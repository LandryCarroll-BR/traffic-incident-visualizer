import { FetchHttpClient } from "@effect/platform";
import { ManagedRuntime } from "effect";

export const ApiRuntime = ManagedRuntime.make(FetchHttpClient.layer);
