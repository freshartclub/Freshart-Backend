const jwt = require("jsonwebtoken");
const { createLog } = require('../functions/common');
const APIErrorLog = createLog('API_error_log');
const Admin = require("../models/adminModel");
const { getImageFile } = require("../functions/aws-sdk");

const validateAdminToken = async (req, res, next) => {
  try {
    if (req?.headers?.authorization) {
      const { 1: token } = req.headers.authorization.split(" ");
      jwt.verify(token, process.env.ACCESS_TOKEN_SECERT, async (err, verifiedJwt) => {
        if (err) {
          return res.status(401).send({ message: "Invalid token please do re-login" });
        }
        let adminData = JSON.parse(Buffer.from(req.headers.authorization.split(".")[1], "base64").toString());
        adminData = await Admin.findOne({ tokens: { $elemMatch: { $eq: token } } }, { tokens: 0 }).lean();
        if (adminData) {

          if (adminData?.profileImage) {
            const imgURL = await getImageFile(process.env.BUCKET_NAME, adminData?.profileImage);
            adminData["profileImage"] = imgURL.imageUrl;
          }

          req.user = adminData;
          return next();
        }
        return res.status(401).send({ message: "You are not authorized" });
      });
    } else {
      return res.status(401).send({ message: "Token is not found" });
    }
  } catch (error) {
    APIErrorLog.error("Error while authenticate the admin");
    APIErrorLog.error(error)
    return res.status(500).send({ message: "Something went wrong" });
  }
};

module.exports = validateAdminToken;
