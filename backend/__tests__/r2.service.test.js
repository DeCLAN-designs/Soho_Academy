const VALID_R2_ENV = {
  R2_ACCOUNT_ID: "abc123accountid",
  R2_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
  R2_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  R2_BUCKET_NAME: "soho-compliance-docs",
  R2_PUBLIC_BASE_URL: "https://pub-abc123.r2.dev",
};

const R2_KEYS = Object.keys(VALID_R2_ENV);

const mockSend = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation((params) => params),
  DeleteObjectCommand: jest.fn().mockImplementation((params) => params),
}));

let r2Service;

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

const loadModule = () => {
  jest.resetModules();
  jest.mock("@aws-sdk/client-s3", () => ({
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
    PutObjectCommand: jest.fn().mockImplementation((params) => params),
    DeleteObjectCommand: jest.fn().mockImplementation((params) => params),
  }));
  r2Service = require("../src/services/r2.service.js");
};

const makeFile = (overrides = {}) => ({
  originalname: "test-document.pdf",
  mimetype: "application/pdf",
  buffer: Buffer.from("fake file content"),
  size: 17,
  ...overrides,
});

beforeEach(() => {
  clearR2Env();
  mockSend.mockReset();
  loadModule();
});

afterEach(() => {
  clearR2Env();
});

describe("normalizeFileName", () => {
  it("returns sanitized basename", () => {
    expect(r2Service.normalizeFileName("my photo (1).jpg")).toBe(
      "my_photo_1_.jpg"
    );
  });

  it("handles empty / null input", () => {
    expect(r2Service.normalizeFileName("")).toBe("incident-image");
    expect(r2Service.normalizeFileName(null)).toBe("incident-image");
  });

  it("truncates to 255 characters", () => {
    const longName = "a".repeat(300) + ".png";
    expect(r2Service.normalizeFileName(longName).length).toBeLessThanOrEqual(255);
  });
});

describe("resolveFileExtension", () => {
  it("returns original extension when present", () => {
    expect(r2Service.resolveFileExtension({ originalname: "doc.pdf", mimetype: "application/pdf" })).toBe(".pdf");
  });

  it("returns extension in lowercase", () => {
    expect(r2Service.resolveFileExtension({ originalname: "img.PNG", mimetype: "image/png" })).toBe(".png");
  });

  it("falls back to mimetype when no extension", () => {
    expect(r2Service.resolveFileExtension({ originalname: "screenshot", mimetype: "image/png" })).toBe(".png");
    expect(r2Service.resolveFileExtension({ originalname: "photo", mimetype: "image/webp" })).toBe(".webp");
    expect(r2Service.resolveFileExtension({ originalname: "photo", mimetype: "image/heic" })).toBe(".heic");
    expect(r2Service.resolveFileExtension({ originalname: "photo", mimetype: "image/heif" })).toBe(".heif");
  });

  it("defaults to .jpg for unknown mimetype without extension", () => {
    expect(r2Service.resolveFileExtension({ originalname: "file", mimetype: "application/octet-stream" })).toBe(".jpg");
  });
});

describe("buildFileKeyForFolder", () => {
  it("produces a key with folder/userId/year/month/uuid.ext format", () => {
    const file = makeFile({ originalname: "report.pdf" });
    const key = r2Service.buildFileKeyForFolder({
      folder: "compliance-documents",
      userId: 42,
      file,
    });

    const parts = key.split("/");
    expect(parts[0]).toBe("compliance-documents");
    expect(parts[1]).toBe("42");
    expect(parts[2]).toMatch(/^\d{4}$/);
    expect(parts[3]).toMatch(/^\d{2}$/);
    expect(parts[4]).toMatch(/\.pdf$/);
  });

  it("defaults folder to 'uploads' when empty", () => {
    const file = makeFile();
    const key = r2Service.buildFileKeyForFolder({
      folder: "",
      userId: 1,
      file,
    });

    expect(key.startsWith("uploads/")).toBe(true);
  });
});

describe("buildFileKey", () => {
  it("uses incident-reports folder by default", () => {
    const file = makeFile({ originalname: "scene.jpg", mimetype: "image/jpeg" });
    const key = r2Service.buildFileKey({ userId: 7, file });

    expect(key.startsWith("incident-reports/")).toBe(true);
  });
});

