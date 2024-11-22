const express = require("express");
const validateAdminToken = require("../middleware/adminValidateToken");
const validateToken = require("../middleware/validateTokenHandler");
const {
  createOrder,
  getAllSubscriptionOrder,
  getAllPurchaseOrder,
  getAllUserOrder,
  getOrder,
  getArtistOrder,
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

router.get("/get-order/:id", validateToken, getOrder);

router.get("/get-artist-order", validateToken, getArtistOrder);

module.exports = router;
