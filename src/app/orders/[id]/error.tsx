"use client";

export default function OrderError({ reset }: { readonly reset: () => void }) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
        <h1 className="text-xl font-semibold">Unable to load order</h1>
        <p className="mt-2 text-sm">The order service did not return confirmation details.</p>
        <button className="mt-4 rounded-md bg-red-700 px-4 py-2 text-sm text-white" type="button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
