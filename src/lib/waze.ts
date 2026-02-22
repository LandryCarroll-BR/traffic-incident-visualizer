import { env } from "@/config/env";
import {
  FetchHttpClient,
  HttpApi,
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup,
} from "@effect/platform";
import { Effect, Layer, Schema as S } from "effect";

export const WazeAlertsParams = S.Struct({
  "bottom-left": S.String,
  "top-right": S.String,
  limit: S.String,
});

export const WazeAlertResponse = S.mutable(
  S.Array(
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
  ),
);

export type WazeAlertResponse = S.Schema.Type<typeof WazeAlertResponse>;

export const GetAlerts = HttpApiEndpoint.get("getAlerts")`/alerts`
  .setUrlParams(WazeAlertsParams)
  .setHeaders(
    S.Struct({
      "x-rapidapi-host": S.String,
      "x-rapidapi-key": S.String,
      "content-type": S.Literal("application/json"),
    }),
  )
  .addSuccess(WazeAlertResponse);

export const WazeApi = HttpApi.make("WazeApi").add(
  HttpApiGroup.make("alerts").add(GetAlerts),
);

export class WazeClient extends Effect.Service<WazeClient>()("WazeClient", {
  effect: Effect.gen(function* () {
    const client = yield* HttpApiClient.make(WazeApi, {
      baseUrl: `${env.WAZE_RAPID_API_BASE_URL}`,
    });

    return { client };
  }),
  dependencies: [FetchHttpClient.layer],
}) {
  static Dev = Layer.effect(
    WazeClient,
    Effect.gen(function* () {
      const client = yield* HttpApiClient.make(WazeApi, {
        baseUrl: `${env.BASE_URL}/api`,
      });

      return WazeClient.make({ client });
    }),
  );
}
