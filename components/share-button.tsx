"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

type ShareButtonProps = {
  className?: string;
  label?: string;
  text?: string;
  title?: string;
  url?: string;
};

export function ShareButton({
  className = "",
  label = "Share",
  text = "Photography by Madan Shrestha",
  title = "Madan Wilds Aura",
  url,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareUrl = url || window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className={`share-button ${className}`.trim()} type="button" onClick={() => void handleShare()}>
      {copied ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
      {copied ? "Link copied" : label}
    </button>
  );
}
