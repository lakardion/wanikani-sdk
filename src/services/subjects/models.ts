import z from "zod";

const meaningShape = {
  meaning: z.string(),
  primary: z.boolean(),
  acceptedAnswer: z.boolean(),
};

const auxiliaryMeaningShape = {
  meaning: z.string(),
  type: z.enum(["whitelist", "blacklist"]),
};

export const subjectShape = {
  auxiliaryMeanings: z.object(auxiliaryMeaningShape).array(),
  characters: z.string(),
  createdAt: z.string().datetime(),
  documentUrl: z.string().url(),
  hiddenAt: z.string().datetime().nullable(),
  lessonPosition: z.number(),
  level: z.number(),
  meaningMnemonic: z.string(),
  meanings: z.object(meaningShape).array(),
  slug: z.string(),
  spacedRepetitionSystemId: z.number(),
};
