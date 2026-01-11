import { createHash } from "node:crypto";
import { z } from "zod";

import type { SchemaReference } from "./openrouter/schemas";
import { resolveSchemaReference, toJsonSchemaDocument } from "./openrouter/schemas";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_CONCURRENCY = 3;
const DEFAULT_MAX_RETRIES = 3;
const MAX_CACHE_ENTRIES = 100;
const MAX_PROMPT_CHARS = 8_000;
const MAX_RESPONSE_SCHEMA_BYTES = 4_096;
const DEFAULT_SYSTEM_PROMPT = "Jesteś empatycznym asystentem Mood Mate.";
const DEFAULT_MODEL_NAME = "tngtech/tng-r1t-chimera:free";

const now = (): number =>
  typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();

type Role = "system" | "user" | "assistant" | "developer" | "tool";

export interface ChatMessage {
  role: Role;
  content: string;
  name?: string;
  metadata?: Record<string, string>;
}

const ChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "developer", "tool"]),
  content: z
    .string()
    .min(1, "Chat content cannot be empty")
    .max(MAX_PROMPT_CHARS, "Chat content exceeds allowed length"),
  name: z.string().max(64).optional(),
  metadata: z.record(z.string()).optional(),
});

const BaseModelParamsSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  top_k: z.number().int().min(1).max(500).optional(),
  max_output_tokens: z.number().int().positive().optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  repetition_penalty: z.number().min(0).max(2).optional(),
});

const ModelProfileSchema = z.object({
  name: z.string().min(1),
  label: z.string().optional(),
  description: z.string().optional(),
  params: BaseModelParamsSchema.default({}),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
});

export type ModelProfile = z.infer<typeof ModelProfileSchema>;

const OpenRouterConfigSchema = z.object({
  apiKey: z.string().min(1, "OPENROUTER_API_KEY is required"),
  baseUrl: z.string().url().default(DEFAULT_BASE_URL),
  httpReferer: z.string().url().optional(),
  titleHeader: z.string().optional(),
  requestTimeoutMs: z.number().int().positive().default(DEFAULT_TIMEOUT_MS),
  maxConcurrency: z.number().int().positive().default(DEFAULT_MAX_CONCURRENCY),
  maxRetries: z.number().int().min(0).max(5).default(DEFAULT_MAX_RETRIES),
  cacheTtlSeconds: z.number().int().min(0).max(300).default(0),
  telemetryEnabled: z.boolean().default(true),
  models: z.array(ModelProfileSchema).default([]),
});

export type OpenRouterConfig = z.infer<typeof OpenRouterConfigSchema>;

export interface ServiceMetrics {
  totalRequests: number;
  successes: number;
  errors: number;
  inFlight: number;
  averageLatencyMs: number;
  lastError?: string;
}

type JsonSchema = Record<string, unknown>;

export type ResponseFormat =
  | { type: "text" }
  | {
      type: "json_schema";
      json_schema: {
        name: string;
        strict?: boolean;
        schema: JsonSchema;
      };
    };

export interface ChatInvocationOptions {
  systemMessage?: string | ChatMessage;
  developerMessage?: string | ChatMessage;
  userMessage?: string | ChatMessage;
  history?: ChatMessage[];
  additionalMessages?: ChatMessage[];
  context?: { label: string; value: string }[];
  responseFormat?: ResponseFormat;
  responseSchema?: SchemaReference;
  disableSchemaFallback?: boolean;
  parameters?: Partial<z.infer<typeof BaseModelParamsSchema>>;
  signal?: AbortSignal;
  cacheKey?: string;
  cacheTtlSeconds?: number;
  metadata?: Record<string, string>;
}

export interface StreamInvocationOptions extends ChatInvocationOptions {
  onError?: (error: unknown) => void;
}

export interface ChatResult {
  id: string;
  model: string;
  content: string;
  finishReason?: string;
  usage?: OpenRouterUsage;
  raw: OpenRouterResponse;
}

export interface ChatStreamChunk {
  id: string;
  model: string;
  content: string;
  done: boolean;
  finishReason?: string;
}

interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenRouterChoice {
  index: number;
  message: ChatMessage;
  finish_reason?: string;
}

