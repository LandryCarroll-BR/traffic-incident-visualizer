import { Effect } from "effect";
import { getSnapshotTimeline } from "@/api/get-snapshot-timeline";
import { AppRuntime } from "@/config/runtime";
import { injectInboundContext } from "@/lib/inject-inbound-context";
import { DatabaseService } from "@/services/database-service";

const MIN_DAYS = 7;
const MAX_DAYS = 90;
const DEFAULT_DAYS = 30;

export const GET = injectInboundContext((request) => {
  const url = new URL(request.url);
  const daysParam = url.searchParams.get("days");
  const parsedDays = parseDays(daysParam);

  if (parsedDays === null) {
    return Promise.resolve(
      jsonResponse(
        { error: "Invalid 'days' query param. Expected an integer." },
        400,
      ),
    );
  }

  const days = clamp(parsedDays, MIN_DAYS, MAX_DAYS);

  return AppRuntime.runPromise(
    getSnapshotTimeline({ days }).pipe(
      Effect.provide(DatabaseService.Default),
      Effect.map((timeline) => jsonResponse(timeline, 200)),
      Effect.catchAll((error) =>
        Effect.succeed(
          jsonResponse(
            {
              error: "Failed to load snapshot timeline.",
              details: String(error),
            },
            500,
          ),
        ),
      ),
    ),
  );
});

function parseDays(days: string | null): number | null {
  if (days === null) {
    return DEFAULT_DAYS;
  }

  const parsed = Number(days);
  if (!Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
