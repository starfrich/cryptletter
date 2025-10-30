"use client";

import { useCallback, useEffect } from "react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "isomorphic-dompurify";

export interface TiptapEditorProps {
  content: string;
  onChange: (html: string, json: any) => void;
  disabled?: boolean;
}

export function TiptapEditor({ content, onChange, disabled = false }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        paragraph: {
          HTMLAttributes: {
            class: "mb-4",
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: "border-l-4 border-primary pl-4 italic my-4 opacity-80",
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: "list-disc ml-6 mb-4 space-y-1",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "list-decimal ml-6 mb-4 space-y-1",
          },
        },
        listItem: {
          HTMLAttributes: {
            class: "pl-2",
          },
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto my-4",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline hover:text-primary-focus cursor-pointer",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    ],
    content: content,
    editorProps: {
      attributes: {
        class:
          "prose prose-lg max-w-none focus:outline-none min-h-[400px] p-4 prose-headings:font-bold prose-h1:text-4xl prose-h1:mt-8 prose-h1:mb-4 prose-h2:text-3xl prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-2xl prose-h3:mt-4 prose-h3:mb-2 prose-p:mb-4 prose-p:leading-relaxed",
      },
      // Sanitize pasted HTML content to prevent XSS and malformed content
      transformPastedHTML(html) {
        // Use DOMPurify with minimal restrictions - only block truly dangerous content
        return DOMPurify.sanitize(html, {
          // Don't use ALLOWED_TAGS - use default (allow most tags)
          // Only explicitly forbid dangerous tags
          FORBID_TAGS: ["script", "iframe", "object", "embed", "style"],
          FORBID_ATTR: [
            "onerror",
            "onload",
            "onclick",
            "onmouseover",
            "onmouseenter",
            "onfocus",
            "onblur",
            "onsubmit",
            "onchange",
          ],
          KEEP_CONTENT: true, // Keep text content when removing tags
          ADD_TAGS: [
            "p",
            "br",
            "strong",
            "em",
            "u",
            "h1",
            "h2",
            "h3",
            "ul",
            "ol",
            "li",
            "a",
            "img",
            "blockquote",
            "code",
            "pre",
          ],
        });
      },
      // Handle plain text paste - keep as-is (Tiptap will escape it safely)
      transformPastedText(text) {
        // Don't modify plain text - Tiptap automatically escapes it
        return text;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const json = editor.getJSON();
      onChange(html, json);
    },
    editable: !disabled,
    immediatelyRender: false, // Fix SSR hydration mismatch
  });

  useEffect(() => {
    if (editor && disabled !== undefined) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  const addImage = useCallback(() => {
    if (!editor) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;

      if (files && files.length > 0) {
        Array.from(files).forEach(file => {
          const reader = new FileReader();

          reader.onload = e => {
            const base64 = e.target?.result as string;
            if (editor) {
              editor.chain().focus().setImage({ src: base64 }).run();
            }
          };

          reader.readAsDataURL(file);
        });
      }
    };

    input.click();
  }, [editor]);

  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes("link").href;
    const url = window.prompt("URL:", previousUrl);

    if (url === null) {
      return;
    }

    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    // Add https:// if no protocol is specified
    let finalUrl = url;
    if (!/^https?:\/\//i.test(url)) {
      finalUrl = `https://${url}`;
    }

    editor?.chain().focus().extendMarkRange("link").setLink({ href: finalUrl }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-base-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-base-200 border-b border-base-300 p-2 flex flex-wrap gap-1">
        {/* Text Formatting */}
        <div className="flex gap-1 border-r border-base-300 pr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run() || disabled}
            className={`btn btn-sm btn-square ${editor.isActive("bold") ? "btn-active" : "btn-ghost"}`}
            title="Bold"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M12.5 4.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5H8v-5h4.5zm-1 7c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5H8v-5h3.5zM6 3v14h5.5c2.49 0 4.5-2.01 4.5-4.5 0-1.48-.71-2.79-1.81-3.62C15.29 8.05 16 6.74 16 5.25 16 2.76 14.24 1 11.5 1H6v2z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run() || disabled}
            className={`btn btn-sm btn-square ${editor.isActive("italic") ? "btn-active" : "btn-ghost"}`}
            title="Italic"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4h-8z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run() || disabled}
            className={`btn btn-sm btn-square ${editor.isActive("strike") ? "btn-active" : "btn-ghost"}`}
            title="Strikethrough"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 4c-1.66 0-3 1.34-3 3v1h2V7c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1h2V7c0-1.66-1.34-3-3-3h-3zm-5 7v2h10v-2H5zm2 4v1c0 .55.45 1 1 1h3c.55 0 1-.45 1-1v-1h2v1c0 1.66-1.34 3-3 3H8c-1.66 0-3-1.34-3-3v-1h2z" />
            </svg>
          </button>
        </div>

        {/* Headings */}
        <div className="flex gap-1 border-r border-base-300 pr-2">
          <button
            type="button"
            onClick={() => {
              if (editor.isActive("heading", { level: 1 })) {
                editor.chain().focus().setParagraph().run();
              } else {
                editor.chain().focus().setHeading({ level: 1 }).run();
              }
            }}
            className={`btn btn-sm ${editor.isActive("heading", { level: 1 }) ? "btn-active" : "btn-ghost"}`}
            disabled={disabled}
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => {
              if (editor.isActive("heading", { level: 2 })) {
                editor.chain().focus().setParagraph().run();
              } else {
                editor.chain().focus().setHeading({ level: 2 }).run();
              }
            }}
            className={`btn btn-sm ${editor.isActive("heading", { level: 2 }) ? "btn-active" : "btn-ghost"}`}
            disabled={disabled}
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => {
              if (editor.isActive("heading", { level: 3 })) {
                editor.chain().focus().setParagraph().run();
              } else {
                editor.chain().focus().setHeading({ level: 3 }).run();
              }
            }}
            className={`btn btn-sm ${editor.isActive("heading", { level: 3 }) ? "btn-active" : "btn-ghost"}`}
            disabled={disabled}
            title="Heading 3"
          >
            H3
          </button>
        </div>

        {/* Lists */}
        <div className="flex gap-1 border-r border-base-300 pr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`btn btn-sm btn-square ${editor.isActive("bulletList") ? "btn-active" : "btn-ghost"}`}
            disabled={disabled}
            title="Bullet List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4h2v2H4V4zm0 5h2v2H4V9zm0 5h2v2H4v-2zm4-10h8v2H8V4zm0 5h8v2H8V9zm0 5h8v2H8v-2z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`btn btn-sm btn-square ${editor.isActive("orderedList") ? "btn-active" : "btn-ghost"}`}
            disabled={disabled}
            title="Numbered List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4H4v3H3v1h3V7H5V4zm-1 8h1v3h1v1H3v-1h1v-2H3v-1h1v-1zm1 5v1H3v-1h3zM8 4h8v2H8V4zm0 5h8v2H8V9zm0 5h8v2H8v-2z" />
            </svg>
          </button>
        </div>

        {/* Insert */}
        <div className="flex gap-1 border-r border-base-300 pr-2">
          <button
            type="button"
            onClick={setLink}
            className={`btn btn-sm btn-square ${editor.isActive("link") ? "btn-active" : "btn-ghost"}`}
            disabled={disabled}
            title="Add Link"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={addImage}
            className="btn btn-sm btn-square btn-ghost"
            disabled={disabled}
            title="Add Image"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`btn btn-sm btn-square ${editor.isActive("blockquote") ? "btn-active" : "btn-ghost"}`}
            disabled={disabled}
            title="Quote"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 6h2v4H6V6zm0 5h2v3H6v-3zM9 6h2v4H9V6zm0 5h2v3H9v-3zm3-5h2v4h-2V6zm0 5h2v3h-2v-3z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`btn btn-sm btn-square ${editor.isActive("codeBlock") ? "btn-active" : "btn-ghost"}`}
            disabled={disabled}
            title="Code Block"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run() || disabled}
            className="btn btn-sm btn-square btn-ghost"
            title="Undo"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run() || disabled}
            className="btn btn-sm btn-square btn-ghost"
            title="Redo"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M12.293 3.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 9H9a5 5 0 00-5 5v2a1 1 0 11-2 0v-2a7 7 0 017-7h5.586l-2.293-2.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="bg-base-100">
        <EditorContent editor={editor} />
      </div>

      {/* Character Count */}
      <div className="bg-base-200 border-t border-base-300 px-4 py-2 text-xs opacity-60 text-right">
        {editor.getText().length} characters
      </div>
    </div>
  );
}
