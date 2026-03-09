import { addUtcDays, parseUtcDayKey, toUtcDayKey } from "@/lib/date";
import type { Alert } from "@/models/alert";
import {
  ALERT_TYPE_KEYS,
  type DailyCounts,
  type EmergingHotspot,
  type RiskDailyPoint,
  type RiskSurfaceCell,
  type TopRiskArea,
} from "@/models/snapshot-analytics";
import {
  calculateDeltaPct,
  createEmptyDailyCounts,
  isKnownAlertType,
} from "./snapshot-metrics";

export const RISK_METHOD_VERSION = "risk-v1";
export const RISK_GRID_SIZE = 0.01;

const TYPE_WEIGHTS: Record<keyof DailyCounts, number> = {
  ACCIDENT: 5,
  ROAD_CLOSED: 4,
  HAZARD: 2,
  JAM: 1,
  POLICE: 0.5,
};

type SnapshotHistoryDay = {
  date: string;
  alerts: Alert[];
};

type GridCellAccumulator = {
  cellId: string;
  row: number;
  col: number;
  cellLat: number;
  cellLng: number;
  bounds: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  byType30d: DailyCounts;
  totalIncidents30d: number;
  accidentCount30d: number;
  severeCount30d: number;
  weightedScore: number;
  dailyByDate: Map<string, DailyCounts>;
};

type RiskSurfaceCellInternal = RiskSurfaceCell & {
  row: number;
  col: number;
  _emergingScore: number;
};

export const buildRiskIntelligence = ({
  selectedDate,
  history,
}: {
  selectedDate: string;
  history: SnapshotHistoryDay[];
}): {
  riskSurface: RiskSurfaceCell[];
  topRiskAreas: TopRiskArea[];
  emergingHotspots: EmergingHotspot[];
} => {
  const windowDates = buildWindowDates(selectedDate, 30);
  const alertsByDate = new Map(history.map((entry) => [entry.date, entry]));
  const cellAccumulators = new Map<string, GridCellAccumulator>();

  for (const dayKey of windowDates) {
    const alerts = alertsByDate.get(dayKey)?.alerts ?? [];

    for (const alert of alerts) {
      if (!isKnownAlertType(alert.type)) {
        continue;
      }

      const row = Math.floor(alert.position[0] / RISK_GRID_SIZE);
      const col = Math.floor(alert.position[1] / RISK_GRID_SIZE);
      const south = roundToFour(row * RISK_GRID_SIZE);
      const west = roundToFour(col * RISK_GRID_SIZE);
      const north = roundToFour(south + RISK_GRID_SIZE);
      const east = roundToFour(west + RISK_GRID_SIZE);
      const cellLat = roundToFour(south + RISK_GRID_SIZE / 2);
      const cellLng = roundToFour(west + RISK_GRID_SIZE / 2);
      const cellId = `${row}:${col}`;

      const existing = cellAccumulators.get(cellId);
      const accumulator =
        existing ??
        ({
          cellId,
          row,
          col,
          cellLat,
          cellLng,
          bounds: { south, west, north, east },
          byType30d: createEmptyDailyCounts(),
          totalIncidents30d: 0,
          accidentCount30d: 0,
          severeCount30d: 0,
          weightedScore: 0,
          dailyByDate: new Map<string, DailyCounts>(),
        } satisfies GridCellAccumulator);

      accumulator.totalIncidents30d += 1;
      accumulator.byType30d[alert.type] += 1;

      if (alert.type === "ACCIDENT") {
        accumulator.accidentCount30d += 1;
      }

      if (alert.type === "ACCIDENT" || alert.type === "ROAD_CLOSED") {
        accumulator.severeCount30d += 1;
      }

      accumulator.weightedScore +=
        TYPE_WEIGHTS[alert.type] * reliabilityFactor(alert.reliability);

      const dailyCounts =
        accumulator.dailyByDate.get(dayKey) ?? createEmptyDailyCounts();
      dailyCounts[alert.type] += 1;
      accumulator.dailyByDate.set(dayKey, dailyCounts);

      if (!existing) {
        cellAccumulators.set(cellId, accumulator);
      }
    }
  }

  const riskSurfaceInternal = Array.from(cellAccumulators.values())
    .map((cell) => toRiskSurfaceCell(cell, windowDates))
    .sort((a, b) => b.riskScore - a.riskScore);

  const topRiskAreas = calculateTopRiskAreas(riskSurfaceInternal, windowDates);
  const emergingHotspots = calculateEmergingHotspots(riskSurfaceInternal);

  return {
    riskSurface: riskSurfaceInternal.map(stripInternalFields),
    topRiskAreas,
    emergingHotspots,
  };
};

