// Feature: Exposes payment server actions that orchestrate PayPal order creation and capture flows.
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

// Run the PayPal capture flow and persist the resulting paid order.
export async function postPayPalCaptureAction(
  req: Request,
  ctx: { params: Promise<{ orderId: string }> },
) {
  // Feature: delegate to route-handler so API and server action share capture behavior.
  return postPayPalCaptureRoute(req, ctx);
}
