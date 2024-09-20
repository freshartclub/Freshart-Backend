const jwt = require("jsonwebtoken");
const { createLog } = require("../functions/common");
const APIErrorLog = createLog("API_error_log");
const User = require("../models/userModel");
const Artist = require("../models/artistModel");
const { getImageFile } = require("../functions/aws-sdk");

const validateToken = async (req, res, next) => {
	try {
		if (req.headers.authorization) {
			const { 1: token } = req.headers.authorization.split(" ");
			jwt.verify(token, process.env.ACCESS_TOKEN_SECERT, async (err, verifiedJwt) => {

				if (err) {
					return res.status(401).send({ message: "Invalid token please do re-login" });
				}

				const data = JSON.parse(Buffer.from(req.headers.authorization.split(".")[1], "base64").toString());

				if (data?.user?.roles == "user") {
					const users = await User.findOne({ isDeleted: false, tokens: { $elemMatch: { $eq: token } } }, { tokens: 0 }).lean(true);
					if (users) {

						if (users?.deletedStatus === "deactivated") {
							return res.status(400).send({ message: "Your account has been deactivated. Please contact the admin." })
						}

						if (users?.commercialRole === 'users' && users?.status === 'expired') {
							return res.status(400).send({ message: "Your subscription has been ended. Please contact your business owner to again subscribe." })
						}
						if (users?.profileImage) {
							const imgURL = await getImageFile(process.env.BUCKET_NAME, users.profileImage);
							users["profileImage"] = imgURL.imageUrl;
						}
						req.user = users;
						return next();
					}

				} else {

					let artist = (await Artist.aggregate([{
						$match: {
							isDeleted: false,
							tokens: { $elemMatch: { $eq: token } }
						},
					},
					{
						$lookup: {
							from: "payments",
							let: { subscriptionPlanId: "$subscriptionPlanId" },
							pipeline: [{
								$match: {
									$expr: {
										$eq: ["$_id", "$$subscriptionPlanId"]
									},
								},
							},
							{
								$project: {
									status: 1,
								},
							}],

							as: "payment",
						},
					},
					{
						$unwind: {
							path: "$payment",
							preserveNullAndEmptyArrays: true
						}
					},
					{
						$addFields: { planStatus: "$payment.status" }
					},
					{
						$project: {
							tokens: 0,
							payment: 0,
							biography: 0,
							skills: 0,
							socialAccounts: 0,
							knownArtistInfo: 0,
							selfIdentification: 0,
							shippingInfo: 0
						},
					},
					]))[0];

					if (artist) {

						if (artist?.deletedStatus === "deactivated") {
							return res.status(400).send({ message: "Your account has been deactivated. Please contact the admin." })
						}

						if (artist?.profileImage) {
							const imgURL = await getImageFile(process.env.BUCKET_NAME, artist.profileImage);
							artist["profileImage"] = imgURL.imageUrl;
						}
						req.user = artist;
						return next();
					}
				}
				return res.status(401).send({ message: "You are not authorized" });
			}
			);
		} else {
			return res.status(404).send({ message: "Token not found. Please log in to your account" });
		}
	} catch (error) {
		APIErrorLog.error("Error while validate the token");
		APIErrorLog.error(error);
		return res
			.status(500)
			.send({ error: error, message: "Something went wrong" });
	}
};

module.exports = validateToken;