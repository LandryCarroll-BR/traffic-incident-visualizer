import type { Alert } from "@/models/alert";
import {
  ALERT_TYPE_KEYS,
  type AlertTypeKey,
  type DailyCounts,
  type NullableCounts,
} from "@/models/snapshot-analytics";

export type AggregatedMetrics = {
  totalAlerts: number;
  severeAlerts: number;
  byType: DailyCounts;
};

export function createEmptyDailyCounts(): DailyCounts {
  return {
    ACCIDENT: 0,
    HAZARD: 0,
    JAM: 0,
    POLICE: 0,
    ROAD_CLOSED: 0,
  };
}

export function createEmptyMetrics(): AggregatedMetrics {
  return {
    totalAlerts: 0,
    severeAlerts: 0,
    byType: createEmptyDailyCounts(),
  };
}

export function isKnownAlertType(value: string): value is AlertTypeKey {
  return ALERT_TYPE_KEYS.includes(value as AlertTypeKey);
}

export function aggregateMetricsFromAlerts(alerts: ReadonlyArray<Alert>) {
  const byType = createEmptyDailyCounts();

  for (const alert of alerts) {
    byType[alert.type] += 1;
  }

  return {
    totalAlerts: alerts.length,
    severeAlerts: byType.ACCIDENT + byType.ROAD_CLOSED,
    byType,
  } satisfies AggregatedMetrics;
}

export function averageMetrics(
  metricsList: ReadonlyArray<AggregatedMetrics>,
): AggregatedMetrics {
  if (metricsList.length === 0) {
    return createEmptyMetrics();
  }

  const totals = createEmptyMetrics();

  for (const metrics of metricsList) {
    totals.totalAlerts += metrics.totalAlerts;
    totals.severeAlerts += metrics.severeAlerts;

    for (const key of ALERT_TYPE_KEYS) {
      totals.byType[key] += metrics.byType[key];
    }
  }

  const divisor = metricsList.length;
  const averagedByType = createEmptyDailyCounts();

  for (const key of ALERT_TYPE_KEYS) {
    averagedByType[key] = roundToTwo(totals.byType[key] / divisor);
  }

  return {
    totalAlerts: roundToTwo(totals.totalAlerts / divisor),
    severeAlerts: roundToTwo(totals.severeAlerts / divisor),
    byType: averagedByType,
  };
}

export function calculateDeltaPct(
  current: number,
  baseline: number,
): number | null {
  if (baseline === 0) {
    return null;
  }

  return roundToTwo(((current - baseline) / baseline) * 100);
}

export function calculateByTypeDeltaPct(
  current: DailyCounts,
  baseline: DailyCounts,
): NullableCounts {
  return {
    ACCIDENT: calculateDeltaPct(current.ACCIDENT, baseline.ACCIDENT),
    HAZARD: calculateDeltaPct(current.HAZARD, baseline.HAZARD),
    JAM: calculateDeltaPct(current.JAM, baseline.JAM),
    POLICE: calculateDeltaPct(current.POLICE, baseline.POLICE),
    ROAD_CLOSED: calculateDeltaPct(current.ROAD_CLOSED, baseline.ROAD_CLOSED),
  };
}

export function calculateHotspots(alerts: ReadonlyArray<Alert>) {
  const cells = new Map<
    string,
    { cellLat: number; cellLng: number; count: number }
  >();

  for (const alert of alerts) {
    const cellLat = roundToTwo(alert.position[0]);
    const cellLng = roundToTwo(alert.position[1]);
    const key = `${cellLat},${cellLng}`;

    const existing = cells.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    cells.set(key, { cellLat, cellLng, count: 1 });
  }

  return Array.from(cells.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export function buildAggregatedMetricsFromCounts(byType: DailyCounts) {
  return {
    totalAlerts:
      byType.ACCIDENT +
      byType.HAZARD +
      byType.JAM +
      byType.POLICE +
      byType.ROAD_CLOSED,
    severeAlerts: byType.ACCIDENT + byType.ROAD_CLOSED,
    byType,
  } satisfies AggregatedMetrics;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
