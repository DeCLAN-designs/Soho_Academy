require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/auth.routes.js");
const complianceDocumentRoutes = require("./routes/complianceDocument.routes.js");
const complaintRoutes = require("./routes/complaint.routes.js");
const fuelMaintenanceRoutes = require("./routes/fuelMaintenance.routes.js");
const incidentRoutes = require("./routes/incident.routes.js");
const parentRoutes = require("./routes/parent.routes.js");
const studentRoutes = require("./routes/student.routes.js");

const app = express();
// API endpoints should not rely on ETag-based caching. Disabling ETag avoids
// 304 responses with empty bodies which can confuse fetch clients.
app.set("etag", false);

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

// Logging — use compact "combined" format in production, verbose "dev" otherwise
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Body parsing
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// Prevent caching of API responses (sensitive data / avoids conditional GET noise).
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/compliance-documents", complianceDocumentRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/fuel-maintenance", fuelMaintenanceRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/students", studentRoutes);

// Health check
app.get("/health", (_, res) => {
  res.status(200).json({ status: "OK" });
});

module.exports = app;
