const mysql = require("mysql2/promise");

const parseDatabaseUrl = (url) => {
  if (!url || typeof url !== "string") {
    return null;
  }

  try {
    const parsed = new URL(url);
    const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));

    if (!parsed.hostname || !database) {
      return null;
    }

    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 3306,
      user: decodeURIComponent(parsed.username || ""),
      password: decodeURIComponent(parsed.password || ""),
      database,
    };
  } catch {
    return null;
  }
};

const fromUrl = parseDatabaseUrl(process.env.DATABASE_URL);
const host = fromUrl?.host || process.env.DB_HOST;
const user = fromUrl?.user || process.env.DB_USER;
const password = fromUrl?.password ?? process.env.DB_PASSWORD;
const database = fromUrl?.database || process.env.DB_NAME;
const port = fromUrl?.port || (process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306);
const useSsl =
  process.env.DB_SSL === "true" ||
  process.env.DB_SSL === "1" ||
  process.env.MYSQL_ATTR_SSL_CA === "true";

if (!host || !user || !database) {
  console.error(
    "MySQL config is incomplete. Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME (and DB_PORT if needed) in the Render Environment tab. Render does not provide MySQL; you need an external MySQL host."
  );
}

const pool = mysql.createPool({
  host,
  port,
  user,
  password,
  database,
  timezone: process.env.DB_TIMEZONE || "+03:00",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 15000),
  ssl: useSsl
    ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
      }
    : undefined,
});

module.exports = pool;
