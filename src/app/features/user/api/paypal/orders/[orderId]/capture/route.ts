import { postPayPalCaptureAction } from "@/backend/modules/payment";

// Delegates PayPal capture flow to shared backend action.
export async function POST(
  req: Request,
  ctx: { params: Promise<{ orderId: string }> },
) {
  return postPayPalCaptureAction(req, ctx);
}
