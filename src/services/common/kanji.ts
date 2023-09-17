import { z } from "zod";
import { readingShape } from "./reading";

const kanjiReadingType = {
  on: "onyomi",
  kun: "kunyomi",
  nano: "nanori",
};

const kanjiReadingShape = z.object(readingShape).merge(
  z.object({
    type: z.nativeEnum(kanjiReadingType),
  })
).shape;

export const kanjiShape = {
  amalgamationSubjectIds: z.number().array(),
  componentSubjectIds: z.number().array(),
  meaningHint: z.string().nullable(),
  readingHint: z.string().nullable(),
  readingMnemonic: z.string(),
  readings: z.object(kanjiReadingShape).array(),
  visuallySimilarSubjectIds: z.number().array(),
};
