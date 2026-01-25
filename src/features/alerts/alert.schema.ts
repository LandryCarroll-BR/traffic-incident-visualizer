import { Schema } from "effect";

export class Alert extends Schema.Class<Alert>("Alert")({
  id: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
}) {}
