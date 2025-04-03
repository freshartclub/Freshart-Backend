const multer = require("multer");
const { upload } = require("./upload");

module.exports.createLog = (logName) => {
  try {
    return require("simple-node-logger").createRollingFileLogger({
      logDirectory: "logs", // NOTE: folder must exist and be writable...
      fileNamePattern: logName + "_<DATE>.log",
      dateFormat: "YYYY_MM_DD",
      timestampFormat: "YYYY-MM-DD HH:mm:ss",
    });
  } catch (error) {
    throw error;
  }
};

module.exports.generateRandomId = (user) => {
  try {
    const characters = user ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" : "0123456789";

    const length = user ? 8 : 10;
    let result = "";

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters[randomIndex];
    }

    return result;
  } catch (error) {
    throw error;
  }
};

module.exports.generateRandomOTP = () => {
  try {
    const digits = "0123456789";
    let OTP = "";
    for (let i = 0; i < 6; i++) {
      OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
  } catch (error) {
    throw error;
  }
};

module.exports.generateRandomOrderId = () => {
  try {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    const length = 25;
    let result = "";

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters[randomIndex];
    }

    return result;
  } catch (error) {
    throw error;
  }
};

module.exports.generateSchedulerRef = () => {
  try {
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";

    const length = 15;
    let result = "";

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters[randomIndex];
    }

    return result;
  } catch (error) {
    throw error;
  }
};

module.exports.fileUploadFunc = (request, response) => {
  return new Promise(async function (resolve, reject) {
    try {
      upload(request, response, (err) => {
        if (request.files && !Object.keys(request.files).length) {
          return resolve({
            type: "fileNotFound",
            status: 400,
          });
        }

        if (request.fileValidationError) {
          return resolve({
            type: request.fileValidationError,
            status: 400,
          });
        }

        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return resolve({
              type: "Unexpected file field",
              status: 400,
            });
          }
        } else if (err) {
          return resolve({
            type: "File upload failed",
            status: 400,
          });
        }

        return resolve({
          type: "success",
          status: 200,
          data: request.files,
        });
      });
    } catch (error) {
      return reject(error);
    }
  });
};
