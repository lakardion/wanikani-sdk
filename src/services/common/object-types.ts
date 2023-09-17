//! we could try to do some magic with this to determine the different possible types of data. But might get quite complicated
export const objectTypes = {
  radical: "radical",
  kanji: "kanji",
  vocabulary: "vocabulary",
  kanaVocabulary: "kana_vocabulary",
  collection: "collection",
  // report: "report",
  // assignment: "assignment",
  // levelProgression: "level_progression",
  // reset: "reset",
  // reviewStatistic: "review_statistic",
  // review: "review",
  // spacedRepetitionSystem: "spaced_repetition_system",
  // studyMaterial: "study_material",
  // user: "user",
  // voiceActor: "voice_actor",
} as const;

type ObjectTypesEnum = typeof objectTypes;
export type ObjectTypes = ObjectTypesEnum[keyof ObjectTypesEnum];
