/**
 * paypal capture route handler
 * handle paypal capture route handler logic
 */
// handles PayPal capture webhook-like route flow with auth, validation, and order finalization.
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/backend/modules/auth";
import {
  clearCheckoutCouponCookie,
  readCheckoutCouponCode,
} from "@/app/lib/checkout-coupon-cookie";
import { summarizeCartLines } from "@/app/lib/cart";
import { getCartWithLiveProductsService } from "@/backend/modules/cart/cart.service";
import { clearCart } from "@/backend/modules/cart";
import { resolveCheckoutCouponPricing } from "@/backend/modules/coupon/coupon.service";
import type { CartItemRowData } from "@/app/features/user/types";
import {
  findPaymentByProviderOrderIdRepo,
  markPaymentFailedRepo,
  markPaymentPaidAndLinkOrderRepo,
  paypalCaptureOrder,
  paypalExtractCaptureId,
  paypalGetOrder,
  paypalOrderAmount,
  transitionPaymentStatusRepo,
} from "@/backend/modules/payment";
import { sendTransactionalEmail } from "@/backend/modules/notification";
import { sendTwilioSms } from "@/backend/modules/notification";
import { publishAdminOrderEvent } from "@/backend/modules/admin-events";
import {
  bustAdminAnalyticsCache,
  bustAdminCouponsListCache,
} from "@/backend/modules/admin-cache";
import {
  enqueueOrderAnalyticsJob,
  enqueueOrderEmailJob,
} from "@/backend/modules/messaging";
import {
  buildPaidOrderLinesFromCart,
  createPaidOrderAfterCaptureService,
  getOrderIdByPayPalOrderIdService,
  getInvoiceByOrderIdService,
  validateCartStockForOrder,
} from "@/backend/modules/order/order.service";
import { resolveUserId } from "@/backend/core/session";
import { deductStockOnPaid } from "@/backend/core/stock-policy";

const DEFAULT_CURRENCY = (
  process.env.PAYPAL_CURRENCY ||
  process.env.NEXT_PUBLIC_PAYPAL_CURRENCY ||
  "MYR"
).trim();
const WEBHOOK_TRUTH_MODE = process.env.PAYMENT_WEBHOOK_TRUTH === "1";

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
    // accept optional payload so capture still works with empty body.
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
  // decimal-safe equality check for money values represented as strings.
  return Math.abs(Number(a) - Number(b)) < 0.0001;
}

function jsonError(status: number, body: Record<string, unknown>) {
  // normalized JSON error helper for all early-return guards.
  return NextResponse.json(body, { status });
}

async function resolveCartOrError() {
  // capture requires a non-empty cart snapshot from current session.
  const cart = await getCartWithLiveProductsService();
  if (!cart?.items?.length) {
    return {
      ok: false as const,
      response: jsonError(400, { error: "empty_cart" }),
    };
  }
  return { ok: true as const, cart };
}

function validateCartStockOrError(cartItems: unknown) {
  // block capture when any item stock is stale/insufficient before charge.
  const cartLines = cartItems as Parameters<
    typeof validateCartStockForOrder
  >[0];
  const stockCheck = validateCartStockForOrder(cartLines);
  if (!stockCheck.ok) {
    return {
      ok: false as const,
      response: jsonError(409, {
        error: "insufficient_stock",
        productId: stockCheck.productId,
      }),
    };
  }
  return { ok: true as const, cartLines };
}

async function resolveExpectedTotalOrError(params: {
  cartItems: CartItemRowData[];
  resolvedUserId: number | null;
}) {
  // recompute totals server-side so coupon/subtotal are authoritative.
  const { totalPrice } = summarizeCartLines(params.cartItems);
  const couponCode = await readCheckoutCouponCode();
  const priced = await resolveCheckoutCouponPricing({
    subtotal: totalPrice,
    couponCode,
    userId: params.resolvedUserId,
  });
  if (!priced.ok) {
    return {
      ok: false as const,
      response: jsonError(400, { error: priced.error }),
    };
  }
  return { ok: true as const, priced, expectedValue: priced.total.toFixed(2) };
}

async function verifyRemoteAmountOrError(params: {
  orderId: string;
  expectedValue: string;
}) {
  // compare PayPal amount with local pricing to prevent amount drift.
  const remote = await paypalGetOrder(params.orderId);
  const remoteAmt = paypalOrderAmount(remote);
  if (
    !remoteAmt ||
    remoteAmt.currencyCode.toUpperCase() !== DEFAULT_CURRENCY.toUpperCase() ||
    !amountsMatch(remoteAmt.value, params.expectedValue)
  ) {
    return {
      ok: false as const,
      response: jsonError(409, { error: "cart_amount_mismatch_refresh_cart" }),
    };
  }
  return { ok: true as const, remote };
}

async function capturePayPalOrError(orderId: string) {
  // perform PayPal capture only after all local preconditions succeed.
  const { ok, json } = await paypalCaptureOrder(orderId);
  if (!ok) {
    return {
      ok: false as const,
      response: jsonError(502, { error: "capture_failed", details: json }),
    };
  }
  return { ok: true as const, json };
}

