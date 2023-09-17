import z from "zod";

const contentTypes = {
  png: "image/png",
  svg: "image/svg+xml",
};

const pngContentShape = {
  color: z.string(),
  dimensions: z.string(),
  styleName: z.string(),
};
const svgContentShape = {
  inlineStyles: z.boolean(),
};

const imageShape = {
  url: z.string().url(),
  contentType: z.nativeEnum(contentTypes),
  metadata: z.object(pngContentShape).or(z.object(svgContentShape)),
};

export const radicalShape = {
  amalgamationSubjectIds: z.number().array(),
  characters: z.string().nullable(),
  characterImages: z.object(imageShape).array(),
};
