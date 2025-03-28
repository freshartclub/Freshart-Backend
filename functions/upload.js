const multer = require("multer");
const mongoose = require("mongoose");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const THUMBNAIL_MAX_SIZE = 80 * 1024;
const MAX_MEMORY_FILE_SIZE = 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file?.fieldname === "collectionFile") {
      if (file.mimetype.startsWith("image/")) {
        return cb(null, "./public/uploads/users");
      } else {
        return cb(null, "./public/uploads/videos");
      }
    }

    if (file?.fieldname === "circleFile") {
      if (file.mimetype.startsWith("image/")) {
        return cb(null, "./public/uploads/users");
      } else {
        return cb(null, "./public/uploads/videos");
      }
    }

    if (file?.fieldname === "ticketImg") {
      if (file.mimetype.startsWith("image/")) {
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

// Multer Upload Configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
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
  { name: "evidenceImg", maxCount: 5 },
  { name: "planImg", maxCount: 1 },
  { name: "carouselImg", maxCount: 1 },
  { name: "circleFile", maxCount: 5 },
]);

const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const compressAndSaveImage = async (inputPath, outputPath, maxSize, isThumbnail = false) => {
  try {
    // Read the original file
    const originalBuffer = fs.readFileSync(inputPath);

    // Compression settings
    const resizeOptions = {
      width: isThumbnail ? 800 : 1600,
      withoutEnlargement: true,
      fit: "inside",
    };

    const jpegOptions = {
      quality: isThumbnail ? 70 : 80,
      mozjpeg: true,
    };

    // Process image
    let outputBuffer = await sharp(originalBuffer).resize(resizeOptions).jpeg(jpegOptions).toBuffer();

    // If still too large, reduce quality further
    let quality = jpegOptions.quality;
    while (outputBuffer.length > maxSize && quality > 10) {
      quality -= 5;
      outputBuffer = await sharp(originalBuffer)
        .resize(resizeOptions)
        .jpeg({ ...jpegOptions, quality })
        .toBuffer();
    }

    // Save the processed image
    fs.writeFileSync(outputPath, outputBuffer);
    return true;
  } catch (error) {
    console.error(`Error processing ${inputPath}:`, error);
    return false;
  }
};

const processImages = async (req, res, next) => {
  try {
    if (!req.files) return;

    ensureDirectoryExists("./public/uploads/users");
    ensureDirectoryExists("./public/low");

    for (const field in req.files) {
      if (
        req.files[field] &&
        !["mainImage", "mainVideo", "additionalVideo", "otherVideo", "uploadDocs"].includes(field) &&
        req.files[field][0]?.mimetype?.startsWith("image/")
      ) {
        for (const file of req.files[field]) {
          const originalPath = `./public/uploads/users/${file.filename}`;

          if (!fs.existsSync(originalPath)) {
            console.warn(`File not found: ${originalPath}`);
            continue;
          }

          const stats = fs.statSync(originalPath);
          console.log(`Processing ${originalPath}, size: ${stats.size} bytes`);

          // Skip if file is too large for safe processing
          if (stats.size > MAX_MEMORY_FILE_SIZE) {
            console.warn(`File too large for processing: ${originalPath} (${stats.size} bytes)`);
            continue;
          }

          if (stats.size > MAX_IMAGE_SIZE) {
            console.log(`Compressing ${originalPath} (${stats.size} > ${MAX_IMAGE_SIZE})`);

            const success = await compressAndSaveImage(originalPath, originalPath, MAX_IMAGE_SIZE);

            if (success) {
              const newStats = fs.statSync(originalPath);
              console.log(`Compressed to: ${newStats.size} bytes`);
            } else {
              console.error(`Failed to compress ${originalPath}`);
            }
          }
        }
      }
    }

    const thumbnailFields = ["backImage", "inProcessImage", "images", "mainImage"];
    for (const field of thumbnailFields) {
      if (req.files[field]) {
        for (const file of req.files[field]) {
          const originalPath = `./public/uploads/users/${file.filename}`;
          const thumbnailPath = `./public/low/${file.filename}`;

          if (!fs.existsSync(originalPath)) {
            console.warn(`Original not found for thumbnail: ${originalPath}`);
            continue;
          }

          try {
            await compressAndSaveImage(originalPath, thumbnailPath, THUMBNAIL_MAX_SIZE, true);
            console.log(`Created thumbnail: ${thumbnailPath}`);
          } catch (err) {
            console.error(`Failed to create thumbnail ${thumbnailPath}:`, err);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in processImages:", error);
    next(error);
  }
};

module.exports = { upload, processImages };
