"use client";

import { MapMarkerClusterGroup } from "@/components/ui/map";

export function MapClusterGroup({ children }: { children: React.ReactNode }) {
  return (
    <MapMarkerClusterGroup
      showCoverageOnHover={false}
      icon={(markerCount) => (
        <div className="bg-popover text-popover-foreground flex size-10 items-center justify-center rounded-full border font-semibold">
          {markerCount}
        </div>
      )}
    >
      {children}
    </MapMarkerClusterGroup>
  );
}
