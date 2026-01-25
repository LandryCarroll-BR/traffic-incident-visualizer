import {
  DEFAULT_ALERT_LIMIT,
  ORLANDO_BOTTOM_LEFT_COORDINATES,
  ORLANDO_TOP_RIGHT_COORDINATES,
} from "@/config/constants";
import { WazeClient } from "@/lib/waze-client";
import { Alert } from "@/schemas/alert-schema";
import { HttpClientResponse, UrlParams } from "@effect/platform";
import { Effect, Schema as S, Schema } from "effect";
import { Mutable } from "effect/Types";

export const getAlerts = (request: GetAlertsRequest) =>
  Effect.gen(function* () {
    const client = yield* WazeClient;

    const encoded = yield* S.encode(GetAlertsEncodedRequestSchema)(request);
    const urlParams = UrlParams.fromInput(encoded);

    const response = yield* client.get("/alerts", {
      urlParams,
    });

    const apiResponse = yield* HttpClientResponse.schemaBodyJson(
      GetAlertsApiResponseSchema,
    )(response);

    const alerts = yield* Schema.decode(S.Array(Alert))(apiResponse);

    const filteredAlerts = yield* Effect.sync(() => {
      return alerts.filter((alert) => {
        const alertDate = new Date(alert.timestampUTC);
        const today = new Date();
        return (
          alertDate.getUTCFullYear() === today.getUTCFullYear() &&
          alertDate.getUTCMonth() === today.getUTCMonth() &&
          alertDate.getUTCDate() === today.getUTCDate()
        );
      });
    });

    return filteredAlerts;
  });

export const getAlertsParams: GetAlertsRequest = {
  bottomLeft: [
    ORLANDO_BOTTOM_LEFT_COORDINATES.latitude,
    ORLANDO_BOTTOM_LEFT_COORDINATES.longitude,
  ],
  topRight: [
    ORLANDO_TOP_RIGHT_COORDINATES.latitude,
    ORLANDO_TOP_RIGHT_COORDINATES.longitude,
  ],
  limit: DEFAULT_ALERT_LIMIT,
};

const GetAlertsRequestSchema = S.Struct({
  bottomLeft: S.Tuple(S.Number, S.Number),
  topRight: S.Tuple(S.Number, S.Number),
  limit: S.Number,
});

export type GetAlertsRequest = Mutable<
  S.Schema.Type<typeof GetAlertsRequestSchema>
>;

const GetAlertsApiRequestSchema = S.Struct({
  "bottom-left": S.String,
  "top-right": S.String,
  limit: S.String,
});

const GetAlertsEncodedRequestSchema = S.transform(
  GetAlertsApiRequestSchema,
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

const GetAlertsApiResponseSchema = S.Array(
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
