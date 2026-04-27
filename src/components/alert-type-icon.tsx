import { cva } from "class-variance-authority";
import {
  ConstructionIcon,
  RadarIcon,
  SirenIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { type AlertType } from "@/models/alert";

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

export function AlertTypeIcon({
  type,
  className,
}: {
  type: AlertType;
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

  return iconMap[type];
}
