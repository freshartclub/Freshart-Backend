const express = require("express");
const validateAdminToken = require("../middleware/adminValidateToken");
const validateToken = require("../middleware/validateTokenHandler");
const {
  createOrder,
  getAllSubscriptionOrder,
  getAllPurchaseOrder,
  getAllUserOrder,
  getArtistOrder,
  getArtistSingleOrder,
  acceptRejectOrderRequest,
} = require("../controller/orderController");

const router = express.Router();

router.post("/create-order", validateToken, createOrder);

router.get(
  "/get-subscription-order",
  validateAdminToken,
  getAllSubscriptionOrder
);

router.get("/get-purchase-order", validateAdminToken, getAllPurchaseOrder);

router.get("/get-all-user-orders", validateToken, getAllUserOrder);

router.get("/get-artist-order", validateToken, getArtistOrder);

// router.get("/get-artist-combined-order",vali)

router.get("/get-artist-single-order/:id", validateToken, getArtistSingleOrder);

router.patch("/accept-order-request/:id", validateToken, acceptRejectOrderRequest);

module.exports = router;