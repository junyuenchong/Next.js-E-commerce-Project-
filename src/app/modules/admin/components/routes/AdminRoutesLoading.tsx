export default function AdminRoutesLoading() {
  return (
    <div className="animate-pulse space-y-6 max-w-4xl">
      <div className="h-8 w-48 rounded bg-gray-200" />
      <div className="h-4 w-full max-w-xl rounded bg-gray-100" />
      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <div className="h-4 w-full rounded bg-gray-100" />
        <div className="h-4 max-w-2xl rounded bg-gray-100" />
        <div className="h-32 w-full rounded bg-gray-50" />
      </div>
    </div>
  );
}
