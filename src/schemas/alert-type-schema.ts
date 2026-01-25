import { Schema } from "effect";

export const AlertType = Schema.Union(
  Schema.Literal("ACCIDENT"),
  Schema.Literal("HAZARD"),
  Schema.Literal("JAM"),
  Schema.Literal("POLICE"),
  Schema.Literal("ROAD_CLOSED"),
);
