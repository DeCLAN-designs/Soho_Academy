jest.mock("../src/services/complianceDocument.service.js");

const {
  createComplianceDocument,
  listComplianceDocumentsByUser,
} = require("../src/services/complianceDocument.service.js");
const {
  createDocument,
  getDocuments,
} = require("../src/controllers/complianceDocument.controller.js");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockReq = (overrides = {}) => ({
  body: { relatedTo: "Driver", documentType: "Insurance", validFromDate: "2026-01-01", validToDate: "2027-01-01" },
  file: { originalname: "policy.pdf", mimetype: "application/pdf", buffer: Buffer.alloc(1), size: 1 },
  user: { sub: "42" },
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("createDocument", () => {
  it("returns 400 when no file is provided", async () => {
    const req = mockReq({ file: undefined });
    const res = mockRes();

    await createDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it("returns 201 on successful upload", async () => {
    createComplianceDocument.mockResolvedValue({ id: 1, documentType: "Insurance" });
    const req = mockReq();
    const res = mockRes();

    await createDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ document: expect.any(Object) }),
      })
    );
  });

  it("returns 400 for INVALID_VALIDITY_RANGE error", async () => {
    const error = new Error("Invalid range");
    error.code = "INVALID_VALIDITY_RANGE";
    createComplianceDocument.mockRejectedValue(error);

    const req = mockReq();
    const res = mockRes();

    await createDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining("Validity") })
    );
  });

  it("returns 500 for R2_NOT_CONFIGURED error", async () => {
    const error = new Error("R2 not configured");
    error.code = "R2_NOT_CONFIGURED";
    createComplianceDocument.mockRejectedValue(error);

    const req = mockReq();
    const res = mockRes();

    await createDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining("R2"),
      })
    );
  });

  it("returns 500 for R2_UPLOAD_FAILED error", async () => {
    const error = new Error("Upload failed");
    error.code = "R2_UPLOAD_FAILED";
    createComplianceDocument.mockRejectedValue(error);

    const req = mockReq();
    const res = mockRes();

    await createDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining("upload"),
      })
    );
  });

  it("returns 500 for unexpected errors", async () => {
    createComplianceDocument.mockRejectedValue(new Error("DB down"));

    const req = mockReq();
    const res = mockRes();

    await createDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });
});

describe("getDocuments", () => {
  it("returns 200 with documents list", async () => {
    listComplianceDocumentsByUser.mockResolvedValue([
      { id: 1, documentType: "Insurance" },
    ]);
    const req = mockReq();
    const res = mockRes();

    await getDocuments(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          documents: expect.any(Array),
        }),
      })
    );
  });

  it("returns 500 on service error", async () => {
    listComplianceDocumentsByUser.mockRejectedValue(new Error("DB error"));
    const req = mockReq();
    const res = mockRes();

    await getDocuments(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });
});
