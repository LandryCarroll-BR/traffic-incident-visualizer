import { getAlerts, getAlertsParams } from "@/api/get-alerts";
import { AlertsMap } from "@/components/alerts-map";
import { MapLayout } from "@/components/map-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiTestRuntime } from "@/config/runtime";
import { WazeClient } from "@/lib/waze-client";
import { Effect } from "effect";
import { AlertCircleIcon } from "lucide-react";
import { connection } from "next/server";

export async function DynamicAlertData() {
  await connection();
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
            <Alert variant="destructive" className="max-w-md">
              <AlertCircleIcon />
              <AlertTitle>Parse Eerror</AlertTitle>
              <AlertDescription>
                There was an error parsing the alert data.
                <pre>{JSON.stringify(error, null, 2)}</pre>
              </AlertDescription>
            </Alert>,
          ),
        RequestError: (error) =>
          Effect.succeed(
            <Alert variant="destructive" className="max-w-md">
              <AlertCircleIcon />
              <AlertTitle>Request Error</AlertTitle>
              <AlertDescription>
                There was an error making the request for alerts.
                <pre>{JSON.stringify(error, null, 2)}</pre>
              </AlertDescription>
            </Alert>,
          ),
        ResponseError: (error) =>
          Effect.succeed(
            <Alert variant="destructive" className="max-w-md">
              <AlertCircleIcon />
              <AlertTitle>Response Error</AlertTitle>
              <AlertDescription>
                There was an error with the response for alerts.
                <pre>{JSON.stringify(error, null, 2)}</pre>
              </AlertDescription>
            </Alert>,
          ),
      }),
    ),
  );
}
