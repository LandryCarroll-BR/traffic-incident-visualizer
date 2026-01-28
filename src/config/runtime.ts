import { InstrumentationService } from "@/services/instrumentation-service";
import { FetchHttpClient } from "@effect/platform";
import { Layer, ManagedRuntime } from "effect";

export const AppRuntime = ManagedRuntime.make(
  Layer.merge(FetchHttpClient.layer, InstrumentationService),
);
