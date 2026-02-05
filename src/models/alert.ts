import { Schema as S } from "effect";

export const AlertId = S.NonEmptyString.pipe(S.brand("AlertId"));

export type AlertId = S.Schema.Type<typeof AlertId>;

export const AlertType = S.Union(
  S.Literal("ACCIDENT"),
  S.Literal("HAZARD"),
  S.Literal("JAM"),
  S.Literal("POLICE"),
  S.Literal("ROAD_CLOSED"),
);

export type AlertType = S.Schema.Type<typeof AlertType>;

export class Alert extends S.Class<Alert>("Alert")({
  id: AlertId,
  position: S.mutable(S.Tuple(S.Number, S.Number)),
  type: AlertType,
  time: S.Number,
  reliability: S.optional(S.Number),
}) {}

export const Alerts = S.mutable(S.Array(Alert));

export type Alerts = S.Schema.Type<typeof Alert>;
