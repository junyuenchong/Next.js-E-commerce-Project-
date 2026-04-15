import {
  paypalCaptureOrder,
  paypalCreateOrder,
  paypalExtractCaptureId,
  paypalGetOrder,
  paypalOrderAmount,
} from "./paypal.service";
import { postPayPalCaptureRoute } from "./paypal-capture.route-handler";

export {
  paypalCaptureOrder,
  paypalCreateOrder,
  paypalExtractCaptureId,
  paypalGetOrder,
  paypalOrderAmount,
};

export async function postPayPalCaptureAction(
  req: Request,
  ctx: { params: Promise<{ orderId: string }> },
) {
  return postPayPalCaptureRoute(req, ctx);
}
