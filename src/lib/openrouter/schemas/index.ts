import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export interface RegisteredSchema {
  name: string;
  schema: z.ZodTypeAny;
  strict?: boolean;
  description?: string;
}

export type SchemaReference = RegisteredSchema | string;

const registry = new Map<string, RegisteredSchema>();

export const registerSchema = (definition: RegisteredSchema): RegisteredSchema => {
  if (!definition.name) {
    throw new Error("Registered schema must have a name");
  }

  registry.set(definition.name, definition);
  return definition;
};

export const registerSchemas = (definitions: RegisteredSchema[]): void => {
  definitions.forEach(registerSchema);
};

export const resolveSchemaReference = (reference?: SchemaReference): RegisteredSchema | undefined => {
  if (!reference) {
    return undefined;
  }

  if (typeof reference === "string") {
    return registry.get(reference);
  }

  if (!registry.has(reference.name)) {
    registry.set(reference.name, reference);
  }

  return reference;
};

export const listRegisteredSchemas = (): RegisteredSchema[] => [...registry.values()];

export interface JsonSchemaDocument {
  name: string;
  strict: boolean;
  schema: Record<string, unknown>;
}

export const toJsonSchemaDocument = (definition: RegisteredSchema): JsonSchemaDocument => ({
  name: definition.name,
  strict: definition.strict ?? true,
  schema: zodToJsonSchema(definition.schema, definition.name) as Record<string, unknown>,
});
