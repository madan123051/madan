import Link from "next/link";

type BrandLogoProps = {
  className?: string;
  href?: string;
};

export function BrandLogo({ className = "", href = "/" }: BrandLogoProps) {
  return (
    <Link
      className={`brand-mark ${className}`.trim()}
      href={href}
      aria-label="Madan Wilds Aura home"
    >
      <span className="brand-logo-mark" aria-hidden="true">
        <span className="brand-logo-lens" />
        <span className="brand-logo-letter">M</span>
      </span>
      <span className="brand-copy">
        <strong>Madan</strong>
        <small>Wilds Aura</small>
      </span>
    </Link>
  );
}
