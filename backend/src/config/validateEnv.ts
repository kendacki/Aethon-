const DEV_JWT = "dev-jwt-secret-change-in-production";
const DEV_API_KEY = "dev-api-key";

function isProduction(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    Boolean(process.env.VERCEL)
  );
}

export function validateProductionEnv(): void {
  if (!isProduction()) return;

  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl || /localhost|127\.0\.0\.1/i.test(dbUrl)) {
    throw new Error(
      "[AETHON] DATABASE_URL must use Railway Postgres internal host (postgres.railway.internal), not localhost.",
    );
  }

  const jwt = process.env.JWT_SECRET ?? "";
  if (!jwt || jwt === DEV_JWT || jwt.length < 32) {
    throw new Error("[AETHON] JWT_SECRET must be set to a strong random value (≥32 chars) in production.");
  }

  const apiKey = process.env.API_KEY;
  if (apiKey === DEV_API_KEY) {
    throw new Error("[AETHON] Remove API_KEY=dev-api-key from production. Protected routes use SIWE JWT only.");
  }
}
