const jwt = require("jsonwebtoken");
const { createLog } = require("../functions/common");
const APIErrorLog = createLog("API_error_log");
const Artist = require("../models/artistModel");

const validateToken = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      const { 1: token } = req.headers.authorization.split(" ");
      jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECERT,
        async (err, verifiedJwt) => {
          if (err) {
            return res
              .status(401)
              .send({ message: "Invalid token please do re-login" });
          }

          let userData = JSON.parse(
            Buffer.from(
              req.headers.authorization.split(".")[1],
              "base64"
            ).toString()
          );

          userData = await Artist.findOne({
            tokens: { $elemMatch: { $eq: token } },
            isDeleted: false,
          }).lean();

          if (userData) {
            req.user = userData;
            return next();
          }

          return res.status(401).send({ message: "You are not authorized" });
        }
      );
    } else {
      return res
        .status(404)
        .send({ message: "Token not found. Please log in to your account" });
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
