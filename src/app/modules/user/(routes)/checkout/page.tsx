/** Checkout: server passes PayPal client id / currency to client. */
import Checkout from "@/app/modules/user/components/client/Checkout/Checkout";

export default function CheckoutPage() {
  const paypalClientId =
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim() ||
    process.env.PAYPAL_CLIENT_ID?.trim() ||
    "";
  const paypalCurrency = (
    process.env.NEXT_PUBLIC_PAYPAL_CURRENCY ||
    process.env.PAYPAL_CURRENCY ||
    "MYR"
  ).trim();

  return (
    <Checkout paypalClientId={paypalClientId} paypalCurrency={paypalCurrency} />
  );
}
