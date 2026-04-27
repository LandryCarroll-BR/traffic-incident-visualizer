"use client";

import {
  AlertCircleIcon,
  FlameIcon,
  MapPinIcon,
  TriangleAlertIcon,
} from "lucide-react";
import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertsMap, type AlertsMapMode } from "@/components/alerts-map";
import { InsightsPanel } from "@/components/insights-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { formatUtcDayLabel } from "@/lib/date";
import { cn, formatSnakeCaseToTitleCase } from "@/lib/utils";
import {
  ALERT_TYPE_KEYS,
  type RiskDailyPoint,
  type RiskSurfaceCell,
  type SnapshotAnalyticsResponse,
  type TimelineResponse,
  type TopRiskArea,
} from "@/models/snapshot-analytics";

type SnapshotDashboardProps = {
  initialTimeline: TimelineResponse;
  initialAnalytics: SnapshotAnalyticsResponse | null;
};

export function SnapshotDashboard({
  initialTimeline,
  initialAnalytics,
}: SnapshotDashboardProps) {
  const defaultIndex = useMemo(() => {
    if (initialTimeline.dates.length === 0) {
      return 0;
    }

    if (!initialAnalytics) {
      return initialTimeline.dates.length - 1;
    }

    const index = initialTimeline.dates.indexOf(initialAnalytics.date);

    return index >= 0 ? index : initialTimeline.dates.length - 1;
  }, [initialTimeline, initialAnalytics]);

  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [loading, setLoading] = useState(
    !initialAnalytics && initialTimeline.dates.length > 0,
  );
  const [mapMode, setMapMode] = useState<AlertsMapMode>("points");
  const [selectedRiskCellId, setSelectedRiskCellId] = useState<string | null>(
    initialAnalytics?.topRiskAreas.at(0)?.primaryCellId ??
      initialAnalytics?.riskSurface.at(0)?.cellId ??
      null,
  );
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const selectedDate = initialTimeline.dates[selectedIndex];
  const riskSurface = analytics?.riskSurface ?? [];
  const topRiskAreas = analytics?.topRiskAreas ?? [];
  const selectedRiskCell =
    riskSurface.find((cell) => cell.cellId === selectedRiskCellId) ?? null;

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    if (analytics?.date === selectedDate) {
      return;
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetch(`/api/snapshots/alerts?date=${selectedDate}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return (await response.json()) as SnapshotAnalyticsResponse;
      })
      .then((response) => {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        setAnalytics(response);
      })
      .catch((err) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(String(err));
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [analytics?.date, selectedDate]);

  useEffect(() => {
    const defaultCellId =
      analytics?.topRiskAreas.at(0)?.primaryCellId ??
      analytics?.riskSurface.at(0)?.cellId ??
      null;
    setSelectedRiskCellId(defaultCellId);
  }, [analytics?.topRiskAreas, analytics?.riskSurface]);

  useEffect(() => {
    if (riskSurface.length === 0 && mapMode !== "points") {
      setMapMode("points");
    }
  }, [riskSurface.length, mapMode]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <InsightsPanel
        timeline={initialTimeline}
        selectedIndex={selectedIndex}
        onSelectedIndexChange={setSelectedIndex}
        compareEnabled={compareEnabled}
        onCompareEnabledChange={setCompareEnabled}
        isOpen={isPanelOpen}
        onOpenChange={setIsPanelOpen}
        analytics={analytics}
        loading={loading}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Failed to load selected date</AlertTitle>
          <AlertDescription>
            Could not load data for{" "}
            {selectedDate ? formatUtcDayLabel(selectedDate) : "selected date"}.
            <pre>{error}</pre>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <div className="h-[calc(100vh-10rem)]">
          {loading ? (
            <AlertsMapLoadingState selectedDate={selectedDate} />
          ) : (
            <>
              <AlertsMap
                key={selectedDate?.toString()}
                alerts={analytics?.alerts ?? []}
                mode={mapMode}
                riskSurface={riskSurface}
                selectedRiskCellId={selectedRiskCellId}
                onRiskCellSelect={setSelectedRiskCellId}
              />

              <div className="pointer-events-none absolute inset-x-3 top-3 z-[1050] flex items-start justify-between gap-3">
                <MapModeSwitcher
                  mode={mapMode}
                  hasRiskData={riskSurface.length > 0}
                  onModeChange={setMapMode}
                />

                {mapMode !== "points" && analytics ? (
                  <RiskInsightsOverlay
                    topRiskAreas={topRiskAreas}
                    selectedRiskCell={selectedRiskCell}
                    onAreaSelect={(area) => {
                      setSelectedRiskCellId(area.primaryCellId);
                    }}
                  />
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MapModeSwitcher({
  mode,
  hasRiskData,
  onModeChange,
}: {
  mode: AlertsMapMode;
  hasRiskData: boolean;
  onModeChange: (mode: AlertsMapMode) => void;
}) {
  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-md border bg-background/95 p-1 shadow-sm">
      <MapModeButton
        active={mode === "points"}
        onClick={() => onModeChange("points")}
      >
        Points
      </MapModeButton>
      <MapModeButton
        active={mode === "risk-heat"}
        onClick={() => onModeChange("risk-heat")}
        disabled={!hasRiskData}
      >
        Risk Heat
      </MapModeButton>
      <MapModeButton
        active={mode === "accident-heat"}
        onClick={() => onModeChange("accident-heat")}
        disabled={!hasRiskData}
      >
        Accident Heat
      </MapModeButton>
    </div>
  );
}

function MapModeButton({
  active,
  children,
  ...props
}: ComponentProps<typeof Button> & {
  active?: boolean;
}) {
  return (
    <Button
      variant={active ? "default" : "ghost"}
      size="xs"
      className={cn("min-w-20")}
      {...props}
    >
      {children}
    </Button>
  );
}

function RiskInsightsOverlay({
  topRiskAreas,
  selectedRiskCell,
  onAreaSelect,
}: {
  topRiskAreas: TopRiskArea[];
  selectedRiskCell: RiskSurfaceCell | null;
  onAreaSelect: (area: TopRiskArea) => void;
}) {
  return (
    <div className="pointer-events-auto flex max-h-[calc(100vh-13rem)] w-[23rem] flex-col gap-3 overflow-y-auto rounded-md border bg-background/96 p-3 shadow-sm">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FlameIcon className="text-destructive size-4" />
          Risk Corridors
        </div>
      </div>

      {/* <div className="space-y-2">
        {topRiskAreas.length === 0 ? (
          <div className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
            No corridor-level risk areas for this date.
          </div>
        ) : (
          topRiskAreas.map((area) => (
            <button
              key={area.areaId}
              type="button"
              onClick={() => onAreaSelect(area)}
              className="hover:bg-muted/60 w-full rounded-md border p-2 text-left transition"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{area.label}</span>
                <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                  {area.riskScore.toFixed(1)}
                </span>
              </div>
              <div className="text-muted-foreground flex items-center justify-between text-[11px]">
                <span>
                  {area.accidentCount30d} accidents · {area.cellCount} cells
                </span>
                <span>{formatTrend(area.trend7dPct)}</span>
              </div>
            </button>
          ))
        )}
      </div> */}

      {selectedRiskCell ? <RiskCellDrilldown cell={selectedRiskCell} /> : null}
    </div>
  );
}

function RiskCellDrilldown({ cell }: { cell: RiskSurfaceCell }) {
  const maxTypeCount = Math.max(
    1,
    ...ALERT_TYPE_KEYS.map((type) => cell.byType30d[type]),
  );

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold">Area Drill-down</div>
        <div className="text-muted-foreground text-[11px]">{cell.cellId}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <StatChip
          icon={<TriangleAlertIcon className="size-3" />}
          label="Risk Score"
          value={cell.riskScore.toFixed(2)}
        />
        <StatChip
          icon={<MapPinIcon className="size-3" />}
          label="Recurrence"
          value={`${cell.recurrenceDays30d} days`}
        />
      </div>

      <div>
        <div className="mb-1 text-[11px] font-medium">30-day pattern</div>
        <MiniSparkline points={cell.daily} />
      </div>

      <Separator />

      <div className="space-y-1">
        <div className="text-[11px] font-medium">Type Breakdown</div>
        {ALERT_TYPE_KEYS.map((type) => {
          const count = cell.byType30d[type];
          const ratio = count / maxTypeCount;

          return (
            <div key={type} className="space-y-0.5">
              <div className="flex items-center justify-between text-[11px]">
                <span>{formatSnakeCaseToTitleCase(type)}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
              <div className="bg-muted h-1.5 w-full rounded-full">
                <div
                  className="bg-primary h-1.5 rounded-full"
                  style={{ width: `${Math.max(6, ratio * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border px-2 py-1.5">
      <div className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px]">
        {icon}
        {label}
      </div>
      <div className="text-xs font-semibold">{value}</div>
    </div>
  );
}

function MiniSparkline({ points }: { points: RiskDailyPoint[] }) {
  const windowPoints = points.slice(-30);
  const maxValue = Math.max(
    1,
    ...windowPoints.map((point) => point.totalIncidents),
  );

  return (
    <div className="bg-muted/40 flex h-16 items-end gap-0.5 rounded-sm border p-1">
      {windowPoints.map((point) => {
        const height = Math.max(6, (point.totalIncidents / maxValue) * 100);

        return (
          <div
            key={point.date}
            title={`${formatUtcDayLabel(point.date)}: ${point.totalIncidents}`}
            className="bg-primary/70 hover:bg-primary w-[3px] rounded-sm"
            style={{ height: `${height}%` }}
          />
        );
      })}
    </div>
  );
}

function formatTrend(value: number | null): string {
  if (value === null) {
    return "N/A";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

function AlertsMapLoadingState({ selectedDate }: { selectedDate?: string }) {
  return (
    <div className="relative h-full overflow-hidden rounded-md border bg-muted/20">
      <Skeleton className="absolute inset-0 rounded-none" />

      <div className="relative z-10 flex h-full flex-col justify-between p-3">
        <div className="flex w-fit items-center gap-2 rounded-md border bg-background/90 px-3 py-2 shadow-sm">
          <Spinner className="size-4" />
          <span className="text-sm font-medium">
            Loading alerts map
            {selectedDate ? ` for ${formatUtcDayLabel(selectedDate)}` : "..."}
          </span>
        </div>

        <div className="ml-auto flex w-36 flex-col gap-2 rounded-md border bg-background/85 p-3 shadow-sm">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
      </div>
    </div>
  );
}
