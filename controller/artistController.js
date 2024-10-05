const mongoose = require("mongoose");
const BecomeArtist = require("../models/becomeArtistModel");
const Artist = require("../models/artistModel");
const { createLog, fileUploadFunc } = require("../functions/common");
const { sendMail } = require("../functions/mailer");
const APIErrorLog = createLog("API_error_log");
const md5 = require("md5");

const isStrongPassword = (password) => {
  const uppercaseRegex = /[A-Z]/;
  const lowercaseRegex = /[a-z]/;
  const numericRegex = /\d/;
  const specialCharRegex = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/;

  if (
    uppercaseRegex.test(password) &&
    lowercaseRegex.test(password) &&
    numericRegex.test(password) &&
    specialCharRegex.test(password)
  ) {
    return true;
  } else {
    return false;
  }
};

const login = async (req, res) => {
  try {
    return res.status(200).send({
      token,
      message: "Artist login Successfully",
    });
  } catch (error) {
    APIErrorLog.error("Error while login the artist");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const becomeArtist = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);

    if (fileData.type !== "success") {
      return res.status(fileData.status).send({
        message:
          fileData?.type === "fileNotFound"
            ? "Please upload the documents"
            : fileData.type,
      });
    }

    const checkDuplicate = await Artist.countDocuments({
      $or: [
        { phone: req.body.phone.replace(/[- )(]/g, "").trim() },
        { email: req.body.email.toLowerCase() },
      ],
      isDeleted: false,
    });

    if (checkDuplicate) {
      return res.status(400).send({
        message:
          "These credentials have already been used. Please use different credentials.",
      });
    }

    let obj = {
      fullName: req.body.fullName
        .toLowerCase()
        .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
        .trim(),
      phone: req.body.phone.replace(/[- )(]/g, "").trim(),
      email: req.body.email.toLowerCase(),
      category: req.body.category,
      style: req.body.style,
      socialMedia: req.body.socialMedia,
      website: req.body.website,
    };

    obj["address"] = {
      city: req.body.city,
      region: req.body.region,
      country: req.body.country,
      zipCode: String(req.body.zipCode),
    };

    obj["uploadFile"] = fileData.data.uploadDocs[0].filename;
    obj["_id"] = mongoose.Types.ObjectId(obj["uploadFile"].slice(0, 24));
    await BecomeArtist.create(obj);

    const mailVariable = {
      "%fullName%": obj.fullName,
      "%phone%": obj.phone,
      "%email%": obj.email,
    };

    sendMail("become-an-artist", mailVariable, obj.email);

    return res
      .status(200)
      .send({ message: "Your Become Artist request sent successfully." });
  } catch (error) {
    APIErrorLog.error("Error while register the artist information");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { artistId, token } = req.query;
    const { password, confirmPassword } = req.body;

    if (token) {
      const artist = await Artist.findOne({
        _id: artistId,
        isDeleted: false,
      });
      if (!artist) return res.status(400).send({ message: "Artist not found" });
      if (artist.passwordLinkTokenUsed === true) {
        return res
          .status(400)
          .send({ message: "Link is either expired/broken" });
      }

      if (!isStrongPassword(password)) {
        return res.status(400).send({
          message:
            "Password must contain one Uppercase, Lowercase, Numeric and Special Character",
        });
      }
      if (password !== confirmPassword) {
        return res
          .status(400)
          .send({ message: "Password and confirm password does not match" });
      }

      artist.password = md5(password);
      artist.passwordLinkTokenUsed = true;
      artist.passwordLinkToken = null;
      await artist.save();
      return res.status(200).send({ message: "New Password set successfully" });
    } else {
      const artist = await Artist.findOne({
        _id: artistId,
        isDeleted: false,
      });
      if (!artist) return res.status(400).send({ message: "Artist not found" });

      if (!isStrongPassword(password)) {
        return res.status(400).send({
          message:
            "Password must contain one Uppercase, Lowercase, Numeric and Special Character",
        });
      }
      if (password !== confirmPassword) {
        return res
          .status(400)
          .send({ message: "Password and confirm password does not match" });
      }

      artist.password = md5(password);
      await artist.save();
      return res.status(200).send({ message: "Password reset successfully" });
    }
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

module.exports = {
  login,
  becomeArtist,
  resetPassword,
};