function toRiskSurfaceCell(
  cell: GridCellAccumulator,
  windowDates: string[],
): RiskSurfaceCellInternal {
  let recurrenceDays30d = 0;
  let incidents7d = 0;
  let incidentsPrev7d = 0;
  const daily: RiskDailyPoint[] = [];

  for (let index = 0; index < windowDates.length; index += 1) {
    const dayKey = windowDates[index];
    const dayCounts = cell.dailyByDate.get(dayKey) ?? createEmptyDailyCounts();
    const dayTotal = sumCounts(dayCounts);
    const daySevere = dayCounts.ACCIDENT + dayCounts.ROAD_CLOSED;

    if (dayTotal > 0) {
      recurrenceDays30d += 1;
    }

    if (index >= windowDates.length - 7) {
      incidents7d += dayTotal;
    } else if (index >= windowDates.length - 14) {
      incidentsPrev7d += dayTotal;
    }

    daily.push({
      date: dayKey,
      totalIncidents: dayTotal,
      severeIncidents: daySevere,
      accidentIncidents: dayCounts.ACCIDENT,
    });
  }

  const trend7dPct = calculateDeltaPct(incidents7d, incidentsPrev7d);
  const volumeConfidence = 1 - Math.exp(-cell.totalIncidents30d / 8);
  const recurrenceConfidence = Math.min(1, recurrenceDays30d / 8);
  const confidence = roundToTwo(
    clamp(volumeConfidence * 0.7 + recurrenceConfidence * 0.3, 0, 1),
  );
  const weightedScore = roundToTwo(cell.weightedScore);
  const riskScore = roundToTwo(weightedScore * confidence);
  const emergingScore = calculateEmergingScore(
    incidents7d,
    incidentsPrev7d,
    confidence,
  );

  return {
    cellId: cell.cellId,
    cellLat: cell.cellLat,
    cellLng: cell.cellLng,
    bounds: cell.bounds,
    grid: {
      row: cell.row,
      col: cell.col,
      size: RISK_GRID_SIZE,
    },
    totalIncidents30d: cell.totalIncidents30d,
    accidentCount30d: cell.accidentCount30d,
    severeCount30d: cell.severeCount30d,
    recurrenceDays30d,
    incidents7d,
    incidentsPrev7d,
    trend7dPct,
    weightedScore,
    confidence,
    riskScore,
    byType30d: cell.byType30d,
    daily,
    row: cell.row,
    col: cell.col,
    _emergingScore: emergingScore,
  };
}

function calculateTopRiskAreas(
  riskSurface: RiskSurfaceCellInternal[],
  windowDates: string[],
): TopRiskArea[] {
  if (riskSurface.length === 0) {
    return [];
  }

  const positiveScores = riskSurface
    .map((cell) => cell.riskScore)
    .filter((score) => score > 0)
    .sort((a, b) => a - b);

  if (positiveScores.length === 0) {
    return [];
  }

  const threshold = percentile(positiveScores, 0.7);
  const candidateCells = riskSurface.filter(
    (cell) => cell.riskScore >= threshold || cell.accidentCount30d >= 2,
  );

  if (candidateCells.length === 0) {
    return [];
  }

  const candidateById = new Map(
    candidateCells.map((cell) => [cell.cellId, cell]),
  );
  const visited = new Set<string>();
  const clusters: RiskSurfaceCellInternal[][] = [];

  for (const cell of candidateCells) {
    if (visited.has(cell.cellId)) {
      continue;
    }

    const stack = [cell];
    const cluster: RiskSurfaceCellInternal[] = [];
    visited.add(cell.cellId);

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) {
        continue;
      }

      cluster.push(current);

      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
          if (rowOffset === 0 && colOffset === 0) {
            continue;
          }

          const neighborId = `${current.row + rowOffset}:${current.col + colOffset}`;
          if (visited.has(neighborId)) {
            continue;
          }

          const neighbor = candidateById.get(neighborId);
          if (!neighbor) {
            continue;
          }

          visited.add(neighborId);
          stack.push(neighbor);
        }
      }
    }

    clusters.push(cluster);
  }

  return clusters
    .map((cluster) => aggregateCluster(cluster, windowDates))
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10)
    .map((area, index) => ({
      ...area,
      areaId: `area-${index + 1}`,
      label: `Corridor ${index + 1}`,
    }));
}

