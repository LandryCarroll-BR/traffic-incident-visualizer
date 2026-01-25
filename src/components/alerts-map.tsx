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
import { Separator } from "@/components/ui/separator";
import {
  ORLANDO_BOTTOM_LEFT_COORDINATES,
  ORLANDO_COORDINATES,
  ORLANDO_TOP_RIGHT_COORDINATES,
} from "@/config/constants";
import { formatSnakeCaseToTitleCase } from "@/lib/utils";
import { Alert } from "@/schemas/alert-schema";
import { AlertType } from "@/schemas/alert-type-schema";
import { ClusterPoint } from "@/schemas/cluster-point-schema";
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
  const points = alerts.map((alert) =>
    Schema.decodeSync(ClusterPoint)({
      id: alert.id,
      position: [alert.locationY, alert.locationX],
      type: Schema.decodeUnknownSync(AlertType)(alert.type),
      time: alert.timestamp,
    }),
  );

  const layers = points
    .map((point) => formatSnakeCaseToTitleCase(point.type))
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
        {points.map((point) => (
          <MapLayerGroup
            key={point.id}
            name={formatSnakeCaseToTitleCase(point.type)}
          >
            <MapMarker
              position={point.position}
              icon={<ClusterPointIcon type={point.type} />}
            >
              <ClusterPointTooltip clusterPoint={point} />
            </MapMarker>
          </MapLayerGroup>
        ))}
      </MapLayers>

      <MapControlContainer className="bg-popover text-popover-foreground bottom-1 right-1 flex flex-col gap-4 rounded-md border p-5 shadow">
        <div className="font-bold uppercase text-xs">Legend</div>
        {layers.map((layer, index) => (
          <div key={index} className="flex items-center gap-1">
            <ClusterPointIcon
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

const clusterPointClasses = cva(
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

function ClusterPointIcon({
  type,
  className,
}: {
  type: ClusterPoint["type"];
  className?: string;
}) {
  const iconMap = {
    HAZARD: (
      <div className={clusterPointClasses({ type: "HAZARD", className })}>
        <TriangleAlertIcon className="text-background" />
      </div>
    ),
    POLICE: (
      <div className={clusterPointClasses({ type: "POLICE", className })}>
        <RadarIcon className="text-background" />
      </div>
    ),
    ACCIDENT: (
      <div className={clusterPointClasses({ type: "ACCIDENT", className })}>
        <SirenIcon className="text-background" />
      </div>
    ),
    JAM: (
      <div className={clusterPointClasses({ type: "JAM", className })}>
        <SirenIcon className="text-background" />
      </div>
    ),
    ROAD_CLOSED: (
      <div className={clusterPointClasses({ type: "ROAD_CLOSED", className })}>
        <ConstructionIcon className="text-background" />
      </div>
    ),
  } as const;

  return iconMap[type ?? "HAZARD"];
}

function ClusterPointTooltip({ clusterPoint }: { clusterPoint: ClusterPoint }) {
  return (
    <MapTooltip side="bottom" sideOffset={24} className="w-fit">
      <div className="flex flex-col gap-2">
        <div className="font-bold">
          <div>
            Incident Type: {formatSnakeCaseToTitleCase(clusterPoint.type)}
          </div>
        </div>
        <Separator />
        <div>
          Coordinates: [{clusterPoint.position[0].toFixed(4)},{" "}
          {clusterPoint.position[1].toFixed(4)}]
        </div>
        <div>
          <Day time={clusterPoint.time} />,
          <DateTime time={clusterPoint.time} />
        </div>
      </div>
    </MapTooltip>
  );
}

function Day({ time, label }: { time: ClusterPoint["time"]; label?: string }) {
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

function DateTime({
  time,
  label,
}: {
  time: ClusterPoint["time"];
  label?: string;
}) {
  const date = new Date(time);
  return (
    <>
      {label ?? ""} {date.toLocaleDateString()} {date.toLocaleTimeString()}
    </>
  );
}
