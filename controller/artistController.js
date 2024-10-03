const mongoose = require("mongoose");

const Artist = require("../models/artistModel");
const { v4: uuidv4 } = require("uuid");
const { createLog, fileUploadFunc } = require("../functions/common");
const { sendMail } = require("../functions/mailer");
const md5 = require("md5");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { checkValidations } = require("../functions/checkValidation");
const { generateOtp } = require("../functions/genrateOtp");
const userSchema = require("../models/UserModel");

const APIErrorLog = createLog("API_error_log");

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    const checkValid = await checkValidations(errors);

    if (checkValid.type === "error") {
      return res.status(400).send({
        message: checkValid.errors.msg,
      });
    }
    const { email, password } = req.body;
    const artist = await Artist.findOne(
      { email: email.toLowerCase(), isDeleted: false },
      { email: 1, password: 1, roles: 1 }
    ).lean();
    if (artist && artist.password === md5(password)) {
      const token = jwt.sign(
        { user: artist },
        process.env.ACCESS_TOKEN_SECERT,
        { expiresIn: "30d" }
      );
      await Artist.updateOne(
        { _id: artist._id, isDeleted: false },
        { $push: { tokens: token } }
      );
      return res.status(200).send({
        token,
        message: "Artist login Successfully",
      });
    }

    return res.status(400).send({ message: "Invalid Username and Password" });
  } catch (error) {
    console.error("Error while logging in the artist", error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    const checkValid = await checkValidations(errors);
    if (checkValid.type === "error") {
      return res.status(400).send({
        message: checkValid.errors.msg,
      });
    }
    const user = await Artist.findOne({
      email: req.body.email,
      isDeleted: false,
    }).lean(true);

    if (!user) {
      return res.status(400).send({ message: "Email not found" });
    }
    const otp = generateOtp();
    Artist.updateOne({ email: req.body.email }, { $set: { otp } }).then();
    await sendMail("resetPassword", { otp }, req.body.email);
    return res
      .status(201)
      .send({ status: 201, message: "Reset OTP sent successfully" });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    return res
      .status(500)
      .send({ message: "Something went wrong", error: error.message });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email } = req.params;
    const { otp } = req.body;

    if (!email || !otp) {
      return res.status(400).send({ message: "Email and OTP are required" });
    }
    const user = await Artist.findOne(
      {
        email,
        isDeleted: false,
      },
      { otp: 1 }
    );

    if (!user) {
      return res.status(400).send({ message: "Email not found" });
    }

    if (user.otp !== otp) {
      return res.status(400).send({ message: "Invalid OTP" });
    }
    const resetToken = uuidv4();
    Artist.updateOne(
      { email },
      { $set: { token: resetToken }, $unset: { otp: "" } }
    ).then();
    return res.status(200).send({
      token: resetToken,
      message: "OTP verified successfully. You can now reset your password.",
    });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    return res
      .status(500)
      .send({ message: "Something went wrong", error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const { token } = req.params;
    if (!newPassword || !confirmPassword || !token) {
      return res.status(400).send({
        message: "New password, confirm password, and reset token are required",
      });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).send({
        message: "New password and confirm password do not match",
      });
    }
    const user = await Artist.findOne({ token, isDeleted: false }).lean(true);
    if (!user) {
      return res.status(400).send({ message: "Invalid reset token" });
    }

    const hashedPassword = md5(newPassword);
    Artist.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword, token: "" } }
    ).then();

    return res.status(200).send({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    return res
      .status(500)
      .send({ message: "Something went wrong", error: error.message });
  }
};
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    const checkValid = await checkValidations(errors);

    if (checkValid.type === "error") {
      return res.status(400).send({
        message: checkValid.errors.msg,
      });
    }
    const { password, newPassword, confirmPassword } = req.body;
    console.log('passwordpasswordpassword', req.body);

    // Check if all required fields are present
    if (!password || !newPassword || !confirmPassword) {
      return res.status(400).send({
        message: "Password, New password and confirm password are required",
      });
    }

    const hashPassword = md5(password);

    // Find the user by ID and get their current password
    const user = await Artist.findOne(
      { _id: req.user._id, isDeleted: false },
      { password: 1 }
    ).lean(true);

    if (!user) {
      return res.status(400).send({ message: "User not found" });
    }

    // Corrected password comparison
    if (user.password !== hashPassword) {
      return res.status(400).send({ message: "The current password you entered is incorrect" });
    }

    // Check if newPassword matches confirmPassword
    if (newPassword !== confirmPassword) {
      return res.status(400).send({
        message: "New password and confirm password must be same",
      });
    }

    // Update the user's password with the new hashed password
    await Artist.updateOne(
      { _id: user._id },
      { $set: { password: md5(newPassword) } }
    );

    return res.status(200).send({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error in changing password:", error);
    return res.status(500).send({
      message: "Something went wrong",
      error: error.message,
    });
  }
};
const User = async (req, res) => {
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
    await userSchema.create(obj);

    const mailVariable = {
      "%fullName%": obj.fullName,
      "%phone%": obj.phone,
      "%email%": obj.email,
    };

    sendMail("user", mailVariable, obj.email);

    return res
      .status(200)
      .send({ message: "Your user request sent successfully." });
  } catch (error) {
    APIErrorLog.error("Error while register the user information");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

module.exports = {
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  changePassword,
  User,
};
