const Artist = require("../models/artistModel");
const Artwork = require("../models/artWorksModel");
const jwt = require("jsonwebtoken");
const { createLog, fileUploadFunc, generateRandomId, generateRandomOTP } = require("../functions/common");
const { sendMail } = require("../functions/mailer");
const APIErrorLog = createLog("API_error_log");
const TicketReply = require("../models/ticketReplyModel");
const Ticket = require("../models/ticketModel");
const md5 = require("md5");
const objectId = require("mongoose").Types.ObjectId;
const axios = require("axios");
const EmailType = require("../models/emailTypeModel");
const Notification = require("../models/notificationModel");
const Plan = require("../models/plansModel");
const Insignia = require("../models/insigniasModel");
const Theme = require("../models/themeModel");
const Style = require("../models/styleModel");
const Discipline = require("../models/disciplineModel");
const Collection = require("../models/collectionModel");
const Favorite = require("../models/favoriteModel");
const Invite = require("../models/inviteModel");
const generateInviteCode = require("../functions/generateInviteCode");

const isStrongPassword = (password) => {
  const uppercaseRegex = /[A-Z]/;
  const lowercaseRegex = /[a-z]/;
  const numericRegex = /\d/;
  const specialCharRegex = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/;

  if (uppercaseRegex.test(password) && lowercaseRegex.test(password) && numericRegex.test(password) && specialCharRegex.test(password)) {
    return true;
  } else {
    return false;
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({ message: "Email and password is required" });
    }

    const user = await Artist.findOne(
      {
        email: email.toLowerCase(),
        isDeleted: false,
      },
      {
        password: 1,
        role: 1,
        artistName: 1,
        isActivated: 1,
        artistSurname1: 1,
        artistSurname2: 1,
        email: 1,
        userId: 1,
        phone: 1,
        gender: 1,
        "commercilization.artProvider": 1,
      }
    )
      .select("+password")
      .lean();

    if (!user) {
      return res.status(400).send({ message: "User suspended/not found" });
    }

    if (user.password !== md5(password)) {
      return res.status(400).send({ message: "Invalid credentials" });
    }

    const userField = {
      _id: user._id,
      role: user.role,
      artistName: user.artistName,
    };

    const token = jwt.sign({ user: userField }, process.env.ACCESS_TOKEN_SECERT, {
      expiresIn: "30d",
    });

    await Artist.updateOne({ _id: user._id, isDeleted: false }, { $push: { tokens: token } });

    return res.status(200).send({
      token,
      user,
      message: "Artist login Successfully",
    });
  } catch (error) {
    APIErrorLog.error("Error while login the artist");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const sendVerifyEmailOTP = async (req, res) => {
  try {
    const { password, cpassword, isArtistRequest } = req.body;

    let { email, langCode, invite } = req.body;
    if (!email) return res.status(400).send({ message: "Email is required" });

    let inviteCode = "";
    let inviteId = "";
    if (invite) {
      const inviteData = await Invite.findOne({ inviteCode: invite }, { email: 1, inviteCode: 1, isUsed: 1 }).lean(true);
      if (!inviteData) return res.status(400).send({ message: "Invite not found" });
      if (inviteData.isUsed) return res.status(400).send({ message: "Invalid/Expired Invite" });

      email = inviteData.email;
      inviteCode = inviteData.inviteCode;
      inviteId = inviteData._id;
    }

    email = email.toLowerCase();
    if (langCode == "GB") langCode = "EN";

    const findEmail = await EmailType.findOne({
      emailType: "verify-email-otp",
      emailLang: langCode,
    }).lean(true);

    if (isArtistRequest == true) {
      const otp = generateRandomOTP();

      const mailVaribles = {
        "%head%": findEmail.emailHead,
        "%email%": email,
        "%msg%": findEmail.emailDesc,
        "%otp%": otp,
      };

      const isExist = await Artist.countDocuments({
        email: email,
        isDeleted: false,
      });

      if (isExist) {
        await Artist.updateOne({ email: email, isDeleted: false }, { $set: { OTP: otp } });
      } else {
        await Artist.create({
          email: email,
          pageCount: 0,
          OTP: otp,
        });
      }

      await sendMail("sample-email", mailVaribles, email);
      return res.status(200).send({
        message: "OTP sent Successfully",
      });
    } else {
      if (password !== cpassword) {
        return res.status(400).send({ message: "Password does not match" });
      }

      if (!isStrongPassword(password)) {
        return res.status(400).send({
          message: "Password must contain one Uppercase, Lowercase, Numeric and Special Character",
        });
      }

      const isExist = await Artist.find(
        {
          email: email,
          isDeleted: false,
        },
        { userId: 1, artistName: 1 }
      ).lean(true);

      const otp = generateRandomOTP();
      const mailVaribles = {
        "%head%": findEmail.emailHead,
        "%email%": email,
        "%msg%": findEmail.emailDesc,
        "%otp%": otp,
      };

      if (isExist.length === 1 && isExist[0].userId) {
        return res.status(400).send({ message: "Email already exist" });
      } else if (isExist.length === 1 && !isExist[0].userId) {
        let obj = {
          OTP: otp,
          userId: "UID-" + generateRandomId(true),
          role: "user",
          password: md5(password),
          pageCount: 0,
        };

        if (inviteId) {
          obj["invite"] = {
            inviteId: inviteId,
            code: inviteCode,
          };
        }

        await Artist.updateOne({ email: email }, { $set: obj });
        if (inviteId) await Invite.updateOne({ _id: inviteId }, { $set: { isUsed: true } });

        await sendMail("sample-email", mailVaribles, email);

        return res.status(200).send({
          id: isExist[0]._id,
          message: "OTP sent Successfully",
        });
      }

      let obj = {
        email: email,
        password: md5(password),
        userId: "UID-" + generateRandomId(true),
        role: "user",
        pageCount: 0,
        OTP: otp,
      };

      if (inviteId) {
        obj["invite"] = {
          inviteId: inviteId,
          code: inviteCode,
        };
      }

      const user = await Artist.create(obj);
      if (inviteId) await Invite.updateOne({ _id: inviteId }, { $set: { isUsed: true } });

      await sendMail("sample-email", mailVaribles, email);

      return res.status(200).send({
        id: user._id,
        message: "OTP sent Successfully",
      });
    }
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const verifyEmailOTP = async (req, res) => {
  try {
    const { id, otp, isArtistRequest } = req.body;
    let { email } = req.body;
    if (!otp) return res.status(400).send({ message: "OTP is required" });

    if (isArtistRequest == true) {
      if (!email) return res.status(400).send({ message: "Email is required" });
      email = email.toLowerCase();

      const user = await Artist.findOne(
        {
          email: email,
          isDeleted: false,
        },
        { OTP: 1 }
      ).lean(true);

      if (!user) return res.status(400).send({ message: "User not found" });
      if (otp !== user.OTP) return res.status(400).send({ message: "Invalid OTP" });

      await Artist.updateOne({ email: email, isDeleted: false }, { $unset: { OTP: "" } });

      return res.status(200).send({
        message: "Email verified Successfully",
      });
    } else {
      const user = await Artist.findOne(
        {
          _id: id,
          isDeleted: false,
        },
        { OTP: 1, role: 1, password: 1, artistName: 1 }
      ).lean(true);

      if (!user) return res.status(400).send({ message: "User not found" });
      if (otp !== user.OTP) return res.status(400).send({ message: "Invalid OTP" });

      const userField = {
        _id: user._id,
        role: user.role,
        artistName: user.artistName,
      };

      const token = jwt.sign({ user: userField }, process.env.ACCESS_TOKEN_SECERT, { expiresIn: "30d" });

      await Artist.updateOne(
        { _id: user._id, isDeleted: false },
        {
          $unset: { OTP: "" },
          $push: { tokens: token },
          $set: { isEmailVerified: true },
        }
      );

      await Notification.create({
        user: user._id,
        notifications: [
          {
            subject: `Welcome to FreshArt Club!`,
            message: `Hello ${user.artistName}, your account has been successfully created. We're excited to have you on board! If you have any questions, feel free to reach out to our support team.`,
          },
        ],
      });

      return res.status(200).send({ token, id: user._id, message: "Email verified Successfully" });
    }
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const sendSMSOTP = async (req, res) => {
  try {
    const { phone, email } = req.body;

    const authHeader = Buffer.from(`${process.env.API_SMS_USER}:${process.env.API_SMS_PWD}`).toString("base64");

    const otp = generateRandomOTP();

    let phoneArr = [];
    phoneArr.push(phone.replace("+", ""));

    const data = {
      to: phoneArr,
      text: `To verify your phone number, use OTP - ${otp}`,
      from: "FreshArtC",
    };

    const url = "https://dashboard.wausms.com/Api/rest/message";

    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${authHeader}`,
    };

    const response = await axios.post(url, data, { headers });

    await Artist.updateOne({ email: email.toLowerCase(), isDeleted: false }, { $set: { OTP: otp } });

    return res.status(200).send({ message: "OTP sent Successfully" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const verifySMSOTP = async (req, res) => {
  try {
    const { otp, email } = req.body;

    const user = await Artist.findOne({
      email: email.toLowerCase(),
      isDeleted: false,
    }).lean(true);

    if (!user) return res.status(400).send({ message: "User not found" });
    if (otp !== user.OTP) {
      return res.status(400).send({ message: "Invalid OTP" });
    }

    Artist.updateOne({ email: email.toLowerCase(), isDeleted: false }, { $unset: { OTP: "" } }).then();

    return res.status(200).send({
      message: "Phone Number verified Successfully",
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const sendForgotPasswordOTP = async (req, res) => {
  try {
    let { email, langCode } = req.body;
    langCode = langCode.toUpperCase();

    if (!email) return res.status(400).send({ message: "Email is required" });
    if (langCode == "GB") langCode = "EN";

    const user = await Artist.findOne({
      email: email.toLowerCase(),
      isDeleted: false,
    });

    if (!user) return res.status(400).send({ message: "User not found" });

    const otp = await generateRandomOTP();
    const findEmail = await EmailType.findOne({
      emailType: "send-forgot-password-otp",
      emailLang: langCode.toUpperCase(),
    }).lean(true);

    const mailVaribles = {
      "%head%": findEmail.emailHead,
      "%email%": user.email,
      "%msg%": findEmail.emailDesc,
      "%name%": user.artistName,
      "%otp%": otp,
    };

    await sendMail("sample-email", mailVaribles, user.email);

    Artist.updateOne({ _id: user._id, isDeleted: false }, { $set: { OTP: otp } }).then();

    return res.status(200).send({
      id: user._id,
      message: "OTP sent Successfully",
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const validateOTP = async (req, res) => {
  try {
    const { id, otp } = req.body;

    if (!id || !otp) {
      return res.status(400).send({ message: "ID and OTP are required" });
    }

    const result = await Artist.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
        OTP: otp,
      },
      { $unset: { OTP: "" } },
      {
        projection: { _id: 1 },
        returnOriginal: false,
      }
    );

    if (!result) {
      return res.status(400).send({ message: "Invalid OTP" });
    }

    return res.status(200).send({
      message: "OTP validated successfully",
      id: result._id,
    });
  } catch (error) {
    APIErrorLog.error("Error while login the admin");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const resetPassword = async (req, res) => {
  try {
    let { id, token } = req.query;
    const { newPassword, confirmPassword } = req.body;

    if (token === "null") token = null;

    if (token !== null) {
      const artist = await Artist.findOne({
        _id: id,
        isDeleted: false,
      });
      if (!artist) return res.status(400).send({ message: "Artist not found" });
      if (!artist?.passwordLinkToken) {
        return res.status(400).send({ message: "Link is either expired/broken" });
      }

      if (!isStrongPassword(newPassword)) {
        return res.status(400).send({
          message: "Password must contain one Uppercase, Lowercase, Numeric and Special Character",
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).send({ message: "Password and confirm password does not match" });
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
        _id: id,
        isDeleted: false,
      });
      if (!artist) return res.status(400).send({ message: "Artist not found" });

      if (!isStrongPassword(newPassword)) {
        return res.status(400).send({
          message: "Password must contain one Uppercase, Lowercase, Numeric and Special Character",
        });
      }
      if (newPassword !== confirmPassword) {
        return res.status(400).send({ message: "Password and confirm password does not match" });
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
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const resendOTP = async (req, res) => {
  try {
    const { id } = req.body;

    const user = await Artist.findOne(
      {
        _id: id,
        isDeleted: false,
      },
      { email: 1, artistName: 1 }
    ).lean();
    if (!user) return res.status(400).send({ message: "User not found" });

    let langCode = "EN";

    const otp = await generateRandomOTP();
    const findEmail = await EmailType.findOne({
      emailType: "send-forgot-password-otp",
      emailLang: langCode.toUpperCase(),
    }).lean(true);

    const mailVaribles = {
      "%head%": findEmail.emailHead,
      "%email%": user.email,
      "%msg%": findEmail.emailDesc,
      "%name%": user.artistName,
      "%otp%": otp,
    };

    await sendMail("sample-email", mailVaribles, user.email);
    await Artist.updateOne({ _id: user._id, isDeleted: false }, { $set: { OTP: otp } });

    return res.status(200).send({
      id: user._id,
      message: "OTP sent Successfully",
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!isStrongPassword(newPassword)) {
      return res.status(400).send({
        message: "Password must contain one Uppercase, Lowercase, Numeric and Special Character",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).send({ message: "Password and confirm password does not match" });
    }

    const user = await Artist.findOne(
      {
        _id: req.user._id,
        isDeleted: false,
      },
      { password: 1 }
    ).lean(true);

    if (!user) {
      return res.status(400).send({ message: "Artist not found" });
    }

    if (md5(oldPassword) !== user.password) {
      return res.status(400).send({ message: "Invalid old password" });
    }

    await Artist.updateOne(
      { _id: user._id, isDeleted: false },
      {
        $set: {
          password: md5(newPassword),
        },
      }
    );

    return res.status(200).send({ message: "Password changed successfully" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const becomeArtist = async (req, res) => {
  try {
    const { id } = req.params;
    const { referralCode } = req.query;
    const fileData = await fileUploadFunc(req, res);
    if (fileData.type !== "success") {
      return res.status(fileData.status).send({
        message: fileData?.type === "fileNotFound" ? "Please upload the documents" : fileData.type,
      });
    }

    if (id) {
      const user = await Artist.findOne(
        {
          _id: id,
          isDeleted: false,
        },
        { isArtistRequestStatus: 1 }
      ).lean(true);

      if (user && user?.isArtistRequestStatus === "pending") {
        return res.status(400).send({
          message: "You have already requested to become Artist. Your requset is in process",
        });
      } else if (user && user?.isArtistRequestStatus === "approved") {
        return res.status(400).send({
          message: "You are already an artist",
        });
      } else if (user && user?.isArtistRequestStatus === "ban") {
        return res.status(400).send({
          message: "You cannot requset to become artist. Please contact admin",
        });
      } else if (user && user?.isArtistRequestStatus === "processing") {
        return res.status(400).send({
          message: "You have already requested to become Artist. Your requset is in process",
        });
      }
    } else {
      const user = await Artist.findOne(
        {
          email: req.body.email.toLowerCase(),
          isDeleted: false,
        },
        { isArtistRequestStatus: 1 }
      ).lean(true);

      if (user && user?.isArtistRequestStatus === "pending") {
        return res.status(400).send({
          message: "You have already requested to become Artist. Your requset is in process",
        });
      } else if (user && user?.isArtistRequestStatus === "approved") {
        return res.status(400).send({
          message: "You are already an artist",
        });
      } else if (user && user?.isArtistRequestStatus === "ban") {
        return res.status(400).send({
          message: "You cannot request to become artist. Please contact admin",
        });
      } else if (user && user?.isArtistRequestStatus === "processing") {
        return res.status(400).send({
          message: "You have already requested to become Artist. Your requset is in process",
        });
      }
    }

    let documnets = [];
    let discipline = {};
    let links = [];

    discipline["discipline"] = req.body.discipline;
    if (req.body.style) {
      if (typeof req.body.style === "string") {
        discipline["style"] = [req.body.style];
      } else {
        discipline["style"] = [];
        for (let i = 0; i < req.body.style.length; i++) {
          discipline["style"].push(req.body.style[i]);
        }
      }
    }

    if (fileData.data?.uploadDocs) {
      for (let i = 0; i < fileData.data.uploadDocs.length; i++) {
        documnets.push(fileData.data.uploadDocs[i].filename);
      }
    }

    if (req.body?.socialMedia) {
      links.push({
        name: req.body.socialMedia,
        link: req.body.website,
      });
    }

    let obj = {
      artistName: req.body.artistName
        .toLowerCase()
        .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
        .trim(),
      phone: req.body.phone.replace(/[- )(]/g, "").trim(),
      email: req.body.email.toLowerCase(),
      isArtistRequestStatus: "pending",
      pageCount: 0,
    };

    if (req?.body?.artistSurname1) {
      obj["artistSurname1"] = req.body.artistSurname1
        .toLowerCase()
        .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
        .trim();
    }

    if (req?.body?.artistSurname2) {
      obj["artistSurname2"] = req.body.artistSurname2
        .toLowerCase()
        .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
        .trim();
    }

    obj["aboutArtist"] = {
      discipline: [discipline],
    };

    obj["links"] = links;

    obj["address"] = {
      city: req.body.city,
      state: req.body.region,
      country: req.body.country,
      zipCode: String(req.body.zipCode),
    };

    if (referralCode) {
      obj["referralCode"] = referralCode;
    }

    const findFullName = (val) => {
      let fullName = val?.artistName || "";

      if (val?.nickName) fullName += " " + `"${val?.nickName}"`;
      if (val?.artistSurname1) fullName += " " + val?.artistSurname1;
      if (val?.artistSurname2) fullName += " " + val?.artistSurname2;

      return fullName.trim();
    };

    obj["documents"] = [
      {
        documentName: `Curriculum Vitae - ${findFullName(req.body)}`,
        uploadDocs: documnets[0],
      },
    ];

    let condition = {
      $set: obj,
    };

    if (id) {
      Artist.updateOne({ _id: id, isDeleted: false }, condition).then();
      await Notification.updateOne(
        { user: id },
        {
          $push: {
            notifications: {
              subject: "Become Artist Request Form Submitted",
              message: `Hello ${req.body.artistName}, Your Become Artist request has been submitted successfully.`,
            },
          },
        }
      );
    } else {
      Artist.updateOne({ email: req.body.email.toLowerCase(), isDeleted: false }, condition).then();
    }

    const name = req.body.artistName;
    const email = req.body.email.toLowerCase();

    let langCode = req.body.langCode;
    if (langCode == "GB") langCode = "EN";

    const findEmail = await EmailType.findOne({
      emailType: "become-artist-request",
      emailLang: langCode,
      isDeleted: false,
    }).lean(true);

    const mailVariable = {
      "%head%": findEmail.emailHead,
      "%email%": email,
      "%msg%": findEmail.emailDesc,
      "%name%": name,
    };

    await sendMail("sample-email", mailVariable, email);

    return res.status(200).send({ message: "Your Become Artist request sent successfully" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const logOut = async (req, res) => {
  try {
    // get token from headers
    const { 1: token } = req.headers.authorization.split(" ");
    const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECERT);

    await Artist.updateOne({ _id: decodeToken.user._id }, { $pull: { tokens: token } });

    return res.status(200).send({ message: "Logout successfully" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const checkArtistToken = async (req, res) => {
  try {
    const artist = await Artist.aggregate([
      {
        $match: {
          _id: req.user._id,
          isDeleted: false,
        },
      },
      {
        $project: {
          _id: 1,
          artistName: 1,
          artistSurname1: 1,
          artistSurname2: 1,
          "commercilization.artProvider": 1,
          mainImage: "$profile.mainImage",
          phone: 1,
          email: 1,
          gender: 1,
          isActivated: 1,
          userId: 1,
        },
      },
    ]);

    return res.status(200).send({
      artist: artist[0],
      message: `welcome Back ${artist[0].artistName}!`,
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getArtistDetails = async (req, res) => {
  try {
    const artist = await Artist.aggregate([
      {
        $match: {
          _id: req.user._id,
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "insignias",
          localField: "insignia",
          foreignField: "_id",
          as: "insignia",
        },
      },
      {
        $unwind: {
          path: "$commercilization.publishingCatalog.PublishingCatalog",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "catalogs",
          localField: "commercilization.publishingCatalog.PublishingCatalog",
          foreignField: "_id",
          as: "lookupCatalog",
        },
      },
      {
        $project: {
          _id: 1,
          artistName: 1,
          artistSurname1: 1,
          artistSurname2: 1,
          phone: 1,
          email: 1,
          aboutArtist: 1,
          links: 1,
          profile: 1,
          highlights: 1,
          address: 1,
          insignia: {
            credentialName: 1,
            insigniaImage: 1,
          },
          language: 1,
          logistics: 1,
          managerDetails: 1,
          nickName: 1,
          aboutArtist: 1,
          createdAt: 1,
          currency: 1,
          documents: 1,
          isArtistRequestStatus: 1,
          profileStatus: 1,
          lastRevalidationDate: 1,
          nextRevalidationDate: 1,
          emergencyInfo: 1,
          commercilization: {
            $mergeObjects: [
              "$commercilization",
              {
                publishingCatalog: {
                  $map: {
                    input: "$lookupCatalog",
                    as: "catalog",
                    in: {
                      ArtistFees: {
                        $arrayElemAt: ["$commercilization.publishingCatalog.ArtistFees", { $indexOfArray: ["$lookupCatalog", "$$catalog"] }],
                      },
                      catalogName: "$$catalog.catalogName",
                      _id: "$$catalog._id",
                    },
                  },
                },
              },
            ],
          },
          extraInfo: 1,
          gender: 1,
          invoice: 1,
          isActivated: 1,
          isDeleted: 1,
          isManagerDetails: 1,
          reviewDetails: 1,
          role: 1,
          userId: 1,
          artistId: 1,
          otherTags: 1,
        },
      },
    ]);

    res.status(200).send({
      artist: artist[0],
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getArtistDetailById = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).send({ message: "Artist Id not found" });
  }

  try {
    const artist = await Artist.aggregate([
      {
        $match: {
          _id: objectId(req.params.id),
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "insignias",
          localField: "insignia",
          foreignField: "_id",
          pipeline: [{ $project: { _id: 1, insigniaImage: 1, credentialName: 1 } }],
          as: "insignia",
        },
      },
      {
        $project: {
          _id: 1,
          artistName: 1,
          artistSurname1: 1,
          artistSurname2: 1,
          phone: 1,
          email: 1,
          aboutArtist: 1,
          links: 1,
          profile: {
            mainImage: "$profile.mainImage",
            mainVideo: "$profile.mainVideo",
          },
          highlights: 1,
          insignia: 1,
        },
      },
    ]);

    if (artist.length === 0) {
      return res.status(400).send({ message: "Artist not found" });
    }

    const artistArtworks = await Artwork.aggregate([
      {
        $match: {
          isDeleted: false,
          status: "published",
          owner: objectId(req.params.id),
        },
      },
      {
        $project: {
          _id: 1,
          artworkName: 1,
          discipline: 1,
          media: "$media.mainImage",
          additionalInfo: {
            offensive: "$additionalInfo.offensive",
            artworkTechnic: "$additionalInfo.artworkTechnic",
            length: "$additionalInfo.length",
            height: "$additionalInfo.height",
            width: "$additionalInfo.width",
            frameHeight: "$additionalInfo.frameHeight",
            frameLength: "$additionalInfo.frameLength",
            frameWidth: "$additionalInfo.frameWidth",
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    res.status(200).send({
      artist: artist[0],
      artworks: artistArtworks,
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const completeProfile = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);

    const getUser = await Artist.findOne({ _id: req.user._id }, { artistName: 1 }).lean(true);
    if (getUser && getUser.artistName) {
      return res.status(400).send({ message: "Profile already completed" });
    }

    let obj = {
      artistName: req.body.artistName,
      artistSurname1: req.body.artistSurname1,
      artistSurname2: req.body.artistSurname2,
      gender: req.body.gender,
      phone: req.body.phone,
      dob: new Date(req.body.dob),
      address: {
        country: req.body.country,
        zipCode: String(req.body.zipCode),
        city: req.body.city,
        state: req.body.state,
      },
    };

    if (fileData?.data?.mainImage) {
      obj["profile"]["mainImage"] = fileData?.data?.mainImage[0].filename;
    }

    const artist = await Artist.findOneAndUpdate({ _id: req.user._id, isDeleted: false }, { $set: obj }).lean(true);

    return res.status(200).send({ message: "Profile completed successfully", data: artist });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const editUserProfile = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);

    const user = await Artist.findOne(
      {
        _id: req.user._id,
        isDeleted: false,
        isActivated: false,
      },
      {
        artistName: 1,
        artistSurname1: 1,
        artistSurname2: 1,
        email: 1,
        phone: 1,
        profile: 1,
      }
    ).lean(true);

    if (!user) {
      return res.status(400).send({ message: "User not found" });
    }

    let obj = {
      artistName: req.body.artistName ? req.body.artistName : user.artistName,
      artistSurname1: req.body.artistSurname1 ? req.body.artistSurname1 : user.artistSurname1,
      artistSurname2: req.body.artistSurname2 ? req.body.artistSurname2 : user.artistSurname2,
      email: req.body.email ? req.body.email : user.email,
      phone: req.body.phone ? req.body.phone : user.phone,
    };

    if (fileData?.data?.mainImage) {
      obj["profile"] = {
        ...user.profile,
        mainImage: fileData?.data?.mainImage[0].filename,
      };
    }

    await Artist.updateOne({ _id: user._id, isDeleted: false }, { $set: obj }).lean(true);

    return res.status(200).send({ message: "Profile updated successfully" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const editArtistProfile = async (req, res) => {
  try {
    const artist = await Artist.findOne(
      {
        _id: req.user._id,
        isDeleted: false,
        isActivated: true,
      },
      { profile: 1 }
    ).lean(true);

    const fileData = await fileUploadFunc(req, res);

    let cvArr = [];
    let accountArr = [];
    let additionalImages = [];
    let additionalVideos = [];
    let disciplineArr = [];

    if (fileData.data?.additionalImage) {
      fileData.data?.additionalImage.forEach((element) => {
        additionalImages.push(element.filename);
      });
    }

    const cleanArray = (inputArray) => {
      if (!Array.isArray(inputArray)) return inputArray;
      return inputArray.map((image) => image.replace(/^"|"$/g, ""));
    };

    if (req?.body?.existingAdditionalImage) {
      if (typeof req?.body?.existingAdditionalImage === "string") {
        additionalImages.push(req?.body?.existingAdditionalImage.replace(/^"|"$/g, ""));
      } else {
        const cleanedImages = cleanArray(req?.body?.existingAdditionalImage);
        additionalImages = [...additionalImages, ...cleanedImages];
      }
    }

    if (fileData.data?.additionalVideo) {
      fileData.data?.additionalVideo.forEach((element) => {
        additionalVideos.push(element.filename);
      });
    }

    if (req?.body?.existingAdditionalVideo) {
      if (typeof req?.body?.existingAdditionalVideo === "string") {
        additionalVideos.push(req?.body?.existingAdditionalVideo.replace(/^"|"$/g, ""));
      } else {
        const cleanedImages = cleanArray(req?.body?.existingAdditionalVideo);
        additionalVideos = [...additionalVideos, ...cleanedImages];
      }
    }

    if (req.body.cvEntries) {
      const cvEntries = Array.isArray(req.body.cvEntries) ? req.body.cvEntries.map((item) => JSON.parse(item)) : req.body.cvEntries;

      if (typeof cvEntries === "string") {
        const obj = JSON.parse(cvEntries);
        cvArr.push(obj);
      } else {
        cvEntries.forEach((element) => {
          cvArr.push(element);
        });
      }
    }

    if (req.body.accounts) {
      const accounts = Array.isArray(req.body.accounts) ? req.body.accounts.map((item) => JSON.parse(item)) : req.body.accounts;

      if (typeof accounts === "string") {
        const obj = JSON.parse(accounts);
        accountArr.push(obj);
      } else {
        accounts.forEach((element) => {
          accountArr.push(element);
        });
      }
    }

    if (req.body.discipline) {
      const disciplines = Array.isArray(req.body.discipline) ? req.body.discipline.map((item) => JSON.parse(item)) : req.body.discipline;

      if (typeof disciplines === "string") {
        const obj = JSON.parse(disciplines);
        disciplineArr.push(obj);
      } else {
        disciplines.forEach((element) => {
          const discipline = element.discipline;
          const style = Array.isArray(element.style) ? element.style.map((s) => (typeof s === "object" && s.value ? s.value : s)) : [];

          disciplineArr.push({
            discipline: discipline,
            style: style,
          });
        });
      }
    }

    const processBodyImg = (img) => {
      if (img === "null") {
        return null;
      } else {
        return img;
      }
    };

    let obj = {
      artistName: req.body.artistName,
      artistSurname1: req.body.artistSurname1,
      artistSurname2: req.body.artistSurname2,
      nickName: req.body.nickName,
      email: req.body.email,
      gender: req.body.gender,
      language: req.body.language,
      dob: new Date(req.body.dob),
      phone: req.body.phoneNumber,
      aboutArtist: {
        about: req.body.about,
        discipline: disciplineArr,
      },
      highlights: {
        addHighlights: req.body.highlights.trim(),
        cv: cvArr,
      },
      profile: {
        mainImage: fileData?.data?.mainImage ? fileData?.data?.mainImage[0].filename : processBodyImg(req.body?.mainImage),
        additionalImage: additionalImages,
        inProcessImage: fileData.data?.inProcessImage ? fileData.data.inProcessImage[0].filename : processBodyImg(req.body?.inProcessImage),
        mainVideo: fileData.data?.mainVideo ? fileData.data.mainVideo[0].filename : processBodyImg(req.body?.mainVideo),
        additionalVideo: additionalVideos,
      },
      address: {
        country: req.body.country,
        zipCode: req.body.zip,
        city: req.body.city,
        state: req.body.stateRegion,
        residentialAddress: req.body.address,
      },
    };

    if (req.body.isManagerDetails == "true") {
      obj["isManagerDetails"] = true;
      obj["managerDetails"] = {
        managerName: req.body.managerName.toLowerCase().trim(),
        managerPhone: req.body?.managerPhone.trim(),
        managerEmail: req.body?.managerEmail.toLowerCase(),
        managerGender: req.body?.managerGender,
        address: {
          address: req.body.managerAddress,
          city: req.body.managerCity,
          state: req.body.managerState,
          zipCode: String(req.body.managerZipCode),
          country: req.body.managerCountry,
        },
      };

      if (req.body.managerArtistLanguage && req.body.managerArtistLanguage.length) {
        obj["managerDetails"]["language"] = Array.isArray(req.body.managerArtistLanguage)
          ? req.body.managerArtistLanguage
          : [req.body.managerArtistLanguage];
      }
    } else {
      obj["isManagerDetails"] = false;
      obj["managerDetails"] = null;
    }

    obj["links"] = accountArr;

    Artist.updateOne({ _id: artist._id, isDeleted: false }, { $set: { reviewDetails: obj, profileStatus: "under-review" } }).then();
    return res.status(200).send({
      message: "Profile saved and Pending to be Validated by Fresh Art Club",
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

// ------------ tickets-----------------

const createTicket = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    const { subject, message, region, ticketType, urgency, impact, isArtDetail } = req.body;

    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    const year = new Date().getFullYear();
    const ticketId = `TI# ${year}-CS${randomNumber}`;

    let payload = {
      user: req.user._id,
      subject,
      message,
      region,
      ticketType: ticketType,
      ticketId: ticketId,
      urgency,
      impact,
      ticketImg: fileData.data?.ticketImg && fileData.data?.ticketImg?.length > 0 ? fileData.data.ticketImg[0].filename : null,
    };

    const ticketData = await Ticket.create(payload);

    return res.status(201).json({
      message: "Ticket posted successfully!",
      data: ticketData,
      isArtDetail: isArtDetail,
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const ticketDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const [ticketData, replyData] = await Promise.all([
      Ticket.findOneAndUpdate({ _id: id }, { $set: { isRead: false } }).lean(true),
      TicketReply.aggregate([
        { $match: { ticket: objectId(id) } },
        {
          $project: {
            _id: 1,
            user: 1,
            userType: 1,
            ticket: 1,
            ticketType: 1,
            ticketImg: 1,
            status: 1,
            message: 1,
            ticketFeedback: 1,
            createdAt: 1,
          },
        },
        { $sort: { createdAt: -1 } },
      ]),
    ]);

    if (!ticketData) {
      return res.status(400).send({ message: "Ticket not found" });
    }

    return res.status(200).send({
      data: ticketData,
      reply: replyData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getUserTickets = async (req, res) => {
  try {
    const tickets = await Ticket.aggregate([
      {
        $match: { user: objectId(req.user._id) },
      },
      {
        $project: {
          _id: 1,
          ticketId: 1,
          ticketType: 1,
          ticketImg: 1,
          subject: 1,
          message: 1,
          urgency: 1,
          isRead: 1,
          impact: 1,
          status: 1,
          ticketFeedback: 1,
          createdAt: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);
    return res.status(200).send({
      data: tickets,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

const replyTicketUser = async (req, res) => {
  try {
    const { id } = req.params;
    const fileData = await fileUploadFunc(req, res);
    const { ticketType, status, message, userType } = req.body;

    const ticketData = await Ticket.countDocuments({ _id: id });
    if (!ticketData) {
      return res.status(400).send({ message: "Ticket not found" });
    }

    Ticket.updateOne({ _id: id }, { $set: { status: status, ticketType: ticketType } }).then();

    const reply = await TicketReply.create({
      user: userType === "admin" ? null : req.user._id,
      userType: "user",
      ticket: id,
      ticketType,
      status,
      message,
      ticketImg: fileData?.data?.ticketImg ? fileData.data.ticketImg[0].filename : null,
    });

    return res.status(201).json({
      message: "Ticket replied successfully",
      data: reply,
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const ticketFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, isLiked } = req.body;

    const ticketData = await Ticket.countDocuments({ _id: id });
    if (!ticketData) {
      return res.status(400).send({ message: "Ticket not found" });
    }

    Ticket.updateOne(
      { _id: id },
      {
        $set: {
          status: isLiked == true ? "Closed" : "In Progress",
          ticketFeedback: {
            isLiked,
            message,
          },
        },
      }
    ).then();

    return res.status(201).send({
      message: "Ticket feedback given successfully",
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getActivedArtists = async (req, res) => {
  try {
    let { s, cred, discipline, style, letter, sort, limit = 15, currPage = 1 } = req.query;

    limit = parseInt(limit);
    currPage = parseInt(currPage);
    sort = sort === "A-Z" ? { artistName: 1 } : sort === "Z-A" ? { artistName: -1 } : { createdAt: -1 };
    const skip = (currPage - 1) * limit;

    const totalArtist = await Artist.countDocuments({ isDeleted: false, isActivated: true });

    const artists = await Artist.aggregate([
      {
        $lookup: {
          from: "insignias",
          localField: "insignia",
          foreignField: "_id",
          pipeline: [{ $project: { credentialName: 1 } }],
          as: "insig",
        },
      },
      {
        $match: {
          isActivated: true,
          isDeleted: false,
          ...(s && {
            $or: [
              { artistName: { $regex: s, $options: "i" } },
              { artistSurname1: { $regex: s, $options: "i" } },
              { artistSurname2: { $regex: s, $options: "i" } },
              { "otherTags.extTags": { $regex: s, $options: "i" } },
            ],
          }),
          ...(discipline && { "aboutArtist.discipline.discipline": { $regex: discipline, $options: "i" } }),
          ...(style && { "aboutArtist.discipline.style": { $regex: style, $options: "i" } }),
          ...(cred && { insig: { $elemMatch: { credentialName: { $regex: cred, $options: "i" } } } }),
          ...(letter && { artistName: { $regex: `^${letter}`, $options: "i" } }),
        },
      },
      {
        $project: {
          artistName: 1,
          artistSurname1: 1,
          artistSurname2: 1,
          aboutArtist: 1,
          profile: 1,
        },
      },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
    ]);

    const totalPages = s || cred || discipline || style || letter ? Math.ceil(artists.length / limit) : Math.ceil(totalArtist / limit);

    res.status(200).send({
      artists,
      totalPages,
      currentPage: currPage,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

const getInsignia = async (req, res) => {
  try {
    const insignia = await Insignia.aggregate([
      {
        $match: {
          isDeleted: false,
          isMain: true,
        },
      },
      {
        $project: {
          _id: 1,
          credentialName: 1,
          insigniaImage: 1,
        },
      },
      { $sort: { credentialName: -1 } },
    ]);

    return res.status(200).json({ data: insignia });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// -------------------ticket----------------------------

const addToCart = async (req, res) => {
  try {
    const { id } = req.params;

    const artwork = await Artwork.findById(id);
    if (artwork.status !== "published") {
      return res.status(400).send({ message: "Item canaot be added to cart" });
    }

    const result = await Artist.updateOne(
      { _id: req.user._id, "cart.item": { $ne: id } },
      {
        $push: { cart: { item: id, quantity: 1 } },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).send({ message: "Item already added to cart" });
    }

    return res.status(200).send({ message: "Item added to cart successfully" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const { id } = req.params;
    const { remove } = req.query;

    if (remove && remove == "true") {
      await Artist.updateOne(
        {
          _id: req.user._id,
          "cart.item": id,
        },
        {
          $pull: { cart: { item: id } },
        }
      );

      return res.status(200).send({ message: "Item removed from cart" });
    }

    const result = await Artist.updateOne(
      {
        _id: req.user._id,
        "cart.item": id,
      },
      {
        $inc: { "cart.$.quantity": -1 }, // Decrement quantity by 1
      }
    );

    if (result && result.modifiedCount === 0) {
      return res.status(404).send({ message: "Item not found in the cart" });
    }

    await Artist.updateOne(
      {
        _id: req.user._id,
      },
      {
        $pull: { cart: { quantity: { $lte: 0 } } }, // Remove items with quantity 0 or less
      }
    );

    return res.status(200).send({ message: `${result.modifiedCount} item(s) removed from cart` });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const likeOrUnlikeArtwork = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!["like", "unlike"].includes(action)) {
      return res.status(400).send({ message: "Invalid action" });
    }

    const updateArtist = action === "like" ? { $addToSet: { likedArtworks: id } } : { $pull: { likedArtworks: id } };

    const updateLikes = action === "like" ? 1 : -1;

    await Promise.all([Artist.updateOne({ _id: req.user._id }, updateArtist), Artwork.updateOne({ _id: id }, { $inc: { numLikes: updateLikes } })]);

    return res.status(200).send({
      message: `Artwork ${action === "like" ? "liked" : "unliked"}`,
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getCartItems = async (req, res) => {
  try {
    const data = await Artist.aggregate([
      { $match: { _id: req.user._id } },
      {
        $lookup: {
          from: "artworks",
          localField: "cart.item",
          foreignField: "_id",
          as: "cartItems",
        },
      },
      {
        $project: {
          _id: 0,
          cart: {
            $map: {
              input: "$cartItems",
              as: "item",
              in: {
                _id: "$$item._id",
                quantity: "$$item.quantity",
                artworkName: "$$item.artworkName",
                media: "$$item.media",
                commercialization: "$$item.commercialization",
                pricing: "$$item.pricing",
              },
            },
          },
        },
      },
    ]);

    return res.status(200).send({ data: data[0] });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getUnAutorisedCartItems = async (req, res) => {
  try {
    let { ids } = req.query;

    ids = ids.split(",").map((id) => objectId(id));

    if (ids.length > 0) {
      const data = await Artwork.aggregate([
        { $match: { _id: { $in: ids } }, status: "published" },
        {
          $project: {
            _id: 1,
            artworkName: 1,
            media: 1,
            commercialization: 1,
            pricing: 1,
          },
        },
      ]);

      return res.status(200).send({ data: { cart: data } });
    }

    return res.status(200).send({ data: { cart: [] } });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getLikedItems = async (req, res) => {
  try {
    const likedItems = await Artist.aggregate([
      { $match: { _id: req.user._id } },
      {
        $lookup: {
          from: "artworks",
          localField: "likedArtworks",
          foreignField: "_id",
          as: "liked",
        },
      },
      {
        $project: {
          _id: 1,
          artistName: 1,
          artistSurname1: 1,
          artistSurname2: 1,
          likedArtworks: {
            $map: {
              input: "$liked",
              as: "item",
              in: {
                _id: "$$item._id",
                artworkName: "$$item.artworkName",
                media: "$$item.media.mainImage",
                size: {
                  width: "$$item.additionalInfo.width",
                  height: "$$item.additionalInfo.height",
                  length: "$$item.additionalInfo.length",
                },
                pricing: {
                  basePrice: "$$item.pricing.basePrice",
                  currency: "$$item.pricing.currency",
                },
                discipline: "$$item.discipline.artworkDiscipline",
              },
            },
          },
        },
      },
    ]);

    return res.status(200).send({ data: likedItems[0] });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getBillingAddresses = async (req, res) => {
  try {
    const data = await Artist.findOne({ _id: req.user._id }, { billingInfo: 1 }).lean(true);

    if (!data) {
      return res.status(400).send({ message: "Artist not found" });
    }

    return res.status(200).send({ data: data.billingInfo });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const addBillingAddress = async (req, res) => {
  try {
    const artist = await Artist.findOne({ _id: req.user._id }, { billingInfo: 1 }).lean(true);

    if (!artist) {
      return res.status(400).send({ message: "User not found" });
    }

    let obj = {};
    obj["billingDetails"] = {
      billingFirstName: req.body.firstName,
      billingLastName: req.body.lastName,
      billingEmail: req.body.email,
      billingCompanyName: req.body?.companyName ? req.body.companyName : "",
      billingAddress: req.body.address,
      billingAddressType: req.body.addressType,
      billingCity: req.body.city,
      billingState: req.body.state,
      billingZipCode: req.body.zipCode,
      billingCountry: req.body.country,
      billingPhone: req.body.phone,
    };

    if (artist.billingInfo && artist.billingInfo.length == 0) {
      obj["isDefault"] = true;
    }

    if (req.params?.addressId) {
      await Artist.updateOne(
        {
          _id: req.user._id,
          "billingInfo._id": objectId(req.params.addressId),
        },
        {
          $set: {
            "billingInfo.$.billingDetails": obj.billingDetails,
          },
        }
      );
    } else {
      await Artist.updateOne({ _id: req.user._id }, { $push: { billingInfo: obj } });
    }

    return res.status(200).send({ message: "New Billing address added" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const removeBillingAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const artist = await Artist.findOne({ _id: req.user._id }, { billingInfo: 1 }).lean(true);

    if (!artist) {
      return res.status(400).send({ message: "Artist not found" });
    }

    await Artist.updateOne({ _id: req.user._id }, { $pull: { billingInfo: { _id: addressId } } });

    return res.status(200).send({ message: "Billing address removed" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const setDefaultBillingAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const artist = await Artist.findOne({ _id: req.user._id, "billingInfo._id": addressId }, { billingInfo: 1 }).lean(true);

    if (!artist) {
      return res.status(404).send({ message: "Address not found" });
    }

    await Artist.updateOne({ _id: req.user._id }, { $set: { "billingInfo.$[].isDefault": false } });

    await Artist.updateOne({ _id: req.user._id, "billingInfo._id": addressId }, { $set: { "billingInfo.$.isDefault": true } });

    return res.status(200).send({ message: "Default Billing Address Updated" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const deleteArtistSeries = async (req, res) => {
  try {
    const artist = await Artist.findOne({ _id: req.user._id }, { artistSeriesList: 1 }).lean(true);
    if (!artist) {
      return res.status(400).send({ message: "Artist not found" });
    }

    const { name } = req.body;
    if (!name) {
      return res.status(400).send({ message: "Series name is required" });
    }

    if (!artist.artistSeriesList.includes(name)) {
      return res.status(400).send({ message: "Series not found in artist's series list" });
    }

    const existingArtwork = await Artwork.findOne({ owner: artist._id, artworkSeries: name.trim() }, { _id: 1 }).lean(true);

    if (existingArtwork) {
      return res.status(400).send({ message: "Series used in other artworks" });
    }

    await Artist.updateOne({ _id: req.user._id }, { $pull: { artistSeriesList: name.trim() } });

    return res.status(200).send({ message: "Series deleted successfully" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const artistReValidate = async (req, res) => {
  try {
    const id = req.user._id;
    const artist = await Artist.findOne(
      {
        _id: id,
        isDeleted: false,
      },
      { email: 1, artistName: 1, nextRevalidationDate: 1 }
    ).lean(true);

    if (!artist) return res.status(400).send({ message: "Artist not found" });

    let { langCode } = req.body;
    langCode = langCode.toUpperCase();

    const findEmail = await EmailType.findOne({
      emailType: "artist-profile-revalidated",
      emailLang: langCode,
    }).lean(true);

    const mailVaribles = {
      "%head%": findEmail.emailHead,
      "%email%": artist.email,
      "%msg%": findEmail.emailDesc,
      "%name%": artist.artistName,
      "%newDate%": new Date(new Date().setDate(new Date().getDate() + 30)).toLocaleDateString("en-GB"),
    };

    let obj = {
      revalidateFixedDate: artist.nextRevalidationDate,
      revalidatedOn: new Date(),
    };

    await Promise.all([
      sendMail("sample-email", mailVaribles, artist.email),
      Artist.updateOne(
        { _id: id },
        {
          $set: {
            lastRevalidationDate: new Date(),
            nextRevalidationDate: new Date(new Date().setDate(new Date().getDate() + 30)),
          },
          $push: { previousRevalidationDate: obj },
        }
      ),
    ]);

    return res.status(200).send({ message: `Artist Profile Re-validated` });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getNotificationsOfUser = async (req, res) => {
  try {
    const notifications = await Notification.findOne({ user: req.user._id }, { notifications: { $elemMatch: { isDeleted: false } } }).lean(true);

    return res.status(200).send({ data: notifications });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const markReadNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (id) {
      await Notification.updateOne({ user: req.user._id, "notifications._id": id }, { $set: { "notifications.$.isRead": true } });
    } else {
      await Notification.updateOne({ user: req.user._id }, { $set: { "notifications.$[].isRead": true } });
    }

    return res.status(200).send({ message: "Notifications marked as read successfully" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (id) {
      await Notification.updateOne({ user: req.user._id, "notifications._id": id }, { $set: { "notifications.$.isDeleted": true } });
    } else {
      await Notification.updateOne({ user: req.user._id }, { $set: { "notifications.$[].isDeleted": true } });
    }

    return res.status(200).send({ message: "Deleted Successfully" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getUserPlans = async (req, res) => {
  try {
    const planList = await Plan.aggregate([
      {
        $project: {
          planName: 1,
          currentPrice: 1,
          currentYearlyPrice: 1,
          defaultPlan: 1,
          defaultArtistFees: 1,
          planId: 1,
          planDesc: 1,
          planImg: 1,
          planGrp: 1,
          priority: 1,
          purchaseDiscount: 1,
        },
      },
    ]);

    return res.status(200).send({ data: planList });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getDataOnHovered = async (req, res) => {
  try {
    const disciplines = await Discipline.find({}, { disciplineName: 1 }).lean(true);

    let disData = [];

    for (let i = 0; i < disciplines.length; i++) {
      let tempData = {};
      const theme = await Theme.find({ discipline: disciplines[i]._id, isMain: true }, { themeName: 1 }).lean(true);
      const style = await Style.find({ discipline: disciplines[i]._id, isMain: true }, { styleName: 1 }).lean(true);
      const artists = await Artist.find(
        { "aboutArtist.discipline.discipline": disciplines[i].disciplineName, isActivated: true },
        { artistName: 1, "profile.mainImage": 1 }
      )
        .limit(2)
        .lean();

      tempData.discipline = disciplines[i].disciplineName;
      tempData.theme = theme;
      tempData.style = style;
      tempData.artists = artists;

      disData.push(tempData);
    }

    const collection = await Collection.find({}, { collectionName: 1, collectionFile: 1 }).limit(1).lean();
    const insignia = await Insignia.find({ isMain: true }, { credentialName: 1 }).lean();

    return res.status(200).send({ data: { disData, collection, insignia } });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const addItemToFavoriteList = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;
    const userId = req.user._id;

    const isAlreadyInSameList = await Favorite.findOne({
      owner: userId,
      "list.title": name,
      list: {
        $elemMatch: {
          title: name,
          items: { $elemMatch: { type, item: id } },
        },
      },
    }).lean();

    if (isAlreadyInSameList) {
      await Favorite.updateOne({ owner: userId, "list.title": name }, { $pull: { "list.$.items": { type, item: id } } });
      return res.status(200).json({ message: "Item removed from favorites" });
    }

    await Favorite.updateOne({ owner: userId, "list.items": { $elemMatch: { type, item: id } } }, { $pull: { "list.$.items": { type, item: id } } });

    const updatedFavorite = await Favorite.findOneAndUpdate(
      { owner: userId, "list.title": name },
      { $addToSet: { "list.$.items": { type, item: id } } },
      { new: true }
    );

    if (!updatedFavorite) {
      await Favorite.updateOne({ owner: userId }, { $push: { list: { title: name, items: [{ type, item: id }] } } }, { upsert: true });
    }

    return res.status(200).json({ message: "Item added to favorites" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const getFavoriteList = async (req, res) => {
  try {
    const { type } = req.query;

    const list = await Favorite.aggregate([
      {
        $match: { owner: objectId(req.user._id), "list.items.type": type },
      },
      {
        $project: {
          owner: 1,
          list: {
            $map: {
              input: "$list",
              as: "item",
              in: {
                title: "$$item.title",
                items: "$$item.items.item",
              },
            },
          },
        },
      },
    ]);

    return res.status(200).send({ data: list[0]?.list ? list[0]?.list : {} });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getFullFavoriteList = async (req, res) => {
  try {
    const list = await Favorite.aggregate([
      { $match: { owner: objectId(req.user._id) } },
      { $unwind: { path: "$list", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$list.items", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          isArtwork: { $eq: ["$list.items.type", "artwork"] },
          isArtist: { $eq: ["$list.items.type", "artist"] },
          isCollection: { $eq: ["$list.items.type", "collection"] },
        },
      },
      {
        $lookup: {
          from: "artworks",
          localField: "list.items.item",
          foreignField: "_id",
          as: "artworkDetails",
          pipeline: [
            {
              $project: {
                _id: 1,
                artworkName: 1,
                media: "$media.mainImage",
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "artists",
          localField: "list.items.item",
          foreignField: "_id",
          as: "artistDetails",
        },
      },
      {
        $lookup: {
          from: "collections",
          localField: "list.items.item",
          foreignField: "_id",
          as: "collectionDetails",
        },
      },
      {
        $addFields: {
          "list.items.item": {
            $cond: {
              if: "$isArtwork",
              then: { $arrayElemAt: ["$artworkDetails", 0] },
              else: {
                $cond: {
                  if: "$isArtist",
                  then: { $arrayElemAt: ["$artistDetails", 0] },
                  else: {
                    $cond: {
                      if: "$isCollection",
                      then: { $arrayElemAt: ["$collectionDetails", 0] },
                      else: null,
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $project: {
          artworkDetails: 0,
          artistDetails: 0,
          collectionDetails: 0,
        },
      },
      {
        $group: {
          _id: {
            favoriteId: "$_id",
            listId: "$list._id",
          },
          owner: { $first: "$owner" },
          title: { $first: "$list.title" },
          items: {
            $push: {
              $cond: {
                if: { $ne: ["$list.items", null] },
                then: "$list.items",
                else: null,
              },
            },
          },
        },
      },
      {
        $addFields: {
          items: {
            $filter: {
              input: "$items",
              as: "item",
              cond: { $ne: ["$$item", null] },
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id.favoriteId",
          owner: { $first: "$owner" },
          list: {
            $push: {
              title: "$title",
              items: "$items",
            },
          },
        },
      },
    ]);

    return res.status(200).send({ data: list[0].list });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const createCustomOrder = async (req, res) => {
  try {
    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    const year = new Date().getFullYear();
    const ticketId = `TI# ${year}-CS${randomNumber}`;

    const formatName = (val) => {
      if (!val) return "Unknown";
      let fullName = val?.artistName || "";
      if (val?.nickName) fullName += ` "${val?.nickName}"`;
      if (val?.artistSurname1) fullName += ` ${val?.artistSurname1}`;
      if (val?.artistSurname2) fullName += ` ${val?.artistSurname2}`;
      return fullName.trim();
    };

    const [user, artist] = await Promise.all([
      Artist.findById(req.user._id, { artistName: 1, artistSurname1: 1, artistSurname2: 1, nickName: 1, email: 1 }).lean(),
      Artist.findById(req.body.artistId, { artistName: 1, artistSurname1: 1, artistSurname2: 1, nickName: 1, email: 1 }).lean(),
    ]);

    if (!user || !artist) {
      return res.status(404).json({ message: "User or Artist not found" });
    }

    const message = {
      "Requested By User Name": formatName(user),
      "Requested By User Email": user?.email || "No Email Provided",
      "Requested To Artist Name": formatName(artist),
      "Requested To Artist Email": artist?.email || "No Email Provided",
      "Request Details": req.body?.projectDetails || "No Details Provided",
      "Number Of Artwork": req.body?.numberOfArtworks || 0,
      Budget: req.body?.budget || "No Budget Provided",
      Discipline: req.body?.discipline || "No Discipline Provided",
      Style: req.body?.style || "No Style Provided",
      "Expected Delivery Date": req.body?.expectedDeliveryDate || "No Date Provided",
    };

    let payload = {
      user: req.user._id,
      subject: "New Custom Order Request",
      message: JSON.stringify(message, null, 2),
      ticketType: "Custom Order",
      ticketId: ticketId,
      ticketImg: null,
    };

    await Ticket.create(payload);

    return res.status(201).json({
      message: "Request Successfully Created",
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const createInvite = async (req, res) => {
  try {
    const user = await Artist.findOne({ _id: req.user._id }, { isActivated: true }).lean();
    if (!user) return res.status(400).send({ message: "Artist not found" });
    if (!user?.isActivated) return res.status(400).send({ message: "You cannot create invite" });

    let { langCode } = req.body;
    let payload = {
      user: req.user._id,
      email: req.body.email.toLowerCase(),
      ...req.body,
    };

    if (langCode == "GB") langCode = "EN";
    const invite = await Invite.create(payload);

    const findEmail = await EmailType.findOne({
      emailType: "send-invite-link",
      emailLang: langCode,
    }).lean(true);

    const mailVaribles = {
      "%head%": findEmail.emailHead,
      "%email%": payload.email.toLowerCase(),
      "%msg%": findEmail.emailDesc,
      "%name%": payload.firstName,
      "%link%": `https://www.dev.freshartclub.com/signup?invite=${payload.inviteCode}`,
    };

    await sendMail("sample-email", mailVaribles, payload.email.toLowerCase());
    return res.status(200).send({ message: "Invite created successfully", data: invite._id });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const randomInviteCode = async (req, res) => {
  try {
    const artist = await Artist.findOne({ _id: req.user._id }, { userId: 1 }).lean(true);
    if (!artist.userId) return res.status(400).send({ message: "Artist not found" });

    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const inviterId = artist.userId.slice(-8);

    let inviteCode = "";
    for (let i = 0; i < 4; i++) {
      inviteCode += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    const code = generateInviteCode(inviterId, inviteCode);

    return res.status(200).send({ data: code });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getInvite = async (req, res) => {
  try {
    const { invite } = req.query;
    if (!invite) return res.status(400).send({ message: "Invite not found" });

    const inviteData = await Invite.findOne({ inviteCode: invite }, { email: 1, inviteCode: 1, isUsed: 1 }).lean(true);
    if (!inviteData) return res.status(400).send({ message: "Invite not found" });

    if (inviteData.isUsed) return res.status(400).send({ message: "Invalid/Expired Invite" });

    return res.status(200).send({ data: inviteData });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getFullInviteData = async (req, res) => {
  try {
    const user = await Artist.findOne({ _id: req.user._id }, { userId: 1, invite: 1 }).lean(true);
    if (!user) return res.status(400).send({ message: "User not found" });

    if (user && !user?.invite) {
      return res.status(400).send({ message: "Invite not found" });
    }

    const inviteData = await Invite.findOne({ _id: user.invite.inviteId }).lean(true);
    if (!inviteData) return res.status(400).send({ message: "Invite not found" });

    return res.status(200).send({ data: inviteData });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getUserSavedCard = async (req, res) => {
  try {
    const card_stored = await Artist.findOne({ _id: req.user._id }, { "card.card_details": 1, isCardExpired: 1, "card.card_stored": 1 }).lean();
    if (!card_stored) return res.status(400).send({ message: "User not found" });

    return res.status(200).send({ data: card_stored });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

module.exports = {
  login,
  sendVerifyEmailOTP,
  verifyEmailOTP,
  sendSMSOTP,
  verifySMSOTP,
  becomeArtist,
  sendForgotPasswordOTP,
  validateOTP,
  resetPassword,
  resendOTP,
  changePassword,
  checkArtistToken,
  getArtistDetails,
  getArtistDetailById,
  logOut,
  completeProfile,
  createTicket,
  ticketDetail,
  ticketFeedback,
  editUserProfile,
  editArtistProfile,
  getActivedArtists,
  getUserTickets,
  replyTicketUser,
  addToCart,
  removeFromCart,
  likeOrUnlikeArtwork,
  getCartItems,
  getUnAutorisedCartItems,
  getLikedItems,
  getBillingAddresses,
  addBillingAddress,
  removeBillingAddress,
  setDefaultBillingAddress,
  deleteArtistSeries,
  artistReValidate,
  getNotificationsOfUser,
  markReadNotification,
  deleteNotification,
  getUserPlans,
  getInsignia,
  getDataOnHovered,
  addItemToFavoriteList,
  getFavoriteList,
  getFullFavoriteList,
  createCustomOrder,
  createInvite,
  randomInviteCode,
  getInvite,
  getFullInviteData,
  getUserSavedCard,
};
