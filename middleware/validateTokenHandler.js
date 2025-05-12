const jwt = require("jsonwebtoken");
const { createLog } = require("../functions/common");
const APIErrorLog = createLog("API_error_log");
const Artist = require("../models/artistModel");

const validateToken = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      const { 1: token } = req.headers.authorization.split(" ");
      jwt.verify(token, process.env.ACCESS_TOKEN_SECERT, async (err, verifiedJwt) => {
        if (err) {
          return res.status(401).send({ message: "Please do re-login" });
        }

        const user = await Artist.findOne({ _id: verifiedJwt.user._id, isDeleted: false }, { artistName: 1, role: 1, tokens: 1, email: 1 }).lean();
        if (!user) return res.status(400).send({ message: "User not found" });

        if (user?.tokens) {
          const isTokenPresent = user.tokens.find((item) => item === token);
          if (!isTokenPresent) return res.status(401).send({ message: "Please do re-login" });

          const userField = {
            _id: user._id,
            role: user.role,
            artistName: user.artistName,
            email: user.email,
          };

          req.user = userField;
          return next();
        }

        return res.status(401).send({ message: "Please Login" });
      });
    } else {
      return res.status(401).send({ message: "Please Login" });
    }
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ error: error, message: "Something went wrong" });
  }
};

module.exports = validateToken;
