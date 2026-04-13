import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import {
  clearCheckoutCouponCookie,
  readCheckoutCouponCode,
} from "@/app/lib/checkout-coupon-cookie";
import { summarizeCartLines } from "@/app/lib/cart";
import { getCartWithLiveProductsService } from "@/backend/modules/cart/cart.service";
import { clearCart } from "@/backend/modules/cart";
import { resolveCheckoutCouponPricing } from "@/backend/modules/coupon/coupon.service";
import type { CartItemRowData } from "@/app/modules/user/types";
import {
  paypalCaptureOrder,
  paypalExtractCaptureId,
  paypalGetOrder,
  paypalOrderAmount,
} from "@/app/lib/paypal";
import { sendTransactionalEmail } from "@/app/lib/email";
import { sendTwilioSms } from "@/app/lib/twilio";
import { publishAdminOrderEvent } from "@/app/lib/admin-events";
import { bustAdminAnalyticsCache } from "@/app/lib/admin-cache";
import {
  enqueueOrderEmailJob,
  enqueueOrderInventoryJob,
} from "@/app/lib/rabbitmq";
import {
  buildPaidOrderLinesFromCart,
  createPaidOrderAfterCaptureService,
  decrementStockForOrderLinesService,
  getOrderIdByPayPalOrderIdService,
  validateCartStockForOrder,
} from "@/backend/modules/order/order.service";

const DEFAULT_CURRENCY = (
  process.env.PAYPAL_CURRENCY ||
  process.env.NEXT_PUBLIC_PAYPAL_CURRENCY ||
  "MYR"
).trim();

function parseCaptureBody(raw: string): {
  smsTo: string;
  shipping: {
    line1?: string | null;
    city?: string | null;
    postcode?: string | null;
    country?: string | null;
    method?: string | null;
  };
} {
  try {
    if (!raw.trim()) return { smsTo: "", shipping: {} };
    const j = JSON.parse(raw) as Record<string, unknown>;
    const smsTo = typeof j.smsTo === "string" ? j.smsTo.trim() : "";
    const s = j.shipping as Record<string, unknown> | undefined;
    const shipping = {
      line1: typeof s?.line1 === "string" ? s.line1 : null,
      city: typeof s?.city === "string" ? s.city : null,
      postcode: typeof s?.postcode === "string" ? s.postcode : null,
      country: typeof s?.country === "string" ? s.country : null,
      method: typeof s?.method === "string" ? s.method : null,
    };
    return { smsTo, shipping };
  } catch {
    return { smsTo: "", shipping: {} };
  }
}

