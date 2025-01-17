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
  unRejectArtistRequest,
  unBanArtistRequest,
  getReviewDetailArtist,
  approveArtistChanges,
  reValidateArtist,
  deleteArtistSeries,
  approveArtworkChanges,
  getReviewDetailArtwork,
  downloadArtworkDataCSV,
  downloadArtistDataCSV,
  downloadDisciplineDataCSV,
  downloadCategoryDataCSV,
  downloadPicklistDataCSV,
  downloadInsigniaDataCSV,
  downloadKBDataCSV,
  downloadFAQDataCSV,
  downloadCouponDataCSV,
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
  addSeriesToArtist,
  moveArtworkToPending,
} = require("../controller/artworkController");
const {
  addIncident,
  getAllIncident,
  getIncidentById,
} = require("../controller/incidentController");
const {
  addCatalog,
  getCatalog,
  getCatalogById,
  getCatalogList,
  deleteCatalog,
} = require("../controller/catalogController");
const {
  addCollection,
  getCollectionById,
  getAllCollections,
  searchCollection,
  deleteArtworkFromCollection,
  deleteCollection,
  restoreCollection,
} = require("../controller/collectionController");
const { getAllSeriesList } = require("../controller/generalController");
const {
  addPlan,
  getPlans,
  getPlanById,
} = require("../controller/planController");
const {
  addCoupon,
  getCoupons,
  getCoupon,
} = require("../controller/couponController");

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

router.patch(
  "/unreject-artist-request/:id",
  validateAdminToken,
  unRejectArtistRequest
);

router.patch("/ban-artist-request/:id", validateAdminToken, banArtistRequest);

router.patch(
  "/unban-artist-request/:id",
  validateAdminToken,
  unBanArtistRequest
);

router.get(
  "/get-review-artist-detail/:id",
  validateAdminToken,
  getReviewDetailArtist
);

router.get(
  "/get-review-artwork/:id",
  validateAdminToken,
  getReviewDetailArtwork
);

router.post("/add-ticket", validateAdminToken, addTicket);

router.get("/get-all-tickets", validateAdminToken, ticketList);

router.get("/get-ticket/:id", validateAdminToken, ticketDetail);

router.post("/reply-ticket/:id", validateAdminToken, replyTicket);

router.get("/get-ticket-replies/:id", validateAdminToken, getTicketReplies);

router.post("/add-incident/:id?", validateAdminToken, addIncident);

router.get("/get-incident-by-id/:id", validateAdminToken, getIncidentById);

router.get("/get-all-incidents", validateAdminToken, getAllIncident);

router.patch(
  "/add-series-to-artist/:id",
  validateAdminToken,
  addSeriesToArtist
);

router.get("/get-series-list/:id", validateAdminToken, getAllSeriesList);

router.patch("/delete-series/:id", validateAdminToken, deleteArtistSeries);

router.patch("/approve-changes/:id", validateAdminToken, approveArtistChanges);

router.patch("/revalidate-artist/:id", validateAdminToken, reValidateArtist);

// ------------------- Artwork Routes ------------------------

router.post("/add-artwork/:id?", validateAdminToken, adminCreateArtwork);

router.get("/get-artwork-list", validateAdminToken, getAdminArtworkList);

router.patch(
  "/approve-artwork-changes/:id",
  validateAdminToken,
  approveArtworkChanges
);

router.patch("/remove-artwork/:id", validateAdminToken, removeArtwork);

router.get("/get-artwork/:id", validateAdminToken, getArtworkById);

router.patch("/publish-artwork/:id", validateAdminToken, publishArtwork);

router.patch("/validate-artwork/:id", validateAdminToken, validateArtwork);

router.get("/get-search-artwork", validateAdminToken, searchArtwork);

router.patch("/move-to-pending/:id", validateAdminToken, moveArtworkToPending);

// ------------------- Catalog Routes ------------------------

router.post("/add-catalog", validateAdminToken, addCatalog);

router.get("/get-all-catalog", validateAdminToken, getCatalog);

router.get("/get-catalog-by-id/:id", validateAdminToken, getCatalogById);

router.get("/get-catalog-list", validateAdminToken, getCatalogList);

router.patch("/delete-catalog/:id", validateAdminToken, deleteCatalog);

// ------------------ collection routes ---------------------

router.post("/add-collection", validateAdminToken, addCollection);

router.get("/get-all-collection", validateAdminToken, getAllCollections);

router.get("/get-collection-by-id/:id", validateAdminToken, getCollectionById);

router.get("/get-search-collection", validateAdminToken, searchCollection);

router.patch(
  "/delete-artwork-from-collection/:id",
  validateAdminToken,
  deleteArtworkFromCollection
);

router.patch("/delete-collection/:id", validateAdminToken, deleteCollection);

router.patch("/restore-collection/:id", validateAdminToken, restoreCollection);

// ------------------ faq routes ---------------------

router.post("/add-faq", validateAdminToken, addFAQ);

router.get("/get-all-faq", validateAdminToken, getFAQList);

router.get("/get-faq-by-id/:id", validateAdminToken, getFAQById);

// ------------------ kb routes ---------------------

router.post("/add-kb", validateAdminToken, addKB);

router.get("/get-all-kb", validateAdminToken, getKBList);

router.get("/get-kb-by-id/:id", validateAdminToken, getKBById);

// ------------------ plan routes ---------------------------

router.post("/add-plan/:id?", validateAdminToken, addPlan);

router.get("/get-all-plans", validateAdminToken, getPlans);

router.get("/get-plan-by-id/:id", validateAdminToken, getPlanById);

// -------------------coupon routes ------------------------

router.post("/add-coupon/:id?", validateAdminToken, addCoupon);

router.get("/get-all-coupons", validateAdminToken, getCoupons);

router.get("/get-coupon-by-id/:id", validateAdminToken, getCoupon);

// -----------------doenload CSV -----------------------------

router.get(
  "/download-artwork-list",
  validateAdminToken,
  downloadArtworkDataCSV
);

router.get(
  "/download-all-artist-list",
  validateAdminToken,
  downloadArtistDataCSV
);

router.get(
  "/download-discipline-list",
  validateAdminToken,
  downloadDisciplineDataCSV
);

router.get(
  "/download-category-list",
  validateAdminToken,
  downloadCategoryDataCSV
);

router.get("/download-picklist", validateAdminToken, downloadPicklistDataCSV);

router.get(
  "/download-insignia-list",
  validateAdminToken,
  downloadInsigniaDataCSV
);

router.get("/download-kb-list", validateAdminToken, downloadKBDataCSV);

router.get("/download-faq-list", validateAdminToken, downloadFAQDataCSV);

router.get("/download-coupon-list", validateAdminToken, downloadCouponDataCSV);

module.exports = router;
