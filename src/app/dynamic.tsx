import { getAlerts } from "@/api/get-alerts";
import { AlertsMap } from "@/components/alerts-map";
import { MapLayout } from "@/components/map-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DEFAULT_ALERT_LIMIT,
  ORLANDO_BOTTOM_LEFT_COORDINATES,
  ORLANDO_TOP_RIGHT_COORDINATES,
} from "@/config/constants";
import { AppRuntime } from "@/config/runtime";
import prisma from "@/lib/prisma";
import { WazeClient } from "@/lib/waze";
import { Effect } from "effect";
import { AlertCircleIcon } from "lucide-react";
import { connection } from "next/server";

export async function DynamicAlertData() {
  await connection();

  const alerts = await AppRuntime.runPromise(
    getAlerts({
      bottomLeft: [
        ORLANDO_BOTTOM_LEFT_COORDINATES.latitude,
        ORLANDO_BOTTOM_LEFT_COORDINATES.longitude,
      ],
      topRight: [
        ORLANDO_TOP_RIGHT_COORDINATES.latitude,
        ORLANDO_TOP_RIGHT_COORDINATES.longitude,
      ],
      limit: DEFAULT_ALERT_LIMIT,
    }).pipe(Effect.provide(WazeClient.Dev)),
  );

  return await AppRuntime.runPromise(
    getAlerts({
      bottomLeft: [
        ORLANDO_BOTTOM_LEFT_COORDINATES.latitude,
        ORLANDO_BOTTOM_LEFT_COORDINATES.longitude,
      ],
      topRight: [
        ORLANDO_TOP_RIGHT_COORDINATES.latitude,
        ORLANDO_TOP_RIGHT_COORDINATES.longitude,
      ],
      limit: DEFAULT_ALERT_LIMIT,
    }).pipe(
      Effect.provide(WazeClient.Dev),
      Effect.andThen((alerts) => (
        <MapLayout>
          <AlertsMap alerts={alerts} />
        </MapLayout>
      )),
      Effect.tapError(Effect.logError),
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
