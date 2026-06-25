require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const {
  requestErrorLogStream,
  requestLogStream,
} = require("./utils/logger.js");

const authRoutes = require("./routes/auth.routes.js");
const complianceDocumentRoutes = require("./routes/complianceDocument.routes.js");
const complaintRoutes = require("./routes/complaint.routes.js");
const fleetRoutes = require("./routes/fleet.routes.js");
const fuelMaintenanceRoutes = require("./routes/fuelMaintenance.routes.js");
const fuelRequestsRoutes = require("./routes/fuelRequests.routes.js");
const incidentRoutes = require("./routes/incident.routes.js");
const parentRoutes = require("./routes/parent.routes.js");
const parentTransportRoutes = require("./routes/parentTransport.routes.js");
const staffAttendanceRoutes = require("./routes/staffAttendance.routes.js");
const routeRoutes = require("./routes/routes.routes.js");
const stopRoutes = require("./routes/stops.routes.js");
const studentAssignmentsRoutes = require("./routes/studentAssignments.routes.js");
const studentAttendanceRoutes = require("./routes/studentAttendance.routes.js");
const studentRoutes = require("./routes/student.routes.js");
const tripsRoutes = require("./routes/trips.routes.js");
const usersRoutes = require("./routes/users.routes.js");
const tmRouteRoutes = require("./routes/route.routes.js");
const tmFleetRoutes = require("./routes/fleet.routes.js");
const tmStaffRoutes = require("./routes/staff.routes.js");
const tmTripRoutes = require("./routes/trip.routes.js");
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

// Logging
const requestLogFormat =
  ":method :url :status :response-time ms - :res[content-length]";

app.use(
  morgan(requestLogFormat, {
    stream: requestLogStream,
  })
);
app.use(
  morgan(requestLogFormat, {
    skip: (_req, res) => res.statusCode < 400,
    stream: requestErrorLogStream,
  })
);

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
app.use("/api", fleetRoutes);
app.use("/api/compliance-documents", complianceDocumentRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/fuel-maintenance", fuelMaintenanceRoutes);
app.use("/api/fuel-requests", fuelRequestsRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/staff", staffAttendanceRoutes);
app.use("/api", routeRoutes);
app.use("/api", stopRoutes);
app.use("/api", studentAssignmentsRoutes);
app.use("/api", studentAttendanceRoutes);
app.use("/api", tripsRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/transport-manager", tmRouteRoutes);
app.use("/api/transport-manager", tmFleetRoutes);
app.use("/api/transport-manager", tmStaffRoutes);
app.use("/api/transport-manager", tmTripRoutes);
app.use("/api/transport-manager", studentTransportRoutes);
app.use("/api/transport-manager", parentTransportRoutes);

// Health check
app.get("/health", (_, res) => {
  res.status(200).json({ status: "OK" });
});

module.exports = app;
