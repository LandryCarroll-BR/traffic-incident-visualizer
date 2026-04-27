import { Data, Effect } from "effect";
import {
  buildRiskIntelligence,
  RISK_METHOD_VERSION,
} from "@/api/risk-intelligence";
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
import {
  RISK_HISTORY_DAYS,
  type SnapshotAnalyticsResponse,
} from "@/models/snapshot-analytics";
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
      riskMethodVersion: RISK_METHOD_VERSION,
      riskSurface: [],
      topRiskAreas: [],
      emergingHotspots: [],
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
  const riskWindowStart = addUtcDays(selectedDate, -(RISK_HISTORY_DAYS - 1));
  const riskHistoryQueryTake = Math.max(RISK_HISTORY_DAYS * 8, 240);

  const candidateRiskSnapshots = yield* Effect.tryPromise({
    try: () =>
      db.snapshot.findMany({
        where: {
          createdAt: {
            gte: riskWindowStart,
            lt: nextDay,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: riskHistoryQueryTake,
        include: {
          snapshotTrafficAlerts: true,
        },
      }),
    catch: (cause) => new SnapshotAnalyticsError({ cause }),
  });

  const riskByDay = new Map<
    string,
    {
      alerts: Alert[];
    }
  >();

  for (const snapshot of candidateRiskSnapshots) {
    const dayKey = toUtcDayKey(snapshot.createdAt);
    if (riskByDay.has(dayKey)) {
      continue;
    }

    const alerts = snapshot.snapshotTrafficAlerts
      .map(mapTrafficAlertToAlert)
      .filter((alert): alert is Alert => alert !== null);

    riskByDay.set(dayKey, { alerts });

    if (riskByDay.size >= RISK_HISTORY_DAYS) {
      break;
    }
  }

  const riskIntelligence = buildRiskIntelligence({
    selectedDate: date,
    history: Array.from(riskByDay.entries()).map(([day, value]) => ({
      date: day,
      alerts: value.alerts,
    })),
  });

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
    riskMethodVersion: RISK_METHOD_VERSION,
    riskSurface: riskIntelligence.riskSurface,
    topRiskAreas: riskIntelligence.topRiskAreas,
    emergingHotspots: riskIntelligence.emergingHotspots,
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