interface OpenRouterResponse {
  id: string;
  created: number;
  model: string;
  choices: OpenRouterChoice[];
  usage?: OpenRouterUsage;
}

interface OpenRouterStreamChoice {
  index: number;
  delta: Partial<ChatMessage>;
  finish_reason?: string | null;
}

interface OpenRouterStreamChunk {
  id: string;
  model?: string;
  created?: number;
  choices: OpenRouterStreamChoice[];
}

interface OpenRouterPayload {
  model: string;
  messages: ChatMessage[];
  response_format?: ResponseFormat;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_output_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  repetition_penalty?: number;
  stream?: boolean;
  metadata?: Record<string, string>;
}

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;

const getImportMetaEnv = (): Record<string, string | undefined> => {
  try {
    return import.meta.env;
  } catch {
    return {};
  }
};

const readEnv = (key: string): string | undefined => {
  const env = getImportMetaEnv();
  if (env?.[key]) {
    return env[key];
  }

  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }

  return undefined;
};

const coerceNumber = (value: string | number | undefined, fallback: number): number => {
  if (value === undefined) {
    return fallback;
  }

  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export class OpenRouterConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenRouterConfigurationError";
  }
}

export class OpenRouterRequestError extends Error {
  readonly status?: number;
  readonly body?: unknown;

  constructor(message: string, status?: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
    this.name = "OpenRouterRequestError";
  }
}

export class OpenRouterRateLimitError extends OpenRouterRequestError {
  retryAfterMs?: number;
}

export class OpenRouterNetworkError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "OpenRouterNetworkError";
  }
}

export function loadOpenRouterConfig(overrides: Partial<OpenRouterConfig> = {}): OpenRouterConfig {
  const parsed = OpenRouterConfigSchema.parse({
    apiKey: overrides.apiKey ?? readEnv("OPENROUTER_API_KEY"),
    baseUrl: overrides.baseUrl ?? readEnv("OPENROUTER_BASE_URL") ?? DEFAULT_BASE_URL,
    httpReferer: overrides.httpReferer ?? readEnv("OPENROUTER_HTTP_REFERER"),
    titleHeader: overrides.titleHeader ?? readEnv("OPENROUTER_TITLE"),
    requestTimeoutMs: overrides.requestTimeoutMs ?? coerceNumber(readEnv("OPENROUTER_TIMEOUT_MS"), DEFAULT_TIMEOUT_MS),
    maxConcurrency:
      overrides.maxConcurrency ?? coerceNumber(readEnv("OPENROUTER_MAX_CONCURRENCY"), DEFAULT_MAX_CONCURRENCY),
    maxRetries: overrides.maxRetries ?? coerceNumber(readEnv("OPENROUTER_MAX_RETRIES"), DEFAULT_MAX_RETRIES),
    cacheTtlSeconds: overrides.cacheTtlSeconds ?? coerceNumber(readEnv("OPENROUTER_CACHE_TTL"), 0),
    telemetryEnabled: overrides.telemetryEnabled ?? readEnv("OPENROUTER_TELEMETRY") !== "false",
    models: overrides.models ?? [],
  });

  if (!parsed.apiKey) {
    throw new OpenRouterConfigurationError("Missing OPENROUTER_API_KEY");
  }

  return parsed;
}

class ConcurrencyLimiter {
  #active = 0;
  readonly #queue: (() => void)[] = [];

  constructor(private readonly limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.limit <= 0) {
      return task();
    }

    if (this.#active >= this.limit) {
      await new Promise<void>((resolve) => this.#queue.push(resolve));
    }

    this.#active += 1;

    try {
      return await task();
    } finally {
      this.#active -= 1;
      const next = this.#queue.shift();
      next?.();
    }
  }
}

class PromptBuilder {
  #systemSet = false;
  #developerSet = false;
  #userSet = false;
  #messages: ChatMessage[] = [];

  addSystemMessage(message: string | ChatMessage): this {
    if (this.#systemSet) {
      throw new Error("System message already defined");
    }

    this.#messages.push(this.#normalizeMessage(message, "system", "System message"));
    this.#systemSet = true;
    return this;
  }

