const { body } = require("express-validator");

const loginData = [
  body("email").exists({ checkFalsy: true }).withMessage("Email or phone number is required"),
  body("password").exists({ checkFalsy: true }).withMessage("Password is required"),
];

const createOrderBody = [
  body("time").exists({ checkFalsy: true }).withMessage("Time is required"),
  body("currency").exists({ checkFalsy: true }).withMessage("Currency is required"),
];

const createPayerBody = [
  body("email").exists({ checkFalsy: true }).withMessage("Email is required"),
  body("address").exists({ checkFalsy: true }).withMessage("Address is required"),
  body("city").exists({ checkFalsy: true }).withMessage("City is required"),
  body("state").exists({ checkFalsy: true }).withMessage("State is required"),
  body("country").exists({ checkFalsy: true }).withMessage("Country is required"),
  body("zipCode").exists({ checkFalsy: true }).withMessage("Zip Code is required"),
  body("phone").exists({ checkFalsy: true }).withMessage("Phone number is required"),
  body("firstName").exists({ checkFalsy: true }).withMessage("First name is required"),
  body("lastName").exists({ checkFalsy: true }).withMessage("Last name is required"),
];

const createSubscribeOrderBody = [
  body("planId").exists({ checkFalsy: true }).withMessage("Plan Id is required"),
  body("user_num").exists({ checkFalsy: true }).withMessage("CVV is required"),
  body("plan_type")
    .exists({ checkFalsy: true })
    .withMessage("Plan type is required")
    .isIn(["yearly", "monthly"])
    .withMessage("Plan type must be either 'yearly' or 'monthly'"),
];

module.exports = {
  loginData,
  createOrderBody,
  createPayerBody,
  createSubscribeOrderBody,
};
