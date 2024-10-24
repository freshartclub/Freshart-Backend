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
const Ticket = require("../models/ticketModel");
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
    const { email, password, cpassword, isArtistRequest } = req.body;
    if (!req.body.email) {
      return res.status(400).send({ message: "Email is required" });
    }

    let becomeArtistRequest = false;
    if (isArtistRequest) becomeArtistRequest = true;

    if (!becomeArtistRequest) {
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
          email: email.toLowerCase(),
          isDeleted: false,
        },
        { userId: 1 }
      ).lean(true);

      const otp = await generateRandomOTP();
      let nUser = true;
      const mailVaribles = {
        "%email%": email,
        "%otp%": otp,
      };

      if (isExist.length === 1 && isExist[0].userId === undefined) {
        Artist.updateOne(
          { email: email.toLowerCase(), isDeleted: false },
          {
            $set: {
              OTP: otp,
              userId: generateRandomId(nUser),
              role: "user",
              password: md5(password),
              pageCount: 0,
            },
          }
        ).then();

        await sendMail("verify-email", mailVaribles, email.toLowerCase());
        return res.status(200).send({
          id: isExist[0]._id,
          message: "OTP sent Successfully",
        });
      } else if (isExist.length > 1) {
        return res.status(400).send({ message: "Email already exist" });
      }

      const user = await Artist.create({
        email: email.toLowerCase(),
        password: md5(password),
        userId: generateRandomId(nUser),
        role: "user",
        pageCount: 0,
        OTP: otp,
      });

      await sendMail("verify-email", mailVaribles, email.toLowerCase());
      return res.status(200).send({
        id: user._id,
        message: "OTP sent Successfully",
      });
    } else {
      const otp = await generateRandomOTP();
      const mailVaribles = {
        "%email%": email,
        "%otp%": otp,
      };

      const isExist = await Artist.countDocuments({
        email: email.toLowerCase(),
        isDeleted: false,
      });

      if (isExist) {
        Artist.updateOne(
          { email: email.toLowerCase(), isDeleted: false },
          { $set: { OTP: otp } }
        ).then();
      } else {
        await Artist.create({
          email: req.body.email.toLowerCase(),
          pageCount: 0,
          OTP: otp,
        });
      }

      await sendMail("verify-email", mailVaribles, email.toLowerCase());
      return res.status(200).send({
        message: "OTP sent Successfully",
      });
    }
  } catch (error) {
    APIErrorLog.error("Error while login the artist");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const verifyEmailOTP = async (req, res) => {
  try {
    const { id, otp, isArtistRequest, email } = req.body;

    if (isArtistRequest) {
      const user = await Artist.findOne({
        email: email.toLowerCase(),
        isDeleted: false,
      }).lean(true);

      if (!user) {
        return res.status(400).send({ message: "User not found" });
      }

      if (otp !== user.OTP) {
        return res.status(400).send({ message: "Invalid OTP" });
      }

      Artist.updateOne(
        { email: email, isDeleted: false },
        { $unset: { OTP: "" } }
      ).then();

      return res.status(200).send({
        message: "Email verified Successfully",
      });
    }

    const user = await Artist.findOne({
      _id: id,
      isDeleted: false,
    }).lean(true);

    if (!user) {
      return res.status(400).send({ message: "User not found" });
    }

    if (otp !== user.OTP) {
      return res.status(400).send({ message: "Invalid OTP" });
    }

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

    Artist.updateOne(
      { _id: user._id, isDeleted: false },
      {
        $unset: { OTP: "" },
        $push: { tokens: token },
        $set: { isEmailVerified: true },
      }
    ).then();

    return res
      .status(200)
      .send({ token, id: user._id, message: "Email verified Successfully" });
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
    const mailVaribles = {
      "%fullName%": user.firstName,
      "%email%": user.email,
      "%otp%": otp,
    };

    await sendMail("send-forgotpassword-otp", mailVaribles, user.email);

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
    APIErrorLog.error("Error while login the admin");
    APIErrorLog.error(error);
    // error response
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
        { isArtistRequest: 1, isArtistRequestStatus: 1 }
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
      }
    } else {
      const user = await Artist.findOne(
        {
          email: req.body.email.toLowerCase(),
          isDeleted: false,
        },
        { isArtistRequest: 1, isArtistRequestStatus: 1 }
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
      }
    }

    let documnets = [];
    let documnet = {};
    let links = [];

    documnet["discipline"] = req.body.discipline;
    if (req.body.style) {
      if (typeof req.body.style === "string") {
        documnet["style"] = [req.body.style];
      } else {
        documnet["style"] = [];
        for (let i = 0; i < req.body.style.length; i++) {
          documnet["style"].push(req.body.style[i]);
        }
      }
    }

    if (fileData.data?.uploadDocs) {
      for (let i = 0; i < fileData.data.uploadDocs.length; i++) {
        documnets.push(fileData.data.uploadDocs[i].filename);
      }
    }

    if (req.body.socialMedia) {
      links.push({
        socialMedia: req.body.socialMedia,
        website: req.body.website,
      });
    }

    let obj = {
      artistName: req.body.artistName
        .toLowerCase()
        .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
        .trim(),
      phone: req.body.phone.replace(/[- )(]/g, "").trim(),
      email: req.body.email.toLowerCase(),
      isArtistRequest: true,
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
      discipline: [documnet],
    };

    obj["links"] = links;

    obj["address"] = {
      city: req.body.city,
      state: req.body.region,
      country: req.body.country,
      zipCode: String(req.body.zipCode),
    };

    obj["document"] = {
      documents: documnets,
    };

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

    const mailVariable = {
      "%fullName%": name,
      "%email%": email,
    };

    await sendMail("become-an-artist", mailVariable, email);

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

const completeProfile = async (req, res) => {
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

    let obj = {
      avatar: fileData?.data.avatar[0].filename,
      artistName: req.body.artistName,
      artistSurname1: req.body.artistSurname2,
      artistSurname2: req.body.artistSurname2,
      gender: req.body.gender,
      dob: req.body.dob,
      address: {
        country: req.body.country,
        zipCode: String(req.body.zipCode),
        city: req.body.city,
        state: req.body.state,
      },
    };

    Artist.updateOne({ _id: id, isDeleted: false }, { $set: obj }).then();

    return res.status(200).send({ message: "Profile updated successfully" });
  } catch (error) {
    APIErrorLog.error("Error while login the admin");
    APIErrorLog.error(error);
    // error response
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
      { avatar: 1 }
    ).lean(true);
    const fileData = await fileUploadFunc(req, res);

    console.log(fileData.data);

    const cvEntries = Array.isArray(req.body.cvEntries)
      ? req.body.cvEntries.map((item) => JSON.parse(item))
      : req.body.cvEntries;

    const accounts = Array.isArray(req.body.accounts)
      ? req.body.accounts.map((item) => JSON.parse(item))
      : req.body.accounts;

    let obj = {
      avatar: fileData?.data?.avatar
        ? fileData?.data.avatar[0].filename
        : artist?.avatar,
      artistName: req.body.artistName,
      artistSurname1: req.body.artistSurname2,
      artistSurname2: req.body.artistSurname2,
      gender: req.body.gender,
      dob: req.body.dob,
      aboutArtist: {
        about: req.body.about,
      },
      highlights: {
        cv: cvEntries,
      },
      address: {
        country: req.body.country,
        zipCode: String(req.body.zipCode),
        city: req.body.city,
        state: req.body.state,
      },
    };

    if (req?.body?.accounts) {
      obj["links"] = accounts;
    }

    console.log(obj);

    Artist.updateOne(
      { _id: artist._id, isDeleted: false },
      { $set: obj }
    ).then();

    return res.status(200).send({ message: "Profile updated successfully" });
  } catch (error) {
    APIErrorLog.error("Error while edit the artist profile");
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

    const { subject, message, region, ticketType } = req.body;
    const randomNumber = Math.floor(100 + Math.random() * 900);
    const year = new Date().getFullYear();
    const ticketId = `Ticket# ${year}-CS${randomNumber}`;

    const payload = {
      user: req.user._id,
      subject,
      message,
      region,
      ticketType: ticketType,
      ticketId: ticketId,
      // ticketImg:
      //   fileData.data.ticketImg && fileData.data.ticketImg.length > 0
      //     ? fileData.data.ticketImg[0].filename
      //     : null,
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

const ticketList = async (req, res) => {
  try {
    let { page, limit, search, sortTicketDate } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    let filter = {};
    if (search) {
      filter["ticketId"] = { $regex: search, $options: "i" };
    }
    let sort = { createdAt: -1 };
    if (sortTicketDate) {
      sort["ticketDate"] = sortTicketDate === "asc" ? 1 : -1;
    }
    const totalItems = await Ticket.countDocuments(filter).lean(true);
    const getData = await Ticket.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(true);

    const totalPages = Math.ceil(totalItems / limit);
    console.log("getData", getData);

    return res.json({
      message: "All tickets retrieved successfully.",
      data: getData,
      pagination: {
        totalItems,
        currentPage: page,
        totalPages,
        limit,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

const ticketDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const ticketData = await Ticket.findById(id);
    return res.status(201).json({
      message: "Ticket details retrieved successfully",
      data: ticketData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};
// -------------------ticket----------------------------

module.exports = {
  login,
  sendVerifyEmailOTP,
  verifyEmailOTP,
  becomeArtist,
  sendForgotPasswordOTP,
  validateOTP,
  resetPassword,
  resendOTP,
  getArtistDetails,
  logOut,
  completeProfile,
  createTicket,
  ticketList,
  ticketDetail,
  editArtistProfile,
};
