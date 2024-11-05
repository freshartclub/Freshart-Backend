const ArtworkMediaStyle = require("../models/artWorkMediaModel");
const Theme = require("../models/themeModel");
const Technic = require("../models/technicModel");
const MediaSupport = require("../models/mediaSupportModel");
const multer = require("multer");

const upload = require("../functions/upload");

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
    const characters = user
      ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
      : "0123456789";

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

module.exports.getListArtworks = async (response) => {
  try {
    let data = [];

    let obj = {
      $lookup: {
        from: "categories",
        let: { category: "$category" },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ["$_id", "$$category"],
              },
            },
          },
          {
            $project: {
              categoryName: 1,
              categorySpanishName: 1,
            },
          },
        ],
        as: "categories",
      },
    };

    switch (response) {
      case "style":
        data = await ArtworkMediaStyle.aggregate([
          {
            $match: {
              isDeleted: false,
            },
          },
          obj,
          {
            $project: {
              styleName: 1,
              spanishStyleName: 1,
              createdAt: 1,
              categoryName: {
                $reduce: {
                  input: "$categories",
                  initialValue: "",
                  in: {
                    $concat: [
                      "$$value", // The accumulated string
                      {
                        $cond: {
                          if: { $eq: ["$$value", ""] },
                          then: "",
                          else: ", ",
                        },
                      },
                      "$$this.categoryName", // The current element
                    ],
                  },
                },
              },
              categorySpanish: {
                $reduce: {
                  input: "$categories",
                  initialValue: "",
                  in: {
                    $concat: [
                      "$$value", // The accumulated string
                      {
                        $cond: {
                          if: { $eq: ["$$value", ""] },
                          then: "",
                          else: ", ",
                        },
                      },
                      "$$this.categorySpanishName", // The current element
                    ],
                  },
                },
              },
            },
          },
        ]);
        break;

      case "theme":
        data = await Theme.aggregate([
          {
            $match: {
              isDeleted: false,
            },
          },
          obj,
          {
            $project: {
              styleName: 1,
              spanishStyleName: 1,
              categoryName: {
                $reduce: {
                  input: "$categories",
                  initialValue: "",
                  in: {
                    $concat: [
                      "$$value", // The accumulated string
                      {
                        $cond: {
                          if: { $eq: ["$$value", ""] },
                          then: "",
                          else: ", ",
                        },
                      },
                      "$$this.categoryName", // The current element
                    ],
                  },
                },
              },
              categorySpanish: {
                $reduce: {
                  input: "$categories",
                  initialValue: "",
                  in: {
                    $concat: [
                      "$$value",
                      {
                        $cond: {
                          if: { $eq: ["$$value", ""] },
                          then: "",
                          else: ", ",
                        },
                      },
                      "$$this.categorySpanishName",
                    ],
                  },
                },
              },
            },
          },
        ]);
        break;

      case "technic":
        data = await Technic.aggregate([
          {
            $match: {
              isDeleted: false,
            },
          },
          obj,
          {
            $project: {
              styleName: 1,
              spanishStyleName: 1,
              categoryName: {
                $reduce: {
                  input: "$categories",
                  initialValue: "",
                  in: {
                    $concat: [
                      "$$value",
                      {
                        $cond: {
                          if: { $eq: ["$$value", ""] },
                          then: "",
                          else: ", ",
                        },
                      },
                      "$$this.categoryName",
                    ],
                  },
                },
              },
              categorySpanish: {
                $reduce: {
                  input: "$categories",
                  initialValue: "",
                  in: {
                    $concat: [
                      "$$value",
                      {
                        $cond: {
                          if: { $eq: ["$$value", ""] },
                          then: "",
                          else: ", ",
                        },
                      },
                      "$$this.categorySpanishName",
                    ],
                  },
                },
              },
            },
          },
        ]);
        break;

      case "support":
        data = await MediaSupport.aggregate([
          {
            $match: {
              isDeleted: false,
            },
          },
          obj,
          {
            $project: {
              styleName: 1,
              spanishStyleName: 1,
              categoryName: {
                $reduce: {
                  input: "$categories",
                  initialValue: "",
                  in: {
                    $concat: [
                      "$$value",
                      {
                        $cond: {
                          if: { $eq: ["$$value", ""] },
                          then: "",
                          else: ", ",
                        },
                      },
                      "$$this.categoryName",
                    ],
                  },
                },
              },
              categorySpanish: {
                $reduce: {
                  input: "$categories",
                  initialValue: "",
                  in: {
                    $concat: [
                      "$$value",
                      {
                        $cond: {
                          if: { $eq: ["$$value", ""] },
                          then: "",
                          else: ", ",
                        },
                      },
                      "$$this.categorySpanishName",
                    ],
                  },
                },
              },
            },
          },
        ]);
        break;
    }

    return data;
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
          // Handle Multer-specific errors
          if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return resolve({
              type: "Unexpected file field",
              status: 400,
            });
          }
          // return resolve({
          // 	type: err.message,
          // 	status: 400,
          // });
        } else if (err) {
          // Handle other errors
          return resolve({
            type: "File upload failed",
            status: 400,
          });
        }

        // const existingFiles = {};
        // const newFilesData = {};

        // // Check for existing files and categorize
        // for (const field in request.files) {
        //   existingFiles[field] = [];
        //   newFilesData[field] = [];

        //   for (const file of request.files[field]) {
        //     const filePath = path.join(__dirname, `../public/uploads/${field}`, file.filename);
        //     if (fs.existsSync(filePath)) {
        //       // File exists, add to existingFiles
        //       existingFiles[field].push({
        //         filename: file.filename,
        //         path: filePath,
        //         size: file.size,
        //       });
        //     } else {
        //       // File does not exist, add to newFilesData
        //       newFilesData[field].push(file);
        //     }
        //   }
        // }

        // // Prepare the response
        // const responseData = {
        //   type: "success",
        //   status: 200,
        //   data: {},
        // };

        // // Include existing files in the response if any
        // for (const field in existingFiles) {
        //   if (existingFiles[field].length > 0) {
        //     responseData.data[field] = existingFiles[field];
        //   }
        // }

        // // Include newly uploaded files in the response if any
        // for (const field in newFilesData) {
        //   if (newFilesData[field].length > 0) {
        //     responseData.data[field] = newFilesData[field];
        //   }
        // }

        // // If there are no new files uploaded, you might want to notify about that
        // if (Object.keys(newFilesData).length === 0) {
        //   responseData.message = "No new files uploaded; all files already exist.";
        // }

        // return resolve(responseData);

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
