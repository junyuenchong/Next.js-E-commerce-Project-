"use client";

import React, { useMemo } from "react";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatAuditSentence(
  action: string | undefined,
  metadata: unknown,
): string {
  if (!isRecord(metadata)) {
    return action ? `Action executed: ${action}.` : "Action executed.";
  }

  if (action === "order.status") {
    const from = asText(metadata.from) ?? "unknown";
    const to = asText(metadata.to) ?? "unknown";
    return `Order status changed from ${from} to ${to}.`;
  }

  if (action === "order.shipment") {
    const carrier = asText(metadata.shippingCarrier);
    const trackingNumber = asText(metadata.trackingNumber);
    const trackingUrl = asText(metadata.trackingUrl);
    const shippedAt = asText(metadata.shippedAt);
    const parts = [
      carrier ? `carrier ${carrier}` : null,
      trackingNumber ? `tracking number ${trackingNumber}` : null,
      trackingUrl ? `tracking link updated` : null,
      shippedAt ? `marked shipped` : null,
    ].filter(Boolean);
    return parts.length > 0
      ? `Shipment updated: ${parts.join(", ")}.`
      : "Shipment details were updated.";
  }

  if (action === "order.refund") {
    const from = asText(metadata.from) ?? "unknown";
    const to = asText(metadata.to) ?? "cancelled";
    return `Order refund flow updated status from ${from} to ${to}.`;
  }

  if (action === "coupon.create") {
    const code = asText(metadata.code) ?? "new coupon";
    return `Created coupon ${code}.`;
  }

  if (action === "coupon.update") {
    const code = asText(metadata.code) ?? "coupon";
    return `Updated ${code} settings.`;
  }

  if (action === "coupon.delete") {
    const code = asText(metadata.code) ?? "coupon";
    return `Deleted ${code}.`;
  }

  if (action === "user.role") {
    const role = asText(metadata.role) ?? "unknown";
    return `User role changed to ${role}.`;
  }

  if (action === "user.update") {
    const email = asText(metadata.email);
    return email
      ? `User profile updated for ${email}.`
      : "User profile updated.";
  }

  if (action === "role-definition.update") {
    const slug = asText(metadata.slug) ?? "role definition";
    return `Permission profile ${slug} was updated.`;
  }

  if (action === "role-definition.assign") {
    const slug = asText(metadata.slug) ?? "profile";
    return `Assigned permissions for ${slug}.`;
  }

  if (
    action === "catalog.category.create" ||
    action === "catalog.category.update"
  ) {
    const name = asText(metadata.name) ?? "category";
    return `${action.endsWith("create") ? "Created" : "Updated"} category ${name}.`;
  }

  if (action === "review.reply") {
    const hasReply = metadata.hasReply === true;
    return hasReply ? "Review reply was posted." : "Review reply was cleared.";
  }

  return action ? `Action executed: ${action}.` : "Action executed.";
}

export function AuditLogDetailsCell({
  action,
  metadata,
}: {
  metadata: unknown;
  action?: string;
}) {
  const text = useMemo(() => {
    return formatAuditSentence(action, metadata);
  }, [action, metadata]);

  return <p className="max-w-[44rem] text-sm text-gray-800">{text}</p>;
}

export function AuditLogDetailsRawToggle() {
  return null;
}
