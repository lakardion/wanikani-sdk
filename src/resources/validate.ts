import * as v from "valibot";
import { WanikaniValidationError } from "../http/errors";

export type ValidatePolicy = "both" | "input" | "output" | "none";

export interface ValidateContext {
  policy: ValidatePolicy;
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
  return result.output;
}
