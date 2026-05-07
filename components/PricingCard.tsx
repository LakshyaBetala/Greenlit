"use client";

import { Check } from "lucide-react";

interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  featured?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  badge?: string;
}

export default function PricingCard({
  name,
  price,
  period = "/mo",
  description,
  features,
  featured = false,
  ctaLabel = "Get Started",
  ctaHref = "#",
  badge,
}: PricingCardProps) {
  return (
    <div className={`surface-card flex flex-col p-8 ${featured ? 'border-2' : ''}`} style={{ borderColor: featured ? 'var(--text-primary)' : 'var(--border-subtle)' }} id={`pricing-${name.toLowerCase()}`}>
      {/* Badge */}
      {badge && (
        <div className="mb-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-black text-white">
            {badge}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h3 className="text-headline mb-1" style={{ fontSize: "1.25rem" }}>
          {name}
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          {description}
        </p>
      </div>

      {/* Price */}
      <div className="mb-8">
        <span className="text-headline" style={{
          fontSize: "3rem",
          letterSpacing: "-0.05em",
        }}>
          {price}
        </span>
        {period && (
          <span style={{ color: "var(--text-tertiary)", fontSize: "0.875rem", marginLeft: "4px" }}>
            {period}
          </span>
        )}
      </div>

      {/* Features */}
      <ul className="flex flex-col gap-4 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <Check
              className="w-4 h-4 flex-shrink-0 mt-0.5"
              style={{ color: featured ? "var(--almmatix-red)" : "var(--status-success)" }}
            />
            <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <a
        href={ctaHref}
        className={`btn ${featured ? "btn-primary" : "btn-outline"} w-full justify-center`}
        style={{ padding: "12px 24px", fontSize: "1rem" }}
      >
        {ctaLabel}
      </a>
    </div>
  );
}
