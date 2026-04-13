/** Checkout: server passes PayPal client id / currency to client. */
import CheckoutClient from "@/app/modules/user/client/components/Checkout/CheckoutClient";

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
    <CheckoutClient
      paypalClientId={paypalClientId}
      paypalCurrency={paypalCurrency}
    />
  );
}
