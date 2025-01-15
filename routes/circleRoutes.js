const express = require("express");
const validateAdminToken = require("../middleware/adminValidateToken");
const { addCircle, getCircle, getCircleList } = require("../controller/circleController");

const router = express.Router();

router.post("/add-circle/:id?", validateAdminToken, addCircle);

router.get("/get-circle/:id", validateAdminToken, getCircle);

router.get("/get-all-circles", validateAdminToken, getCircleList);

module.exports = router;
