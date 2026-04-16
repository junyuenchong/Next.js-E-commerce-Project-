"use client";

import { useMemo, useState } from "react";

type InvoiceDialogProps = {
  invoiceNumber: string;
  issuedAt?: string;
  status?: string;
  downloadUrl: string;
  initialContent?: string;
  triggerLabel?: string;
};

export default function InvoiceDialog({
  invoiceNumber,
  issuedAt,
  status,
  downloadUrl,
  initialContent,
  triggerLabel = "View invoice",
}: InvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const previewContent = useMemo(
    () => (initialContent ?? "").trim(),
    [initialContent],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        {triggerLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b px-4 py-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Invoice {invoiceNumber}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  {issuedAt
                    ? `Issued ${new Date(issuedAt).toLocaleString()}`
                    : ""}
                  {issuedAt && status ? " · " : ""}
                  {status ? `Status: ${status}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto px-4 py-3">
              {previewContent ? (
                <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-800">
                  {previewContent}
                </pre>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Invoice preview is not available in this response.
                  </p>
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    Open invoice
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <a
                href={downloadUrl}
                className="rounded-md bg-black px-3 py-2 text-xs font-medium text-white hover:bg-gray-800"
              >
                Download invoice
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
