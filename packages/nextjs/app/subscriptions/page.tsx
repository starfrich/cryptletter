"use client";

import { SubscriptionManagement } from "../_components/SubscriptionManagement";
import { PageContainer } from "~~/components/layouts/PageContainer";

export default function SubscriptionsPage() {
  return (
    <PageContainer maxWidth="xl">
      <h1 className="text-3xl font-bold mb-6">My Subscriptions</h1>
      <SubscriptionManagement />
    </PageContainer>
  );
}
