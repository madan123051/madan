"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type HeroImage = { url: string; alt?: string };

const fallbackImage: HeroImage = {
  url: "/images/madan-profile.webp",
  alt: "Portrait of Madan Shrestha, photographer behind Madan Wilds Aura",
};

export function HeroRotator() {
  const [images, setImages] = useState<HeroImage[]>([fallbackImage]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHeroImages() {
      try {
        const response = await fetch("/api/hero", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as { images?: HeroImage[] };
        const nextImages = (payload.images ?? []).filter((image) => image.url).slice(0, 5);
        if (response.ok && nextImages.length) setImages(nextImages);
      } catch {
        // The local portrait remains visible when Firebase is unavailable.
      }
    }

    void loadHeroImages();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (images.length < 2) return;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, 6500);
    return () => window.clearInterval(interval);
  }, [images.length]);

  return (
    <div className="hero-rotator" aria-live="off">
      {images.map((image, index) => (
        <Image
          className={index === activeIndex ? "hero-image active" : "hero-image"}
          src={image.url}
          alt={index === activeIndex ? image.alt || "Madan Wilds Aura photography" : ""}
          aria-hidden={index !== activeIndex}
          fill
          key={image.url}
          priority={index === 0}
          sizes="100vw"
          unoptimized
        />
      ))}
      {images.length > 1 ? (
        <div className="hero-dots" aria-label="Hero image position">
          {images.map((image, index) => (
            <button
              aria-label={`Show hero image ${index + 1}`}
              className={index === activeIndex ? "active" : ""}
              key={image.url}
              onClick={() => setActiveIndex(index)}
              type="button"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
