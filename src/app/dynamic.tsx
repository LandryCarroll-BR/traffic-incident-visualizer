import { getAlerts, getAlertsParams } from "@/api/get-alerts";
import { AlertsMap } from "@/components/alerts-map";
import { MapLayout } from "@/components/map-layout";
import { ApiTestRuntime } from "@/config/runtime";
import { WazeClient } from "@/lib/waze-client";
import { Effect } from "effect";

export async function DynamicAlertData() {
  return await ApiTestRuntime.runPromise(
    getAlerts(getAlertsParams).pipe(
      Effect.provide(WazeClient.Test),
      Effect.andThen((alerts) => (
        <MapLayout>
          <AlertsMap alerts={alerts} />
        </MapLayout>
      )),
      Effect.tapError(Effect.log),
      Effect.catchTags({
        ParseError: (error) =>
          Effect.succeed(
            <>
              <div>Parse Error occurred while fetching alerts.</div>
              <pre>{JSON.stringify(error, null, 2)}</pre>
            </>,
          ),
        RequestError: (error) =>
          Effect.succeed(
            <>
              <div>Request Error occurred while fetching alerts.</div>
              <pre>{JSON.stringify(error, null, 2)}</pre>
            </>,
          ),
        ResponseError: (error) =>
          Effect.succeed(
            <>
              <div>Response Error occurred while fetching alerts.</div>
              <pre>{JSON.stringify(error, null, 2)}</pre>
            </>,
          ),
      }),
    ),
  );
}
