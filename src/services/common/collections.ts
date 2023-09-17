import z from "zod";
import { objectTypes } from "./object-types";

export const getBaseModelCollection = <T extends z.ZodRawShape>(shape: T) => ({
  object: z.literal(objectTypes.collection),
  url: z.string().url(),
  pages: z.object({
    nextUrl: z.string().nullable(),
    previousUrl: z.string().nullable(),
    perPage: z.number(),
  }),
  totalCount: z.number(),
  dataUpdatedAt: z.string().datetime().nullable(),
  data: z.object(shape).array(),
});
