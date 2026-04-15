import { postPayPalCaptureAction } from "@/backend/modules/payment";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ orderId: string }> },
) {
  return postPayPalCaptureAction(req, ctx);
}
