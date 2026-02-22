import { GetAlertsEncodedRequestSchema } from "@/api/get-alerts";
import {
  ORLANDO_BOTTOM_LEFT_COORDINATES,
  ORLANDO_TOP_RIGHT_COORDINATES,
} from "@/config/constants";
import { env } from "@/config/env";
import { WazeClient } from "@/lib/waze";
import { DatabaseService } from "@/services/database-service";
import { Data, Effect, Schema as S } from "effect";

class SnapshotSaveError extends Data.TaggedError("SnapshotSaveError")<{
  cause?: unknown;
}> {}

export const saveSnapshot = Effect.fn("api/save-snapshot")(function* () {
  const { client } = yield* WazeClient;

  const urlParams = yield* S.encode(GetAlertsEncodedRequestSchema)({
    bottomLeft: [
      ORLANDO_BOTTOM_LEFT_COORDINATES.latitude,
      ORLANDO_BOTTOM_LEFT_COORDINATES.longitude,
    ],
    topRight: [
      ORLANDO_TOP_RIGHT_COORDINATES.latitude,
      ORLANDO_TOP_RIGHT_COORDINATES.longitude,
    ],
    limit: 500,
  });

  const alerts = yield* client.alerts.getAlerts({
    urlParams,
    headers: {
      "x-rapidapi-host": env.WAZE_RAPID_API_HOST || "",
      "x-rapidapi-key": env.WAZE_RAPID_API_KEY || "",
      "content-type": "application/json",
    },
  });

  const db = yield* DatabaseService;

  if (alerts.length === 0) return;

  return yield* Effect.tryPromise({
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
    catch: (cause) => new SnapshotSaveError({ cause }),
  });
});
