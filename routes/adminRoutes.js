const express = require("express");
const router = express.Router();
const { loginData } = require("../validations/validator");
const {
  sendLoginOTP,
  validateOTP,
  testAdmin,
  artistRegister,
  listArtworkStyle,
  listDiscipline,
  createInsignias,
  getRegisterArtist,
  getInsignias,
  activateArtist,
  getAllCompletedArtists,
  getArtistPendingList,
  getArtistRequestList,
  resendOTP,
  createNewUser,
  serachUser,
  getAllUsers,
  logOut,
  getAllArtists,
  getUserFromId,
  suspendArtist,
  changeArtistPassword,
  unSuspendArtist,
  suspendedArtistList,
  ticketList,
  ticketDetail,
  replyTicket,
  getTicketReplies,
  rejectArtistRequest,
  banArtistRequest,
} = require("../controller/adminController");
const validateAdminToken = require("../middleware/adminValidateToken");
const {
  getArtworkList,
  getArtistById,
  removeArtwork,
  adminCreateArtwork,
} = require("../controller/artworkController");

router.post("/send-login-otp", loginData, sendLoginOTP);

router.post("/validate-otp", validateOTP);

router.post("/resend-otp", resendOTP);

router.patch("/logout", validateAdminToken, logOut);

router.get("/dashboard", validateAdminToken, testAdmin);

router.get("/get-register-artist/:id", validateAdminToken, getRegisterArtist);

router.post("/artist-register/:id?", validateAdminToken, artistRegister);

router.get(
  "/list-artwork-style/:response",
  validateAdminToken,
  listArtworkStyle
);

router.get("/list-discipline", validateAdminToken, listDiscipline);

router.post("/create-insignias", validateAdminToken, createInsignias);

router.get("/get-insignias", validateAdminToken, getInsignias);

router.post("/activate-artist/:id", validateAdminToken, activateArtist);

router.get(
  "/get-all-completed-artists",
  validateAdminToken,
  getAllCompletedArtists
);

router.get("/get-all-artists", validateAdminToken, getAllArtists);

router.get(
  "/get-artist-request-list",
  validateAdminToken,
  getArtistRequestList
);

router.get(
  "/get-artist-pending-list",
  validateAdminToken,
  getArtistPendingList
);

router.get("/get-user/:id", validateAdminToken, getUserFromId);

router.post("/create-new-user/:id?", validateAdminToken, createNewUser);

router.get("/get-user-by-id", validateAdminToken, serachUser);

router.get("/get-all-users", validateAdminToken, getAllUsers);

router.get("/suspended-list", validateAdminToken, suspendedArtistList);

router.patch("/suspend-artist/:id", validateAdminToken, suspendArtist);

router.patch("/unsuspend-artist/:id", validateAdminToken, unSuspendArtist);

router.patch(
  "/change-artist-password/:id",
  validateAdminToken,
  changeArtistPassword
);

router.post("/add-artwork/:id?", validateAdminToken, adminCreateArtwork);

router.get("/get-artist-by-id", validateAdminToken, getArtistById);

router.get("/get-artwork-list", validateAdminToken, getArtworkList);

router.patch("/remove-artwork/:id", validateAdminToken, removeArtwork);

router.patch(
  "/reject-artist-request/:id",
  validateAdminToken,
  rejectArtistRequest
);

router.patch("/ban-artist-request/:id", validateAdminToken, banArtistRequest);

router.get("/get-all-tickets", validateAdminToken, ticketList);

router.get("/get-ticket/:id", validateAdminToken, ticketDetail);

router.post("/reply-ticket/:id", validateAdminToken, replyTicket);

router.get("/get-ticket-replies/:id", validateAdminToken, getTicketReplies);

module.exports = router;
