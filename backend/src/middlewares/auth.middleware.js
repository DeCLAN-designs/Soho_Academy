const { verifyAccessToken } = require("../utils/token.js");

const getBearerToken = (authorizationHeader) => {
  if (!authorizationHeader || typeof authorizationHeader !== "string") {
    return null;
  }

  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
};

const authenticate = (req, res, next) => {
  const token = getBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token is missing.",
    });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token.",
    });
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated.",
    });
  }

  if (roles.length > 0 && !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission for this resource.",
    });
  }

  return next();
};

module.exports = {
  authenticate,
  authorizeRoles,
};
