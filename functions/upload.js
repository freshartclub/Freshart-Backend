const multer = require("multer");
const mongoose = require("mongoose");

const storage = multer.diskStorage({
	destination: function (req, file, cb) {

		if (file?.fieldname === "uploadDocs") {
			cb(null, "./public/uploads/documents");
		} else {
			if (["additionalVideo", "mainVideo"].includes(file?.fieldname)) {
				cb(null, "./public/uploads/videos");
			} else {
				cb(null, "./public/uploads/users");
			}
		}
	},

	filename: function (req, file, cb) {
		const fileExtension = file.originalname.substr(file.originalname.lastIndexOf(".") + 1, file.originalname.length);
		let data = req?.user?._id
		if (["profileImage", "additionalImage", "inProcessImage", "uploadDocs", "additionalVideo", "mainVideo", "insigniaImage"].includes(file?.fieldname)) {
			data = mongoose.Types.ObjectId();
		}
		cb(null, `${data}.${fileExtension}`);
	},
});

const fileFilter = (req, file, cb) => {
	if (file?.fieldname === "uploadDocs") {
		const fileExtension = file.originalname.substr(file.originalname.lastIndexOf(".") + 1, file.originalname.length);

		if (["docx", "xlsx"].includes(fileExtension) || file.mimetype === "application/pdf") {
			return cb(null, true);
		}
	}

	if (["additionalVideo", "mainVideo"].includes(file?.fieldname)) {
		if (file.mimetype === "video/mp4") {
			return cb(null, true);
		}
	} else {
		if (['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype)) {
			return cb(null, true);
		}
	}

	req.fileValidationError = "Please upload valid image format";
	return cb(null, false, req.fileValidationError);
};

const upload = multer({
	storage: storage,
	// limits: {
	// 	fileSize: 1024 * 1024 * 5,
	// },
	fileFilter: fileFilter,
}).fields([
	{ name: "profileImage", maxCount: 3 },
	{ name: "additionalImage", maxCount: 1 },
	{ name: "inProcessImage", maxCount: 1 },
	{ name: "mainVideo", maxCount: 1 },
	{ name: "additionalVideo", maxCount: 1 },
	{ name: "uploadDocs", maxCount: 1 },
	{ name: "insigniaImage", maxCount: 1 },
]);

module.exports = upload;