async function persistPaidOrderOrError(params: {
  orderId: string;
  paypalCaptureId: string | null;
  lines: ReturnType<typeof buildPaidOrderLinesFromCart>;
  priced: Awaited<ReturnType<typeof resolveCheckoutCouponPricing>> & {
    ok: true;
  };
  expectedValue: string;
  resolvedUserId: number | null;
  sessionEmail: string | null;
  shipping: {
    line1?: string | null;
    city?: string | null;
    postcode?: string | null;
    country?: string | null;
    method?: string | null;
  };
  useAsyncFulfillment: boolean;
  skipStockDecrement: boolean;
}) {
  try {
    // persist order and coupon consumption atomically via service/repo transaction.
    const orderRow = await createPaidOrderAfterCaptureService(
      {
        userId: params.resolvedUserId,
        emailSnapshot: params.sessionEmail,
        currency: DEFAULT_CURRENCY,
        total: Number(params.expectedValue),
        paypalOrderId: params.orderId,
        paypalCaptureId: params.paypalCaptureId,
        lines: params.lines,
        couponId: params.priced.couponId,
        couponCodeSnapshot: params.priced.codeSnapshot,
        discountAmount: params.priced.discountAmount,
        shippingLine1: params.shipping.line1,
        shippingCity: params.shipping.city,
        shippingPostcode: params.shipping.postcode,
        shippingCountry: params.shipping.country,
        shippingMethod: params.shipping.method,
      },
      { skipStockDecrement: params.skipStockDecrement },
    );
    const dbOrderId = orderRow.id;
    return { ok: true as const, dbOrderId };
  } catch (e) {
    console.error("[paypal/capture] persist order failed after PayPal OK", e);
    return {
      ok: false as const,
      response: jsonError(500, {
        error: "order_persist_failed",
        hint: "Payment may have succeeded; contact support with PayPal order id.",
      }),
    };
  }
}

function resolveSessionEmail(
  session: Awaited<ReturnType<typeof getServerSession>>,
): string | null {
  // email is optional; notifications are best-effort, not payment-critical.
  const sessionUser =
    (session as { user?: { email?: string | null } } | null)?.user ?? null;
  return sessionUser?.email?.trim() ?? null;
}

function paymentReceivedText(params: {
  dbOrderId: number;
  invoiceNumber: string | null;
  orderId: string;
  currency: string;
  expectedValue: string;
  linesText: string;
}) {
  return `Thank you. Your order is recorded.\n\nOrder #${params.dbOrderId}\nInvoice: ${params.invoiceNumber ?? "-"}\nPayPal: ${params.orderId}\nTotal: ${params.currency} ${params.expectedValue}\n\n${params.linesText}`;
}

async function runFulfillmentFlow(params: {
  useAsyncFulfillment: boolean;
  dbOrderId: number;
  inventoryLines: { productId: number; quantity: number }[];
  sessionEmail: string | null;
  orderId: string;
  expectedValue: string;
  linesText: string;
  invoiceNumber: string | null;
}) {
  const emailText = paymentReceivedText({
    dbOrderId: params.dbOrderId,
    invoiceNumber: params.invoiceNumber,
    orderId: params.orderId,
    currency: DEFAULT_CURRENCY,
    expectedValue: params.expectedValue,
    linesText: params.linesText,
  });

  if (params.useAsyncFulfillment) {
    // prefer async fulfillment when MQ is enabled for faster capture responses.
    let emailEnqueued = false;
    let analyticsEnqueued = false;
    try {
      await enqueueOrderAnalyticsJob({
        v: 1,
        orderId: params.dbOrderId,
        status: "paid",
      });
      analyticsEnqueued = true;

      if (params.sessionEmail) {
        await enqueueOrderEmailJob({
          v: 1,
          orderId: params.dbOrderId,
          to: params.sessionEmail,
          subject: `Order #${params.dbOrderId} — payment received`,
          text: emailText,
        });
        emailEnqueued = true;
      }
    } catch (e) {
      // keep order consistency if queue writes fail.
      console.error(
        "[paypal/capture] RabbitMQ enqueue failed; applying sync payment + analytics + email",
        e,
      );
      if (!analyticsEnqueued) {
        await bustAdminAnalyticsCache();
        await bustAdminCouponsListCache();
        await publishAdminOrderEvent({
          kind: "updated",
          id: params.dbOrderId,
          status: "paid",
        });
      }
      if (params.sessionEmail && !emailEnqueued) {
        await sendTransactionalEmail({
          to: params.sessionEmail,
          subject: `Order #${params.dbOrderId} — payment received`,
          text: emailText,
        });
      }
    }
    // Coupon redemption increments `coupon.usedCount` during persistence.
    // Bust coupons list cache so admin UI shows updated Uses immediately.
    await bustAdminCouponsListCache();
    return;
  }

  await bustAdminAnalyticsCache();
  await bustAdminCouponsListCache();
  await publishAdminOrderEvent({
    kind: "updated",
    id: params.dbOrderId,
    status: "paid",
  });
  if (params.sessionEmail) {
    await sendTransactionalEmail({
      to: params.sessionEmail,
      subject: `Order #${params.dbOrderId} — payment received`,
      text: emailText,
    });
  }
}

