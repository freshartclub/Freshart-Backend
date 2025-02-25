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
  getCartItems,
  ticketFeedback,
  removeFromCart,
  sendSMSOTP,
  verifySMSOTP,
  changePassword,
  addBillingAddress,
  removeBillingAddress,
  getBillingAddresses,
  setDefaultBillingAddress,
  deleteArtistSeries,
  artistReValidate,
  editUserProfile,
  likeOrUnlikeArtwork,
  getLikedItems,
  getNotificationsOfUser,
  markReadNotification,
  deleteNotification,
  getUserPlans,
  checkArtistToken,
  getUnAutorisedCartItems,
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
  artistModifyArtwork,
  getAllArtworks,
  getArtworkGroupBySeries,
} = require("../controller/artworkController");
const { getActiveIncident } = require("../controller/incidentController");
const { getAllSeriesList } = require("../controller/generalController");
const { getUserSideCollections, getUserSideCollectionById } = require("../controller/collectionController");

router.post("/login", login);

router.post("/send-register-otp", sendVerifyEmailOTP);

router.post("/verify-email", verifyEmailOTP);

router.post("/sms-otp", sendSMSOTP);

router.post("/verify-sms-otp", verifySMSOTP);

router.post("/become-artist", becomeArtist);

router.post("/forgot-password-otp", sendForgotPasswordOTP);

router.post("/validate-otp", validateOTP);

router.post("/reset-password", resetPassword);

router.post("/resend-otp", resendOTP);

router.patch("/change-password", validateToken, changePassword);

router.get("/check-artist-token", validateToken, checkArtistToken);

router.get("/get-artist", validateToken, getArtistDetails);

router.get("/get-artist-detail/:id", getArtistDetailById);

router.patch("/logout", validateToken, logOut);

router.post("/complete-profile", validateToken, completeProfile);

router.post("/create-ticket", validateToken, createTicket);

router.get("/get-user-tickets", validateToken, getUserTickets);

router.post("/reply-ticket/:id", validateToken, replyTicketUser);

router.get("/ticket/:id", validateToken, ticketDetail);

router.patch("/ticket-feedback/:id", validateToken, ticketFeedback);

router.patch("/edit-user-profile", validateToken, editUserProfile);

router.patch("/edit-artist-profile", validateToken, editArtistProfile);

router.patch("/add-series-to-artist", validateToken, addSeriesToArtist);

router.patch("/delete-series-to-artist", validateToken, deleteArtistSeries);

router.get("/get-series-list", validateToken, getAllSeriesList);

router.get("/get-billing-address", validateToken, getBillingAddresses);

router.post("/add-billing-address/:addressId?", validateToken, addBillingAddress);

router.patch("/remove-billing-address/:addressId", validateToken, removeBillingAddress);

router.patch("/set-default-address/:addressId", validateToken, setDefaultBillingAddress);

router.patch("/revalidate-profile", validateToken, artistReValidate);

// -------------------artwork----------------------------

router.get("/get-artist-artworks", validateToken, getArtistArtwork);

router.post("/add-artwork/:id?", validateToken, artistCreateArtwork);

router.patch("/modify-artwork/:id", validateToken, artistModifyArtwork);

router.get("/get-all-artists", validateToken, getActivedArtists);

router.get("/get-artwork/:id", getArtworkById);

router.patch("/delete-artwork/:id", validateToken, removeArtwork);

router.patch("/publish-artwork/:id", validateToken, publishArtwork);

router.get("/get-home-artworks", getHomeArtwork);

router.post("/add-to-recent/:id", validateToken, addToRecentView);

router.get("/get-recent-view", validateToken, getRecentlyView);

router.patch("/add-to-cart/:id", validateToken, addToCart);

router.patch("/remove-from-cart/:id", validateToken, removeFromCart);

router.get("/get-liked-items", validateToken, getLikedItems);

router.get("/get-cart", validateToken, getCartItems);

router.get("/get-unauthorized-cart", getUnAutorisedCartItems);

router.get("/get-all-incidents", validateToken, getActiveIncident);

router.get("/get-all-artworks", getAllArtworks);

router.get("/get-artist-artworks-by-series/:id", validateToken, getArtworkGroupBySeries);

router.patch("/like-unlike-artwork/:id", validateToken, likeOrUnlikeArtwork);

// -------------------- notifications ---------------------------------

router.get("/get-notifications", validateToken, getNotificationsOfUser);

router.patch("/read-notification/:id?", validateToken, markReadNotification);

router.patch("/delete-notification/:id?", validateToken, deleteNotification);

// ------------------------ collections ----------------------------------

router.get("/get-all-collections", getUserSideCollections);

router.get("/get-collection/:id", getUserSideCollectionById);

// -------------------------- plans ---------------------------------------------

router.get("/get-all-plans", validateToken, getUserPlans);

module.exports = router;
