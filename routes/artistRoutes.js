const express = require("express");
const router = express.Router();
const { login,forgotPassword,verifyOtp, resetPassword, User} = require("../controller/artistController");
const { loginData } = require("../validations/validator");

router.post("/login", loginData , login);
router.post("/forgot-password", forgotPassword);
router.post('/verify-otp/:email', verifyOtp);
router.post('/reset-password/:token', resetPassword);
router.post("/create-user", User);

module.exports = router;