describe("getR2Client", () => {
  it("creates S3Client with correct endpoint and credentials", () => {
    setR2Env();
    loadModule();

    const { S3Client } = require("@aws-sdk/client-s3");
    r2Service.getR2Client();

    expect(S3Client).toHaveBeenCalledWith({
      region: "auto",
      endpoint: `https://${VALID_R2_ENV.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: VALID_R2_ENV.R2_ACCESS_KEY_ID,
        secretAccessKey: VALID_R2_ENV.R2_SECRET_ACCESS_KEY,
      },
    });
  });

  it("throws R2_NOT_CONFIGURED when env vars are missing", () => {
    clearR2Env();
    loadModule();

    expect(() => r2Service.getR2Client()).toThrow();

    try {
      r2Service.getR2Client();
    } catch (error) {
      expect(error.code).toBe("R2_NOT_CONFIGURED");
    }
  });

  it("returns the same client on subsequent calls (singleton)", () => {
    setR2Env();
    loadModule();

    const client1 = r2Service.getR2Client();
    const client2 = r2Service.getR2Client();

    expect(client1).toBe(client2);
  });
});

describe("uploadFilesToR2", () => {
  beforeEach(() => {
    setR2Env();
    loadModule();
    mockSend.mockResolvedValue({});
  });

  it("returns empty array when files is empty", async () => {
    const result = await r2Service.uploadFilesToR2({
      files: [],
      userId: 1,
      folder: "compliance-documents",
    });

    expect(result).toEqual([]);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns empty array when files is not an array", async () => {
    const result = await r2Service.uploadFilesToR2({
      files: null,
      userId: 1,
    });

    expect(result).toEqual([]);
  });

  it("uploads a single file and returns metadata", async () => {
    const file = makeFile();
    const result = await r2Service.uploadFilesToR2({
      files: [file],
      userId: 42,
      folder: "compliance-documents",
    });

    expect(result).toHaveLength(1);
    expect(result[0].fileName).toBe("test-document.pdf");
    expect(result[0].fileKey).toContain("compliance-documents/42/");
    expect(result[0].fileUrl).toContain(VALID_R2_ENV.R2_PUBLIC_BASE_URL);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("uploads multiple files", async () => {
    const files = [
      makeFile({ originalname: "doc1.pdf" }),
      makeFile({ originalname: "doc2.pdf" }),
    ];

    const result = await r2Service.uploadFilesToR2({
      files,
      userId: 10,
      folder: "compliance-documents",
    });

    expect(result).toHaveLength(2);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("throws R2_NOT_CONFIGURED when env vars are missing", async () => {
    clearR2Env();
    loadModule();

    await expect(
      r2Service.uploadFilesToR2({
        files: [makeFile()],
        userId: 1,
      })
    ).rejects.toMatchObject({ code: "R2_NOT_CONFIGURED" });
  });

  it("throws R2_UPLOAD_FAILED when S3 send rejects", async () => {
    mockSend.mockRejectedValue(new Error("S3 network error"));

    await expect(
      r2Service.uploadFilesToR2({
        files: [makeFile()],
        userId: 1,
        folder: "compliance-documents",
      })
    ).rejects.toMatchObject({ code: "R2_UPLOAD_FAILED" });
  });

  it("cleans up already-uploaded files on partial failure", async () => {
    mockSend
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("Second file failed"));

    const files = [
      makeFile({ originalname: "ok.pdf" }),
      makeFile({ originalname: "fail.pdf" }),
    ];

    await expect(
      r2Service.uploadFilesToR2({ files, userId: 1, folder: "test" })
    ).rejects.toMatchObject({ code: "R2_UPLOAD_FAILED" });

    // The third call should be a DeleteObjectCommand cleanup for the first file
    expect(mockSend.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});

describe("uploadIncidentImagesToR2", () => {
  beforeEach(() => {
    setR2Env();
    loadModule();
    mockSend.mockResolvedValue({});
  });

  it("uses incident-reports folder", async () => {
    const file = makeFile({ originalname: "scene.jpg", mimetype: "image/jpeg" });
    const result = await r2Service.uploadIncidentImagesToR2({
      files: [file],
      userId: 5,
    });

    expect(result[0].fileKey).toContain("incident-reports/");
  });
});

describe("deleteFilesFromR2", () => {
  beforeEach(() => {
    setR2Env();
    loadModule();
    mockSend.mockResolvedValue({});
  });

  it("does nothing when fileKeys is empty", async () => {
    await r2Service.deleteFilesFromR2([]);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("does nothing when fileKeys is not an array", async () => {
    await r2Service.deleteFilesFromR2(null);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends DeleteObjectCommand for each key", async () => {
    await r2Service.deleteFilesFromR2(["key1", "key2"]);

    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("logs error but does not throw when delete fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockSend.mockRejectedValue(new Error("Delete failed"));

    await expect(
      r2Service.deleteFilesFromR2(["key1"])
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("deleteIncidentImagesFromR2", () => {
  beforeEach(() => {
    setR2Env();
    loadModule();
    mockSend.mockResolvedValue({});
  });

  it("delegates to deleteFilesFromR2", async () => {
    await r2Service.deleteIncidentImagesFromR2(["key1"]);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});
