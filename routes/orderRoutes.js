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
  getData,
  getStaus,
  createSubcribeOrder,
  getSubscribeResponData,
} = require("../controller/orderController");

const router = express.Router();

router.post("/create-order", validateToken, createOrder);

router.post("/subscribe-plan", validateToken, createSubcribeOrder);

router.get("/get-all-orders", validateAdminToken, getAllOrders);

router.get("/get-all-user-orders", validateToken, getAllUserOrders);

router.get("/get-artist-order", validateToken, getArtistOrders);

router.get("/get-artist-single-order/:id", validateToken, getArtistSingleOrder);

router.patch("/accept-order-request/:id", validateToken, acceptRejectOrderRequest);

router.patch("/upload-evidence/:id", validateToken, uploadEvedience);

router.patch("/cancel-particular-item/:id", validateToken, cancelParticularItemFromOrder);

router.get("/get-admin-order-detail/:id", validateAdminToken, getAdminOrderDetails);

router.get("/get-user-single-order/:id", validateToken, getUserSingleOrder);

router.patch("/give-review/:id/:artworkId", validateToken, giveReview);

router.get("/status", validateToken, getStaus);

router.get("/hash", generateHash);

router.post("/success", getData);

router.post("/get-subscribe-response", getSubscribeResponData);

module.exports = router;
