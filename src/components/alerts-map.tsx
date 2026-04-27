import { cva } from "class-variance-authority";
import { Schema } from "effect";
import type { LatLngBoundsExpression } from "leaflet";
import {
  ConstructionIcon,
  MapPinIcon,
  RadarIcon,
  SirenIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import type { PlaceFeature } from "@/components/ui/place-autocomplete";
import {
  Map as IncidentMap,
  MapControlContainer,
  MapLayerGroup,
  MapLayers,
  MapLayersControl,
  MapMarker,
  MapRectangle,
  MapSearchControl,
  MapTileLayer,
  MapTooltip,
} from "@/components/ui/map";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ORLANDO_BOTTOM_LEFT_COORDINATES,
  ORLANDO_COORDINATES,
  ORLANDO_TOP_RIGHT_COORDINATES,
} from "@/config/constants";
import { cn, formatSnakeCaseToTitleCase } from "@/lib/utils";
import { type Alert, AlertType } from "@/models/alert";
import {
  RISK_HISTORY_DAYS,
  type RiskSurfaceCell,
} from "@/models/snapshot-analytics";

export type AlertsMapMode = "points" | "risk-heat" | "accident-heat";

type AlertsMapProps = {
  alerts: Alert[];
  mode: AlertsMapMode;
  riskSurface: RiskSurfaceCell[];
  selectedRiskCellId?: string | null;
  selectedRiskCellIds?: string[];
  onRiskCellSelect?: (cellId: string) => void;
};

const HEAT_CELL_LIMIT = 400;

