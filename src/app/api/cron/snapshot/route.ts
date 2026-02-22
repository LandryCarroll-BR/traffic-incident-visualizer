import { Effect, Layer } from "effect";
import { injectInboundContext } from "@/lib/inject-inbound-context";
import { withAuth } from "@/lib/with-auth";
import { AppRuntime } from "@/config/runtime";
import { saveSnapshot } from "@/api/save-snapshot";
import { WazeClient } from "@/lib/waze";
import { DatabaseService } from "@/services/database-service";

const layers = Layer.mergeAll(WazeClient.Default, DatabaseService.Default);

export const GET = withAuth(
  injectInboundContext(() =>
    AppRuntime.runPromise(
      saveSnapshot().pipe(
        Effect.provide(layers),
        Effect.map(
          (res) =>
            new Response(JSON.stringify(res), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
        ),
        Effect.catchTags({
          SnapshotSaveError: (error) =>
            Effect.succeed(
              new Response(`Error saving snapshot: ${String(error)}`, {
                status: 500,
              }),
            ),
          HttpApiDecodeError: (error) =>
            Effect.succeed(
              new Response(`Error decoding API response: ${String(error)}`, {
                status: 500,
              }),
            ),
          ParseError: (error) =>
            Effect.succeed(
              new Response(`Error parsing data: ${String(error)}`, {
                status: 500,
              }),
            ),
          RequestError: (error) =>
            Effect.succeed(
              new Response(`Error making API request: ${String(error)}`, {
                status: 500,
              }),
            ),
          ResponseError: (error) =>
            Effect.succeed(
              new Response(`Error in API response: ${String(error)}`, {
                status: 500,
              }),
            ),
        }),
      ),
    ),
  ),
);
