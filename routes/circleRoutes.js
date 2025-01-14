const express = require("express");
const validateAdminToken = require("../middleware/adminValidateToken");
const { addCircle, getCircle } = require("../controller/circleController");

const router = express.Router();

router.post("/add-circle/:id?", validateAdminToken, addCircle);

router.get("/get-circle/:id", validateAdminToken, getCircle);

module.exports = router;
