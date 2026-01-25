import { FetchHttpClient } from "@effect/platform";
import { ManagedRuntime } from "effect";

export const ApiRuntime = ManagedRuntime.make(FetchHttpClient.layer);
export const ApiTestRuntime = ManagedRuntime.make(FetchHttpClient.layer);
