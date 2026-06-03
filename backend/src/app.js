require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth.routes.js");
const complianceDocumentRoutes = require("./routes/complianceDocument.routes.js");
const complaintRoutes = require("./routes/complaint.routes.js");
const fuelMaintenanceRoutes = require("./routes/fuelMaintenance.routes.js");
const incidentRoutes = require("./routes/incident.routes.js");
const parentRoutes = require("./routes/parent.routes.js");
const studentRoutes = require("./routes/student.routes.js");
const routeRoutes = require("./routes/route.routes.js");
const fleetRoutes = require("./routes/fleet.routes.js");
const staffRoutes = require("./routes/staff.routes.js");
const tripRoutes = require("./routes/trip.routes.js");
const studentTransportRoutes = require("./routes/studentTransport.routes.js");

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

// Logging — only enable in non-production environments
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

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

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

// Routes
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/compliance-documents", complianceDocumentRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/fuel-maintenance", fuelMaintenanceRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/transport-manager", routeRoutes);
app.use("/api/transport-manager", fleetRoutes);
app.use("/api/transport-manager", staffRoutes);
app.use("/api/transport-manager", tripRoutes);
app.use("/api/transport-manager", studentTransportRoutes);

// Health check
app.get("/health", (_, res) => {
  res.status(200).json({ status: "OK" });
});

module.exports = app;
