import { Data, Effect } from "effect";
import {
  aggregateMetricsFromAlerts,
  averageMetrics,
  calculateByTypeDeltaPct,
  calculateDeltaPct,
  calculateHotspots,
  createEmptyMetrics,
  isKnownAlertType,
} from "@/api/snapshot-metrics";
import { addUtcDays, parseUtcDayKey, toUtcDayKey } from "@/lib/date";
import { Alert, AlertId } from "@/models/alert";
import type { SnapshotAnalyticsResponse } from "@/models/snapshot-analytics";
import { DatabaseService } from "@/services/database-service";

class SnapshotAnalyticsError extends Data.TaggedError(
  "SnapshotAnalyticsError",
)<{
  cause?: unknown;
}> {}

export const getSnapshotAnalyticsByDate = Effect.fn(
  "api/getSnapshotAnalyticsByDate",
)(function* ({ date }: { date: string }) {
  const db = yield* DatabaseService;
  const selectedDate = parseUtcDayKey(date);
  const nextDay = addUtcDays(selectedDate, 1);

  const selectedSnapshot = yield* Effect.tryPromise({
    try: () =>
      db.snapshot.findFirst({
        where: {
          createdAt: {
            gte: selectedDate,
            lt: nextDay,
          },
        },
        include: {
          snapshotTrafficAlerts: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    catch: (cause) => new SnapshotAnalyticsError({ cause }),
  });

  if (!selectedSnapshot) {
    const emptyMetrics = createEmptyMetrics();
    return {
      date,
      alerts: [],
      metrics: {
        totalAlerts: 0,
        severeAlerts: 0,
        byType: emptyMetrics.byType,
        baseline7d: emptyMetrics,
        deltas: {
          totalAlertsPct: null,
          severeAlertsPct: null,
          byTypePct: calculateByTypeDeltaPct(
            emptyMetrics.byType,
            emptyMetrics.byType,
          ),
        },
      },
      hotspots: [],
    };
  }

  const selectedAlerts = selectedSnapshot.snapshotTrafficAlerts
    .map(mapTrafficAlertToAlert)
    .filter((alert): alert is Alert => alert !== null);

  const selectedMetrics = aggregateMetricsFromAlerts(selectedAlerts);

  const candidateBaselineSnapshots = yield* Effect.tryPromise({
    try: () =>
      db.snapshot.findMany({
        where: {
          createdAt: {
            lt: selectedDate,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 120,
        include: {
          snapshotTrafficAlerts: true,
        },
      }),
    catch: (cause) => new SnapshotAnalyticsError({ cause }),
  });

  const baselineByDay = new Map<
    string,
    {
      createdAt: Date;
      alerts: Alert[];
    }
  >();

  for (const snapshot of candidateBaselineSnapshots) {
    const dayKey = toUtcDayKey(snapshot.createdAt);
    if (baselineByDay.has(dayKey)) {
      continue;
    }

    const alerts = snapshot.snapshotTrafficAlerts
      .map(mapTrafficAlertToAlert)
      .filter((alert): alert is Alert => alert !== null);

    baselineByDay.set(dayKey, {
      createdAt: snapshot.createdAt,
      alerts,
    });

    if (baselineByDay.size >= 7) {
      break;
    }
  }

  const baselineMetrics = averageMetrics(
    Array.from(baselineByDay.values()).map(({ alerts }) =>
      aggregateMetricsFromAlerts(alerts),
    ),
  );

  return {
    date,
    alerts: selectedAlerts,
    metrics: {
      totalAlerts: selectedMetrics.totalAlerts,
      severeAlerts: selectedMetrics.severeAlerts,
      byType: selectedMetrics.byType,
      baseline7d: baselineMetrics,
      deltas: {
        totalAlertsPct: calculateDeltaPct(
          selectedMetrics.totalAlerts,
          baselineMetrics.totalAlerts,
        ),
        severeAlertsPct: calculateDeltaPct(
          selectedMetrics.severeAlerts,
          baselineMetrics.severeAlerts,
        ),
        byTypePct: calculateByTypeDeltaPct(
          selectedMetrics.byType,
          baselineMetrics.byType,
        ),
      },
    },
    hotspots: calculateHotspots(selectedAlerts),
  } satisfies SnapshotAnalyticsResponse;
});

function mapTrafficAlertToAlert(
  alert: {
    id: string;
    type: string;
    locationX: number;
    locationY: number;
    timestamp: Date;
    reliability: number;
  } | null,
): Alert | null {
  if (!alert) {
    return null;
  }

  const normalizedType = alert.type.toUpperCase();
  if (!isKnownAlertType(normalizedType)) {
    return null;
  }

  return Alert.make({
    id: AlertId.make(alert.id),
    type: normalizedType,
    position: [alert.locationY, alert.locationX],
    time: new Date(alert.timestamp).getTime(),
    reliability: alert.reliability,
  });
}
