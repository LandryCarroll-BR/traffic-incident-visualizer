import { Map, MapTileLayer } from "@/components/ui/map";
import type { LatLngExpression } from "leaflet";

export function BasicMap() {
  const ORLANDO_COORDINATES = [28.5383, -81.3792] satisfies LatLngExpression;

  return (
    <Map center={ORLANDO_COORDINATES}>
      <MapTileLayer />
    </Map>
  );
}
