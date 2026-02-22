import { Effect } from "effect";
import { getSnapshotAnalyticsByDate } from "@/api/get-snapshot-analytics-by-date";
import { AppRuntime } from "@/config/runtime";
import { parseUtcDayKey } from "@/lib/date";
import { injectInboundContext } from "@/lib/inject-inbound-context";
import { DatabaseService } from "@/services/database-service";

const UTC_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const GET = injectInboundContext((request) => {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");

  if (!date || !UTC_DATE_REGEX.test(date)) {
    return Promise.resolve(
      jsonResponse(
        { error: "Invalid 'date' query param. Expected format YYYY-MM-DD." },
        400,
      ),
    );
  }

  try {
    parseUtcDayKey(date);
  } catch {
    return Promise.resolve(
      jsonResponse(
        { error: "Invalid 'date' query param. Expected a valid UTC date." },
        400,
      ),
    );
  }

  return AppRuntime.runPromise(
    getSnapshotAnalyticsByDate({ date }).pipe(
      Effect.provide(DatabaseService.Default),
      Effect.map((snapshot) => jsonResponse(snapshot, 200)),
      Effect.catchAll((error) =>
        Effect.succeed(
          jsonResponse(
            {
              error: "Failed to load snapshot alerts.",
              details: String(error),
            },
            500,
          ),
        ),
      ),
    ),
  );
});

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
