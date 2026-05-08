"use client";

import { useState } from "react";
import Link from "next/link";
import type { DigitalProduct } from "@/lib/domain/digital";
import type { Role } from "@/lib/domain/auth";

export interface DigitalProductManagementProps {
  readonly initialProducts: ReadonlyArray<DigitalProduct>;
  readonly userRole: Role;
  readonly tenantId: string;
  readonly baseUrl: string;
  readonly error?: string;
}

export function DigitalProductManagement({
  initialProducts,
  userRole,
  error,
}: DigitalProductManagementProps) {
  const [products] = useState<readonly DigitalProduct[]>(initialProducts);
  const canMutate = userRole === "operator" || userRole === "admin";

  if (products.length === 0) {
    return (
      <section data-testid="digital-products-empty" className="rounded border border-dashed border-gray-300 p-6 text-sm text-gray-600">
        <h2 className="text-lg font-semibold">No digital products yet</h2>
        <p className="mt-1">
          Upload your first PDF, video, or other downloadable artefact to start issuing licences.
        </p>
        {canMutate ? (
          <Link
            href="/admin/digital-products/new"
            className="mt-3 inline-block rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Add a digital product
          </Link>
        ) : null}
        {error ? (
          <p data-testid="digital-products-error" className="mt-2 text-rose-700">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Digital products</h2>
        {canMutate ? (
          <Link
            href="/admin/digital-products/new"
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            New
          </Link>
        ) : null}
      </header>
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="w-1/4 py-1">SKU</th>
            <th className="w-1/3 py-1">Name</th>
            <th className="w-1/6 py-1">Version</th>
            <th className="w-1/6 py-1">Size</th>
            <th className="w-1/6 py-1">Updated</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} data-testid={`digital-product-row-${p.id}`} className="border-t border-gray-200">
              <td className="py-1 font-mono text-xs">{p.sku}</td>
              <td className="py-1">
                <Link href={`/admin/digital-products/${p.id}`} className="text-emerald-700 hover:underline">
                  {p.name}
                </Link>
              </td>
              <td className="py-1">{p.version}</td>
              <td className="py-1">{formatBytes(p.fileSize)}</td>
              <td className="py-1">{p.updatedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
