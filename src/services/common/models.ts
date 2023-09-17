import { z } from "zod";
import { kanjiShape } from "./kanji";
import { ObjectTypes, objectTypes } from "./object-types";
import { radicalShape } from "./radical";
import { kanaVocabularyShape, vocabularyShape } from "./vocabulary";

const dataShapeByObjectType: Record<ObjectTypes, z.ZodRawShape> = {
  kanji: kanjiShape,
  kana_vocabulary: kanaVocabularyShape,
  vocabulary: vocabularyShape,
  radical: radicalShape,
  collection: { tbd: z.unknown() },
};

export const getBaseModelShape = <T extends z.ZodRawShape>(
  innerShape: T
  // type: ObjectTypes
) => {
  // const resolvedShape = dataShapeByObjectType[type];
  return {
    // object: z.literal(type),
    object: z.nativeEnum(objectTypes),
    url: z.string().url(),
    dataUpdatedAt: z.string().datetime().nullable(),
    //TODO: we might just want to determine inner shape from the `objectTypes` rather than from user parameter so it is something to take into account.
    // data: z.object(resolvedShape),
    data: z.object(innerShape),
  };
};