  addDeveloperMessage(message: string | ChatMessage): this {
    if (this.#developerSet) {
      throw new Error("Developer message already defined");
    }

    this.#messages.push(this.#normalizeMessage(message, "developer", "Developer message"));
    this.#developerSet = true;
    return this;
  }

  addUserMessage(message: string | ChatMessage): this {
    if (this.#userSet) {
      throw new Error("User message already defined");
    }

    this.#messages.push(this.#normalizeMessage(message, "user", "User message"));
    this.#userSet = true;
    return this;
  }

  addContext(entries: { label: string; value: string }[] = []): this {
    if (!entries.length) {
      return this;
    }

    const formatted = entries.map(({ label, value }) => `- ${label}: ${value}`).join("\n");

    this.#messages.push(
      this.#normalizeMessage(
        {
          role: "system",
          content: `Contextual data:\n${formatted}`,
        },
        "system",
        "Context message"
      )
    );

    return this;
  }

  addHistory(history: ChatMessage[] = []): this {
    history.forEach((message, index) => {
      const parsed = this.#normalizeMessage(message, message.role, `History message #${index + 1}`);

      if (!["assistant", "user", "tool"].includes(parsed.role)) {
        throw new Error("History message role must be assistant, user or tool");
      }

      this.#messages.push(parsed);
    });

    return this;
  }

  addAdditionalMessages(messages: ChatMessage[] = []): this {
    messages.forEach((message, index) => {
      const parsed = this.#normalizeMessage(message, message.role, `Additional message #${index + 1}`);
      this.#messages.push(parsed);
    });

    return this;
  }

  build(): ChatMessage[] {
    return [...this.#messages];
  }

  #normalizeMessage(message: string | ChatMessage, fallbackRole: Role, source: string): ChatMessage {
    const normalized =
      typeof message === "string" ? { role: fallbackRole, content: message } : { ...message, role: fallbackRole };

    try {
      return ChatMessageSchema.parse({
        ...normalized,
        content: sanitizedContent(normalized.content),
      });
    } catch (error) {
      throw new Error(`${source} invalid: ${(error as Error).message}`);
    }
  }
}

class InMemoryCache {
  #store = new Map<string, { expiresAt?: number; result: ChatResult }>();

  get(key: string): ChatResult | undefined {
    const entry = this.#store.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.#store.delete(key);
      return undefined;
    }

    return entry.result;
  }

  set(key: string, result: ChatResult, ttlSeconds: number): void {
    const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1_000 : undefined;

    if (this.#store.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = this.#store.keys().next().value;
      if (oldestKey) {
        this.#store.delete(oldestKey);
      }
    }

    this.#store.set(key, { result, expiresAt });
  }
}

type TelemetryEvent =
  | {
      type: "request_start";
      model: string;
      metadata?: Record<string, string>;
    }
  | {
      type: "request_success";
      model: string;
      latencyMs: number;
      usage?: OpenRouterUsage;
    }
  | {
      type: "request_error";
      model: string;
      latencyMs: number;
      error: unknown;
    };

class OpenRouterTelemetry {
  constructor(private readonly enabled: boolean) {}

  record(event: TelemetryEvent): void {
    if (!this.enabled) {
      return;
    }

    if (event.type === "request_start") {
      return;
    }

    if (event.type === "request_error") {
      // eslint-disable-next-line no-console
      console.error("[OpenRouter]", event.error);
      return;
    }

    // eslint-disable-next-line no-console
    console.debug("[OpenRouter] success", event.model, `${event.latencyMs.toFixed(0)}ms`);
  }
}

class ResponseMapper {
  mapResponse(raw: OpenRouterResponse): ChatResult {
    const choice = raw.choices.at(0);
    if (!choice) {
      throw new OpenRouterRequestError("OpenRouter response missing choices");
    }

    const content = choice.message?.content ?? "";

    return {
      id: raw.id,
      model: raw.model,
      content,
      finishReason: choice.finish_reason ?? undefined,
      usage: raw.usage,
      raw,
    };
  }
}

const sanitizedContent = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length > MAX_PROMPT_CHARS) {
    return trimmed.slice(0, MAX_PROMPT_CHARS);
  }

  return trimmed;
};

