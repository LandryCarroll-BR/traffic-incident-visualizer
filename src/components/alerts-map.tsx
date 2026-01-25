import { MapClusterGroup } from "@/components/map-cluster-group";
import {
  Map,
  MapMarker,
  MapMarkerClusterGroup,
  MapPopup,
  MapRectangle,
  MapTileLayer,
  MapTooltip,
} from "@/components/ui/map";
import {
  ORLANDO_BOTTOM_LEFT_COORDINATES,
  ORLANDO_COORDINATES,
  ORLANDO_TOP_RIGHT_COORDINATES,
} from "@/config/constants";
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
  const CLUSTER_POINTS = alerts.map((alert) =>
    Schema.decodeSync(ClusterPoint)({
      name: alert.timestamp.toString(),
      position: [alert.locationY, alert.locationX],
      type: Schema.decodeUnknownSync(AlertType)(alert.type),
    }),
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
      <MapClusterGroup>
        {CLUSTER_POINTS.map((point, i) => (
          <MapMarker
            key={i}
            position={point.position}
            icon={<ClusterPointIcon clusterPoint={point} />}
          >
            <ClusterPointTooltip clusterPoint={point} />
          </MapMarker>
        ))}
      </MapClusterGroup>
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

function ClusterPointIcon({ clusterPoint }: { clusterPoint: ClusterPoint }) {
  const iconMap = {
    HAZARD: (
      <div className={clusterPointClasses({ type: "HAZARD" })}>
        <TriangleAlertIcon className="text-background" />
      </div>
    ),
    POLICE: (
      <div className={clusterPointClasses({ type: "POLICE" })}>
        <RadarIcon className="text-background" />
      </div>
    ),
    ACCIDENT: (
      <div className={clusterPointClasses({ type: "ACCIDENT" })}>
        <SirenIcon className="text-background" />
      </div>
    ),
    JAM: (
      <div className={clusterPointClasses({ type: "JAM" })}>
        <SirenIcon className="text-background" />
      </div>
    ),
    ROAD_CLOSED: (
      <div className={clusterPointClasses({ type: "ROAD_CLOSED" })}>
        <ConstructionIcon className="text-background" />
      </div>
    ),
  } as const;

  return iconMap[clusterPoint.type ?? "HAZARD"];
}

function ClusterPointTooltip({ clusterPoint }: { clusterPoint: ClusterPoint }) {
  return (
    <MapTooltip side="bottom" sideOffset={24} className="w-fit">
      {clusterPoint.type}
    </MapTooltip>
  );
}
