"use client";

import { useParams } from "next/navigation";
import { SubscribeCheckout } from "../../_components/SubscribeCheckout";
import { PageContainer } from "~~/components/layouts/PageContainer";

export default function SubscribePage() {
  const params = useParams();
  const address = params.address as string;

  return (
    <PageContainer maxWidth="lg">
      <SubscribeCheckout creatorAddress={address} />
    </PageContainer>
  );
}
