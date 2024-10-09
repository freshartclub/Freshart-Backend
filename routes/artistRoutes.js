const express = require("express");
const router = express.Router();
const {
  login,
  becomeArtist,
  resetPassword,
  registerUser,
  sendForgotPasswordOTP,
  validateOTP,
  resendOTP,
} = require("../controller/artistController");

router.post("/login", login);

router.post("/register", registerUser);

router.post("/become-artist", becomeArtist);

router.post("/forgot-password-otp", sendForgotPasswordOTP);

router.post("/validate-otp", validateOTP);

router.post("/reset-password", resetPassword);

router.post("/resend-otp", resendOTP);

module.exports = router;
