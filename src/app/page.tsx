import { DynamicAlertData } from "@/app/dynamic";
import PageLayout from "@/components/page-layout";
import { Suspense } from "react";

export default async function Home() {
  return (
    <PageLayout>
      <Suspense>
        <DynamicAlertData />
      </Suspense>
    </PageLayout>
  );
}
