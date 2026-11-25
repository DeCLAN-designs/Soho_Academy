jest.mock("../src/config/db.js", () => ({
  query: jest.fn(),
}));
jest.mock("../src/services/auth.service.js", () => ({
  ensureUsersTable: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../src/services/r2.service.js", () => ({
  deleteIncidentImagesFromR2: jest.fn(),
  uploadIncidentImagesToR2: jest.fn(),
}));

const pool = require("../src/config/db.js");
const { ensureIncidentTables } = require("../src/services/incident.service.js");

describe("incident.service schema compatibility", () => {
  beforeEach(() => {
    pool.query.mockImplementation(async (query) => {
      if (query.includes("information_schema.COLUMNS")) {
        return [[{ COLUMN_NAME: "immediateActionTaken" }], []];
      }

      return [[], []];
    });
  });

  test("adds the legacy actionTaken column and preserves existing values", async () => {
    await ensureIncidentTables();

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("ADD COLUMN actionTaken TEXT NULL")
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("SET actionTaken = immediateActionTaken")
    );
  });
});
