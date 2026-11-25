const request = require("supertest");
const app = require("../src/app");

describe("temporarily disabled communications APIs", () => {
  test.each([
    "/api/messages",
    "/api/notifications",
    "/api/announcements/public",
    "/api/transport-manager/announcements",
  ])("%s responds with service unavailable", async (path) => {
    const response = await request(app).get(path);

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      success: false,
      message: "Messaging and announcements are temporarily disabled.",
    });
  });
});
