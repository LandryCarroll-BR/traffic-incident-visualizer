import { getSnapshotAlerts } from "@/api/get-snapshot-alerts";
import { AlertsMap } from "@/components/alerts-map";
import { MapLayout } from "@/components/map-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppRuntime } from "@/config/runtime";
import { DatabaseService } from "@/services/database-service";
import { Effect } from "effect";
import { AlertCircleIcon } from "lucide-react";
import { connection } from "next/server";

export async function DynamicAlertData() {
  await connection();

  return await AppRuntime.runPromise(
    getSnapshotAlerts({
      date: new Date("2026-02-05T02:46:31.209Z"),
    }).pipe(
      Effect.provide(DatabaseService.Default),
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
        SnapshotNotFoundError: (error) =>
          Effect.succeed(
            <Alert variant="destructive" className="max-w-md">
              <AlertCircleIcon />
              <AlertTitle>Snapshot Not Found</AlertTitle>
              <AlertDescription>
                No snapshot was found for the specified date.
                <pre>{JSON.stringify(error, null, 2)}</pre>
              </AlertDescription>
            </Alert>,
          ),
      }),
    ),
  );
}
