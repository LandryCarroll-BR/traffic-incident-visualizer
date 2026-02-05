import { Effect } from "effect";
import Alerts from "./alerts.json";
import { injectInboundContext } from "@/lib/inject-inbound-context";
import { InstrumentationService } from "@/services/instrumentation-service";
import { AppRuntime } from "@/config/runtime";
import { saveSnapshot } from "@/api/save-snapshot";

const getTestAlerts = Effect.succeed(Alerts).pipe(
  Effect.tap(() => Effect.annotateCurrentSpan("data-set", "test alerts")),
  Effect.tap(() => Effect.annotateCurrentSpan("route", "GET /api/alerts")),
  Effect.withSpan("getTestAlerts"),
);

export const GET = injectInboundContext(() =>
  AppRuntime.runPromise(
    getTestAlerts.pipe(
      Effect.provide(InstrumentationService),
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
  ),
);
