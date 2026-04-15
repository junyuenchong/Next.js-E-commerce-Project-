import type { LoginProviderId } from "@/backend/modules/auth/dto/login-providers.dto";
export type { LoginProviderId } from "@/backend/modules/auth/dto/login-providers.dto";
export { loginProvidersFromRow } from "@/backend/modules/auth/dto/login-providers.dto";

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
