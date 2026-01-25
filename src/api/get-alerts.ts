import { WazeClient } from "@/lib/waze-client";
import { HttpClientResponse, UrlParams } from "@effect/platform";
import { Effect, Schema as S } from "effect";
import { Mutable } from "effect/Types";

export const getAlerts = (request: GetAlertsRequest) =>
  Effect.gen(function* () {
    const wazeClient = yield* WazeClient;

    const encoded = yield* S.encode(GetAlertsEncodedSchema)(request);
    const urlParams = UrlParams.fromInput(encoded);

    const response = yield* wazeClient.get("/alerts", {
      urlParams,
    });

    // console.log("Raw response:", response);
    // return response;

    return yield* HttpClientResponse.schemaBodyJson(GetAlertsResponseSchema)(
      response,
    );
  });

const GetAlertsRequestSchema = S.Struct({
  bottomLeft: S.Tuple(S.Number, S.Number),
  topRight: S.Tuple(S.Number, S.Number),
  limit: S.Number,
});

type GetAlertsRequest = Mutable<S.Schema.Type<typeof GetAlertsRequestSchema>>;

const GetAlertsApiSchema = S.Struct({
  "bottom-left": S.String,
  "top-right": S.String,
  limit: S.String,
});

const GetAlertsEncodedSchema = S.transform(
  GetAlertsApiSchema,
  GetAlertsRequestSchema,
  {
    decode: (api) => ({
      bottomLeft: api["bottom-left"].split(", ").map(Number) as [
        number,
        number,
      ],
      topRight: api["top-right"].split(", ").map(Number) as [number, number],
      limit: parseInt(api.limit, 10),
    }),
    encode: (input) => ({
      "bottom-left": `${input.bottomLeft[0]}, ${input.bottomLeft[1]}`,
      "top-right": `${input.topRight[0]}, ${input.topRight[1]}`,
      limit: String(input.limit),
    }),
  },
);

const GetAlertsResponseSchema = S.Array(
  S.Struct({
    id: S.String,
    type: S.String,
    subType: S.String,
    reliability: S.Number,
    locationY: S.Number,
    locationX: S.Number,
    timestamp: S.Number,
    timestampUTC: S.String,
  }),
);
