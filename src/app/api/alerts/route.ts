import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect } from "effect";

const getTestAlerts = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;

  const raw = yield* fs.readFileString(process.cwd() + "/public/alerts.json");

  const alerts = yield* Effect.try({
    try: () => {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error("alerts.json must be a JSON array");
      }
      return parsed as Array<Record<string, unknown>>;
    },
    catch: (cause) =>
      new Error(`Failed to read/parse ./public/alerts.json: ${String(cause)}`),
  });

  return alerts;
}).pipe(Effect.provide(NodeFileSystem.layer));

export const GET = async (_: Request) => {
  const alerts = await Effect.runPromise(getTestAlerts);

  return new Response(JSON.stringify(alerts), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
