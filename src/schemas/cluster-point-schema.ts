import { AlertType } from "@/schemas/alert-type-schema";
import { Schema as S } from "effect";

export class ClusterPoint extends S.Class<ClusterPoint>("ClusterPoint")({
  name: S.String,
  position: S.mutable(S.Tuple(S.Number, S.Number)),
  type: AlertType,
}) {}
