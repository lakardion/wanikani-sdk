import { z } from "zod";

export const readingShape = {
  reading: z.string(),
  primary: z.boolean(),
  acceptedAnswer: z.boolean(),
};
