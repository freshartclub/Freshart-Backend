const Artist = require("../models/artistModel");
const Artwork = require("../models/artWorksModel");
const jwt = require("jsonwebtoken");
const {
  createLog,
  fileUploadFunc,
  generateRandomId,
  generateRandomOTP,
} = require("../functions/common");
const { sendMail } = require("../functions/mailer");
const APIErrorLog = createLog("API_error_log");
const TicketReply = require("../models/ticketReplyModel");
const Ticket = require("../models/ticketModel");
const md5 = require("md5");
const objectId = require("mongoose").Types.ObjectId;
const axios = require("axios");
const EmailType = require("../models/emailTypeModel");

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

    if (!email || !password) {
      return res
        .status(400)
        .send({ message: "Email and password is required" });
    }

    const user = await Artist.findOne({
      email: email.toLowerCase(),
      isDeleted: false,
    })
      .select("+password")
      .lean(true);

    if (!user) {
      return res.status(400).send({ message: "User suspended/not found" });
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

    await Artist.updateOne(
      { _id: user._id, isDeleted: false },
      { $push: { tokens: token } }
    );

    return res.status(200).send({
      token,
      user,
      message: "Artist login Successfully",
    });
  } catch (error) {
    APIErrorLog.error("Error while login the artist");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const sendVerifyEmailOTP = async (req, res) => {
  try {
    const { password, cpassword, isArtistRequest } = req.body;
    let { email } = req.body;
    if (!email) return res.status(400).send({ message: "Email is required" });

    email = email.toLowerCase();

    const findEmail = await EmailType.findOne({
      emailType: "verify-email-otp",
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
        await Artist.updateOne(
          { email: email, isDeleted: false },
          { $set: { OTP: otp } }
        );
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
          message:
            "Password must contain one Uppercase, Lowercase, Numeric and Special Character",
        });
      }

      const isExist = await Artist.find(
        {
          email: email,
          isDeleted: false,
        },
        { userId: 1 }
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
        await Artist.updateOne(
          { email: email },
          {
            $set: {
              OTP: otp,
              userId: "UID-" + generateRandomId(true),
              role: "user",
              password: md5(password),
              pageCount: 0,
            },
          }
        );

        await sendMail("sample-email", mailVaribles, email);
        return res.status(200).send({
          id: isExist[0]._id,
          message: "OTP sent Successfully",
        });
      }

      const user = await Artist.create({
        email: email,
        password: md5(password),
        userId: "UID-" + generateRandomId(true),
        role: "user",
        pageCount: 0,
        OTP: otp,
      });

      await sendMail("sample-email", mailVaribles, email);
      return res.status(200).send({
        id: user._id,
        message: "OTP sent Successfully",
      });
    }
  } catch (error) {
    APIErrorLog.error("Error while login the artist");
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
      if (otp !== user.OTP)
        return res.status(400).send({ message: "Invalid OTP" });

      await Artist.updateOne(
        { email: email, isDeleted: false },
        { $unset: { OTP: "" } }
      );

      return res.status(200).send({
        message: "Email verified Successfully",
      });
    } else {
      const user = await Artist.findOne(
        {
          _id: id,
          isDeleted: false,
        },
        { OTP: 1, role: 1, password: 1 }
      ).lean(true);

      if (!user) return res.status(400).send({ message: "User not found" });
      if (otp !== user.OTP)
        return res.status(400).send({ message: "Invalid OTP" });

      const userField = {
        _id: user._id,
        role: user.role,
        password: user.password,
      };

      const token = jwt.sign(
        { user: userField },
        process.env.ACCESS_TOKEN_SECERT,
        { expiresIn: "30d" }
      );

      await Artist.updateOne(
        { _id: user._id, isDeleted: false },
        {
          $unset: { OTP: "" },
          $push: { tokens: token },
          $set: { isEmailVerified: true },
        }
      );

      return res
        .status(200)
        .send({ token, id: user._id, message: "Email verified Successfully" });
    }
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const sendSMSOTP = async (req, res) => {
  try {
    const { phone, email } = req.body;

    const authHeader = Buffer.from(
      `${process.env.API_SMS_USER}:${process.env.API_SMS_PWD}`
    ).toString("base64");

    const otp = generateRandomOTP();

    let phoneArr = [];
    phoneArr.push(phone.replace("+", ""));

    const data = {
      to: phoneArr,
      text: `To verify your phone number, use OTP - ${otp}`,
      from: "57575757111",
    };

    const url = "https://dashboard.wausms.com/Api/rest/message";

    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${authHeader}`,
    };

    const response = await axios.post(url, data, { headers });

    await Artist.updateOne(
      { email: email.toLowerCase(), isDeleted: false },
      { $set: { OTP: otp } }
    );

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

    Artist.updateOne(
      { email: email.toLowerCase(), isDeleted: false },
      { $unset: { OTP: "" } }
    ).then();

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
    const { email } = req.body;

    const user = await Artist.findOne({
      email: email.toLowerCase(),
      isDeleted: false,
    });

    if (!user) {
      return res.status(400).send({ message: "User not found" });
    }

    const otp = await generateRandomOTP();
    const findEmail = await EmailType.findOne({
      emailType: "send-forgot-password-otp",
    }).lean(true);

    const mailVaribles = {
      "%head%": findEmail.emailHead,
      "%email%": user.email,
      "%msg%": findEmail.emailDesc,
      "%name%": user.artistName,
      "%otp%": otp,
    };

    await sendMail("sample-email", mailVaribles, user.email);

    Artist.updateOne(
      { _id: user._id, isDeleted: false },
      { $set: { OTP: otp } }
    ).then();

    return res.status(200).send({
      id: user._id,
      message: "OTP sent Successfully",
    });
  } catch (error) {
    APIErrorLog.error("Error while register the artist information");
    APIErrorLog.error(error);
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
        _id: id,
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
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

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
    const fileData = await fileUploadFunc(req, res);
    if (fileData.type !== "success") {
      return res.status(fileData.status).send({
        message:
          fileData?.type === "fileNotFound"
            ? "Please upload the documents"
            : fileData.type,
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
          message:
            "You have already requested to become Artist. Your requset is in process",
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
          message:
            "You have already requested to become Artist. Your requset is in process",
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
          message:
            "You have already requested to become Artist. Your requset is in process",
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
          message:
            "You have already requested to become Artist. Your requset is in process",
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
    } else {
      Artist.updateOne(
        { email: req.body.email.toLowerCase(), isDeleted: false },
        condition
      ).then();
    }

    const name = req.body.artistName;
    const email = req.body.email.toLowerCase();

    const findEmail = await EmailType.findOne({
      emailType: "become-artist-request",
      isDeleted: false,
    }).lean(true);

    const mailVariable = {
      "%head%": findEmail.emailHead,
      "%email%": email,
      "%msg%": findEmail.emailDesc,
      "%name%": name,
    };

    await sendMail("sample-email", mailVariable, email);

    return res
      .status(200)
      .send({ message: "Your Become Artist request sent successfully" });
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

    await Artist.updateOne(
      { _id: decodeToken.user._id },
      { $pull: { tokens: token } }
    );

    return res.status(200).send({ message: "Logout successfully" });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    // error response
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
          isEmailVerified: 1,
          artistSurname2: 1,
          phone: 1,
          email: 1,
          aboutArtist: 1,
          links: 1,
          profile: 1,
          highlights: 1,
          publishingCatalog: 1,
          address: 1,
          insignia: {
            credentialName: 1,
            insigniaImage: 1,
          },
          links: 1,
          language: 1,
          logistics: 1,
          managerDetails: 1,
          nickName: 1,
          aboutArtist: 1,
          cart: 1,
          createdAt: 1,
          currency: 1,
          documents: 1,
          isArtistRequestStatus: 1,
          profileStatus: 1,
          lastRevalidationDate: 1,
          nextRevalidationDate: 1,
          billingInfo: 1,
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
                        $arrayElemAt: [
                          "$commercilization.publishingCatalog.ArtistFees",
                          { $indexOfArray: ["$lookupCatalog", "$$catalog"] },
                        ],
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
          role: 1,
          userId: 1,
          artistId: 1,
          wishlist: 1,
          otherTags: 1,
        },
      },
    ]);

    res.status(200).send({
      artist: artist[0],
      url: "https://dev.freshartclub.com/images",
      message: `welcome ${artist.artistName ? artist.artistName : "Back"}`,
    });
  } catch (error) {
    APIErrorLog.error("Error while login the admin");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getArtistDetailById = async (req, res) => {
  try {
    const artist = await Artist.findOne(
      {
        _id: req.params.id,
        isDeleted: false,
      },
      {
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
      }
    )
      .populate("insignia", "credentialName insigniaImage")
      .lean(true);

    if (!artist) {
      return res.status(400).send({ message: "Artist not found" });
    }

    const artistArtworks = await Artwork.aggregate([
      {
        $match: {
          isDeleted: false,
          owner: objectId(req.params.id),
        },
      },

      {
        $project: {
          _id: 1,
          artworkName: 1,
          discipline: 1,
          media: 1,
          additionalInfo: {
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
      artist: artist,
      artworks: artistArtworks,
      url: "https://dev.freshartclub.com/images",
    });
  } catch (error) {
    APIErrorLog.error("Error while login the admin");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const completeProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const fileData = await fileUploadFunc(req, res);

    if (fileData.type !== "success") {
      return res.status(fileData.status).send({
        message:
          fileData?.type === "fileNotFound"
            ? "Please upload the Image"
            : fileData.type,
      });
    }

    let obj = {
      artistName: req.body.artistName,
      artistSurname1: req.body.artistSurname1,
      artistSurname2: req.body.artistSurname2,
      gender: req.body.gender,
      profile: {
        mainImage: fileData?.data.mainImage[0].filename,
      },
      address: {
        country: req.body.country,
        zipCode: String(req.body.zipCode),
        city: req.body.city,
        state: req.body.state,
      },
    };

    const artist = await Artist.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: obj }
    ).lean(true);

    return res
      .status(200)
      .send({ message: "Profile updated successfully", data: artist });
  } catch (error) {
    APIErrorLog.error("Error while login the admin");
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
        additionalImages.push(
          req?.body?.existingAdditionalImage.replace(/^"|"$/g, "")
        );
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
        additionalVideos.push(
          req?.body?.existingAdditionalVideo.replace(/^"|"$/g, "")
        );
      } else {
        const cleanedImages = cleanArray(req?.body?.existingAdditionalVideo);
        additionalVideos = [...additionalVideos, ...cleanedImages];
      }
    }

    if (req.body.cvEntries) {
      const cvEntries = Array.isArray(req.body.cvEntries)
        ? req.body.cvEntries.map((item) => JSON.parse(item))
        : req.body.cvEntries;

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
      const accounts = Array.isArray(req.body.accounts)
        ? req.body.accounts.map((item) => JSON.parse(item))
        : req.body.accounts;

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
      const disciplines = Array.isArray(req.body.discipline)
        ? req.body.discipline.map((item) => JSON.parse(item))
        : req.body.discipline;

      if (typeof disciplines === "string") {
        const obj = JSON.parse(disciplines);
        disciplineArr.push(obj);
      } else {
        disciplines.forEach((element) => {
          const discipline = element.discipline;
          const style = Array.isArray(element.style)
            ? element.style.map((s) =>
                typeof s === "object" && s.value ? s.value : s
              )
            : [];

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
        mainImage: fileData?.data?.mainImage
          ? fileData?.data?.mainImage[0].filename
          : processBodyImg(req.body?.mainImage),
        additionalImage: additionalImages,
        inProcessImage: fileData.data?.inProcessImage
          ? fileData.data.inProcessImage[0].filename
          : processBodyImg(req.body?.inProcessImage),
        mainVideo: fileData.data?.mainVideo
          ? fileData.data.mainVideo[0].filename
          : processBodyImg(req.body?.mainVideo),
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

      if (
        req.body.managerArtistLanguage &&
        req.body.managerArtistLanguage.length
      ) {
        obj["managerDetails"]["language"] = Array.isArray(
          req.body.managerArtistLanguage
        )
          ? req.body.managerArtistLanguage
          : [req.body.managerArtistLanguage];
      }
    } else {
      obj["isManagerDetails"] = false;
      obj["managerDetails"] = null;
    }

    obj["links"] = accountArr;

    Artist.updateOne(
      { _id: artist._id, isDeleted: false },
      { $set: { reviewDetails: obj, profileStatus: "under-review" } }
    ).then();

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
    const artist = await Artist.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);

    if (!artist) {
      return res.status(400).send({ message: "Artist/User not found" });
    }

    const fileData = await fileUploadFunc(req, res);
    const { subject, message, region, ticketType, urgency, impact } = req.body;

    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    const year = new Date().getFullYear();
    const ticketId = `TI# ${year}-CS${randomNumber}`;

    const payload = {
      user: req.user._id,
      subject,
      message,
      region,
      ticketType: ticketType,
      ticketId: ticketId,
      urgency,
      impact,
      ticketImg:
        fileData.data?.ticketImg && fileData.data?.ticketImg?.length > 0
          ? fileData.data.ticketImg[0].filename
          : null,
    };

    const ticketData = await Ticket.create(payload);

    return res.status(201).json({
      message: "Ticket posted successfully!",
      data: ticketData,
    });
  } catch (error) {
    APIErrorLog.error("Error while posting the ticket");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const ticketDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const [ticketData, replyData] = await Promise.all([
      Ticket.findOne({ _id: id }).lean(true),
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

    return res.status(200).send({
      data: ticketData,
      reply: replyData,
      url: "https://dev.freshartclub.com/images",
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

    Ticket.updateOne(
      { _id: id },
      { $set: { status: status, ticketType: ticketType } }
    ).then();

    const reply = await TicketReply.create({
      user: userType === "admin" ? null : req.user._id,
      userType: "user",
      ticket: id,
      ticketType,
      status,
      message,
      ticketImg: fileData?.data?.ticketImg
        ? fileData.data.ticketImg[0].filename
        : null,
    });

    return res.status(201).json({
      message: "Ticket replied successfully",
      data: reply,
    });
  } catch (error) {
    APIErrorLog.error("Error while replying the ticket");
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
    const artists = await Artist.find(
      {
        isActivated: true,
        isDeleted: false,
      },
      {
        artistName: 1,
        artistSurname1: 1,
        artistSurname2: 1,
        aboutArtist: 1,
        profile: 1,
      }
    ).lean(true);

    return res.status(200).send({
      artists: artists,
      url: "https://dev.freshartclub.com/images",
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// -------------------ticket----------------------------

const addToCart = async (req, res) => {
  try {
    const { id } = req.params;

    const artist = await Artist.findOne(
      { _id: req.user._id },
      { cart: 1 }
    ).lean(true);

    if (!artist) {
      return res.status(400).send({ message: "Artist not found" });
    }

    const result = await Artist.updateOne(
      {
        _id: req.user._id,
        "cart.item": id,
      },
      {
        $inc: { "cart.$.quantity": 1 }, // Increment quantity if the item exists
      }
    );

    if (result.modifiedCount === 0) {
      await Artist.updateOne(
        { _id: req.user._id },
        {
          $push: { cart: { item: id, quantity: 1 } }, // Add new item with quantity 1
        }
      );

      return res
        .status(200)
        .send({ message: "Item added to cart successfully" });
    }

    return res
      .status(200)
      .send({ message: `${result.modifiedCount} item(s) updated in cart` });
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

    return res
      .status(200)
      .send({ message: `${result.modifiedCount} item(s) removed from cart` });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const addRemoveToWishlist = async (req, res) => {
  try {
    const { id } = req.params;

    const artist = await Artist.findOne(
      { _id: req.user._id },
      { wishlist: 1 }
    ).lean(true);

    if (!artist) {
      return res.status(400).send({ message: "Artist not found" });
    }

    if (artist.wishlist) {
      const isExist = artist.wishlist.find((item) => item.toString() == id);
      if (isExist) {
        Artist.updateOne(
          { _id: req.user._id },
          { $pull: { wishlist: id } }
        ).then();
        return res.status(200).send({ message: "Unliked" });
      }
    }

    Artist.updateOne({ _id: req.user._id }, { $push: { wishlist: id } }).then();
    return res.status(200).send({ message: "Artwork Liked" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getCartItems = async (req, res) => {
  try {
    const data = await Artist.findOne({ _id: req.user._id }, { cart: 1 })
      .populate({
        path: "cart",
        select: "item quantity",
        populate: {
          path: "item",
          select: "artworkName pricing media.mainImage commercialization",
        },
      })
      .lean(true);

    return res
      .status(200)
      .send({ data, url: "https://dev.freshartclub.com/images" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getWishlistItems = async (req, res) => {
  try {
    const artist = await Artist.countDocuments({ _id: req.user._id }).lean(
      true
    );
    if (!artist) {
      return res.status(400).send({ message: "Artist not found" });
    }

    const wishlistItems = await Artist.findOne(
      { _id: req.user._id },
      { wishlist: 1 }
    )
      .populate("wishlist", "artworkName pricing media")
      .lean(true);

    return res.status(200).send({
      data: wishlistItems,
      url: "https://dev.freshartclub.com/images",
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getBillingAddresses = async (req, res) => {
  try {
    const data = await Artist.findOne(
      { _id: req.user._id },
      { billingInfo: 1 }
    ).lean(true);

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
    const artist = await Artist.findOne(
      { _id: req.user._id },
      { billingInfo: 1 }
    ).lean(true);

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
      await Artist.updateOne(
        { _id: req.user._id },
        { $push: { billingInfo: obj } }
      );
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

    const artist = await Artist.findOne(
      { _id: req.user._id },
      { billingInfo: 1 }
    ).lean(true);

    if (!artist) {
      return res.status(400).send({ message: "Artist not found" });
    }

    await Artist.updateOne(
      { _id: req.user._id },
      { $pull: { billingInfo: { _id: addressId } } }
    );

    return res.status(200).send({ message: "Billing address removed" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const setDefaultBillingAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const artist = await Artist.findOne(
      { _id: req.user._id, "billingInfo._id": addressId },
      { billingInfo: 1 }
    ).lean(true);

    if (!artist) {
      return res.status(404).send({ message: "Address not found" });
    }

    await Artist.updateOne(
      { _id: req.user._id },
      { $set: { "billingInfo.$[].isDefault": false } }
    );

    await Artist.updateOne(
      { _id: req.user._id, "billingInfo._id": addressId },
      { $set: { "billingInfo.$.isDefault": true } }
    );

    return res.status(200).send({ message: "Default Billing Address Updated" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const deleteArtistSeries = async (req, res) => {
  try {
    const artist = await Artist.findOne(
      { _id: req.user._id },
      { artistSeriesList: 1 }
    ).lean(true);
    if (!artist) {
      return res.status(400).send({ message: "Artist not found" });
    }

    const { name } = req.body;
    if (!name) {
      return res.status(400).send({ message: "Series name is required" });
    }

    if (!artist.artistSeriesList.includes(name)) {
      return res
        .status(400)
        .send({ message: "Series not found in artist's series list" });
    }

    const existingArtwork = await Artwork.findOne(
      { owner: artist._id, artworkSeries: name.trim() },
      { _id: 1 }
    ).lean(true);

    if (existingArtwork) {
      return res.status(400).send({ message: "Series used in other artworks" });
    }

    await Artist.updateOne(
      { _id: req.user._id },
      { $pull: { artistSeriesList: name.trim() } }
    );

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

    const findEmail = await EmailType.findOne({
      emailType: "artist-profile-revalidated",
    }).lean(true);

    const mailVaribles = {
      "%head%": findEmail.emailHead,
      "%email%": artist.email,
      "%msg%": findEmail.emailDesc,
      "%name%": artist.artistName,
      "%newDate%": new Date(
        new Date().setDate(new Date().getDate() + 30)
      ).toLocaleDateString("en-GB"),
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
            nextRevalidationDate: new Date(
              new Date().setDate(new Date().getDate() + 30)
            ),
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
  getArtistDetails,
  getArtistDetailById,
  logOut,
  completeProfile,
  createTicket,
  ticketDetail,
  ticketFeedback,
  editArtistProfile,
  getActivedArtists,
  getUserTickets,
  replyTicketUser,
  addToCart,
  removeFromCart,
  addRemoveToWishlist,
  getCartItems,
  getWishlistItems,
  getBillingAddresses,
  addBillingAddress,
  removeBillingAddress,
  setDefaultBillingAddress,
  deleteArtistSeries,
  artistReValidate,
};
