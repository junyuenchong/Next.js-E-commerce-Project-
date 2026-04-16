export type RateLimitPolicy = {
  keyPrefix: string;
  max: number;
  windowSeconds: number;
  retryAfterSeconds: number;
};

export const RATE_LIMIT_POLICIES = {
  authPost: {
    keyPrefix: "auth:post",
    max: 30,
    windowSeconds: 60,
    retryAfterSeconds: 60,
  },
  paypalCapture: {
    keyPrefix: "paypal:capture",
    max: 20,
    windowSeconds: 60,
    retryAfterSeconds: 60,
  },
  supportUserMessage: {
    keyPrefix: "support:user:msg",
    max: 10,
    windowSeconds: 30,
    retryAfterSeconds: 30,
  },
  supportAdminMessage: {
    keyPrefix: "support:admin:msg",
    max: 20,
    windowSeconds: 30,
    retryAfterSeconds: 30,
  },
} as const satisfies Record<string, RateLimitPolicy>;
