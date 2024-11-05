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
  ticketDetail,
  getActivedArtists,
  getUserTickets,
  replyTicketUser,
  getArtistDetailById,
} = require("../controller/artistController");
const validateToken = require("../middleware/validateTokenHandler");
const {
  getUserArtwork,
  artistCreateArtwork,
  getArtworkById,
  removeArtwork,
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

router.get("/get-artist-detail/:id", validateToken, getArtistDetailById);

router.patch("/logout", validateToken, logOut);

router.post("/complete-profile/:id", validateToken, completeProfile);

router.post("/create-ticket", validateToken, createTicket);

router.get("/get-user-tickets", validateToken, getUserTickets);

router.post("/reply-ticket/:id", validateToken, replyTicketUser);

router.get("/ticket/:id", validateToken, ticketDetail);

router.patch("/edit-artist-profile", validateToken, editArtistProfile);

router.get("/get-artist-artworks", validateToken, getUserArtwork);

router.post("/add-artwork/:id?", validateToken, artistCreateArtwork);

router.get("/get-all-artists", validateToken, getActivedArtists);

router.get("/get-artwork/:id", validateToken, getArtworkById);

router.patch("/delete-artwork/:id", validateToken, removeArtwork);

module.exports = router;
