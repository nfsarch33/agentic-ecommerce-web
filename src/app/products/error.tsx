"use client";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  return (
    <div role="alert" className="mx-auto max-w-6xl px-6 py-12">
      <div className="rounded-md border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
        <p className="mt-2 text-sm text-red-700">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
