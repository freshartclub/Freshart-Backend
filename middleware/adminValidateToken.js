const jwt = require("jsonwebtoken");
const { createLog } = require("../functions/common");
const APIErrorLog = createLog("API_error_log");
const Admin = require("../models/adminModel");

const validateAdminToken = async (req, res, next) => {
	try {
		if (req?.headers?.authorization) {
			const { 1: token } = req.headers.authorization.split(" ");
			jwt.verify(
				token,
				process.env.ACCESS_TOKEN_SECERT,
				async (err, verifiedJwt) => {
					if (err) {
						return res
							.status(401)
							.send({ message: "Invalid token please do re-login" });
					}
					let adminData = JSON.parse(
						Buffer.from(
							req.headers.authorization.split(".")[1],
							"base64"
						).toString()
					);
					adminData = await Admin.findOne(
						{ tokens: { $elemMatch: { $eq: token } } },
						{ roles: 1 }
					).lean();
					if (adminData) {
						req.user = adminData;
						return next();
					}
					return res.status(401).send({ message: "You are not authorized" });
				}
			);
		} else {
			return res.status(401).send({ message: "Token is not found" });
		}
	} catch (error) {
		APIErrorLog.error("Error while authenticate the admin");
		APIErrorLog.error(error);
		return res.status(500).send({ message: "Something went wrong" });
	}
};

module.exports = validateAdminToken;
