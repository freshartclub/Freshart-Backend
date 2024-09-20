const express = require("express");
const router = express.Router();
const { login } = require("../controller/adminController");

router.post("/login", login);

module.exports = router;