const mergeAbortSignals = (external?: AbortSignal, internal?: AbortSignal): AbortSignal | undefined => {
  if (!external) {
    return internal;
  }

  if (!internal) {
    return external;
  }

  const controller = new AbortController();

  const forwardAbort = (signal: AbortSignal) => {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
    }
  };

  forwardAbort(external);
  forwardAbort(internal);
  return controller.signal;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class OpenRouterService {
  #config: OpenRouterConfig;
  #http: HttpClient;
  #limiter: ConcurrencyLimiter;
  #cache: InMemoryCache;
  #telemetry: OpenRouterTelemetry;
  #mapper: ResponseMapper;
  #metrics: ServiceMetrics;
  #modelRegistry: Map<string, ModelProfile>;

  constructor(config: OpenRouterConfig, transport?: HttpClient) {
    if (typeof window !== "undefined") {
      throw new OpenRouterConfigurationError("OpenRouterService must be instantiated server-side");
    }

    this.#config = OpenRouterConfigSchema.parse(config);
    this.#http = transport ?? globalThis.fetch?.bind(globalThis);

    if (!this.#http) {
      throw new OpenRouterConfigurationError("Fetch API not available. Provide custom HttpClient.");
    }

    this.#limiter = new ConcurrencyLimiter(this.#config.maxConcurrency);
    this.#cache = new InMemoryCache();
    this.#telemetry = new OpenRouterTelemetry(this.#config.telemetryEnabled);
    this.#mapper = new ResponseMapper();
    this.#metrics = {
      totalRequests: 0,
      successes: 0,
      errors: 0,
      inFlight: 0,
      averageLatencyMs: 0,
    };
    this.#modelRegistry = new Map(this.#config.models.map((profile) => [profile.name, profile]));
  }

  get metrics(): ServiceMetrics {
    return { ...this.#metrics };
  }

  registerModel(profile: ModelProfile): void {
    const parsed = ModelProfileSchema.parse(profile);
    this.#modelRegistry.set(parsed.name, parsed);
  }

  async invokeChat(options: ChatInvocationOptions): Promise<ChatResult> {
    const payload = this.#buildPayload(options, { stream: false });
    const cacheKey = this.#resolveCacheKey(payload, options.cacheKey);
    const cacheTtl = options.cacheTtlSeconds ?? this.#config.cacheTtlSeconds ?? 0;

    if (cacheTtl > 0) {
      const cached = this.#cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this.#limiter.run(async () => {
      const started = now();
      this.#metrics.totalRequests += 1;
      this.#metrics.inFlight += 1;
      this.#telemetry.record({
        type: "request_start",
        model: payload.model,
        metadata: payload.metadata,
      });

      try {
        const raw = await this.#executeJsonRequest(payload, options.signal);
        const result = this.#mapper.mapResponse(raw);

        const latency = now() - started;
        this.#recordSuccess(payload.model, latency, raw.usage);

        if (cacheTtl > 0) {
          this.#cache.set(cacheKey, result, cacheTtl);
        }

        return result;
      } catch (error) {
        const latency = now() - started;
        this.#recordError(payload.model, latency, error);
        throw error;
      } finally {
        this.#metrics.inFlight -= 1;
      }
    });
  }

  async *streamChat(options: StreamInvocationOptions): AsyncGenerator<ChatStreamChunk> {
    const payload = this.#buildPayload(options, { stream: true });

    const response = await this.#executeStreamRequest(payload, options.signal);

    if (!response.body) {
      throw new OpenRouterNetworkError("Streaming not supported by response");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split("\n\n");
        buffer = segments.pop() ?? "";

        for (const segment of segments) {
          const trimmed = segment.trim();
          if (!trimmed.startsWith("data:")) {
            continue;
          }

          const data = trimmed.replace(/^data:\s*/, "");
          if (data === "[DONE]") {
            return;
          }

          let parsed: OpenRouterStreamChunk;
          try {
            parsed = JSON.parse(data) as OpenRouterStreamChunk;
          } catch (error) {
            options.onError?.(error);
            throw new OpenRouterRequestError("Malformed stream chunk");
          }
          const choice = parsed.choices.at(0);
          if (!choice) {
            continue;
          }

          const content = choice.delta.content ?? "";
          yield {
            id: parsed.id,
            model: parsed.model ?? payload.model,
            content,
            done: Boolean(choice.finish_reason),
            finishReason: choice.finish_reason ?? undefined,
          };
        }
      }
    } catch (error) {
      options.onError?.(error);
      throw error;
    } finally {
      reader.releaseLock();
    }
  }

  #buildPayload(options: ChatInvocationOptions, flags: { stream: boolean }): OpenRouterPayload {
    const profile = this.#resolveModelProfile();

    const builder = new PromptBuilder();
    const systemPrompt = options.systemMessage ?? DEFAULT_SYSTEM_PROMPT;
    builder.addSystemMessage(systemPrompt);

    if (options.developerMessage) {
      builder.addDeveloperMessage(options.developerMessage);
    }

    if (options.context?.length) {
      builder.addContext(options.context);
    }

    if (options.userMessage) {
      builder.addUserMessage(options.userMessage);
    }

    if (options.history?.length) {
      builder.addHistory(options.history);
    }

    if (options.additionalMessages?.length) {
      builder.addAdditionalMessages(options.additionalMessages);
    }

    const messages = builder.build();
    const nonSystemMessages = messages.filter((message) => message.role !== "system");

    if (!nonSystemMessages.length) {
      throw new OpenRouterRequestError("At least one non-system message must be provided");
    }

    const mergedParams = {
      ...profile.params,
      ...options.parameters,
    };

    const responseFormat = this.#applyResponseFormat(options);

    return {
      model: profile.name,
      messages,
      response_format: responseFormat,
      ...mergedParams,
      stream: flags.stream,
      metadata: options.metadata,
    };
  }

  #applyResponseFormat(options: ChatInvocationOptions): ResponseFormat | undefined {
    if (!options.responseFormat && !options.responseSchema) {
      return undefined;
    }

    const fallbackDisabled = options.disableSchemaFallback === true;

    try {
      if (options.responseFormat) {
        return this.#validateResponseFormat(options.responseFormat);
      }

      const schemaDefinition = resolveSchemaReference(options.responseSchema);
      if (!schemaDefinition) {
        return undefined;
      }

      const document = toJsonSchemaDocument(schemaDefinition);
      this.#assertSchemaSize(document.schema);

      return {
        type: "json_schema",
        json_schema: {
          name: document.name,
          strict: document.strict,
          schema: document.schema,
        },
      };
    } catch (error) {
      if (fallbackDisabled || options.responseFormat) {
        throw error;
      }

      this.#metrics.lastError = error instanceof Error ? error.message : String(error);
      return undefined;
    }
  }

  #validateResponseFormat(format: ResponseFormat): ResponseFormat {
    if (format.type !== "json_schema") {
      return format;
    }

    if (!format.json_schema?.name) {
      throw new OpenRouterRequestError("response_format.json_schema.name is required");
    }

    if (!format.json_schema.schema) {
      throw new OpenRouterRequestError("response_format.json_schema.schema is required");
    }

    this.#assertSchemaSize(format.json_schema.schema);

    return {
      type: "json_schema",
      json_schema: {
        name: format.json_schema.name,
        strict: format.json_schema.strict ?? true,
        schema: format.json_schema.schema,
      },
    };
  }

  #assertSchemaSize(schema: Record<string, unknown>): void {
    const serialized = JSON.stringify(schema);
    if (serialized.length > MAX_RESPONSE_SCHEMA_BYTES) {
      throw new OpenRouterRequestError(`Response schema exceeds ${MAX_RESPONSE_SCHEMA_BYTES} bytes`);
    }
  }

  async #executeJsonRequest(payload: OpenRouterPayload, externalSignal?: AbortSignal): Promise<OpenRouterResponse> {
    const response = await this.#performRequest(payload, externalSignal);
    const text = await response.text();
    if (!text) {
      throw new OpenRouterRequestError("Empty response from OpenRouter");
    }

    let json: OpenRouterResponse;
    try {
      json = JSON.parse(text) as OpenRouterResponse;
    } catch {
      throw new OpenRouterRequestError("Invalid JSON returned by OpenRouter", response.status, text);
    }

    return json;
  }

  async #executeStreamRequest(payload: OpenRouterPayload, externalSignal?: AbortSignal): Promise<Response> {
    return this.#performRequest(payload, externalSignal);
  }

  async #performRequest(payload: OpenRouterPayload, externalSignal?: AbortSignal): Promise<Response> {
    const attemptRequest = async (attempt: number): Promise<Response> => {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(new Error("OpenRouter request timed out")),
        this.#config.requestTimeoutMs
      );

      const signal = mergeAbortSignals(externalSignal, controller.signal);

      try {
        const requestInit: RequestInit = {
          method: "POST",
          headers: this.#buildHeaders(payload),
          body: JSON.stringify(payload),
        };

        if (signal) {
          requestInit.signal = signal;
        }

        const response = await this.#http(`${this.#config.baseUrl}/chat/completions`, requestInit);

        if (!response.ok) {
          const body = await response.text();
          const error =
            response.status === 429
              ? new OpenRouterRateLimitError("Rate limited", response.status, body)
              : new OpenRouterRequestError(`OpenRouter responded with ${response.status}`, response.status, body);

          if (response.headers.has("retry-after")) {
            const retryAfterSeconds = Number(response.headers.get("retry-after"));
            if (Number.isFinite(retryAfterSeconds)) {
              (error as OpenRouterRateLimitError).retryAfterMs = retryAfterSeconds * 1_000;
            }
          }

          if (this.#shouldRetry(response.status) && attempt < this.#config.maxRetries) {
            const delayMs = this.#backoffDelay(attempt);
            await wait(delayMs);
            return attemptRequest(attempt + 1);
          }

          throw error;
        }

        return response;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw new OpenRouterNetworkError("Request aborted", error);
        }

        if (attempt < this.#config.maxRetries) {
          await wait(this.#backoffDelay(attempt));
          return attemptRequest(attempt + 1);
        }

        throw new OpenRouterNetworkError("OpenRouter request failed", error);
      } finally {
        clearTimeout(timeout);
      }
    };

    return attemptRequest(0);
  }

  #buildHeaders(payload: OpenRouterPayload): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.#config.apiKey}`,
      "Content-Type": "application/json",
      Accept: payload.stream ? "text/event-stream" : "application/json",
    };

    if (this.#config.httpReferer) {
      headers["HTTP-Referer"] = this.#config.httpReferer;
    }

    if (this.#config.titleHeader) {
      headers["X-Title"] = this.#config.titleHeader;
    }

    return headers;
  }

  #shouldRetry(status?: number): boolean {
    if (!status) {
      return true;
    }

    if (status === 429) {
      return true;
    }

    return status >= 500;
  }

  #backoffDelay(attempt: number): number {
    const base = 2 ** attempt * 200;
    const jitter = Math.random() * 100;
    return base + jitter;
  }

  #resolveModelProfile(): ModelProfile {
    const profile = this.#modelRegistry.get(DEFAULT_MODEL_NAME) ?? {
      name: DEFAULT_MODEL_NAME,
      params: {},
      priority: "normal",
    };

    this.#modelRegistry.set(profile.name, profile);
    return profile;
  }

  #resolveCacheKey(payload: OpenRouterPayload, provided?: string): string {
    if (provided) {
      return provided;
    }

    const hash = createHash("sha256");
    hash.update(JSON.stringify(payload));
    return hash.digest("hex");
  }

  #recordSuccess(model: string, latencyMs: number, usage?: OpenRouterUsage): void {
    this.#metrics.successes += 1;
    this.#metrics.averageLatencyMs =
      (this.#metrics.averageLatencyMs * (this.#metrics.successes - 1) + latencyMs) / this.#metrics.successes;

    this.#telemetry.record({
      type: "request_success",
      model,
      latencyMs,
      usage,
    });
  }

  #recordError(model: string, latencyMs: number, error: unknown): void {
    this.#metrics.errors += 1;
    this.#metrics.lastError = error instanceof Error ? error.message : String(error);

    this.#telemetry.record({
      type: "request_error",
      model,
      latencyMs,
      error,
    });
  }
}
