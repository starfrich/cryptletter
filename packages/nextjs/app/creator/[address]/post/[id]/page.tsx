"use client";

import { useParams } from "next/navigation";
import { NewsletterDetail } from "../../../../_components/NewsletterDetail";
import { PageContainer } from "~~/components/layouts/PageContainer";

export default function PostPage() {
  const params = useParams();
  const postId = params.id as string;

  return (
    <PageContainer maxWidth="lg">
      <NewsletterDetail postId={postId} />
    </PageContainer>
  );
}
