import { Schema as S } from "effect";

export class Alert extends S.Class<Alert>("Alert")({
  id: S.NonEmptyString,
  type: S.String,
  subType: S.String,
  reliability: S.Number,
  locationY: S.Number,
  locationX: S.Number,
  timestamp: S.Number,
  timestampUTC: S.String,
}) {}

export const Alerts = S.mutable(S.Array(Alert));
