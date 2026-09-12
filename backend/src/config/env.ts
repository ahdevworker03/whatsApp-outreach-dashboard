import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  metaApiVersion: process.env.META_API_VERSION ?? "v21.0",
  get metaAccessToken(): string {
    return requireEnv("META_ACCESS_TOKEN");
  },
  get metaPhoneNumberId(): string {
    return requireEnv("META_PHONE_NUMBER_ID");
  },
  get metaWebhookVerifyToken(): string {
    return requireEnv("META_WEBHOOK_VERIFY_TOKEN");
  },
  get databaseUrl(): string {
    return requireEnv("DATABASE_URL");
  },
  get apiAccessToken(): string {
    return requireEnv("API_ACCESS_TOKEN");
  },
};
