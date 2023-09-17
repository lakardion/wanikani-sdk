import { createApi, createCustomServiceCall } from "@thinknimble/tn-models";
import z from "zod";
import { client } from "../axios-client";
import { getBaseModelShape } from "../common";
import { getBaseModelCollection } from "../common/collections";
import { subjectShape } from "./models";

const wnkCustomFilterParser = (filters: object) => {
  //@ts-expect-error not sure why this doesn't work really...
  return new URLSearchParams(filters).toString();
};

const getAll = createCustomServiceCall(
  {
    outputShape: getBaseModelCollection(getBaseModelShape(subjectShape)),
    filtersShape: {
      ids: z.number().array(),
      types: z.string().array(),
      slugs: z.string().array(),
      levels: z.number().array(),
    },
  },
  async ({ utils, client, slashEndingBaseUri, parsedFilters }) => {
    const urlParams = parsedFilters
      ? "?" + wnkCustomFilterParser(parsedFilters)
      : "";
    //@ts-expect-error we didnt' yet fix the slash ending thing
    const res = await client.get(`${slashEndingBaseUri}${urlParams}`);
    return utils.fromApi(res.data);
  }
);

export const subjectApi = createApi(
  {
    baseUri: "subjects",
    disableTrailingSlash: true,
    client,
  },
  {
    getAll,
  }
);
