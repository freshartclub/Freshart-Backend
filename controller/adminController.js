const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const md5 = require("md5");
const Admin = require("../models/adminModel");
const Artist = require("../models/artistModel");
const ArtworkMediaStyle = require("../models/artWorkMediaModel");
const { createLog, getListArtworks } = require("../functions/common");
const multer = require("multer");
const APIErrorLog = createLog("API_error_log");
const { checkValidations } = require("../functions/checkValidation");

const upload = require("../functions/upload");

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
		const admin = await Admin.findOne({
			_id: req.user._id,
			isDeleted: false,
		}).lean(true);
		return res.status(200).send({
			admin: req.user,
			message: `welcome ${admin?.firstName}`,
		});
	} catch (error) {
		APIErrorLog.error("Error while get the data of the dashboard admin");
		APIErrorLog.error(error);
		// error response
		return res.status(500).send({ message: "Something went wrong" });
	}
};

const artistRegister = async (req, res) => {
	try {
		// const admin = await Admin.countDocuments({
		// 	_id: req.user._id,
		// 	isDeleted: false,
		// }).lean(true);

		// if (!admin) {
		// 	return res.status(400).send({
		// 		message: `Admin not found`,
		// 	});
		// }

		upload(req, res, (err) => {
			if (req.fileValidationError) {
				return res.status(400).send({
					status: 400,
					message: req.fileValidationError,
				});
			}

			if (err instanceof multer.MulterError) {
				// Handle Multer-specific errors
				if (err.code === "LIMIT_UNEXPECTED_FILE") {
					return res.status(400).json({ error: "Unexpected file field" });
				}
				return res.status(400).json({ error: err.message });
			} else if (err) {
				// Handle other errors
				return res.status(500).json({ error: "File upload failed" });
			}

			console.log(req.files.profileImage);
			console.log(req.files.coverImage);

			res.status(200).json({ message: "Files uploaded successfully" });
		});

		// let obj = {
		// 	artistName: req.body.artistName
		// 		.toLowerCase()
		// 		.replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
		// 		.trim(),
		// 	artistId: req.body.artistId,
		// 	phone: req.body.phone.replace(/[- )(]/g, "").trim(),
		// 	email: req.body.email.toLowerCase(),
		// 	language: req.body.language,
		// 	gender: req.body.gender,
		// 	description: req.body.description,
		// 	aboutArtist: req.body.aboutArtist,
		// };

		// if (req?.body?.artistSurname1) {
		// 	obj["artistSurname1"] = req.body.artistSurname1
		// 		.toLowerCase()
		// 		.replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
		// 		.trim();
		// }

		// if (req?.body?.artistSurname2) {
		// 	obj["artistSurname2"] = req.body.artistSurname2
		// 		.toLowerCase()
		// 		.replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
		// 		.trim();
		// }

		// if (req?.body?.nickname) {
		// 	obj["nickname"] = req.body.nickname
		// 		.toLowerCase()
		// 		.replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
		// 		.trim();
		// }

		// obj["address"] = {
		// 	country: req.body.country,
		// 	zipCode: String(req.body.zipCode),
		// 	city: req.body.city,
		// 	state: req.body.state,
		// 	address: req.body.address,
		// };

		// obj["category"] = {
		// 	artistCategory: req.body.artistCategory,
		// 	style1: req.body.style1,
		// 	style2: req.body.style2,
		// };

		// await Artist.create(obj);

		// return res.status(200).send({
		// 	message: "Artist Registered successfully",
		// });
	} catch (error) {
		APIErrorLog.error("Error while registered the artist by admin");
		APIErrorLog.error(error);
		// error response
		return res.status(500).send({ message: "Something went wrong" });
	}
};

const listArtworkStyle = async (req, res) => {
	try {
		const admin = await Admin.countDocuments({
			_id: req.user._id,
			isDeleted: false,
		}).lean(true);

		if (!admin) {
			return res.status(400).send({
				message: `Admin not found`,
			});
		}

		const data = await getListArtworks(req.params.response);

		return res.status(200).send({
			data: data,
			message: data.length ? "success" : "No record found",
		});
	} catch (error) {
		APIErrorLog.error("Error while registered the artist by admin");
		APIErrorLog.error(error);
		// error response
		return res.status(500).send({ message: "Something went wrong" });
	}
};

module.exports = {
	login,
	testAdmin,
	artistRegister,
	listArtworkStyle,
};
