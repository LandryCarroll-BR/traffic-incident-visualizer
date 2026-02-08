import { getSnapshotByDate } from "@/api/get-snapshot-by-date";
import { Alert, AlertId, Alerts, AlertType } from "@/models/alert";
import { Effect, Schema as S } from "effect";
import { Mutable } from "effect/Types";

export const GetSnapshotAlertsRequestSchema = S.Struct({
  date: S.Date,
});

export type GetSnapshotAlertsRequest = Mutable<
  S.Schema.Type<typeof GetSnapshotAlertsRequestSchema>
>;

export const getSnapshotAlerts = Effect.fn("api/getSnapshotAlerts")(function* (
  request: GetSnapshotAlertsRequest,
) {
  const snapshot = yield* getSnapshotByDate(request.date);

  const mappedAlerts = snapshot?.snapshotTrafficAlerts.map((alert) =>
    Alert.make({
      id: AlertId.make(alert.id),
      time: new Date(alert.timestamp).getTime(),
      reliability: alert.reliability,
      type: S.decodeUnknownSync(AlertType)(alert.type),
      position: [alert.locationY, alert.locationX],
    }),
  );

  if (!mappedAlerts) {
    return [];
  }

  return yield* S.decode(Alerts)(mappedAlerts);
});
