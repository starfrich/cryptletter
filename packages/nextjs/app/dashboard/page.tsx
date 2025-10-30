"use client";

import { CreatorDashboardView } from "../_components/CreatorDashboardView";
import { PageContainer } from "~~/components/layouts/PageContainer";

export default function DashboardPage() {
  return (
    <PageContainer maxWidth="lg">
      <CreatorDashboardView />
    </PageContainer>
  );
}
