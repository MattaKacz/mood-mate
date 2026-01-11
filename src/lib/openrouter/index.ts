import { OpenRouterService, loadOpenRouterConfig, type OpenRouterConfig } from "@/lib/openrouter.service";

let instance: OpenRouterService | undefined;

export const getOpenRouterService = (overrides?: Partial<OpenRouterConfig>): OpenRouterService => {
  if (instance && !overrides) {
    return instance;
  }

  const config = loadOpenRouterConfig(overrides);
  const service = new OpenRouterService(config);

  if (!overrides) {
    instance = service;
  }

  return service;
};
