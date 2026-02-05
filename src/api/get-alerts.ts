import { env } from "@/config/env";
import { WazeAlertsParams, WazeClient } from "@/lib/waze";
import { Alert, AlertId, Alerts, AlertType } from "@/models/alert";
import { Effect, Schema as S } from "effect";
import { Mutable } from "effect/Types";

export const GetAlertsRequestSchema = S.Struct({
  bottomLeft: S.Tuple(S.Number, S.Number),
  topRight: S.Tuple(S.Number, S.Number),
  limit: S.Number,
});

export type GetAlertsRequest = Mutable<
  S.Schema.Type<typeof GetAlertsRequestSchema>
>;

export const GetAlertsEncodedRequestSchema = S.transform(
  WazeAlertsParams,
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

export const getAlerts = Effect.fn("api/getAlerts")(function* (
  request: GetAlertsRequest,
) {
  const { client } = yield* WazeClient;

  const urlParams = yield* S.encode(GetAlertsEncodedRequestSchema)(request);

  const wazeAlerts = yield* client.alerts.getAlerts({
    urlParams,
    headers: {
      "x-rapidapi-host": env.WAZE_RAPID_API_HOST || "",
      "x-rapidapi-key": env.WAZE_RAPID_API_KEY || "",
      "content-type": "application/json",
    },
  });

  const mappedAlerts = wazeAlerts.map((alert) =>
    Alert.make({
      id: AlertId.make(alert.id),
      type: S.decodeUnknownSync(AlertType)(alert.type),
      position: [alert.locationY, alert.locationX],
      time: alert.timestamp,
      reliability: alert.reliability,
    }),
  );

  return yield* S.decode(Alerts)(mappedAlerts);
});
