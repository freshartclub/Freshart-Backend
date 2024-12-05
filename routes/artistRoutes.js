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
  addToCart,
  addRemoveToWishlist,
  getWishlistItems,
  getCartItems,
  ticketFeedback,
  removeFromCart,
  exportLanguageJSONFile,
  smsSendOTP,
} = require("../controller/artistController");
const validateToken = require("../middleware/validateTokenHandler");
const {
  getArtistArtwork,
  artistCreateArtwork,
  getArtworkById,
  removeArtwork,
  publishArtwork,
  getHomeArtwork,
  addToRecentView,
  getRecentlyView,
  addSeriesToArtist,
} = require("../controller/artworkController");
const { getAllIncident } = require("../controller/incidentController");
const { getAllSeriesList } = require("../controller/generalController");

router.post("/login", login);

router.post("/send-register-otp", sendVerifyEmailOTP);

router.post("/verify-email", verifyEmailOTP);

router.post("/sms-otp", smsSendOTP);

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

router.patch("/ticket-feedback/:id", validateToken, ticketFeedback);

router.patch("/edit-artist-profile", validateToken, editArtistProfile);

router.patch("/add-series-to-artist/:id", validateToken, addSeriesToArtist);

router.get("/get-series-list/:id", validateToken, getAllSeriesList);

// -------------------artwork----------------------------

router.get("/get-artist-artworks", validateToken, getArtistArtwork);

router.post("/add-artwork/:id?", validateToken, artistCreateArtwork);

router.get("/get-all-artists", validateToken, getActivedArtists);

router.get("/get-artwork/:id", validateToken, getArtworkById);

router.patch("/delete-artwork/:id", validateToken, removeArtwork);

router.patch("/publish-artwork/:id", validateToken, publishArtwork);

router.get("/get-home-artworks", validateToken, getHomeArtwork);

router.post("/add-to-recent/:id", validateToken, addToRecentView);

router.get("/get-recent-view", validateToken, getRecentlyView);

router.patch("/add-to-cart/:id", validateToken, addToCart);

router.patch("/remove-from-cart/:id", validateToken, removeFromCart);

router.patch("/item-to-wishlist/:id", validateToken, addRemoveToWishlist);

router.get("/get-wishlist", validateToken, getWishlistItems);

router.get("/get-cart", validateToken, getCartItems);

router.get("/get-all-incidents", validateToken, getAllIncident);

router.get("/get-language", exportLanguageJSONFile);

module.exports = router;
