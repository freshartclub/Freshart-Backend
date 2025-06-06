const { body, param } = require("express-validator");

const loginData = [
  body("email").exists({ checkFalsy: true }).withMessage("Email or phone number is required"),
  body("password").exists({ checkFalsy: true }).withMessage("Password is required"),
];

const createOrderBody = [
  body("time").exists({ checkFalsy: true }).withMessage("Time is required"),
  body("currency").exists({ checkFalsy: true }).withMessage("Currency is required"),
  body("shipping").exists({ checkFalsy: true }).isFloat({ min: 0.01 }).withMessage("Shipping is required"),
  body("note").optional().isString().withMessage("Note is invalid"),
  body("type")
    .exists({ checkFalsy: true })
    .withMessage("Offer Type is required")
    .isIn(["offer", "request", "custom", "instant"])
    .withMessage("Offer Type is invalid"),
];

const createPayerBody = [
  body("email").exists({ checkFalsy: true }).withMessage("Email is required"),
  body("address").exists({ checkFalsy: true }).withMessage("Address is required"),
  body("city").exists({ checkFalsy: true }).withMessage("City is required"),
  body("state").exists({ checkFalsy: true }).withMessage("State is required"),
  body("country").exists({ checkFalsy: true }).withMessage("Country is required"),
  body("zipCode").exists({ checkFalsy: true }).withMessage("Zip Code is required"),
  body("phone").exists({ checkFalsy: true }).withMessage("Phone number is required"),
  body("artistName").exists({ checkFalsy: true }).withMessage("Artist name is required"),
  body("artistSurname1").exists({ checkFalsy: true }).withMessage("Surname 1 is required"),
];

const createSubscribeOrderBody = [
  body("planId").exists({ checkFalsy: true }).withMessage("Plan Id is required"),
  body("plan_type")
    .exists({ checkFalsy: true })
    .withMessage("Plan type is required")
    .isIn(["yearly", "monthly"])
    .withMessage("Plan type must be either 'yearly' or 'monthly'"),
];

const checkOutSubBody = [
  body("ids")
    .exists({ checkFalsy: true })
    .withMessage("Subscription Id is required")
    .isArray({ min: 1 })
    .withMessage("Subscription Id must be an array"),
];

const makeOfferBody = [
  param("id").exists({ checkFalsy: true }).withMessage("Artwork Id is required"),
  body("offer").optional({ checkFalsy: true }).isFloat({ min: 0.01 }).withMessage("Offer Price must be a number greater than 0"),
  body("offerType")
    .exists({ checkFalsy: true })
    .withMessage("Offer Type is required")
    .isIn(["Downward Offer", "Upward Offer"])
    .withMessage("Offer Type is invalid"),
  body("artistId").exists({ checkFalsy: true }).withMessage("Artist Id is required"),
  body("counterAccept").isBoolean().withMessage("Acceptance must be a boolean").exists().withMessage("Counter Acceptance is required"),
];

const addToCartOfferBody = [
  param("id").exists({ checkFalsy: true }).withMessage("Artwork Id is required"),
  body("offerprice")
    .exists({ checkFalsy: true })
    .withMessage("Offer Price is required")
    .isFloat({ min: 0.01 })
    .withMessage("Offer Price must be a number greater than 0"),
  body("offerId").exists({ checkFalsy: true }).withMessage("Offer Id is required"),
  body("type")
    .exists({ checkFalsy: true })
    .withMessage("Offer Type is required")
    .isIn(["offer", "request", "custom"])
    .withMessage("Offer Type is invalid"),
];

const makeOfferArtistBody = [
  param("id").exists({ checkFalsy: true }).withMessage("Offer Id is required"),
  body("offer").optional({ checkFalsy: true }).isFloat({ min: 0.01 }).withMessage("Offer Price must be a number greater than 0"),
  body("isAccepted").optional().isBoolean().withMessage("Acceptance must be a boolean"),
  body("counterAccept").isBoolean().withMessage("Acceptance must be a boolean").exists().withMessage("Counter Acceptance is required"),
];

const confrimExchangeBody = [
  body("subscribeIds")
    .exists({ checkFalsy: true })
    .withMessage("Subscription Ids is required")
    .isArray({ min: 1 })
    .withMessage("Subscription Ids is invalid"),
  body("exchangeIds").exists({ checkFalsy: true }).withMessage("Exchange Ids is required").isArray({ min: 0 }).withMessage("Exchange Ids is invalid"),
  body("returnDate").exists({ checkFalsy: true }).withMessage("Return Date is required").isDate().withMessage("Return Date is invalid"),
  body("pickupDate").exists({ checkFalsy: true }).withMessage("Pickup Date is required").isDate().withMessage("Pickup Date is invalid"),
  body("instructions").exists({ checkFalsy: true }).withMessage("Instructions is required").isString().withMessage("Instructions is invalid"),
];

const acceptRejectOrderRequestBody = [
  param("id").exists({ checkFalsy: true }).withMessage("Order Id is required"),
  body("status").exists({ checkFalsy: true }).withMessage("Status is required").isIn(["accepted", "rejected"]).withMessage("Status is invalid"),
  body("userId").exists({ checkFalsy: true }).withMessage("User Id is required"),
  body("morningFrom").exists({ checkFalsy: true }).withMessage("Morning From is required").isTime().withMessage("Morning From is invalid"),
  body("morningTo").exists({ checkFalsy: true }).withMessage("Morning To is required").isTime().withMessage("Morning To is invalid"),
  body("eveningFrom").exists({ checkFalsy: true }).withMessage("Evening From is required").isTime().withMessage("Evening From is invalid"),
  body("eveningTo").exists({ checkFalsy: true }).withMessage("Evening To is required").isTime().withMessage("Evening To is invalid"),
];

module.exports = {
  loginData,
  createOrderBody,
  createPayerBody,
  createSubscribeOrderBody,
  checkOutSubBody,
  makeOfferBody,
  makeOfferArtistBody,
  confrimExchangeBody,
  addToCartOfferBody,
  acceptRejectOrderRequestBody,
};
