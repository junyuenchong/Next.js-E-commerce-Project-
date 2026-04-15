import { NextResponse } from "next/server";

export function unknownErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "")
    return error.message;
  if (typeof error === "string" && error.trim() !== "") return error;
  return "Unknown error";
}

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
