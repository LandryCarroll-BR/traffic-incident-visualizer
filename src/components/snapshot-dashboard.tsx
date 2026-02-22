"use client";

import { AlertCircleIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertsMap } from "@/components/alerts-map";
import { InsightsPanel } from "@/components/insights-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatUtcDayLabel } from "@/lib/date";
import type {
  SnapshotAnalyticsResponse,
  TimelineResponse,
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const selectedDate = initialTimeline.dates[selectedIndex];

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

      <div className="relative min-h-0 flex-1 ">
        {loading ? (
          <div className="bg-background/70 pointer-events-none absolute inset-0 z-[1000] flex items-start justify-end p-3">
            <Skeleton className="h-6 w-32" />
          </div>
        ) : null}

        <div className="h-[calc(100vh-10rem)]">
          <AlertsMap alerts={analytics?.alerts ?? []} />
        </div>
      </div>
    </div>
  );
}
