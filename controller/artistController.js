const mongoose = require("mongoose");
const Artist = require("../models/artistModel");
const jwt = require("jsonwebtoken");
const {
  createLog,
  fileUploadFunc,
  generateRandomId,
  generateRandomOTP,
} = require("../functions/common");
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
    const { email, password } = req.body;

    const user = await Artist.findOne({
      email: email.toLowerCase(),
      isDeleted: false,
    })
      .select("+password")
      .lean(true);

    if (!user) {
      return res.status(400).send({ message: "Artist not found" });
    }

    if (user.password !== md5(password)) {
      return res.status(400).send({ message: "Invalid credentials" });
    }

    const userField = {
      _id: user._id,
      role: user.role,
      password: user.password,
    };

    const token = jwt.sign(
      { user: userField },
      process.env.ACCESS_TOKEN_SECERT,
      {
        expiresIn: "30d",
      }
    );

    Artist.updateOne(
      { _id: user._id, isDeleted: false },
      { $push: { tokens: token } }
    ).then();

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

const registerUser = async (req, res) => {
  try {
    const { email, password, cpassword } = req.body;

    if (password !== cpassword) {
      return res.status(400).send({ message: "Password does not match" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).send({
        message:
          "Password must contain one Uppercase, Lowercase, Numeric and Special Character",
      });
    }

    const isExist = await Artist.countDocuments({
      email: email.toLowerCase(),
      isDeleted: false,
    });

    if (isExist) {
      return res.status(400).send({
        message:
          "User with this email already exist. Please try with another email",
      });
    }

    let user = true;
    const newUser = await Artist.create({
      email: email.toLowerCase(),
      password: md5(password),
      userId: generateRandomId(user),
      role: "user",
    });

    const userField = {
      _id: newUser._id,
      role: newUser.role,
      password: newUser.password,
    };

    const token = jwt.sign(
      { user: userField },
      process.env.ACCESS_TOKEN_SECERT,
      { expiresIn: "30d" }
    );

    await Artist.updateOne(
      { _id: newUser._id, isDeleted: false },
      {
        $push: { tokens: token },
      }
    );

    return res.status(200).send({
      token,
      message: "Artist registered Successfully",
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

    let obj = {
      artistName: req.body.fullName
        .toLowerCase()
        .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
        .trim(),
      phone: req.body.phone.replace(/[- )(]/g, "").trim(),
      email: req.body.email.toLowerCase(),
      isArtistRequest: true,
      // style: req.body.style,
    };

    obj["category"] = {
      category: req.body.category,
    };

    obj["links"] = {
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

    let condition = {
      $set: obj,
    };

    const checkAritst = async (email) => {
      const isExistingAritst = await Artist.countDocuments({
        email: email.toLowerCase(),
        isDeleted: false,
      });

      if (isExistingAritst) {
        return res
          .status(400)
          .send({ message: "Artist already exist with this email" });
      }

      await Artist.create(obj);
    };

    req?.params?.id
      ? await Artist.updateOne({ _id: req.params.id }, condition)
      : await checkAritst(obj.email);

    const mailVariable = {
      "%fullName%": obj.artistName,
      "%email%": obj.email,
    };

    await sendMail("become-an-artist", mailVariable, obj.email);

    return res
      .status(200)
      .send({ message: "Your Become Artist request sent successfully" });
  } catch (error) {
    APIErrorLog.error("Error while register the artist information");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const sendForgotPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await Artist.findOne({
      email: email.toLowerCase(),
      isDeleted: false,
    });

    if (!user) {
      return res.status(400).send({ message: "User not found" });
    }

    const otp = await generateRandomOTP();
    const mailVaribles = {
      "%fullName%": user.firstName,
      "%email%": user.email,
      "%otp%": otp,
    };

    await sendMail("send-forgotpassword-otp", mailVaribles, user.email);

    await Artist.updateOne(
      { _id: user._id, isDeleted: false },
      { $set: { OTP: otp } }
    );

    return res.status(200).send({
      id: user._id,
      message: "OTP sent Successfully",
    });
  } catch (error) {
    APIErrorLog.error("Error while register the artist information");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const validateOTP = async (req, res) => {
  try {
    const { id, otp } = req.body;

    const user = await Artist.findOne({
      _id: id,
      isDeleted: false,
    }).lean(true);

    if (!user) {
      return res.status(400).send({ message: "User not found" });
    }

    if (!user.OTP) {
      return res.status(400).send({ message: "Invalid OTP" });
    }

    if (user.OTP !== otp) {
      return res.status(400).send({ message: "Invalid OTP" });
    }

    await Artist.updateOne(
      { _id: user._id, isDeleted: false },
      { $unset: { OTP: "" } }
    );

    return res
      .status(200)
      .send({ message: "OTP verified successfully", id: user._id });
  } catch (error) {
    APIErrorLog.error("Error while login the admin");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const resetPassword = async (req, res) => {
  try {
    let { artistId, token } = req.query;
    const { newPassword, confirmPassword } = req.body;

    if (token === "null") token = null;

    if (token !== null) {
      const artist = await Artist.findOne({
        _id: artistId,
        isDeleted: false,
      });
      if (!artist) return res.status(400).send({ message: "Artist not found" });
      if (!artist?.passwordLinkToken) {
        return res
          .status(400)
          .send({ message: "Link is either expired/broken" });
      }

      if (!isStrongPassword(newPassword)) {
        return res.status(400).send({
          message:
            "Password must contain one Uppercase, Lowercase, Numeric and Special Character",
        });
      }

      if (newPassword !== confirmPassword) {
        return res
          .status(400)
          .send({ message: "Password and confirm password does not match" });
      }

      await Artist.updateOne(
        { _id: artist._id },
        {
          $set: {
            password: md5(newPassword),
          },
          $unset: {
            passwordLinkToken: 1,
          },
        }
      );
      return res.status(200).send({ message: "New Password set successfully" });
    } else {
      const artist = await Artist.findOne({
        _id: artistId,
        isDeleted: false,
      });
      if (!artist) return res.status(400).send({ message: "Artist not found" });

      if (!isStrongPassword(newPassword)) {
        return res.status(400).send({
          message:
            "Password must contain one Uppercase, Lowercase, Numeric and Special Character",
        });
      }
      if (newPassword !== confirmPassword) {
        return res
          .status(400)
          .send({ message: "Password and confirm password does not match" });
      }

      await Artist.updateOne(
        { _id: artist._id },
        {
          $set: {
            password: md5(newPassword),
          },
        }
      );
      return res.status(200).send({ message: "Password reset successfully" });
    }
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const resendOTP = async (req, res) => {
  try {
  } catch (error) {
    APIErrorLog.error("Error while login the admin");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getArtistDetails = async (req, res) => {
  try {
    const artist = await Artist.findOne({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);

    if (!artist) {
      return res.status(400).send({ message: "Artist/User not found" });
    }

    res.status(200).send({
      artist: req.user,
      message: `welcome ${artist.artistName ? artist.artistName : "Back"}`,
    });
  } catch {
    APIErrorLog.error("Error while login the admin");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

module.exports = {
  login,
  registerUser,
  becomeArtist,
  sendForgotPasswordOTP,
  validateOTP,
  resetPassword,
  resendOTP,
  getArtistDetails,
};
