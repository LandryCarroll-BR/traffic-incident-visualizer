import { FetchHttpClient } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Layer, ManagedRuntime } from "effect";

export const ApiRuntime = ManagedRuntime.make(FetchHttpClient.layer);
export const ApiTestRuntime = ManagedRuntime.make(
  Layer.merge(FetchHttpClient.layer, NodeFileSystem.layer),
);
