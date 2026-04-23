import { NextResponse } from "next/server";

/**
 * Convert unknown errors into a readable message.
 */
export function unknownErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "")
    return error.message;
  if (typeof error === "string" && error.trim() !== "") return error;
  return "Unknown error";
}

/**
 * Return a normalized 500 JSON response and log details.
 */
export function jsonInternalServerError(
  error: unknown,
  logPrefix: string,
  fallbackMessage: string = "Internal Server Error",
) {
  console.error(logPrefix, error);
  return NextResponse.json(
    {
      error: "server_error",
      message: fallbackMessage,
      ...(process.env.NODE_ENV === "development"
        ? { detail: unknownErrorMessage(error) }
        : null),
    },
    { status: 500 },
  );
}