function amountsMatch(a: string, b: string): boolean {
  return Math.abs(Number(a) - Number(b)) < 0.0001;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ orderId: string }> },
) {
  const rawBody = await req.text().catch(() => "");
  const { smsTo, shipping } = parseCaptureBody(rawBody);

  try {
    const { orderId } = await ctx.params;
    if (!orderId) {
      return NextResponse.json({ error: "missing_order" }, { status: 400 });
    }

    const existingId = await getOrderIdByPayPalOrderIdService(orderId);
    if (existingId !== null) {
      const dupRes = NextResponse.json({
        ok: true,
        duplicate: true,
        order: { id: existingId },
      });
      clearCheckoutCouponCookie(dupRes);
      return dupRes;
    }

    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as
      | { id?: string; email?: string | null }
      | undefined;
    const userId =
      sessionUser?.id !== undefined
        ? parseInt(String(sessionUser.id), 10)
        : NaN;
    const resolvedUserId = Number.isFinite(userId) ? userId : null;
    const sessionEmail =
      sessionUser?.email?.trim() ||
      (session?.user as { email?: string } | undefined)?.email?.trim() ||
      null;

    const cart = await getCartWithLiveProductsService();
    if (!cart?.items?.length) {
      return NextResponse.json({ error: "empty_cart" }, { status: 400 });
    }

    const cartLines = cart.items as Parameters<
      typeof validateCartStockForOrder
    >[0];
    const stockCheck = validateCartStockForOrder(cartLines);
    if (!stockCheck.ok) {
      return NextResponse.json(
        { error: "insufficient_stock", productId: stockCheck.productId },
        { status: 409 },
      );
    }

    const { totalPrice } = summarizeCartLines(cart.items as CartItemRowData[]);
    const couponCode = await readCheckoutCouponCode();
    const priced = await resolveCheckoutCouponPricing({
      subtotal: totalPrice,
      couponCode,
      userId: resolvedUserId,
    });
    if (!priced.ok) {
      return NextResponse.json({ error: priced.error }, { status: 400 });
    }
    const expectedValue = priced.total.toFixed(2);

    const remote = await paypalGetOrder(orderId);
    const remoteAmt = paypalOrderAmount(remote);
    if (
      !remoteAmt ||
      remoteAmt.currencyCode.toUpperCase() !== DEFAULT_CURRENCY.toUpperCase() ||
      !amountsMatch(remoteAmt.value, expectedValue)
    ) {
      return NextResponse.json(
        { error: "cart_amount_mismatch_refresh_cart" },
        { status: 409 },
      );
    }

    const { ok, json } = await paypalCaptureOrder(orderId);
    if (!ok) {
      return NextResponse.json(
        { error: "capture_failed", details: json },
        { status: 502 },
      );
    }

    const paypalCaptureId = paypalExtractCaptureId(json);
    const lines = buildPaidOrderLinesFromCart(cartLines);

    const useAsyncFulfillment = Boolean(process.env.RABBITMQ_URL?.trim());

    let dbOrderId: number;
    try {
      const orderRow = await createPaidOrderAfterCaptureService(
        {
          userId: resolvedUserId,
          emailSnapshot: sessionEmail,
          currency: DEFAULT_CURRENCY,
          total: Number(expectedValue),
          paypalOrderId: orderId,
          paypalCaptureId,
          lines,
          couponId: priced.couponId,
          couponCodeSnapshot: priced.codeSnapshot,
          discountAmount: priced.discountAmount,
          shippingLine1: shipping.line1,
          shippingCity: shipping.city,
          shippingPostcode: shipping.postcode,
          shippingCountry: shipping.country,
          shippingMethod: shipping.method,
        },
        { skipStockDecrement: useAsyncFulfillment },
      );
      dbOrderId = orderRow.id;
      void publishAdminOrderEvent({
        kind: "updated",
        id: dbOrderId,
        status: "paid",
      });
      void bustAdminAnalyticsCache();
    } catch (e) {
      console.error("[paypal/capture] persist order failed after PayPal OK", e);
      return NextResponse.json(
        {
          error: "order_persist_failed",
          hint: "Payment may have succeeded; contact support with PayPal order id.",
        },
        { status: 500 },
      );
    }

    await clearCart();

    const linesText = lines
      .map((i) => `${i.title} x${i.quantity} @ ${i.unitPrice}`)
      .join("\n");

    const inventoryLines = lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
    }));

    if (useAsyncFulfillment) {
      let inventoryEnqueued = false;
      let emailEnqueued = false;
      try {
        await enqueueOrderInventoryJob({
          v: 1,
          orderId: dbOrderId,
          lines: inventoryLines,
        });
        inventoryEnqueued = true;
        if (sessionEmail) {
          await enqueueOrderEmailJob({
            v: 1,
            orderId: dbOrderId,
            to: sessionEmail,
            subject: `Order #${dbOrderId} — payment received`,
            text: `Thank you. Your order is recorded.\n\nOrder #${dbOrderId}\nPayPal: ${orderId}\nTotal: ${DEFAULT_CURRENCY} ${expectedValue}\n\n${linesText}`,
          });
          emailEnqueued = true;
        }
      } catch (e) {
        console.error(
          "[paypal/capture] RabbitMQ enqueue failed; applying sync inventory + email",
          e,
        );
        if (!inventoryEnqueued) {
          await decrementStockForOrderLinesService(inventoryLines);
        }
        if (sessionEmail && !emailEnqueued) {
          await sendTransactionalEmail({
            to: sessionEmail,
            subject: `Order #${dbOrderId} — payment received`,
            text: `Thank you. Your order is recorded.\n\nOrder #${dbOrderId}\nPayPal: ${orderId}\nTotal: ${DEFAULT_CURRENCY} ${expectedValue}\n\n${linesText}`,
          });
        }
      }
    } else if (sessionEmail) {
      await sendTransactionalEmail({
        to: sessionEmail,
        subject: `Order #${dbOrderId} — payment received`,
        text: `Thank you. Your order is recorded.\n\nOrder #${dbOrderId}\nPayPal: ${orderId}\nTotal: ${DEFAULT_CURRENCY} ${expectedValue}\n\n${linesText}`,
      });
    }

    if (smsTo) {
      await sendTwilioSms({
        to: smsTo,
        body: `CJY E-Commerce: order #${dbOrderId} paid ${DEFAULT_CURRENCY} ${expectedValue}. PayPal ${orderId}`,
      });
    }

    const okRes = NextResponse.json({
      ok: true,
      capture: json,
      order: { id: dbOrderId },
    });
    clearCheckoutCouponCookie(okRes);
    return okRes;
  } catch (e) {
    console.error("[paypal/capture]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
