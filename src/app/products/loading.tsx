export default function Loading() {
  return (
    <div role="status" className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
        <span className="text-sm text-gray-600">Loading products...</span>
      </div>
    </div>
  );
}
