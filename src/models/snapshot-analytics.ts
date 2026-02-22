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
};
