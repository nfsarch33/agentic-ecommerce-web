"use client";

import type { ProductType } from "@/lib/domain/digital";
import { isProductType } from "@/lib/domain/digital";

export interface ProductTypeSelectorProps {
  readonly value: ProductType;
  readonly onChange: (next: ProductType) => void;
  readonly disabled?: boolean;
}

const OPTIONS: ReadonlyArray<{ value: ProductType; label: string; description: string }> = [
  {
    value: "physical",
    label: "Physical",
    description: "Tangible item shipped to the customer.",
  },
  {
    value: "digital",
    label: "Digital",
    description: "Downloadable file delivered via signed URL after purchase.",
  },
  {
    value: "membership",
    label: "Membership",
    description: "Recurring subscription managed under the membership context.",
  },
];

export function ProductTypeSelector({ value, onChange, disabled }: ProductTypeSelectorProps) {
  return (
    <fieldset
      role="radiogroup"
      aria-label="Product type"
      data-testid="product-type-selector"
      className="space-y-2"
    >
      <legend className="sr-only">Product type</legend>
      {OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className={[
            "flex items-start gap-2 rounded border p-2 text-sm",
            value === opt.value ? "border-emerald-500 bg-emerald-50" : "border-gray-200",
          ].join(" ")}
        >
          <input
            type="radio"
            name="product-type"
            value={opt.value}
            disabled={disabled}
            checked={value === opt.value}
            onChange={(e) => {
              const next = e.target.value;
              if (isProductType(next)) onChange(next);
            }}
            data-testid={`product-type-${opt.value}`}
          />
          <div>
            <div className="font-medium">{opt.label}</div>
            <div className="text-xs text-gray-600">{opt.description}</div>
          </div>
        </label>
      ))}
    </fieldset>
  );
}
