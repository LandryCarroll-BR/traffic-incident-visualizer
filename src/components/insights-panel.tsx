"use client";

import {
  BarChart3Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  FlameIcon,
  MapPinIcon,
  TrendingUpIcon,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { formatUtcDayLabel } from "@/lib/date";
import { formatSnakeCaseToTitleCase } from "@/lib/utils";
import {
  ALERT_TYPE_KEYS,
  type DailyCounts,
  type SnapshotAnalyticsResponse,
  type TimelineResponse,
} from "@/models/snapshot-analytics";

type InsightsPanelProps = {
  timeline: TimelineResponse;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  compareEnabled: boolean;
  onCompareEnabledChange: (enabled: boolean) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  analytics: SnapshotAnalyticsResponse | null;
  loading: boolean;
};

const chartConfig = {
  ACCIDENT: { label: "Accident", color: "var(--destructive)" },
  HAZARD: { label: "Hazard", color: "var(--primary)" },
  JAM: { label: "Jam", color: "oklch(0.6658 0.1574 58.3183)" },
  POLICE: { label: "Police", color: "oklch(0.6 0.13 250)" },
  ROAD_CLOSED: { label: "Road Closed", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

export function InsightsPanel({
  timeline,
  selectedIndex,
  onSelectedIndexChange,
  compareEnabled,
  onCompareEnabledChange,
  isOpen,
  onOpenChange,
  analytics,
  loading,
}: InsightsPanelProps) {
  const selectedDate = timeline.dates[selectedIndex] ?? analytics?.date ?? null;
  const selectedDateLabel = selectedDate
    ? formatUtcDayLabel(selectedDate)
    : "No date selected";

  const hasTimelineData = timeline.dates.length > 0;
  const hasAnalytics = analytics !== null;
  const topType = hasAnalytics ? getTopType(analytics.metrics.byType) : null;
  const topHotspot = hasAnalytics ? analytics.hotspots.at(0) : undefined;

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <Card className="gap-3 py-4">
        <CardHeader className="px-4 pb-0 gap-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <BarChart3Icon className="text-primary size-4" />
              <CardTitle>Daily Risk Insights</CardTitle>
            </div>
            <CardDescription className="text-xs">
              {selectedDateLabel}
            </CardDescription>
            <div className="ml-auto">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? "Collapse" : "Expand"}
                  {isOpen ? (
                    <ChevronUpIcon className="size-4" />
                  ) : (
                    <ChevronDownIcon className="size-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
          <CardContent className="space-y-4 px-4 pb-1">
            {!hasTimelineData ? (
              <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                No snapshots are available yet. Once your daily cron captures
                data, timeline insights and map playback will appear here.
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    icon={<TrendingUpIcon className="size-4" />}
                    label="Total Alerts"
                    value={String(analytics?.metrics.totalAlerts ?? 0)}
                    delta={
                      compareEnabled
                        ? (analytics?.metrics.deltas.totalAlertsPct ?? null)
                        : null
                    }
                    loading={loading && !hasAnalytics}
                  />
                  <MetricCard
                    icon={<FlameIcon className="size-4" />}
                    label="Severe Alerts"
                    value={String(analytics?.metrics.severeAlerts ?? 0)}
                    delta={
                      compareEnabled
                        ? (analytics?.metrics.deltas.severeAlertsPct ?? null)
                        : null
                    }
                    loading={loading && !hasAnalytics}
                  />
                  <MetricCard
                    icon={<BarChart3Icon className="size-4" />}
                    label="Top Type"
                    value={
                      topType ? formatSnakeCaseToTitleCase(topType) : "N/A"
                    }
                    delta={
                      compareEnabled && topType
                        ? (analytics?.metrics.deltas.byTypePct[topType] ?? null)
                        : null
                    }
                    loading={loading && !hasAnalytics}
                  />
                  <MetricCard
                    icon={<MapPinIcon className="size-4" />}
                    label="Top Hotspot"
                    value={
                      topHotspot
                        ? `${topHotspot.cellLat.toFixed(
                            2,
                          )}, ${topHotspot.cellLng.toFixed(2)}`
                        : "N/A"
                    }
                    caption={
                      topHotspot ? `${topHotspot.count} alerts` : undefined
                    }
                    loading={loading && !hasAnalytics}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-medium">
                      Trend by alert type
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Switch
                        checked={compareEnabled}
                        onCheckedChange={onCompareEnabledChange}
                      />
                      7-day baseline deltas
                    </div>
                  </div>
                  <ChartContainer
                    config={chartConfig}
                    className="h-52 w-full rounded-md border p-2"
                  >
                    <LineChart data={timeline.points}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) =>
                          formatUtcDayLabel(value).split(",")[0]
                        }
                        tickLine={false}
                        axisLine={false}
                        minTickGap={24}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        width={30}
                      />
                      <ChartTooltip
                        cursor={{ strokeDasharray: "4 4" }}
                        content={
                          <ChartTooltipContent
                            labelFormatter={(value) =>
                              typeof value === "string"
                                ? formatUtcDayLabel(value)
                                : String(value)
                            }
                          />
                        }
                      />
                      {selectedDate ? (
                        <ReferenceLine
                          x={selectedDate}
                          stroke="var(--foreground)"
                          strokeDasharray="3 3"
                        />
                      ) : null}
                      {ALERT_TYPE_KEYS.map((alertType) => (
                        <Line
                          key={alertType}
                          dataKey={`byType.${alertType}`}
                          name={formatSnakeCaseToTitleCase(alertType)}
                          type="monotone"
                          stroke={`var(--color-${alertType})`}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                  </ChartContainer>
                </div>

                <div className="space-y-2 pb-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>{formatUtcDayLabel(timeline.dates[0])}</span>
                    {/* <span>{selectedDateLabel}</span> */}
                    <span>
                      {formatUtcDayLabel(
                        timeline.dates[timeline.dates.length - 1],
                      )}
                    </span>
                  </div>
                  <Slider
                    value={[selectedIndex]}
                    max={timeline.dates.length - 1}
                    step={1}
                    onValueChange={(value) => {
                      const next = value[0];
                      if (typeof next === "number") {
                        onSelectedIndexChange(next);
                      }
                    }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function MetricCard({
  label,
  value,
  icon,
  delta,
  caption,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  delta?: number | null;
  caption?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-md border p-3">
        <Skeleton className="mb-2 h-3 w-28" />
        <Skeleton className="h-7 w-16" />
      </div>
    );
  }

  return (
    <div className="rounded-md border p-3">
      <div className="text-muted-foreground mb-2 flex items-center gap-1 text-xs">
        {icon}
        {label}
      </div>
      <div className="flex items-center gap-2">
        <div className="text-lg font-semibold">{value}</div>
        {typeof delta === "number" ? <DeltaPill delta={delta} /> : null}
      </div>
      {caption ? (
        <div className="text-muted-foreground mt-1 text-xs">{caption}</div>
      ) : null}
    </div>
  );
}

function DeltaPill({ delta }: { delta: number }) {
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  return (
    <span
      className={
        "rounded-full px-2 py-0.5 text-[10px] font-medium " +
        (isPositive
          ? "bg-destructive/15 text-destructive"
          : isNegative
            ? "bg-emerald-500/15 text-emerald-600"
            : "bg-muted text-muted-foreground")
      }
    >
      {isPositive ? "+" : ""}
      {delta.toFixed(2)}%
    </span>
  );
}

function getTopType(byType: DailyCounts) {
  const pairs = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const top = pairs[0];
  if (!top || top[1] === 0) {
    return null;
  }

  return top[0] as (typeof ALERT_TYPE_KEYS)[number];
}
