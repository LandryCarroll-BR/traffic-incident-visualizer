import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect } from "effect";

type Alert = Record<string, unknown>;

const parseAlerts = (raw: string) =>
  Effect.try({
    try: () => {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error("alerts.json must be a JSON array");
      }
      return parsed as Alert[];
    },
    catch: (cause) =>
      new Error(`Failed to parse alerts.json: ${String(cause)}`),
  });

const readAlertsFromFs = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const raw = yield* fs.readFileString(process.cwd() + "/public/alerts.json");
  return yield* parseAlerts(raw);
}).pipe(Effect.provide(NodeFileSystem.layer));

const readAlertsFromPublicUrl = (origin: string) =>
  Effect.tryPromise({
    try: async () => {
      const url = new URL("/alerts.json", origin);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching ${url.toString()}`);
      }
      return await res.text();
    },
    catch: (cause) =>
      new Error(`Failed to fetch /alerts.json from public: ${String(cause)}`),
  }).pipe(Effect.flatMap(parseAlerts));

export const GET = async (request: Request) => {
  const origin = new URL(request.url).origin;

  const alerts = await Effect.runPromise(
    readAlertsFromPublicUrl(origin).pipe(
      // Local/dev fallback (or if fetch is blocked in some environment)
      Effect.catchAll(() => readAlertsFromFs),
    ),
  );

  return new Response(JSON.stringify(alerts), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
