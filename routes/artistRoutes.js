const express = require("express");
const router = express.Router();
const { login,forgotPassword,verifyOtp, resetPassword, User, changePassword} = require("../controller/artistController");
const { loginData, userChangePassword } = require("../validations/validator");
const validateToken = require("../middleware/validateTokenHandler");

router.post("/login", loginData , login);
router.post("/forgot-password", forgotPassword);
router.post('/verify-otp/:email', verifyOtp);
router.post('/reset-password/:token', resetPassword);
router.post('/change-password', validateToken,userChangePassword , changePassword);
router.post("/create-user", User);

module.exports = router;
