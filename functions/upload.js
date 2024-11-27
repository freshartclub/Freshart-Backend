const multer = require("multer");
const mongoose = require("mongoose");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file?.fieldname === "uploadDocs") {
      cb(null, "./public/uploads/documents");
    } else {
      if (
        ["additionalVideo", "mainVideo", "otherVideo"].includes(file?.fieldname)
      ) {
        cb(null, "./public/uploads/videos");
      } else {
        cb(null, "./public/uploads/users");
      }
    }
  },

  filename: function (req, file, cb) {
    const fileExtension = file.originalname.substr(
      file.originalname.lastIndexOf(".") + 1,
      file.originalname.length
    );
    let data = req?.user?._id;
    if (
      [
        "disciplineImage",
        "profileImage",
        "additionalImage",
        "images",
        "inProcessImage",
        "uploadDocs",
        "additionalVideo",
        "mainImage",
        "mainVideo",
        "otherVideo",
        "backImage",
        "insigniaImage",
        "avatar",
        "catalogImg",
        "ticketImg",
        "collectionFile",
        "expertImg",
      ].includes(file?.fieldname)
    ) {
      data = mongoose.Types.ObjectId();
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
  }
  if (["collectionFile"].includes(file?.fieldname)) {
    if (file.mimetype === "video/mp4") {
      return cb(null, true);
    } else if (
      file.mimetype === "image/jpg" ||
      file.mimetype === "image/png" ||
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/webp"
    ) {
      return cb(null, true);
    }
  }

  if (
    ["additionalVideo", "mainVideo", "otherVideo"].includes(file?.fieldname)
  ) {
    if (
      file.mimetype === "video/mp4" ||
      file.mimetype === "video/webm" ||
      file.mimetype === "video/mkv"
    ) {
      return cb(null, true);
    }
  } else {
    if (
      ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
        file.mimetype
      )
    ) {
      return cb(null, true);
    }
  }

  req.fileValidationError = "Please upload valid File format";
  return cb(null, false, req.fileValidationError);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
}).fields([
  { name: "disciplineImage", maxCount: 1 },
  { name: "profileImage", maxCount: 1 },
  { name: "additionalImage", maxCount: 5 },
  { name: "inProcessImage", maxCount: 1 },
  { name: "mainVideo", maxCount: 1 },
  { name: "mainImage", maxCount: 1 },
  { name: "additionalVideo", maxCount: 5 },
  { name: "uploadDocs", maxCount: 5 },
  { name: "insigniaImage", maxCount: 1 },
  { name: "avatar", maxCount: 1 },
  { name: "images", maxCount: 5 },
  { name: "otherVideo", maxCount: 1 },
  { name: "backImage", maxCount: 1 },
  { name: "ticketImg", maxCount: 1 },
  { name: "catalogImg", maxCount: 1 },
  { name: "collectionFile", maxCount: 1 },
  { name: "expertImg", maxCount: 1 },
]);

module.exports = upload;