export function AlertsMap({
  alerts,
  mode,
  riskSurface,
  selectedRiskCellId,
  selectedRiskCellIds = [],
  onRiskCellSelect,
}: AlertsMapProps) {
  const layers = alerts
    .map((alert) => formatSnakeCaseToTitleCase(alert.type))
    .filter(
      // remove duplicates
      (type, index, self) => self.indexOf(type) === index,
    );

  const BOUNDS_OFFSET = 0.1;

  const BOUNDS = [
    [
      ORLANDO_BOTTOM_LEFT_COORDINATES.latitude + -BOUNDS_OFFSET,
      ORLANDO_BOTTOM_LEFT_COORDINATES.longitude + -BOUNDS_OFFSET,
    ],
    [
      ORLANDO_TOP_RIGHT_COORDINATES.latitude + BOUNDS_OFFSET,
      ORLANDO_TOP_RIGHT_COORDINATES.longitude + BOUNDS_OFFSET,
    ],
  ] satisfies LatLngBoundsExpression;
  const searchBounds = [
    ORLANDO_BOTTOM_LEFT_COORDINATES.longitude,
    ORLANDO_BOTTOM_LEFT_COORDINATES.latitude,
    ORLANDO_TOP_RIGHT_COORDINATES.longitude,
    ORLANDO_TOP_RIGHT_COORDINATES.latitude,
  ] as [number, number, number, number];

  const isPointMode = mode === "points";
  const visibleRiskCells = riskSurface.slice(0, HEAT_CELL_LIMIT);
  const [selectedPlace, setSelectedPlace] = useState<PlaceFeature | null>(null);
  const selectedRiskCellIdSet = new Set(selectedRiskCellIds);
  const hasSelectedHeatCell =
    !isPointMode &&
    (selectedRiskCellId !== null || selectedRiskCellIdSet.size > 0);
  const selectedHeatCell = hasSelectedHeatCell
    ? visibleRiskCells.find((cell) => cell.cellId === selectedRiskCellId)
    : undefined;
  const maxRiskScore = Math.max(
    1,
    ...visibleRiskCells.map((cell) => cell.riskScore),
  );
  const maxAccidentCount = Math.max(
    1,
    ...visibleRiskCells.map((cell) => cell.accidentCountWindow),
  );

  return (
    <IncidentMap
      center={ORLANDO_COORDINATES}
      zoom={11}
      className="border"
      minZoom={11}
      maxBounds={BOUNDS}
    >
      <MapTileLayer />
      <MapSearchControl
        className="top-14 left-3 z-1001 w-72"
        placeholder="Search"
        bbox={searchBounds}
        lat={ORLANDO_COORDINATES[0]}
        lon={ORLANDO_COORDINATES[1]}
        zoom={11}
        locationBiasScale={0.6}
        onPlaceSelect={setSelectedPlace}
      />
      <MapSearchResultOverlay feature={selectedPlace} />

      {isPointMode ? (
        <MapLayers defaultLayerGroups={layers}>
          <MapLayersControl layerGroupsLabel="Incident Type" />
          {alerts.map((alert) => (
            <MapLayerGroup
              key={alert.id}
              name={formatSnakeCaseToTitleCase(alert.type)}
            >
              <MapMarker
                position={alert.position}
                icon={<PointIcon type={alert.type} />}
              >
                <AlertTooltip alert={alert} />
              </MapMarker>
            </MapLayerGroup>
          ))}
        </MapLayers>
      ) : (
        visibleRiskCells.map((cell) => {
          const value =
            mode === "risk-heat" ? cell.riskScore : cell.accidentCountWindow;
          const maxValue =
            mode === "risk-heat" ? maxRiskScore : maxAccidentCount;
          const isSelected = selectedRiskCellId === cell.cellId;
          const isInSelectedCorridor = selectedRiskCellIdSet.has(cell.cellId);
          const isHighlighted = isSelected || isInSelectedCorridor;
          const color = getHeatColor(value, maxValue);

          return (
            <MapRectangle
              key={cell.cellId}
              bounds={[
                [cell.bounds.south, cell.bounds.west],
                [cell.bounds.north, cell.bounds.east],
              ]}
              pathOptions={{
                color: isHighlighted ? "hsl(var(--foreground))" : color,
                fillColor: color,
                weight: isSelected
                  ? 2.5
                  : isInSelectedCorridor
                    ? 1.5
                    : hasSelectedHeatCell
                      ? 0.5
                      : 1,
                opacity: isSelected
                  ? 1
                  : isInSelectedCorridor
                    ? 0.95
                    : hasSelectedHeatCell
                      ? 0.75
                      : 0.75,
                fillOpacity: isSelected
                  ? 0.9
                  : isInSelectedCorridor
                    ? 0.72
                    : hasSelectedHeatCell
                      ? 0.22
                      : 0.6,
              }}
              className={cn(
                "hover:cursor-pointer transition-all",
                hasSelectedHeatCell && !isSelected && "saturate-[0.9]",
              )}
              eventHandlers={{
                click: () => {
                  onRiskCellSelect?.(cell.cellId);
                },
              }}
            >
              <RiskCellTooltip cell={cell} mode={mode} />
            </MapRectangle>
          );
        })
      )}

      {selectedHeatCell ? (
        <MapRectangle
          key={`${selectedHeatCell.cellId}-focus-ring`}
          bounds={[
            [selectedHeatCell.bounds.south, selectedHeatCell.bounds.west],
            [selectedHeatCell.bounds.north, selectedHeatCell.bounds.east],
          ]}
          stroke={true}
          weight={10}
          pathOptions={{
            weight: 10,
            color: "#ffffff",
            opacity: 100,
          }}
          className="pointer-events-none outline-2 rounded-sm outline-white animate-pulse"
        />
      ) : null}

      <MapControlContainer className="bg-popover text-popover-foreground bottom-1 left-1 flex max-w-60 flex-col gap-3 rounded-md border p-4 shadow">
        {isPointMode ? (
          <>
            <div className="font-bold uppercase text-xs">Legend</div>
            {layers.map((layer) => (
              <div key={layer} className="flex items-center gap-1">
                <PointIcon
                  type={Schema.decodeUnknownSync(AlertType)(
                    layer.toUpperCase().replace(" ", "_"),
                  )}
                  className="scale-75"
                />
                <div className="text-base">{layer}</div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="font-bold uppercase text-xs">Risk Heat</div>
            <div className="text-muted-foreground text-xs">
              {mode === "risk-heat"
                ? "Composite risk score"
                : "Accident density"}
            </div>
            <div className="space-y-1">
              <HeatLegendRow color="#16a34a" label="Low" />
              <HeatLegendRow color="#f59e0b" label="Medium" />
              <HeatLegendRow color="#dc2626" label="High" />
            </div>
            <div className="text-muted-foreground text-[11px]">
              Showing top {visibleRiskCells.length} cells by risk score.
            </div>
          </>
        )}
      </MapControlContainer>

      <MapRectangle
        pathOptions={{
          color: "transparent",
          fillColor: "hsl(var(--foreground))",
          fillOpacity: 0.06,
        }}
        className="hover:cursor-grab! stroke-none"
        bounds={BOUNDS}
      />
    </IncidentMap>
  );
}

const pointClasses = cva(
  "size-8 rounded-full -translate-x-1 ring-4 flex items-center justify-center border border-foreground/50",
  {
    variants: {
      type: {
        HAZARD: "bg-primary ring-primary/30",
        POLICE: "bg-blue-500 ring-blue-500/30",
        ACCIDENT: "bg-red-500 ring-red-500/30",
        JAM: "bg-orange-500 ring-orange-500/30",
        ROAD_CLOSED: "bg-neutral-400 ring-neutral-500/30",
      },
    },
    defaultVariants: {
      type: "HAZARD",
    },
  },
);

function PointIcon({
  type,
  className,
}: {
  type: Alert["type"];
  className?: string;
}) {
  const iconMap = {
    HAZARD: (
      <div className={pointClasses({ type: "HAZARD", className })}>
        <TriangleAlertIcon className="text-background" />
      </div>
    ),
    POLICE: (
      <div className={pointClasses({ type: "POLICE", className })}>
        <RadarIcon className="text-background" />
      </div>
    ),
    ACCIDENT: (
      <div className={pointClasses({ type: "ACCIDENT", className })}>
        <SirenIcon className="text-background" />
      </div>
    ),
    JAM: (
      <div className={pointClasses({ type: "JAM", className })}>
        <SirenIcon className="text-background" />
      </div>
    ),
    ROAD_CLOSED: (
      <div className={pointClasses({ type: "ROAD_CLOSED", className })}>
        <ConstructionIcon className="text-background" />
      </div>
    ),
  } as const;

  return iconMap[type ?? "HAZARD"];
}

function AlertTooltip({ alert }: { alert: Alert }) {
  return (
    <MapTooltip side="bottom" sideOffset={24} className="w-fit">
      <div className="flex flex-col gap-2">
        <div className="font-bold">
          <div>{formatSnakeCaseToTitleCase(alert.type)}</div>
        </div>
        <Separator />
        <div>
          Coordinates: [{alert.position[0].toFixed(4)},{" "}
          {alert.position[1].toFixed(4)}]
        </div>
        <div>
          Reliability: {alert.reliability ?? 0} out of 10
          <Progress
            className={cn(
              alert.reliability && alert.reliability >= 7
                ? "[&_*[data-slot=progress-indicator]]:bg-green-500"
                : alert.reliability && alert.reliability >= 5
                  ? "[&_*[data-slot=progress-indicator]]:bg-primary"
                  : "[&_*[data-slot=progress-indicator]]:bg-red-500",
            )}
            value={(alert.reliability ?? 0) * 10}
            max={10}
          />
        </div>
        <div>
          <Day time={alert.time} />, <DateTime time={alert.time} />
        </div>
      </div>
    </MapTooltip>
  );
}

function RiskCellTooltip({
  cell,
  mode,
}: {
  cell: RiskSurfaceCell;
  mode: AlertsMapMode;
}) {
  return (
    <MapTooltip side="bottom" sideOffset={22} className="w-64">
      <div className="space-y-2">
        <div className="font-semibold">Cell {cell.cellId}</div>
        <Separator />
        <div className="text-xs">
          Center: {cell.cellLat.toFixed(4)}, {cell.cellLng.toFixed(4)}
        </div>
        <div className="text-xs">
          {mode === "risk-heat"
            ? "Risk Score"
            : `Accidents (${RISK_HISTORY_DAYS}d)`}
          :{" "}
          {mode === "risk-heat"
            ? cell.riskScore.toFixed(2)
            : cell.accidentCountWindow}
        </div>
        <div className="text-xs">
          {RISK_HISTORY_DAYS}d incidents: {cell.totalIncidentsWindow} (
          {cell.severeCountWindow} severe)
        </div>
        <div className="text-xs">
          Recurrence: {cell.recurrenceDaysWindow} days | Trend:{" "}
          {formatTrend(cell.trend7dPct)}
        </div>
      </div>
    </MapTooltip>
  );
}

function MapSearchResultOverlay({ feature }: { feature: PlaceFeature | null }) {
  const map = useMap();
  const position = feature
    ? ([feature.geometry.coordinates[1], feature.geometry.coordinates[0]] as [
        number,
        number,
      ])
    : null;

  useEffect(() => {
    if (!feature || !position) {
      return;
    }

    const extent = feature.properties.extent;
    if (extent) {
      map.fitBounds(
        [
          [extent[1], extent[0]],
          [extent[3], extent[2]],
        ],
        {
          padding: [32, 32],
          maxZoom: 15,
        },
      );
      return;
    }

    map.flyTo(position, Math.max(map.getZoom(), 14));
  }, [feature, map, position]);

  if (!feature || !position) {
    return null;
  }

  return (
    <MapMarker position={position} icon={<SearchResultIcon />}>
      <MapTooltip side="bottom" sideOffset={22}>
        <div className="space-y-1">
          <div className="font-semibold">{getPlaceTitle(feature)}</div>
          <div className="text-xs text-muted-foreground">
            {getPlaceSubtitle(feature)}
          </div>
        </div>
      </MapTooltip>
    </MapMarker>
  );
}

function SearchResultIcon() {
  return (
    <div className="flex size-8 -translate-x-1 items-center justify-center rounded-full border border-foreground/40 bg-background shadow-sm ring-4 ring-primary/20">
      <MapPinIcon className="size-4 text-primary" />
    </div>
  );
}

function getPlaceTitle(feature: PlaceFeature): string {
  return (
    feature.properties.name ??
    feature.properties.street ??
    feature.properties.locality ??
    "Search result"
  );
}

function getPlaceSubtitle(feature: PlaceFeature): string {
  const parts = [
    feature.properties.street,
    feature.properties.city ?? feature.properties.locality,
    feature.properties.state,
  ].filter(Boolean);

  return parts.join(", ");
}

function HeatLegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div
        className="h-2.5 w-6 rounded-sm border"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
  );
}

function getHeatColor(value: number, maxValue: number): string {
  const ratio = clamp(value / Math.max(maxValue, 1), 0, 1);

  if (ratio >= 0.8) {
    return "#dc2626";
  }

  if (ratio >= 0.6) {
    return "#f97316";
  }

  if (ratio >= 0.4) {
    return "#f59e0b";
  }

  if (ratio >= 0.2) {
    return "#84cc16";
  }

  return "#16a34a";
}

function formatTrend(value: number | null): string {
  if (value === null) {
    return "N/A";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function Day({ time, label }: { time: Alert["time"]; label?: string }) {
  const dateLabels = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
  };

  const day = new Date(time).getDay();
  return (
    <>
      {label ?? ""} {dateLabels[day as keyof typeof dateLabels]}
    </>
  );
}

function DateTime({ time, label }: { time: Alert["time"]; label?: string }) {
  const date = new Date(time);
  return (
    <>
      {label ?? ""} {date.toLocaleDateString()} {date.toLocaleTimeString()}
    </>
  );
}
