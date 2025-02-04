const express = require("express");
const validateAdminToken = require("../middleware/adminValidateToken");
const {
  addCircle,
  getCircle,
  getCircleList,
  getArtistCircleList,
  getCircleById,
} = require("../controller/circleController");
const validateToken = require("../middleware/validateTokenHandler");

const router = express.Router();

router.post("/add-circle/:id?", validateAdminToken, addCircle);

router.get("/get-circle/:id", validateAdminToken, getCircle);

router.get("/get-all-circles", validateAdminToken, getCircleList);

router.get("/get-artist-circle-list", validateToken, getArtistCircleList);

router.get("/get-circle-by-id/:id", validateToken, getCircleById);

module.exports = router;
