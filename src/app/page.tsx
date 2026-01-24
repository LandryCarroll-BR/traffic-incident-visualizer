import { BasicMap } from "@/components/map-example";
import { MapLayout } from "@/components/map-layout";
import PageLayout from "@/components/page-layout";

export default function Home() {
  return (
    <PageLayout>
      <MapLayout>
        <BasicMap />
      </MapLayout>
    </PageLayout>
  );
}