function aggregateCluster(
  cells: RiskSurfaceCellInternal[],
  windowDates: string[],
): Omit<TopRiskArea, "areaId" | "label"> {
  const byType30d = createEmptyDailyCounts();
  let totalIncidents30d = 0;
  let accidentCount30d = 0;
  let severeCount30d = 0;
  let incidents7d = 0;
  let incidentsPrev7d = 0;
  let totalConfidence = 0;
  let totalRiskScore = 0;
  let totalWeight = 0;
  let centroidLat = 0;
  let centroidLng = 0;

  let south = Number.POSITIVE_INFINITY;
  let west = Number.POSITIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;

  const daily = windowDates.map((date) => ({
    date,
    totalIncidents: 0,
    severeIncidents: 0,
    accidentIncidents: 0,
  }));

  const primaryCell = cells.reduce((best, current) =>
    current.riskScore > best.riskScore ? current : best,
  );

  for (const cell of cells) {
    totalIncidents30d += cell.totalIncidents30d;
    accidentCount30d += cell.accidentCount30d;
    severeCount30d += cell.severeCount30d;
    incidents7d += cell.incidents7d;
    incidentsPrev7d += cell.incidentsPrev7d;
    totalConfidence += cell.confidence;
    totalRiskScore += cell.riskScore;

    const weight = Math.max(cell.riskScore, 0.1);
    totalWeight += weight;
    centroidLat += cell.cellLat * weight;
    centroidLng += cell.cellLng * weight;

    south = Math.min(south, cell.bounds.south);
    west = Math.min(west, cell.bounds.west);
    north = Math.max(north, cell.bounds.north);
    east = Math.max(east, cell.bounds.east);

    for (const key of ALERT_TYPE_KEYS) {
      byType30d[key] += cell.byType30d[key];
    }

    for (let index = 0; index < windowDates.length; index += 1) {
      const point = cell.daily[index];
      if (!point) {
        continue;
      }

      daily[index].totalIncidents += point.totalIncidents;
      daily[index].severeIncidents += point.severeIncidents;
      daily[index].accidentIncidents += point.accidentIncidents;
    }
  }

  const recurrenceDays30d = daily.filter(
    (point) => point.totalIncidents > 0,
  ).length;

  const severeMixPct =
    totalIncidents30d > 0
      ? roundToTwo((severeCount30d / totalIncidents30d) * 100)
      : 0;

  return {
    primaryCellId: primaryCell.cellId,
    centroidLat: roundToFour(centroidLat / totalWeight),
    centroidLng: roundToFour(centroidLng / totalWeight),
    bounds: {
      south: roundToFour(south),
      west: roundToFour(west),
      north: roundToFour(north),
      east: roundToFour(east),
    },
    cellIds: cells.map((cell) => cell.cellId),
    cellCount: cells.length,
    totalIncidents30d,
    accidentCount30d,
    severeCount30d,
    severeMixPct,
    recurrenceDays30d,
    incidents7d,
    incidentsPrev7d,
    trend7dPct: calculateDeltaPct(incidents7d, incidentsPrev7d),
    confidence: roundToTwo(totalConfidence / cells.length),
    riskScore: roundToTwo(totalRiskScore),
    byType30d,
    daily,
  };
}

function calculateEmergingHotspots(
  riskSurface: RiskSurfaceCellInternal[],
): EmergingHotspot[] {
  return riskSurface
    .filter(
      (cell) =>
        cell.incidents7d >= 3 &&
        cell.trend7dPct !== null &&
        cell.trend7dPct >= 35 &&
        cell._emergingScore >= 1.5,
    )
    .sort((a, b) => b._emergingScore - a._emergingScore)
    .slice(0, 10)
    .map((cell) => ({
      cellId: cell.cellId,
      cellLat: cell.cellLat,
      cellLng: cell.cellLng,
      incidents7d: cell.incidents7d,
      incidentsPrev7d: cell.incidentsPrev7d,
      trend7dPct: cell.trend7dPct,
      confidence: cell.confidence,
      significance: cell._emergingScore >= 2.5 ? "HIGH" : "MEDIUM",
      significanceScore: roundToTwo(cell._emergingScore),
    }));
}

function calculateEmergingScore(
  incidents7d: number,
  incidentsPrev7d: number,
  confidence: number,
): number {
  const baseline = Math.max(incidentsPrev7d, 1);
  const jump = incidents7d - incidentsPrev7d;
  if (jump <= 0) {
    return 0;
  }

  const standardizedJump = jump / Math.sqrt(baseline);
  return standardizedJump * confidence;
}

function stripInternalFields(cell: RiskSurfaceCellInternal): RiskSurfaceCell {
  const { row: _row, col: _col, _emergingScore, ...rest } = cell;
  void _row;
  void _col;
  void _emergingScore;
  return rest;
}

function buildWindowDates(selectedDate: string, days: number): string[] {
  const end = parseUtcDayKey(selectedDate);
  const dates: string[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    dates.push(toUtcDayKey(addUtcDays(end, -offset)));
  }

  return dates;
}

function sumCounts(counts: DailyCounts): number {
  let sum = 0;
  for (const key of ALERT_TYPE_KEYS) {
    sum += counts[key];
  }
  return sum;
}

function reliabilityFactor(reliability: number | undefined): number {
  if (typeof reliability !== "number" || Number.isNaN(reliability)) {
    return 0.6;
  }

  return clamp(reliability / 10, 0.2, 1);
}

function percentile(valuesAsc: number[], p: number): number {
  if (valuesAsc.length === 0) {
    return 0;
  }

  const clamped = clamp(p, 0, 1);
  const index = Math.floor((valuesAsc.length - 1) * clamped);
  return valuesAsc[index] ?? valuesAsc[valuesAsc.length - 1];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundToFour(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
