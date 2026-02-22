import { Data, Effect } from "effect";
import {
  buildAggregatedMetricsFromCounts,
  createEmptyDailyCounts,
  isKnownAlertType,
} from "@/api/snapshot-metrics";
import { toUtcDayKey } from "@/lib/date";
import type { TimelineResponse } from "@/models/snapshot-analytics";
import { DatabaseService } from "@/services/database-service";

class SnapshotTimelineError extends Data.TaggedError("SnapshotTimelineError")<{
  cause?: unknown;
}> {}

export const getSnapshotTimeline = Effect.fn("api/getSnapshotTimeline")(
  function* ({ days }: { days: number }) {
    const db = yield* DatabaseService;
    const take = Math.max(days * 4, 120);

    const snapshots = yield* Effect.tryPromise({
      try: () =>
        db.snapshot.findMany({
          take,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            createdAt: true,
          },
        }),
      catch: (cause) => new SnapshotTimelineError({ cause }),
    });

    if (snapshots.length === 0) {
      return { dates: [], points: [] };
    }

    const snapshotByDay = new Map<string, { id: string; createdAt: Date }>();

    for (const snapshot of snapshots) {
      const dayKey = toUtcDayKey(snapshot.createdAt);
      if (!snapshotByDay.has(dayKey)) {
        snapshotByDay.set(dayKey, snapshot);
      }
    }

    const selectedSnapshots = Array.from(snapshotByDay.values()).slice(0, days);
    const selectedSnapshotIds = selectedSnapshots.map(
      (snapshot) => snapshot.id,
    );

    if (selectedSnapshotIds.length === 0) {
      return { dates: [], points: [] };
    }

    const alerts = yield* Effect.tryPromise({
      try: () =>
        db.trafficAlert.findMany({
          where: {
            snapshotsid: { in: selectedSnapshotIds },
          },
          select: {
            snapshotsid: true,
            type: true,
          },
        }),
      catch: (cause) => new SnapshotTimelineError({ cause }),
    });

    const countsBySnapshotId = new Map(
      selectedSnapshotIds.map((id) => [id, createEmptyDailyCounts()]),
    );

    for (const snapshotAlert of alerts) {
      const existingCounts =
        countsBySnapshotId.get(snapshotAlert.snapshotsid) ??
        createEmptyDailyCounts();

      if (isKnownAlertType(snapshotAlert.type)) {
        existingCounts[snapshotAlert.type] += 1;
      }

      countsBySnapshotId.set(snapshotAlert.snapshotsid, existingCounts);
    }

    const points = selectedSnapshots
      .map((snapshot) => {
        const byType =
          countsBySnapshotId.get(snapshot.id) ?? createEmptyDailyCounts();
        const totals = buildAggregatedMetricsFromCounts(byType);

        return {
          date: toUtcDayKey(snapshot.createdAt),
          totalAlerts: totals.totalAlerts,
          severeAlerts: totals.severeAlerts,
          byType,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      dates: points.map((point) => point.date),
      points,
    } satisfies TimelineResponse;
  },
);
