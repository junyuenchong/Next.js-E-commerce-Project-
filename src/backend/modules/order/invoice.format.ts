type InvoiceLine = {
  title?: string;
  quantity?: number;
  unitPrice?: number;
};

type InvoiceLike = {
  invoiceNumber: string;
  issuedAt: Date;
  billedEmail: string | null;
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  couponCode: string | null;
  orderId: number;
  lineItems: unknown;
};

function parseLines(value: unknown): InvoiceLine[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (line): line is InvoiceLine => typeof line === "object" && line !== null,
  );
}

/**
 * Render a plain-text invoice summary.
 */
export function renderInvoiceText(invoice: InvoiceLike): string {
  const lines = parseLines(invoice.lineItems);
  const bodyLines = lines.length
    ? lines
        .map((line) => {
          const title = line.title ?? "Item";
          const quantity = line.quantity ?? 0;
          const unitPrice = line.unitPrice ?? 0;
          return `- ${title} x${quantity} @ ${unitPrice.toFixed(2)}`;
        })
        .join("\n")
    : "- No line items snapshot";

  return [
    `Invoice ${invoice.invoiceNumber}`,
    `Order #${invoice.orderId}`,
    `Issued at: ${invoice.issuedAt.toISOString()}`,
    `Billed email: ${invoice.billedEmail ?? "-"}`,
    "",
    "Items:",
    bodyLines,
    "",
    `Subtotal: ${invoice.currency} ${invoice.subtotal.toFixed(2)}`,
    `Discount: ${invoice.currency} ${invoice.discount.toFixed(2)}${invoice.couponCode ? ` (${invoice.couponCode})` : ""}`,
    `Total: ${invoice.currency} ${invoice.total.toFixed(2)}`,
  ].join("\n");
}
