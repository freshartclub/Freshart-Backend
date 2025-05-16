const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const THUMBNAIL_MAX_SIZE = 80 * 1024;

const generateRandomString = () => {
  return crypto.randomBytes(5).toString("hex").slice(0, 10);
};

const generateFilename = (originalname) => {
  const ext = path.extname(originalname).slice(1);
  const randomStr = generateRandomString();
  const timestamp = Date.now();
  return `${randomStr}-${timestamp}.${ext}`;
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const basePath = "./public/uploads";

    if (file?.fieldname === "collectionFile" || file?.fieldname === "circleFile") {
      const typePath = file.mimetype.startsWith("image/") ? "users" : "videos";
      return cb(null, `${basePath}/${typePath}`);
    }

    if (file?.fieldname === "ticketImg") {
      const typePath = file.mimetype.startsWith("image/") ? "users" : "documents";
      return cb(null, `${basePath}/${typePath}`);
    }

    if (file?.fieldname === "uploadDocs") {
      return cb(null, `${basePath}/documents`);
    }

    if (["additionalVideo", "mainVideo", "otherVideo"].includes(file?.fieldname)) {
      return cb(null, `${basePath}/videos`);
    }

    return cb(null, `${basePath}/users`);
  },

  filename: function (req, file, cb) {
    cb(null, generateFilename(file.originalname));
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

  const field = file?.fieldname;

  const fieldValidators = {
    uploadDocs: docMimeTypes,
    collectionFile: new Set([...imageMimeTypes, ...videoMimeTypes]),
    circleFile: new Set([...imageMimeTypes, ...videoMimeTypes]),
    ticketImg: new Set([...imageMimeTypes, ...docMimeTypes]),
    additionalVideo: videoMimeTypes,
    mainVideo: videoMimeTypes,
    otherVideo: videoMimeTypes,
    default: imageMimeTypes,
  };

  const validator = fieldValidators[field] || fieldValidators.default;

  if (validator.has(file.mimetype)) {
    return cb(null, true);
  }

  req.fileValidationError = "Please upload a valid file format";
  return cb(null, false, req.fileValidationError);
};

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
  { name: "checkImage", maxCount: 5 },
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
    if (!req.files) return next();

    const thumbnailFields = ["backImage", "inProcessImage", "images", "mainImage"];
    const keepOriginalFields = ["mainVideo", "additionalVideo", "otherVideo", "uploadDocs"];

    ensureDirectoryExists("./public/uploads/users");
    ensureDirectoryExists("./public/uploads/videos");
    ensureDirectoryExists("./public/uploads/documents");
    ensureDirectoryExists("./public/low");

    for (const field in req.files) {
      for (const file of req.files[field]) {
        if (!file.mimetype?.startsWith("image/")) continue;

        let storagePath;
        if (file.fieldname === "uploadDocs") {
          storagePath = `./public/uploads/documents/${file.filename}`;
        } else if (["additionalVideo", "mainVideo", "otherVideo"].includes(file.fieldname)) {
          storagePath = `./public/uploads/videos/${file.filename}`;
        } else {
          storagePath = `./public/uploads/users/${file.filename}`;
        }

        if (!fs.existsSync(storagePath)) {
          console.warn(`File not found: ${storagePath}`);
          continue;
        }

        const stats = fs.statSync(storagePath);

        if (keepOriginalFields.includes(field)) {
          console.log(`Keeping original file: ${storagePath}`);
          continue;
        }

        // Process compression for non-thumbnail, non-protected image fields
        const shouldKeepOriginal = keepOriginalFields.includes(field);
        const shouldGenerateThumbnail = thumbnailFields.includes(field);

        if (!shouldKeepOriginal && file.mimetype.startsWith("image/")) {
          if (stats.size > MAX_IMAGE_SIZE) {
            // console.log(`Compressing ${storagePath} (${stats.size} > ${MAX_IMAGE_SIZE})`);
            const success = await compressAndSaveImage(storagePath, storagePath, MAX_IMAGE_SIZE);

            if (success) {
              const newStats = fs.statSync(storagePath);
              // console.log(`Compressed to: ${newStats.size} bytes`);
            } else {
              console.error(`Failed to compress ${storagePath}`);
            }
          }
        }
      }
    }

    // Generate thumbnails only for specified fields
    for (const field of thumbnailFields) {
      if (req.files[field]) {
        for (const file of req.files[field]) {
          if (!file.mimetype?.startsWith("image/")) continue;

          const originalPath = `./public/uploads/users/${file.filename}`;
          const thumbnailPath = `./public/low/${file.filename}`;

          if (!fs.existsSync(originalPath)) {
            // console.warn(`Original not found for thumbnail: ${originalPath}`);
            continue;
          }

          try {
            await compressAndSaveImage(originalPath, thumbnailPath, THUMBNAIL_MAX_SIZE, true);
            // console.log(`Created thumbnail: ${thumbnailPath}`);
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
