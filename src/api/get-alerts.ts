import {
  GetAlertsApiResponseSchema,
  GetAlertsEncodedRequestSchema,
  GetAlertsRequest,
} from "@/api/get-alerts.interface";
import { WazeClient } from "@/lib/waze-client";
import { Alerts } from "@/schemas/alert-schema";
import { HttpClientResponse, UrlParams } from "@effect/platform";
import { Effect, Schema as S, Schema } from "effect";

export const getAlerts = Effect.fn("api/getAlerts")(function* (
  request: GetAlertsRequest,
) {
  const client = yield* WazeClient;

  const encoded = yield* S.encode(GetAlertsEncodedRequestSchema)(request);
  const urlParams = UrlParams.fromInput(encoded);

  const response = yield* client.get("/alerts", {
    urlParams,
  });

  const apiResponse = yield* HttpClientResponse.schemaBodyJson(
    GetAlertsApiResponseSchema,
  )(response);

  const alerts = yield* Schema.decode(Alerts)(apiResponse);

  // const filteredAlerts = yield* Effect.sync(() => {
  //   return alerts.filter((alert) => {
  //     const alertDate = new Date(alert.timestampUTC);
  //     const today = new Date();
  //     return (
  //       alertDate.getUTCFullYear() === today.getUTCFullYear() &&
  //       alertDate.getUTCMonth() === today.getUTCMonth() &&
  //       alertDate.getUTCDate() === today.getUTCDate()
  //     );
  //   });
  // });

  return alerts;
});
