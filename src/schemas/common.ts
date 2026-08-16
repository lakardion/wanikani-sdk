import * as v from "valibot";

export const TimestampSchema = v.pipe(v.string(), v.isoTimestamp());
export type Timestamp = v.InferOutput<typeof TimestampSchema>;

export const NullableTimestamp = v.nullable(TimestampSchema);

export function envelope<TObject extends string, TData extends v.GenericSchema>(
  object: TObject,
  data: TData,
) {
  return v.looseObject({
    id: v.number(),
    object: v.literal(object),
    url: v.string(),
    data_updated_at: NullableTimestamp,
    data,
  });
}

export function collection<TObject extends string, TItem extends v.GenericSchema>(
  itemObject: TObject,
  item: TItem,
) {
  return v.looseObject({
    object: v.literal("collection"),
    url: v.string(),
    pages: v.looseObject({
      next_url: v.nullable(v.string()),
      previous_url: v.nullable(v.string()),
      per_page: v.number(),
    }),
    total_count: v.number(),
    data_updated_at: NullableTimestamp,
    data: v.array(envelope(itemObject, item)),
  });
}

export const ApiErrorSchema = v.looseObject({
  error: v.string(),
  code: v.number(),
});
export type ApiErrorBody = v.InferOutput<typeof ApiErrorSchema>;

export type Envelope<TObject extends string, TData> = {
  id: number;
  object: TObject;
  url: string;
  data_updated_at: string | null;
  data: TData;
};

export type Collection<TObject extends string, TData> = {
  object: "collection";
  url: string;
  pages: { next_url: string | null; previous_url: string | null; per_page: number };
  total_count: number;
  data_updated_at: string | null;
  data: Envelope<TObject, TData>[];
};
