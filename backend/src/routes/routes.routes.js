const express = require("express");
const {
  deleteRouteById,
  getRoutes,
  patchRouteStatus,
  postRoute,
  putRoute,
} = require("../controllers/routes.controller.js");

const router = express.Router();
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware.js");

// Protect route management endpoints: Transport Manager & School Admin only
router.use(authenticate, authorizeRoles('Transport Manager', 'School Admin'));

router.get("/routes", getRoutes);
router.post("/routes", postRoute);
router.put("/routes/:id", putRoute);
router.patch("/routes/:id/status", patchRouteStatus);
router.delete("/routes/:id", deleteRouteById);

module.exports = router;
