const multer = require("multer");
const mongoose = require("mongoose");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file?.fieldname === "collectionFile") {
      if (file.mimetype === "image/jpg" || file.mimetype === "image/png" || file.mimetype === "image/jpeg" || file.mimetype === "image/webp") {
        return cb(null, "./public/uploads/users");
      } else {
        return cb(null, "./public/uploads/videos");
      }
    }

    if (file?.fieldname === "circleFile") {
      if (file.mimetype === "image/jpg" || file.mimetype === "image/png" || file.mimetype === "image/jpeg" || file.mimetype === "image/webp") {
        return cb(null, "./public/uploads/users");
      } else {
        return cb(null, "./public/uploads/videos");
      }
    }

    if (file?.fieldname === "ticketImg") {
      if (file.mimetype === "image/jpg" || file.mimetype === "image/png" || file.mimetype === "image/jpeg" || file.mimetype === "image/webp") {
        return cb(null, "./public/uploads/users");
      } else {
        return cb(null, "./public/uploads/documents");
      }
    }

    if (file?.fieldname === "uploadDocs") {
      cb(null, "./public/uploads/documents");
    }

    if (["additionalVideo", "mainVideo", "otherVideo"].includes(file?.fieldname)) {
      return cb(null, "./public/uploads/videos");
    }

    return cb(null, "./public/uploads/users");
  },

  filename: function (req, file, cb) {
    const fileExtension = path.extname(file.originalname).slice(1);
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
        "evidenceImg",
        "planImg",
        "carouselImg",
        "circleFile",
      ].includes(file?.fieldname)
    ) {
      data = mongoose.Types.ObjectId();
    }
    cb(null, `${data}.${fileExtension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const imageMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
  const videoMimeTypes = new Set(["video/mp4", "video/webm", "video/mkv"]);
  const docMimeTypes = new Set([
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain",
    "application/pdf",
  ]);

  if (file?.fieldname === "uploadDocs") {
    if (docMimeTypes.has(file.mimetype)) {
      return cb(null, true);
    }
  }

  if (file?.fieldname === "collectionFile") {
    if (videoMimeTypes.has(file.mimetype) || imageMimeTypes.has(file.mimetype)) {
      return cb(null, true);
    }
  }

  if (file?.fieldname === "circleFile") {
    if (videoMimeTypes.has(file.mimetype) || imageMimeTypes.has(file.mimetype)) {
      return cb(null, true);
    }
  }

  if (file?.fieldname === "ticketImg") {
    if (docMimeTypes.has(file.mimetype) || imageMimeTypes.has(file.mimetype)) {
      return cb(null, true);
    }
  }

  if (["additionalVideo", "mainVideo", "otherVideo"].includes(file?.fieldname) && videoMimeTypes.has(file.mimetype)) {
    return cb(null, true);
  }

  if (imageMimeTypes.has(file.mimetype)) {
    return cb(null, true);
  }

  req.fileValidationError = "Please upload a valid file format";
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
  { name: "otherVideo", maxCount: 5 },
  { name: "backImage", maxCount: 1 },
  { name: "ticketImg", maxCount: 1 },
  { name: "catalogImg", maxCount: 1 },
  { name: "collectionFile", maxCount: 1 },
  { name: "expertImg", maxCount: 1 },
  { name: "expertImg", maxCount: 1 },
  { name: "evidenceImg", maxCount: 5 },
  { name: "planImg", maxCount: 1 },
  { name: "carouselImg", maxCount: 1 },
  { name: "circleFile", maxCount: 5 },
]);

const processImages = async (req, res) => {
  try {
    const imageFields = ["backImage", "inProcessImage", "images", "mainImage"];

    if (!req.files) return;

    for (const field of imageFields) {
      if (req.files[field]) {
        for (const file of req.files[field]) {
          // const originalPath = file.path;
          const compressedPath = `./public/low/${file.filename}`;

          // if (!fs.existsSync("./public/uploads/low")) {
          //   fs.mkdirSync("./public/uploads/low", {
          //     recursive: true,
          //   });
          // }

          await sharp(`./public/uploads/users/${file.filename}`).resize({ width: 800 }).jpeg({ quality: 60 }).toFile(compressedPath);

          // await sharp(`./public/uploads/users/${file.filename}`)
          //   .resize({ width: 800 })
          //   .jpeg({ quality: 60 })
          //   .toFile(compressedPath);
        }
      }
    }

    return;
  } catch (error) {
    console.error("Error processing images:", error);
    next(error);
  }
};

module.exports = { upload, processImages };
