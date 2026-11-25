jest.mock("../src/config/db.js", () => ({
  query: jest.fn(),
}));
jest.mock("../src/services/auth.service.js", () => ({
  ensureUsersTable: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../src/services/student.service.js", () => ({
  ensureStudentsTables: jest.fn().mockResolvedValue(undefined),
}));

const pool = require("../src/config/db.js");
const { listTransportRequestsForManager } = require("../src/services/parent.service.js");

describe("parent.service transport request routes", () => {
  beforeEach(() => {
    pool.query.mockResolvedValue([[], []]);
  });

  test("selects route columns used by the deployed schema", async () => {
    await expect(listTransportRequestsForManager()).resolves.toEqual([]);

    const query = pool.query.mock.calls[0][0];
    expect(query).toContain("r.routeCode AS currentRouteCode");
    expect(query).toContain("r.routeName AS currentRouteName");
  });
});
