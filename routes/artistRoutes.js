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
  completeProfile,
  createTicket,
  sendVerifyEmailOTP,
  verifyEmailOTP,
  editArtistProfile,
  ticketList,
  ticketDetail,
} = require("../controller/artistController");
const validateToken = require("../middleware/validateTokenHandler");
const {
  getUserArtwork,
  artistCreateArtwork,
} = require("../controller/artworkController");

router.post("/login", login);

router.post("/send-register-otp", sendVerifyEmailOTP);

router.post("/verify-email", verifyEmailOTP);

router.post("/become-artist", becomeArtist);

router.post("/forgot-password-otp", sendForgotPasswordOTP);

router.post("/validate-otp", validateOTP);

router.post("/reset-password", resetPassword);

router.post("/resend-otp", resendOTP);

router.get("/get-artist", validateToken, getArtistDetails);

router.patch("/logout", validateToken, logOut);

router.post("/complete-profile/:id", validateToken, completeProfile);

router.post("/create-ticket", validateToken, createTicket);

router.get("/get-tickets", validateToken, ticketList);
router.get("/ticket/:id", validateToken, ticketDetail);

router.patch("/edit-artist-profile", validateToken, editArtistProfile);

router.get("/get-artist-artworks", validateToken, getUserArtwork);

router.post("/add-artwork", validateToken, artistCreateArtwork);

module.exports = router;
