const multer = require("multer");
const mongoose = require("mongoose");

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		if (file?.fieldname === "uploadDocs") {
			cb(null, "./public/uploads/documents");
		} else {
			cb(null, "./public/uploads/users");
		}
	},

	filename: function (req, file, cb) {
		const fileExtension = file.originalname.substr(
			file.originalname.lastIndexOf(".") + 1,
			file.originalname.length
		);
		let data;
		if (
			["profileImage", "coverImage", "uploadDocs"].includes(file?.fieldname)
		) {
			data = mongoose.Types.ObjectId();
		} else {
			data = req?.user?._id;
		}
		cb(null, `${data}.${fileExtension}`);
	},
});

const fileFilter = (req, file, cb) => {
	if (file?.fieldname === "uploadDocs") {
		const fileExtension = file.originalname.substr(
			file.originalname.lastIndexOf(".") + 1,
			file.originalname.length
		);

		if (
			["docx", "xlsx"].includes(fileExtension) ||
			file.mimetype === "application/pdf"
		) {
			return cb(null, true);
		}
	} else {
		if (
			file.mimetype === "image/jpeg" ||
			file.mimetype === "image/jpg" ||
			file.mimetype === "image/png"
		) {
			return cb(null, true);
		}
	}

	req.fileValidationError = "Please upload valid image format";
	return cb(null, false, req.fileValidationError);
};

const upload = multer({
	storage: storage,
	limits: {
		fileSize: 1024 * 1024 * 5,
	},
	fileFilter: fileFilter,
}).fields([
	{ name: "profileImage", maxCount: 3 },
	{ name: "coverImage", maxCount: 1 },
	{ name: "uploadDocs", maxCount: 1 },
]);

module.exports = upload;
