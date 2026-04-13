export default function LoadError({
  message,
  title,
}: {
  message?: string;
  /** When set, shown as the primary line (search / list errors). */
  title?: string;
}) {
  const primary = title ?? message ?? "Something went wrong. Please try again.";
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800">
      {primary}
    </div>
  );
}
