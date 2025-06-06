const express = require("express");
const validateAdminToken = require("../middleware/adminValidateToken");
const validateToken = require("../middleware/validateTokenHandler");
const {
  createOrder,
  getArtistSingleOrder,
  acceptRejectOrderRequest,
  uploadEvedience,
  cancelParticularItemFromOrder,
  getAdminOrderDetails,
  getUserSingleOrder,
  getAllUserOrders,
  getArtistOrders,
  getAllOrders,
  giveReview,
  generateHash,
  getStaus,
  createSubcribeOrder,
  createPayerSubscribeUser,
  getKey,
  checkPayerExist,
  createPayer,
  createSubscribeUser,
  getUserPlans,
  makePlanCurrActive,
  deleteCard,
  updatePayerSubscribeUser,
  cancelSchedule,
  sendOrderSMSOTP,
  verifyOrderSMSOTP,
} = require("../controller/orderController");
const {
  createPayerBody,
  createSubscribeOrderBody,
  createOrderBody,
  checkOutSubBody,
  confrimExchangeBody,
  acceptRejectOrderRequestBody,
} = require("../validations/validator");
const { checkOutSub, confrimExchange, createPurchaseLogistics } = require("../controller/checkOutSubController");

const router = express.Router();

router.post("/create-order", validateToken, createOrderBody, createOrder);

router.get("/get-key", validateToken, getKey);

router.get("/check-user-ref", validateToken, checkPayerExist);

router.post("/create-payer", validateToken, createPayerBody, createPayer);

router.post("/send-otp", validateToken, sendOrderSMSOTP);

router.patch("/verify-otp", validateToken, verifyOrderSMSOTP);

// when card is not stored
router.post("/subscribe-plan", validateToken, createPayerSubscribeUser);

// when card is stored
router.post("/create-subscribe-plan", validateToken, createSubscribeOrderBody, createSubscribeUser);

router.get("/get-all-orders", validateAdminToken, getAllOrders);

router.get("/get-all-user-orders", validateToken, getAllUserOrders);

router.get("/get-artist-order", validateToken, getArtistOrders);

router.get("/get-artist-single-order/:id", validateToken, getArtistSingleOrder);

router.post("/accept-order/:id", validateToken, acceptRejectOrderRequestBody, acceptRejectOrderRequest);

router.patch("/upload-evidence/:id", validateToken, uploadEvedience);

router.patch("/cancel-particular-item/:id", validateToken, cancelParticularItemFromOrder);

router.get("/get-admin-order-detail/:id", validateAdminToken, getAdminOrderDetails);

router.get("/get-user-single-order/:id", validateToken, getUserSingleOrder);

router.patch("/give-review/:id/:artworkId", validateToken, giveReview);

router.get("/status", validateToken, getStaus);

router.get("/hash", generateHash);

router.get("/user-plans", validateToken, getUserPlans);

router.patch("/active/:id", validateToken, makePlanCurrActive);

// delete card
router.delete("/delete", validateToken, deleteCard);

// add new card
router.post("/add-new", validateToken, updatePayerSubscribeUser);

// cancel schedule
router.post("/cancel/:id", validateToken, cancelSchedule);

// ---------------------- checkout sub --------------------------

router.post("/check-sub", validateToken, checkOutSubBody, checkOutSub);
router.post("/exchange", validateToken, confrimExchangeBody, confrimExchange);
router.post("/purchase/logistics", createPurchaseLogistics);

module.exports = router;
