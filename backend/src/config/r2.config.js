const R2_ENV_KEYS = Object.freeze([
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_BASE_URL",
]);

const PLACEHOLDER_PATTERNS = [
  /^your[_-]/i,
  /^replace[_-]/i,
  /^changeme$/i,
  /^xxx+$/i,
  /^todo$/i,
];

const isPlaceholder = (value) => {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return true;
  }

  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
};

const getR2Config = () => {
  const accountId = String(process.env.R2_ACCOUNT_ID || "").trim();
  const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || "").trim();
  const bucketName = String(process.env.R2_BUCKET_NAME || "").trim();
  const publicBaseUrl = String(process.env.R2_PUBLIC_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl,
  };
};

const validateR2Config = () => {
  const config = getR2Config();
  const missing = [];
  const placeholders = [];

  const fieldToEnvVar = {
    accountId: "R2_ACCOUNT_ID",
    accessKeyId: "R2_ACCESS_KEY_ID",
    secretAccessKey: "R2_SECRET_ACCESS_KEY",
    bucketName: "R2_BUCKET_NAME",
    publicBaseUrl: "R2_PUBLIC_BASE_URL",
  };

  for (const [field, envVar] of Object.entries(fieldToEnvVar)) {
    const value = config[field];

    if (!value) {
      missing.push(envVar);
    } else if (isPlaceholder(value)) {
      placeholders.push(envVar);
    }
  }

  return {
    valid: missing.length === 0 && placeholders.length === 0,
    missing,
    placeholders,
    config,
  };
};

const ensureR2Configured = () => {
  const result = validateR2Config();

  if (result.missing.length > 0) {
    const error = new Error(
      `Cloudflare R2 is not configured. Missing: ${result.missing.join(", ")}.`
    );
    error.code = "R2_NOT_CONFIGURED";
    throw error;
  }

  if (result.placeholders.length > 0) {
    const error = new Error(
      `Cloudflare R2 has placeholder values. Update: ${result.placeholders.join(", ")}.`
    );
    error.code = "R2_NOT_CONFIGURED";
    throw error;
  }

  return result.config;
};

const logR2ConfigWarnings = () => {
  const result = validateR2Config();

  if (result.valid) {
    return;
  }

  if (result.missing.length > 0) {
    console.warn(
      `[R2 Config] Missing environment variables: ${result.missing.join(", ")}. ` +
        "File uploads to Cloudflare R2 will fail until these are set."
    );
  }

  if (result.placeholders.length > 0) {
    console.warn(
      `[R2 Config] Placeholder values detected for: ${result.placeholders.join(", ")}. ` +
        "Replace these with real Cloudflare R2 credentials."
    );
  }
};

module.exports = {
  R2_ENV_KEYS,
  PLACEHOLDER_PATTERNS,
  isPlaceholder,
  getR2Config,
  validateR2Config,
  ensureR2Configured,
  logR2ConfigWarnings,
};
