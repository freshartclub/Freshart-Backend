const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const md5 = require("md5");
const Admin = require("../models/adminModel");
const { createLog } = require("../functions/common");
const APIErrorLog = createLog("API_error_log");
const { checkValidations } = require("../functions/checkValidation");

const login = async (req, res) => {
	try {
		const errors = validationResult(req);

		const checkValid = await checkValidations(errors);
		if (checkValid.type === "error") {
			return res.status(400).send({
				message: checkValid.errors.msg,
			});
		}

		// Get user input
		const { email, password } = req.body;

		// Validate if user exist in our database
		const admins = await Admin.findOne(
			{ email: email.toLowerCase(), isDeleted: false, status: "active" },
			{ email: 1, password: 1, roles: 1 }
		).lean(true);

		if (admins && admins.password === md5(password)) {
			// Create token
			const token = jwt.sign(
				{ user: admins },
				process.env.ACCESS_TOKEN_SECERT,
				{ expiresIn: "30d" }
			);

			Admin.updateOne(
				{ _id: admins._id, isDeleted: false },
				{ $push: { tokens: token } }
			).then();

			return res.status(200).send({
				token,
				message: "Admin login Successfully",
			});
		}
		return res.status(400).send({ message: "Invalid Username and Password" });
	} catch (error) {
		APIErrorLog.error("Error while login the admin");
		APIErrorLog.error(error);
		// error response
		return res.status(500).send({ message: "Something went wrong" });
	}
};

const testAdmin = async (req, res) => {
	try {
		return res.status(200).json({
			admin: req.user,
			message: `welcome ${req?.user?.firstName}`,
		});
	} catch (error) {
		APIErrorLog.error("Error while get the data of the dashboard admin");
		APIErrorLog.error(error);
		// error response
		return res.status(500).send({ message: "Something went wrong" });
	}
};

module.exports = {
	login,
	testAdmin,
};