// Handle PayPal capture: validate cart/totals, capture payment, persist order, and fulfill.
export async function postPayPalCaptureRoute(
  req: Request,
  ctx: { params: Promise<{ orderId: string }> },
) {
  // guard-style early returns keep capture error mapping deterministic.
  const rawBody = await req.text().catch(() => "");
  const { smsTo, shipping } = parseCaptureBody(rawBody);

  try {
    const { orderId } = await ctx.params;
    if (!orderId) {
      return jsonError(400, { error: "missing_order" });
    }

    const payment = await findPaymentByProviderOrderIdRepo("PAYPAL", orderId);
    if (WEBHOOK_TRUTH_MODE && !payment) {
      return jsonError(409, { error: "payment_record_not_found" });
    }
    const existingId = await getOrderIdByPayPalOrderIdService(orderId);
    if (existingId !== null) {
      if (payment) {
        await markPaymentPaidAndLinkOrderRepo({
          paymentId: payment.id,
          orderId: existingId,
          providerCaptureId: null,
          gatewayResponse: { duplicateOrder: true },
        }).catch(() => null);
      }
      const dupRes = NextResponse.json({
        ok: true,
        duplicate: true,
        order: { id: existingId },
      });
      clearCheckoutCouponCookie(dupRes);
      return dupRes;
    }

    const resolvedUserId = await resolveUserId();
    const session = await getServerSession(authOptions);
    const sessionEmail = resolveSessionEmail(session);

    // keep chain linear so each failure returns the most specific HTTP error.
    const cartResolved = await resolveCartOrError();
    if (!cartResolved.ok) return cartResolved.response;
    const cart = cartResolved.cart;

    const stockResolved = validateCartStockOrError(cart.items);
    if (!stockResolved.ok) return stockResolved.response;
    const cartLines = stockResolved.cartLines;

    const expectedResolved = await resolveExpectedTotalOrError({
      cartItems: cart.items as CartItemRowData[],
      resolvedUserId,
    });
    if (!expectedResolved.ok) return expectedResolved.response;
    const { priced, expectedValue } = expectedResolved;

    const remoteOk = await verifyRemoteAmountOrError({
      orderId,
      expectedValue,
    });
    if (!remoteOk.ok) return remoteOk.response;

    const captureOk = await capturePayPalOrError(orderId);
    if (!captureOk.ok) {
      if (payment) {
        await markPaymentFailedRepo({
          paymentId: payment.id,
          reason: "paypal_capture_failed",
          gatewayResponse: { orderId, details: "capture_failed" },
        }).catch(() => null);
      }
      return captureOk.response;
    }
    const json = captureOk.json;

    const paypalCaptureId = paypalExtractCaptureId(json);

    if (WEBHOOK_TRUTH_MODE) {
      // In webhook-truth mode, capture only acknowledges gateway capture.
      // Final paid/cancelled/refunded transitions and order linking happen in webhook.
      if (payment) {
        await transitionPaymentStatusRepo({
          paymentId: payment.id,
          toStatus: "PAID",
          reason: "capture_ack_pending_webhook_link",
          metadata: json as Prisma.InputJsonValue,
        }).catch(() => null);
      }
      const processingRes = NextResponse.json({
        ok: true,
        processing: true,
      });
      clearCheckoutCouponCookie(processingRes);
      return processingRes;
    }

    const lines = buildPaidOrderLinesFromCart(cartLines);
    const useAsyncFulfillment = Boolean(process.env.RABBITMQ_URL?.trim());

    const persisted = await persistPaidOrderOrError({
      orderId,
      paypalCaptureId,
      lines,
      priced,
      expectedValue,
      resolvedUserId,
      sessionEmail,
      shipping,
      useAsyncFulfillment,
      skipStockDecrement: !deductStockOnPaid(),
    });
    if (!persisted.ok) return persisted.response;
    const { dbOrderId } = persisted;
    if (payment) {
      await markPaymentPaidAndLinkOrderRepo({
        paymentId: payment.id,
        orderId: dbOrderId,
        providerCaptureId: paypalCaptureId,
        gatewayResponse: json as Prisma.InputJsonValue,
      });
    }
    const invoice = await getInvoiceByOrderIdService(dbOrderId);

    await clearCart();

    const linesText = lines
      .map((i) => `${i.title} x${i.quantity} @ ${i.unitPrice}`)
      .join("\n");

    const inventoryLines = lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
    }));

    await runFulfillmentFlow({
      useAsyncFulfillment,
      dbOrderId,
      inventoryLines,
      sessionEmail,
      orderId,
      expectedValue,
      linesText,
      invoiceNumber: invoice?.invoiceNumber ?? null,
    });

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
    return jsonError(500, { error: "server_error" });
  }
}
