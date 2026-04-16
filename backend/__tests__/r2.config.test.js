const VALID_R2_ENV = {
  R2_ACCOUNT_ID: "abc123accountid",
  R2_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
  R2_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  R2_BUCKET_NAME: "soho-compliance-docs",
  R2_PUBLIC_BASE_URL: "https://pub-abc123.r2.dev",
};

const R2_KEYS = Object.keys(VALID_R2_ENV);

let getR2Config;
let validateR2Config;
let ensureR2Configured;
let logR2ConfigWarnings;
let isPlaceholder;

const loadModule = () => {
  jest.resetModules();
  const mod = require("../src/config/r2.config.js");
  getR2Config = mod.getR2Config;
  validateR2Config = mod.validateR2Config;
  ensureR2Configured = mod.ensureR2Configured;
  logR2ConfigWarnings = mod.logR2ConfigWarnings;
  isPlaceholder = mod.isPlaceholder;
  return mod;
};

const setR2Env = (overrides = {}) => {
  const env = { ...VALID_R2_ENV, ...overrides };
  for (const key of R2_KEYS) {
    if (env[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = env[key];
    }
  }
};

const clearR2Env = () => {
  for (const key of R2_KEYS) {
    delete process.env[key];
  }
};

beforeEach(() => {
  clearR2Env();
  loadModule();
});

afterEach(() => {
  clearR2Env();
});

describe("isPlaceholder", () => {
  it("returns true for empty string", () => {
    expect(isPlaceholder("")).toBe(true);
  });

  it("returns true for whitespace-only string", () => {
    expect(isPlaceholder("   ")).toBe(true);
  });

  it("returns true for null / undefined", () => {
    expect(isPlaceholder(null)).toBe(true);
    expect(isPlaceholder(undefined)).toBe(true);
  });

  it.each([
    "your_cloudflare_account_id",
    "your_r2_access_key_id",
    "your_r2_secret_access_key",
    "your_r2_bucket_name",
    "your-bucket-id",
    "replace_with_a_secure_secret",
    "changeme",
    "xxx",
    "XXXXXX",
    "todo",
  ])("returns true for placeholder value: %s", (value) => {
    expect(isPlaceholder(value)).toBe(true);
  });

  it.each([
    "abc123accountid",
    "AKIAIOSFODNN7EXAMPLE",
    "soho-compliance-docs",
    "https://pub-abc123.r2.dev",
    "real-bucket-name",
  ])("returns false for real value: %s", (value) => {
    expect(isPlaceholder(value)).toBe(false);
  });
});

describe("getR2Config", () => {
  it("returns all R2 config values from environment", () => {
    setR2Env();
    const config = getR2Config();

    expect(config).toEqual({
      accountId: VALID_R2_ENV.R2_ACCOUNT_ID,
      accessKeyId: VALID_R2_ENV.R2_ACCESS_KEY_ID,
      secretAccessKey: VALID_R2_ENV.R2_SECRET_ACCESS_KEY,
      bucketName: VALID_R2_ENV.R2_BUCKET_NAME,
      publicBaseUrl: VALID_R2_ENV.R2_PUBLIC_BASE_URL,
    });
  });

  it("returns empty strings when env vars are not set", () => {
    clearR2Env();
    const config = getR2Config();

    expect(config.accountId).toBe("");
    expect(config.accessKeyId).toBe("");
    expect(config.secretAccessKey).toBe("");
    expect(config.bucketName).toBe("");
    expect(config.publicBaseUrl).toBe("");
  });

  it("trims whitespace from values", () => {
    setR2Env({ R2_ACCOUNT_ID: "  abc123  ", R2_BUCKET_NAME: " my-bucket " });
    const config = getR2Config();

    expect(config.accountId).toBe("abc123");
    expect(config.bucketName).toBe("my-bucket");
  });

  it("strips trailing slash from publicBaseUrl", () => {
    setR2Env({ R2_PUBLIC_BASE_URL: "https://pub-abc123.r2.dev/" });
    const config = getR2Config();

    expect(config.publicBaseUrl).toBe("https://pub-abc123.r2.dev");
  });
});

describe("validateR2Config", () => {
  it("returns valid=true when all vars are set with real values", () => {
    setR2Env();
    const result = validateR2Config();

    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.placeholders).toEqual([]);
  });

  it("reports missing vars when env is empty", () => {
    clearR2Env();
    const result = validateR2Config();

    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(R2_KEYS);
    expect(result.placeholders).toEqual([]);
  });

  it("reports individual missing var", () => {
    setR2Env({ R2_BUCKET_NAME: "" });
    const result = validateR2Config();

    expect(result.valid).toBe(false);
    expect(result.missing).toContain("R2_BUCKET_NAME");
    expect(result.missing).toHaveLength(1);
  });

  it("detects placeholder values from .env.example defaults", () => {
    setR2Env({
      R2_ACCOUNT_ID: "your_cloudflare_account_id",
      R2_ACCESS_KEY_ID: "your_r2_access_key_id",
      R2_SECRET_ACCESS_KEY: "your_r2_secret_access_key",
      R2_BUCKET_NAME: "your_r2_bucket_name",
      R2_PUBLIC_BASE_URL: "https://pub-abc123.r2.dev",
    });
    const result = validateR2Config();

    expect(result.valid).toBe(false);
    expect(result.placeholders).toContain("R2_ACCOUNT_ID");
    expect(result.placeholders).toContain("R2_ACCESS_KEY_ID");
    expect(result.placeholders).toContain("R2_SECRET_ACCESS_KEY");
    expect(result.placeholders).toContain("R2_BUCKET_NAME");
  });

  it("returns config object regardless of validity", () => {
    setR2Env({ R2_BUCKET_NAME: "" });
    const result = validateR2Config();

    expect(result.config).toBeDefined();
    expect(result.config.accountId).toBe(VALID_R2_ENV.R2_ACCOUNT_ID);
  });
});

