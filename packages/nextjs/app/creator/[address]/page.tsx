"use client";

import { useParams } from "next/navigation";
import { CreatorProfile } from "../../_components/CreatorProfile";
import { PageContainer } from "~~/components/layouts/PageContainer";

export default function CreatorPage() {
  const params = useParams();
  const address = params.address as string;

  return (
    <PageContainer maxWidth="lg">
      <CreatorProfile address={address} />
    </PageContainer>
  );
}
