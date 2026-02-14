require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/auth.routes.js");

const app = express();
const frontendOrigin =
  process.env.FRONTEND_ORIGIN ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173";

// Security middleware
app.use(helmet());

// CORS — restrict in production
app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  })
);

// Logging
app.use(morgan("dev"));

// Body parsing
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);

// Health check
app.get("/health", (_, res) => {
  res.status(200).json({ status: "OK" });
});

module.exports = app;
