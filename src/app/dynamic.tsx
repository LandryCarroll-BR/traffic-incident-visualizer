import { Effect } from "effect";
import { AlertCircleIcon } from "lucide-react";
import { connection } from "next/server";
import { getSnapshotAnalyticsByDate } from "@/api/get-snapshot-analytics-by-date";
import { getSnapshotTimeline } from "@/api/get-snapshot-timeline";
import { MapLayout } from "@/components/map-layout";
import { SnapshotDashboard } from "@/components/snapshot-dashboard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppRuntime } from "@/config/runtime";
import { DatabaseService } from "@/services/database-service";

export async function DynamicAlertData() {
  await connection();

  return await AppRuntime.runPromise(
    Effect.gen(function* () {
      const timeline = yield* getSnapshotTimeline({ days: 30 });
      const latestDate = timeline.dates.at(-1);

      if (!latestDate) {
        return (
          <MapLayout>
            <SnapshotDashboard
              initialTimeline={toPlainValue(timeline)}
              initialAnalytics={null}
            />
          </MapLayout>
        );
      }

      const analytics = yield* getSnapshotAnalyticsByDate({ date: latestDate });

      return (
        <MapLayout>
          <SnapshotDashboard
            initialTimeline={toPlainValue(timeline)}
            initialAnalytics={toPlainValue(analytics)}
          />
        </MapLayout>
      );
    }).pipe(
      Effect.provide(DatabaseService.Default),
      Effect.tapError(Effect.logError),
      Effect.catchAll((error) =>
        Effect.succeed(
          <Alert variant="destructive" className="max-w-lg">
            <AlertCircleIcon />
            <AlertTitle>Dashboard Load Error</AlertTitle>
            <AlertDescription>
              Failed to load snapshot dashboard data.
              <pre>{JSON.stringify(error, null, 2)}</pre>
            </AlertDescription>
          </Alert>,
        ),
      ),
    ),
  );
}

function toPlainValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
