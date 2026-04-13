export type LoginProviderId = "local" | "google" | "facebook";

const ORDER: LoginProviderId[] = ["local", "google", "facebook"];

export function loginProvidersFromRow(
  passwordHash: string | null | undefined,
  accounts: { provider: string }[],
): LoginProviderId[] {
  const set = new Set<LoginProviderId>();
  if (passwordHash) set.add("local");
  for (const a of accounts) {
    if (a.provider === "google") set.add("google");
    else if (a.provider === "facebook") set.add("facebook");
  }
  return ORDER.filter((id) => set.has(id));
}

export function formatLoginProviderLabel(id: LoginProviderId): string {
  switch (id) {
    case "local":
      return "Local";
    case "google":
      return "Google";
    case "facebook":
      return "Facebook";
    default:
      return id;
  }
}
