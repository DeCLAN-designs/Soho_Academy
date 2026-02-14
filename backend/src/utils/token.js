const jwt = require("jsonwebtoken");

const getAccessSecret = () => process.env.JWT_SECRET || "development_access_secret";
const getRefreshSecret = () =>
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "development_refresh_secret";

const getAccessExpiry = () => process.env.JWT_EXPIRES_IN || "15m";
const getRefreshExpiry = () => process.env.JWT_REFRESH_EXPIRES_IN || "7d";

const createAccessToken = (payload) =>
  jwt.sign(payload, getAccessSecret(), { expiresIn: getAccessExpiry() });

const createRefreshToken = (payload) =>
  jwt.sign(payload, getRefreshSecret(), { expiresIn: getRefreshExpiry() });

const verifyAccessToken = (token) => jwt.verify(token, getAccessSecret());
const verifyRefreshToken = (token) => jwt.verify(token, getRefreshSecret());

// Kept for backward compatibility with existing imports.
const createToken = createAccessToken;

module.exports = {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  createToken,
};
