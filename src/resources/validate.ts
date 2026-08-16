import * as v from "valibot";
import { WanikaniValidationError } from "../http/errors";

export type ValidatePolicy = "both" | "input" | "output" | "none";

/**
 * Called once per object in a response payload that carries fields the schema
 * does not know. `path` locates the object within the response body using
 * dotted keys and array indices (e.g. `"data"`, `"data[0].subscription"`,
 * `"data.readings[0]"`); `fields` lists the unknown field names found there.
 */
export type UnknownFieldsCallback = (path: string, fields: string[]) => void;

export interface ValidateContext {
  policy: ValidatePolicy;
  onUnknownFields?: UnknownFieldsCallback;
}

export function validateInput<TSchema extends v.GenericSchema>(
  ctx: ValidateContext,
  schema: TSchema,
  value: v.InferInput<TSchema>,
): v.InferOutput<TSchema> {
  if (ctx.policy === "none" || ctx.policy === "output") {
    return value as v.InferOutput<TSchema>;
  }
  const result = v.safeParse(schema, value);
  if (!result.success) throw new WanikaniValidationError("input", result.issues);
  return result.output;
}

export function validateOutput<TSchema extends v.GenericSchema>(
  ctx: ValidateContext,
  schema: TSchema,
  value: unknown,
): v.InferOutput<TSchema> {
  if (ctx.policy === "none" || ctx.policy === "input") {
    return value as v.InferOutput<TSchema>;
  }
  const result = v.safeParse(schema, value);
  if (!result.success) throw new WanikaniValidationError("output", result.issues);
  if (ctx.onUnknownFields) {
    reportUnknownFields(schema, value, "", ctx.onUnknownFields);
  }
  return result.output;
}

interface ObjectLikeSchema {
  entries: Record<string, v.GenericSchema>;
}

interface ArrayLikeSchema {
  item: v.GenericSchema;
}

interface UnionLikeSchema {
  options: readonly v.GenericSchema[];
}

interface WrappedSchema {
  wrapped: v.GenericSchema;
}

interface PipedSchema {
  pipe: readonly unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function joinPath(path: string, key: string): string {
  return path ? `${path}.${key}` : key;
}

/**
 * Walks the raw response value against the schema and reports, per object,
 * the keys the schema does not know. Mirrors valibot's own traversal:
 * unions resolve to the first variant that parses, wrappers unwrap, and
 * records/leaf schemas accept anything.
 */
function reportUnknownFields(
  schema: v.GenericSchema,
  value: unknown,
  path: string,
  report: UnknownFieldsCallback,
): void {
  switch (schema.type) {
    case "object":
    case "loose_object": {
      if (!isRecord(value)) return;
      const { entries } = schema as unknown as ObjectLikeSchema;
      const unknown = Object.keys(value).filter((key) => !(key in entries));
      if (unknown.length > 0) report(path, unknown);
      for (const [key, entry] of Object.entries(entries)) {
        if (key in value) {
          reportUnknownFields(entry, value[key], joinPath(path, key), report);
        }
      }
      return;
    }
    case "array": {
      if (!Array.isArray(value)) return;
      const { item } = schema as unknown as ArrayLikeSchema;
      for (let index = 0; index < value.length; index++) {
        reportUnknownFields(item, value[index], `${path}[${index}]`, report);
      }
      return;
    }
    case "union": {
      const { options } = schema as unknown as UnionLikeSchema;
      for (const option of options) {
        if (v.safeParse(option, value).success) {
          reportUnknownFields(option, value, path, report);
          return;
        }
      }
      return;
    }
    case "optional":
    case "nullable":
    case "nullish": {
      const { wrapped } = schema as unknown as WrappedSchema;
      reportUnknownFields(wrapped, value, path, report);
      return;
    }
    case "pipe": {
      const { pipe } = schema as unknown as PipedSchema;
      const first = pipe[0];
      if (first) reportUnknownFields(first as v.GenericSchema, value, path, report);
      return;
    }
    default:
      return;
  }
}