describe("ensureR2Configured", () => {
  it("returns config when all vars are valid", () => {
    setR2Env();
    const config = ensureR2Configured();

    expect(config.accountId).toBe(VALID_R2_ENV.R2_ACCOUNT_ID);
    expect(config.bucketName).toBe(VALID_R2_ENV.R2_BUCKET_NAME);
  });

  it("throws R2_NOT_CONFIGURED when vars are missing", () => {
    clearR2Env();

    expect(() => ensureR2Configured()).toThrow();

    try {
      ensureR2Configured();
    } catch (error) {
      expect(error.code).toBe("R2_NOT_CONFIGURED");
      expect(error.message).toContain("Missing");
    }
  });

  it("throws R2_NOT_CONFIGURED when vars are placeholders", () => {
    setR2Env({
      R2_ACCOUNT_ID: "your_cloudflare_account_id",
      R2_ACCESS_KEY_ID: "your_r2_access_key_id",
      R2_SECRET_ACCESS_KEY: "your_r2_secret_access_key",
      R2_BUCKET_NAME: "your_r2_bucket_name",
    });

    expect(() => ensureR2Configured()).toThrow();

    try {
      ensureR2Configured();
    } catch (error) {
      expect(error.code).toBe("R2_NOT_CONFIGURED");
      expect(error.message).toContain("placeholder");
    }
  });

  it("lists all missing vars in error message", () => {
    setR2Env({ R2_ACCOUNT_ID: "", R2_BUCKET_NAME: "" });

    try {
      ensureR2Configured();
    } catch (error) {
      expect(error.message).toContain("R2_ACCOUNT_ID");
      expect(error.message).toContain("R2_BUCKET_NAME");
    }
  });
});

describe("logR2ConfigWarnings", () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("does not warn when config is valid", () => {
    setR2Env();
    logR2ConfigWarnings();

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("warns about missing environment variables", () => {
    clearR2Env();
    logR2ConfigWarnings();

    expect(warnSpy).toHaveBeenCalled();
    const message = warnSpy.mock.calls[0][0];
    expect(message).toContain("[R2 Config]");
    expect(message).toContain("Missing");
  });

  it("warns about placeholder values", () => {
    setR2Env({ R2_BUCKET_NAME: "your_r2_bucket_name" });
    logR2ConfigWarnings();

    expect(warnSpy).toHaveBeenCalled();
    const allMessages = warnSpy.mock.calls.map((call) => call[0]).join(" ");
    expect(allMessages).toContain("Placeholder");
    expect(allMessages).toContain("R2_BUCKET_NAME");
  });

  it("warns about both missing and placeholder vars at the same time", () => {
    setR2Env({
      R2_ACCOUNT_ID: "",
      R2_BUCKET_NAME: "your_r2_bucket_name",
    });
    logR2ConfigWarnings();

    expect(warnSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
