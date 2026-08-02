const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "APP_URL",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "BILLING_PROVIDER",
  "STRIPE_MODE",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_ESSENTIAL_PRICE_ID",
  "STRIPE_PROFESSIONAL_PRICE_ID",
];

const errors = [];
const warnings = [];
const placeholderPattern =
  /replace|example|resend\.dev|your-project|your-verified-domain|localhost|127\.0\.0\.1/i;

for (const name of required) {
  const value = process.env[name]?.trim();
  if (!value) {
    errors.push(`${name} is missing.`);
  } else if (placeholderPattern.test(value)) {
    errors.push(`${name} contains a local or placeholder value.`);
  }
}

for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "APP_URL"]) {
  const value = process.env[name];
  if (!value) continue;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") errors.push(`${name} must use HTTPS.`);
    if (/\.(test|invalid|localhost)$/.test(url.hostname)) {
      errors.push(`${name} uses a reserved non-production domain.`);
    }
    if (
      name === "APP_URL" &&
      (url.pathname !== "/" || url.search || url.hash)
    ) {
      errors.push(
        "APP_URL must be a canonical origin without a path or query.",
      );
    }
  } catch {
    errors.push(`${name} is not a valid URL.`);
  }
}

if ((process.env.CRON_SECRET?.length ?? 0) < 32) {
  errors.push("CRON_SECRET must contain at least 32 characters.");
}
if ((process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0) < 32) {
  errors.push("SUPABASE_SERVICE_ROLE_KEY appears too short.");
}
if ((process.env.RESEND_API_KEY?.length ?? 0) < 12) {
  errors.push("RESEND_API_KEY appears too short.");
}
if (
  process.env.EMAIL_FROM &&
  !/<[^@\s]+@[^@\s]+\.[^@\s]+>$/.test(process.env.EMAIL_FROM) &&
  !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(process.env.EMAIL_FROM)
) {
  errors.push("EMAIL_FROM must contain a valid sender email address.");
}
if (
  process.env.EMAIL_FROM &&
  /\.(test|invalid|localhost)>?$/.test(process.env.EMAIL_FROM)
) {
  errors.push("EMAIL_FROM uses a reserved non-production domain.");
}
if (process.env.SIGHTLINE_E2E === "true") {
  errors.push("SIGHTLINE_E2E must not be enabled in production.");
}
if (process.env.BILLING_PROVIDER !== "stripe") {
  errors.push(
    "BILLING_PROVIDER must be stripe in production; mock billing is local/test-only.",
  );
}
if (process.env.STRIPE_MODE !== "live") {
  errors.push("STRIPE_MODE must be live in production.");
}
if (
  process.env.STRIPE_SECRET_KEY &&
  !process.env.STRIPE_SECRET_KEY.startsWith("sk_live_")
) {
  errors.push(
    "STRIPE_SECRET_KEY must be a live mode secret key in production.",
  );
}
if (!process.env.INTERNAL_ADMIN_AUTH_USER_IDS?.trim()) {
  warnings.push(
    "INTERNAL_ADMIN_AUTH_USER_IDS is empty; no platform operator can access internal tools.",
  );
}

if (errors.length) {
  console.error("Production environment validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("Production environment contract passed.");
}
for (const warning of warnings) console.warn(`Warning: ${warning}`);
