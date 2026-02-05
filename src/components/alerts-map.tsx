import {
  Map,
  MapControlContainer,
  MapLayerGroup,
  MapLayers,
  MapLayersControl,
  MapMarker,
  MapRectangle,
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
import { Alert, AlertType } from "@/models/alert";
import { cva } from "class-variance-authority";
import { Schema } from "effect";
import { LatLngBoundsExpression } from "leaflet";
import {
  ConstructionIcon,
  RadarIcon,
  SirenIcon,
  TriangleAlertIcon,
} from "lucide-react";

export function AlertsMap({ alerts }: { alerts: Alert[] }) {
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

  return (
    <Map
      center={ORLANDO_COORDINATES}
      zoom={11}
      className="border"
      minZoom={11}
      maxBounds={BOUNDS}
    >
      <MapTileLayer />
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

      <MapControlContainer className="bg-popover text-popover-foreground bottom-1 right-1 flex flex-col gap-4 rounded-md border p-5 shadow">
        <div className="font-bold uppercase text-xs">Legend</div>
        {layers.map((layer, index) => (
          <div key={index} className="flex items-center gap-1">
            <PointIcon
              type={Schema.decodeUnknownSync(AlertType)(
                layer.toUpperCase().replace(" ", "_"),
              )}
              className="scale-75"
            />
            <div className="text-base">{layer}</div>
          </div>
        ))}
      </MapControlContainer>

      <MapRectangle
        fillOpacity={0.075}
        className="hover:cursor-grab! stroke-none"
        bounds={BOUNDS}
      />
    </Map>
  );
}

const pointClasses = cva(
  "size-8 rounded-full -translate-x-1 ring-4 flex items-center justify-center border border-foreground/50",
  {
    variants: {
      type: {
        HAZARD: "bg-primary ring-primary/30",
        POLICE: "bg-blue-500  ring-blue-500/30",
        ACCIDENT: "bg-red-500 ring-red-500/30",
        JAM: "bg-orange-500 ring-orange-500/30",
        ROAD_CLOSED: "bg-gray-700 ring-gray-700/30",
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
                  ? "[&_*[data-slot=progress-indicator]]:bg-yellow-500"
                  : "[&_*[data-slot=progress-indicator]]:bg-red-500",
            )}
            value={(alert.reliability ?? 0) * 10}
            max={10}
          />
        </div>
        <div>
          <Day time={alert.time} />,
          <DateTime time={alert.time} />
        </div>
      </div>
    </MapTooltip>
  );
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
