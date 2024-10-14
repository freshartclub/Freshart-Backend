const express = require("express");
const router = express.Router();
const {
  login,
  becomeArtist,
  resetPassword,
  sendForgotPasswordOTP,
  validateOTP,
  resendOTP,
  getArtistDetails,
  logOut,
  sendRegisterUserOTP,
  verifyRegisterUserMail,
  completeProfile,
} = require("../controller/artistController");
const validateToken = require("../middleware/validateTokenHandler");

router.post("/login", login);

router.post("/send-register-otp", sendRegisterUserOTP);

router.post("/verify-email", verifyRegisterUserMail);

router.post("/become-artist", becomeArtist);

router.post("/forgot-password-otp", sendForgotPasswordOTP);

router.post("/validate-otp", validateOTP);

router.post("/reset-password", resetPassword);

router.post("/resend-otp", resendOTP);

router.get("/get-artist", validateToken, getArtistDetails);

router.patch("/logout", validateToken, logOut);

router.post("/complete-profile/:id", validateToken, completeProfile);

module.exports = router;
