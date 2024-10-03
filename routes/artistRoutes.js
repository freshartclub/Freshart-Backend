const express = require("express");
const router = express.Router();
const { login, becomeArtist, forgotPassword,verifyOtp, resetPassword} = require("../controller/artistController");
const { loginData } = require("../validations/validator");

router.post("/login", loginData , login);
router.post("/forgot-password", forgotPassword);
router.post('/verify-otp/:email', verifyOtp);
router.post('/reset-password/:token', resetPassword);
router.post("/become-artist", becomeArtist);

module.exports = router;
