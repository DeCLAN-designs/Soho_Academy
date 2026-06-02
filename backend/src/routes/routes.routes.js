const express = require("express");
const {
  deleteRouteById,
  getRoutes,
  patchRouteStatus,
  postRoute,
  putRoute,
} = require("../controllers/routes.controller.js");

const router = express.Router();

router.get("/routes", getRoutes);
router.post("/routes", postRoute);
router.put("/routes/:id", putRoute);
router.patch("/routes/:id/status", patchRouteStatus);
router.delete("/routes/:id", deleteRouteById);

module.exports = router;
