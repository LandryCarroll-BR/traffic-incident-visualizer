import type { Alert } from "@/models/alert";

export const ALERT_TYPE_KEYS = [
  "ACCIDENT",
  "HAZARD",
  "JAM",
  "POLICE",
  "ROAD_CLOSED",
] as const;

export type AlertTypeKey = (typeof ALERT_TYPE_KEYS)[number];

export type DailyCounts = Record<AlertTypeKey, number>;

export type NullableCounts = Record<AlertTypeKey, number | null>;

export type TimelinePoint = {
  date: string;
  totalAlerts: number;
  severeAlerts: number;
  byType: DailyCounts;
};

export type TimelineResponse = {
  dates: string[];
  points: TimelinePoint[];
};

export type RiskDailyPoint = {
  date: string;
  totalIncidents: number;
  severeIncidents: number;
  accidentIncidents: number;
};

export type RiskBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type RiskSurfaceCell = {
  cellId: string;
  cellLat: number;
  cellLng: number;
  bounds: RiskBounds;
  grid: {
    row: number;
    col: number;
    size: number;
  };
  totalIncidents30d: number;
  accidentCount30d: number;
  severeCount30d: number;
  recurrenceDays30d: number;
  incidents7d: number;
  incidentsPrev7d: number;
  trend7dPct: number | null;
  weightedScore: number;
  confidence: number;
  riskScore: number;
  byType30d: DailyCounts;
  daily: RiskDailyPoint[];
};

export type TopRiskArea = {
  areaId: string;
  label: string;
  primaryCellId: string;
  centroidLat: number;
  centroidLng: number;
  bounds: RiskBounds;
  cellIds: string[];
  cellCount: number;
  totalIncidents30d: number;
  accidentCount30d: number;
  severeCount30d: number;
  severeMixPct: number;
  recurrenceDays30d: number;
  incidents7d: number;
  incidentsPrev7d: number;
  trend7dPct: number | null;
  confidence: number;
  riskScore: number;
  byType30d: DailyCounts;
  daily: RiskDailyPoint[];
};

export type EmergingHotspot = {
  cellId: string;
  cellLat: number;
  cellLng: number;
  incidents7d: number;
  incidentsPrev7d: number;
  trend7dPct: number | null;
  confidence: number;
  significance: "MEDIUM" | "HIGH";
  significanceScore: number;
};

export type SnapshotAnalyticsResponse = {
  date: string;
  alerts: Alert[];
  metrics: {
    totalAlerts: number;
    severeAlerts: number;
    byType: DailyCounts;
    baseline7d: {
      totalAlerts: number;
      severeAlerts: number;
      byType: DailyCounts;
    };
    deltas: {
      totalAlertsPct: number | null;
      severeAlertsPct: number | null;
      byTypePct: NullableCounts;
    };
  };
  hotspots: Array<{
    cellLat: number;
    cellLng: number;
    count: number;
  }>;
  riskMethodVersion: string;
  riskSurface: RiskSurfaceCell[];
  topRiskAreas: TopRiskArea[];
  emergingHotspots: EmergingHotspot[];
};
