import { Effect } from "effect";
import Alerts from "./alerts.json";

const getTestAlerts = Effect.succeed(Alerts);

export const GET = async () =>
  Effect.runPromise(
    getTestAlerts.pipe(
      Effect.map(
        (res) =>
          new Response(JSON.stringify(res), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
      Effect.catchAll((err) =>
        Effect.succeed(
          new Response(`Server error: ${String(err)}`, { status: 500 }),
        ),
      ),
    ),
  );
