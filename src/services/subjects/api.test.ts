import { describe, it, expect } from "vitest";
import { updateWnkToken } from "../axios-client";
import { wnkToken } from "../../../secrets";
import { subjectApi } from "./api";

//TODO: remove these thoughts put them somewhere else
// for the time being we should just hit the api and there shouldn't be many tests set up. if we actually were to check the health status of the sdk vs the api (see if anything has changed ig) we probably would want to do a run on the endpoints bt we should be careful of the rate limit so we shoulnd't run too many tests for that..

describe("Subjects", () => {
  it("tests subject api", async () => {
    updateWnkToken(wnkToken);
    const result = await subjectApi.csc.getAll({
      filters: {
        types: ["kanji"],
        levels: [5],
      },
    });
    console.log(result);
  });
});
