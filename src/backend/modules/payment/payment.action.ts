// exposes payment server actions that orchestrate PayPal order creation and capture flows.
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

/**
 * Handles post pay pal capture action.
 */
export async function postPayPalCaptureAction(
  req: Request,
  ctx: { params: Promise<{ orderId: string }> },
) {
  // delegate to route-handler so API and server action share capture behavior.
  return postPayPalCaptureRoute(req, ctx);
}
