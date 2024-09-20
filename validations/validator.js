const { body } = require("express-validator");
const loginData = [
	body("username")
		.exists({ checkFalsy: true })
		.withMessage("Email or phone number is required"),
	body("password")
		.exists({ checkFalsy: true })
		.withMessage("Password is required"),
];

module.exports = {
	loginData,
};
