"use client";

import { PublishEditor } from "../../_components/PublishEditor";

export default function PublishPage() {
  return (
    <div className="flex flex-col gap-8 w-full px-3 md:px-8 py-8">
      <div className="max-w-4xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-6">Publish Newsletter</h1>
        <PublishEditor />
      </div>
    </div>
  );
}
