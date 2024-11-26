const express = require("express");
const router = express.Router();
const { loginData } = require("../validations/validator");
const {
  sendLoginOTP,
  validateOTP,
  testAdmin,
  artistRegister,
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
  serachUserByQueryInput,
  addTicket,
  getInsigniaById,
  deleteInsignia,
  addFAQ,
  getFAQList,
  getFAQById,
  addKB,
  getKBList,
  getKBById,
} = require("../controller/adminController");
const validateAdminToken = require("../middleware/adminValidateToken");
const {
  getArtistById,
  removeArtwork,
  adminCreateArtwork,
  getArtworkById,
  publishArtwork,
  validateArtwork,
  getAdminArtworkList,
  searchArtwork,
} = require("../controller/artworkController");
const {
  addIncident,
  getAllIncident,
} = require("../controller/incidentController");
const {
  addCatalog,
  getCatalog,
  getCatalogById,
} = require("../controller/catalogController");
const {
  addCollection,
  getCollection,
  getCollectionById,
} = require("../controller/collectionController");

router.post("/send-login-otp", loginData, sendLoginOTP);

router.post("/validate-otp", validateOTP);

router.post("/resend-otp", resendOTP);

router.patch("/logout", validateAdminToken, logOut);

router.get("/dashboard", validateAdminToken, testAdmin);

router.get("/get-register-artist/:id", validateAdminToken, getRegisterArtist);

router.post("/artist-register/:id?", validateAdminToken, artistRegister);

router.post("/add-insignia", validateAdminToken, createInsignias);

router.get("/get-insignia/:id", validateAdminToken, getInsigniaById);

router.patch("/delete-insignia/:id", validateAdminToken, deleteInsignia);

router.get("/get-all-insignia", validateAdminToken, getInsignias);

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

router.get(
  "/get-user-by-query-input",
  validateAdminToken,
  serachUserByQueryInput
);

router.get("/get-all-users", validateAdminToken, getAllUsers);

router.get("/suspended-list", validateAdminToken, suspendedArtistList);

router.patch("/suspend-artist/:id", validateAdminToken, suspendArtist);

router.patch("/unsuspend-artist/:id", validateAdminToken, unSuspendArtist);

router.patch(
  "/change-artist-password/:id",
  validateAdminToken,
  changeArtistPassword
);

router.get("/get-artist-by-id", validateAdminToken, getArtistById);

router.patch(
  "/reject-artist-request/:id",
  validateAdminToken,
  rejectArtistRequest
);

router.patch("/ban-artist-request/:id", validateAdminToken, banArtistRequest);

router.post("/add-ticket", validateAdminToken, addTicket);

router.get("/get-all-tickets", validateAdminToken, ticketList);

router.get("/get-ticket/:id", validateAdminToken, ticketDetail);

router.post("/reply-ticket/:id", validateAdminToken, replyTicket);

router.get("/get-ticket-replies/:id", validateAdminToken, getTicketReplies);

router.post("/add-incident", validateAdminToken, addIncident);

router.get("/get-all-incidents", validateAdminToken, getAllIncident);

// ------------------- Artwork Routes ------------------------

router.post("/add-artwork/:id?", validateAdminToken, adminCreateArtwork);

router.get("/get-artwork-list", validateAdminToken, getAdminArtworkList);

router.patch("/remove-artwork/:id", validateAdminToken, removeArtwork);

router.get("/get-artwork/:id", validateAdminToken, getArtworkById);

router.patch("/publish-artwork/:id", validateAdminToken, publishArtwork);

router.patch("/validate-artwork/:id", validateAdminToken, validateArtwork);

router.get("/get-search-artwork", validateAdminToken, searchArtwork);

// ------------------- Catalog Routes ------------------------

router.post("/add-catalog", validateAdminToken, addCatalog);

router.get("/get-all-catalog", validateAdminToken, getCatalog);

router.get("/get-catalog-by-id/:id", validateAdminToken, getCatalogById);

// ------------------ collection routes ---------------------

router.post("/add-collection", validateAdminToken, addCollection);

router.get("/get-all-collection", validateAdminToken, getCollection);

router.get("/get-collection-by-id/:id", validateAdminToken, getCollectionById);

router.post("/add-faq", validateAdminToken, addFAQ);

router.get("/get-all-faq", validateAdminToken, getFAQList);

router.get("/get-faq-by-id/:id", validateAdminToken, getFAQById);

router.post("/add-kb", validateAdminToken, addKB);

router.get("/get-all-kb", validateAdminToken, getKBList);

router.get("/get-kb-by-id/:id", validateAdminToken, getKBById);

module.exports = router;
