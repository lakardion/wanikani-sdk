import z from "zod";
import { readingShape } from "./reading";

const contextSentenceShape = {
  en: z.string(),
  ja: z.string(),
};

const pronunciationAudioMetadataAttributeShape = {
  gender: z.string(),
  sourceId: z.number(),
  pronunciation: z.string(),
  voiceActorId: z.number(),
  voiceActorName: z.string(),
  voiceDescription: z.string(),
};
const pronunciationAudioShape = {
  url: z.string().url(),
  contentType: z.nativeEnum({
    mpeg: "audio/mpeg",
    ogg: "audio/ogg",
  }),
  metadata: z.object(pronunciationAudioMetadataAttributeShape),
};

export const vocabularyShape = {
  componentSubjectIds: z.number().array(),
  contextSentences: z.object(contextSentenceShape).array(),
  meaningMnemonic: z.string(),
  partsOfSpeech: z.string().array(),
  pronunciationAudios: z.object(pronunciationAudioShape).array(),
  readings: z.object(readingShape).array(),
  readingMnemonic: z.string(),
};

export const kanaVocabularyShape = {
  contextSentences: z.object(contextSentenceShape).array(),
  meaningMnemonic: z.string(),
  partsOfSpeech: z.string().array(),
  pronunciationAudios: z.object(pronunciationAudioShape).array(),
};
