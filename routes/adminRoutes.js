const express = require("express");
const router = express.Router();
const { loginData } = require("../validations/validator");
const { login, testAdmin } = require("../controller/adminController");
const validateAdminToken = require("../middleware/adminValidateToken");

router.post("/login", loginData, login);

router.get("/dashboard", validateAdminToken, testAdmin);

module.exports = router;
