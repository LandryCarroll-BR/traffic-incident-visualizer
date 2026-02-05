import { WazeAlertResponse } from "@/lib/waze";
import { DatabaseService } from "@/services/database-service";
import { Data, Effect } from "effect";

class SnapshotSaveError extends Data.TaggedError("SnapshotSaveError")<{
  cause?: unknown;
}> {}

export const saveSnapshot = Effect.fn("api/save-snapshot")(function* (
  alerts: WazeAlertResponse,
) {
  const db = yield* DatabaseService;

  if (alerts.length === 0) return;

  yield* Effect.tryPromise({
    try: () =>
      db.snapshot.create({
        data: {
          snapshotTrafficAlerts: {
            createMany: {
              data: alerts.map((alert) => ({
                locationX: alert.locationX,
                locationY: alert.locationY,
                type: alert.type,
                reliability: alert.reliability,
                subType: alert.subType,
                timestamp: new Date(alert.timestamp),
                timestampUTC: new Date(alert.timestampUTC),
              })),
            },
          },
        },
      }),
    catch: (cause) => {
      console.log("Snapshot save failed:", cause);
      return new SnapshotSaveError({ cause });
    },
  });
});
