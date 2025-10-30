"use client";

import { useState } from "react";
import { TiptapEditor } from "./TiptapEditor";

export interface NewsletterContent {
  title: string;
  contentHtml: string;
  contentJson: any;
}

interface NewsletterEditorProps {
  initialContent?: Partial<NewsletterContent>;
  onChange: (content: NewsletterContent) => void;
  disabled?: boolean;
}

export function NewsletterEditor({ initialContent, onChange, disabled = false }: NewsletterEditorProps) {
  const [title, setTitle] = useState(initialContent?.title || "");
  const [contentHtml, setContentHtml] = useState(initialContent?.contentHtml || "");
  const [contentJson, setContentJson] = useState(initialContent?.contentJson || null);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    onChange({ title: newTitle, contentHtml, contentJson });
  };

  const handleContentChange = (html: string, json: any) => {
    setContentHtml(html);
    setContentJson(json);
    onChange({ title, contentHtml: html, contentJson: json });
  };

  return (
    <div className="space-y-4">
      {/* Title Input */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Title</span>
          <span className="label-text-alt">{title.length}/200</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          maxLength={200}
          placeholder="Enter newsletter title..."
          className="input input-bordered input-lg w-full font-bold"
          disabled={disabled}
        />
      </div>

      {/* Tiptap Rich Text Editor */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Content</span>
          <span className="label-text-alt opacity-60">Rich text editor with image support</span>
        </label>
        <TiptapEditor content={contentHtml} onChange={handleContentChange} disabled={disabled} />
      </div>
    </div>
  );
}
