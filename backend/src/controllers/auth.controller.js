const {
  getAuthenticatedUserById,
  loginUser,
  listNumberPlates,
  refreshSession,
  registerUser,
} = require("../services/auth.service.js");

const isProduction = process.env.NODE_ENV === "production";
const parseExpiryToMs = (value, fallbackMs) => {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return fallbackMs;
  }

  if (/^\d+$/.test(normalizedValue)) {
    return Number(normalizedValue);
  }

  const match = normalizedValue.match(/^(\d+)(ms|s|m|h|d)$/i);

  if (!match) {
    return fallbackMs;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitMultipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * unitMultipliers[unit];
};

const refreshTokenMaxAge = parseExpiryToMs(
  process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  7 * 24 * 60 * 60 * 1000
);

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/api/auth",
  maxAge: refreshTokenMaxAge,
};

const register = async (req, res) => {
  const {
    email,
    firstName,
    lastName,
    phoneNumber,
    numberPlate,
    role,
    password,
  } = req.body || {};

  try {
    const user = await registerUser({
      email,
      firstName,
      lastName,
      phoneNumber,
      numberPlate,
      role,
      password,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      data: user,
    });
  } catch (error) {
    if (error && error.code === "DUPLICATE_USER") {
      return res.status(409).json({
        success: false,
        message: "A user with that email or phone number already exists.",
      });
    }

    if (error && error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "A user with that email or phone number already exists.",
      });
    }

    if (error && error.code === "NUMBER_PLATE_REQUIRED") {
      return res.status(400).json({
        success: false,
        message: "numberPlate is required for Driver and Bus Assistant.",
      });
    }

    if (error && error.code === "NUMBER_PLATE_NOT_FOUND") {
      return res.status(400).json({
        success: false,
        message:
          "Selected number plate is not available. Choose an existing number plate.",
      });
    }

    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to register user.",
    });
  }
};

const getNumberPlates = async (_req, res) => {
  try {
    const numberPlates = await listNumberPlates();

    return res.status(200).json({
      success: true,
      message: "Number plates retrieved successfully.",
      data: {
        numberPlates,
      },
    });
  } catch (error) {
    console.error("Get number plates error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch number plates.",
    });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Missing required login fields.",
    });
  }

  try {
    const user = await loginUser({ email, password });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials.",
      });
    }

    res.cookie("refreshToken", user.refreshToken, refreshCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        numberPlate: user.numberPlate || null,
        token: user.accessToken,
        accessToken: user.accessToken,
        refreshToken: user.refreshToken,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to login user.",
    });
  }
};

const refresh = async (req, res) => {
  const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Refresh token is missing.",
    });
  }

  try {
    const session = await refreshSession(refreshToken);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token.",
      });
    }

    res.cookie("refreshToken", session.refreshToken, refreshCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully.",
      data: {
        email: session.email,
        firstName: session.firstName,
        lastName: session.lastName,
        phoneNumber: session.phoneNumber,
        role: session.role,
        numberPlate: session.numberPlate || null,
        token: session.accessToken,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token.",
    });
  }
};

const me = async (req, res) => {
  try {
    const user = await getAuthenticatedUserById(req.user?.sub);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Authenticated user was not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Authenticated user retrieved.",
      data: user,
    });
  } catch (error) {
    console.error("Get authenticated user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch authenticated user.",
    });
  }
};

const logout = (_req, res) => {
  res.clearCookie("refreshToken", refreshCookieOptions);

  return res.status(200).json({
    success: true,
    message: "Logout successful.",
  });
};

module.exports = {
  register,
  login,
  refresh,
  me,
  logout,
  getNumberPlates,
};
