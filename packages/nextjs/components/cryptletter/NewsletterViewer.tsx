"use client";

import { useEffect, useState } from "react";
import { createIPFSClient, decryptImage } from "@fhevm-sdk";
import DOMPurify from "isomorphic-dompurify";

/**
 * NewsletterViewer Component
 *
 * Renders Tiptap HTML content with proper styling
 * Supports both preview mode (base64 images) and published mode (IPFS images)
 * Handles encrypted image decryption automatically
 */

interface NewsletterViewerProps {
  content: string; // Tiptap HTML output
  aesKey?: Uint8Array; // AES key for decrypting encrypted images (optional)
}

export function NewsletterViewer({ content, aesKey }: NewsletterViewerProps) {
  const [processedContent, setProcessedContent] = useState(content);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Process encrypted images if AES key is provided
    const processEncryptedImages = async () => {
      // First, clean up any HTML-like text that appears as literal text in the content
      // This handles cases where XSS payloads were stored as escaped text
      let cleanedContent = content;

      // Remove text nodes that contain HTML-like patterns (tags, entities, etc)
      // Only remove if they look like XSS attempts (script, xml declarations, etc)
      cleanedContent = cleanedContent
        .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags as text
        .replace(/<\?xml[^>]*>.*?>/gi, "") // Remove XML declarations
        .replace(/<!DOCTYPE[^>]*>/gi, "") // Remove DOCTYPE declarations
        .replace(/<!\[CDATA\[.*?\]\]>/gi, ""); // Remove CDATA sections
      // Note: We don't remove img tags here - DOMPurify will handle proper sanitization

      // Sanitize content to prevent XSS attacks
      const sanitizedContent = DOMPurify.sanitize(cleanedContent, {
        ALLOWED_TAGS: [
          "p",
          "br",
          "strong",
          "em",
          "u",
          "s",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "ul",
          "ol",
          "li",
          "blockquote",
          "a",
          "code",
          "pre",
          "img",
          "span",
          "div",
        ],
        ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "title", "class", "data-encrypted", "data-ipfs-cid"],
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        // Remove dangerous tags completely (including their content)
        FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "link", "meta", "title", "base"],
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
      });

      // Check if content has encrypted images
      if (!sanitizedContent.includes('data-encrypted="true"') || !aesKey) {
        setProcessedContent(sanitizedContent);
        return;
      }

      setIsProcessing(true);

      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(sanitizedContent, "text/html");
        const encryptedImages = doc.querySelectorAll('img[data-encrypted="true"]');

        if (encryptedImages.length === 0) {
          setProcessedContent(sanitizedContent);
          setIsProcessing(false);
          return;
        }

        // Initialize IPFS client
        const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT;
        const ipfsGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY
          ? `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}`
          : undefined;

        if (!pinataJwt) {
          console.warn("IPFS JWT not configured, encrypted images will not be decrypted");
          setProcessedContent(sanitizedContent);
          setIsProcessing(false);
          return;
        }

        const ipfsClient = createIPFSClient({ jwt: pinataJwt, gateway: ipfsGateway });

        // Decrypt each image
        for (const img of Array.from(encryptedImages)) {
          try {
            const imgElement = img as HTMLImageElement;
            const ipfsCid = imgElement.getAttribute("data-ipfs-cid");

            if (!ipfsCid) continue;

            // Download encrypted image from IPFS
            const encryptedData = await ipfsClient.downloadFromIPFS(ipfsCid);

            // Decrypt image
            const decryptedData = await decryptImage(encryptedData, aesKey);

            // Detect MIME type from first bytes
            let mimeType = "image/jpeg"; // default
            if (decryptedData[0] === 0x89 && decryptedData[1] === 0x50) {
              mimeType = "image/png";
            } else if (decryptedData[0] === 0xff && decryptedData[1] === 0xd8) {
              mimeType = "image/jpeg";
            } else if (decryptedData[0] === 0x47 && decryptedData[1] === 0x49) {
              mimeType = "image/gif";
            } else if (decryptedData[0] === 0x52 && decryptedData[1] === 0x49) {
              mimeType = "image/webp";
            }

            // Convert to base64 data URL
            const blob = new Blob([decryptedData], { type: mimeType });
            const dataUrl = await new Promise<string>(resolve => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });

            // Replace image src with decrypted data URL
            imgElement.src = dataUrl;
            imgElement.removeAttribute("data-encrypted");
            imgElement.removeAttribute("data-ipfs-cid");
          } catch (error) {
            console.error("Failed to decrypt image:", error);
            // Leave the broken image
          }
        }

        // Serialize back to HTML and sanitize again after processing
        const finalContent = DOMPurify.sanitize(doc.body.innerHTML, {
          ALLOWED_TAGS: [
            "p",
            "br",
            "strong",
            "em",
            "u",
            "s",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "ul",
            "ol",
            "li",
            "blockquote",
            "a",
            "code",
            "pre",
            "img",
            "span",
            "div",
          ],
          ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "title", "class"],
          ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
          // Remove dangerous tags completely (including their content)
          FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "link", "meta", "title", "base"],
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
        });
        setProcessedContent(finalContent);
      } catch (error) {
        console.error("Failed to process encrypted images:", error);
        setProcessedContent(sanitizedContent);
      } finally {
        setIsProcessing(false);
      }
    };

    processEncryptedImages();
  }, [content, aesKey]);

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center py-8 opacity-60">
        <span className="loading loading-spinner loading-md mr-3"></span>
        <span>Loading images...</span>
      </div>
    );
  }

  return <div className="newsletter-viewer-wrapper" dangerouslySetInnerHTML={{ __html: processedContent }} />;
}
