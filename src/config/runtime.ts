import { InstrumentationService } from "@/services/instrumentation-service";
import { Layer, ManagedRuntime } from "effect";

export const AppRuntime = ManagedRuntime.make(
  Layer.mergeAll(InstrumentationService),
);
