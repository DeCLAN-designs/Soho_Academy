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
        if (query.includes("'numberPlate', 'plate_number'")) {
          return [[{ COLUMN_NAME: "plate_number" }], []];
        }

        if (query.includes("'confirmedBy', 'status'")) {
          return [[], []];
        }

        return [[{ COLUMN_NAME: "immediateActionTaken" }], []];
      }

      return [[], []];
    });
  });

  test("adds legacy incident columns and preserves existing values", async () => {
    await ensureIncidentTables();

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("ADD COLUMN actionTaken TEXT NULL")
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("SET actionTaken = immediateActionTaken")
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining(
        "ADD COLUMN numberPlate VARCHAR(20) NULL AFTER actionTaken"
      )
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("SET numberPlate = plate_number")
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining(
        "ADD COLUMN confirmedBy VARCHAR(255) NULL AFTER numberPlate"
      )
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining(
        "ADD COLUMN status ENUM('Pending', 'Approved', 'Rejected')"
      )
    );
  });
});
