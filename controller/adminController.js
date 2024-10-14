const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const md5 = require("md5");
const moment = require("moment");
const Admin = require("../models/adminModel");
const Insignia = require("../models/insigniasModel");
const Artist = require("../models/artistModel");
const Category = require("../models/categoryModel");
const {
  createLog,
  getListArtworks,
  fileUploadFunc,
  generateRandomOTP,
  generateRandomId,
} = require("../functions/common");
const APIErrorLog = createLog("API_error_log");
const { checkValidations } = require("../functions/checkValidation");
const { sendMail } = require("../functions/mailer");
const crypto = require("crypto");
const BecomeArtist = require("../models/becomeArtistModel");

const sendLoginOTP = async (req, res) => {
  try {
    const errors = validationResult(req);

    const checkValid = await checkValidations(errors);
    if (checkValid.type === "error") {
      return res.status(400).send({
        message: checkValid.errors.msg,
      });
    }

    // Get user input
    const { email, password } = req.body;

    // Validate if user exist in our database
    const admins = await Admin.findOne(
      { email: email.toLowerCase(), isDeleted: false, status: "active" },
      { email: 1, password: 1, roles: 1 }
    );

    if (admins && admins.password === md5(password)) {
      const otp = await generateRandomOTP();
      const mailVaribles = {
        "%fullName%": admins.firstName,
        "%email%": admins.email,
        "%otp%": otp,
      };

      await sendMail("send-admin-otp", mailVaribles, admins.email);

      await Admin.updateOne(
        { _id: admins._id, isDeleted: false },
        { $set: { OTP: otp } }
      );

      return res.status(200).send({
        id: admins._id,
        message: "OTP sent Successfully",
      });
    }

    return res.status(400).send({ message: "Invalid Email/Password" });
  } catch (error) {
    APIErrorLog.error("Error while login the admin");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const validateOTP = async (req, res) => {
  try {
    const { id, otp } = req.body;

    const admins = await Admin.findOne({
      _id: id,
      isDeleted: false,
      status: "active",
    }).lean(true);

    const adminField = {
      _id: id,
      roles: admins.roles,
      status: admins.status,
      password: admins.password,
    };

    if (admins && admins.OTP == otp) {
      // Create token
      const token = jwt.sign(
        { user: adminField },
        process.env.ACCESS_TOKEN_SECERT,
        { expiresIn: "30d" }
      );

      Admin.updateOne(
        { _id: admins._id, isDeleted: false },
        {
          $unset: { OTP: "" },
          $push: { tokens: token },
        }
      ).then();

      return res.status(200).send({
        token,
        message: "OTP Verified Successfully",
      });
    }

    return res.status(400).send({ message: "Invalid OTP" });
  } catch (error) {
    APIErrorLog.error("Error while login the admin");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const resendOTP = async (req, res) => {
  try {
    const { id } = req.body;

    const admins = await Admin.findOne({
      _id: id,
      isDeleted: false,
    }).lean(true);

    if (admins) {
      const otp = await generateRandomOTP();
      const mailVaribles = {
        "%fullName%": admins.firstName,
        "%email%": admins.email,
        "%otp%": otp,
      };

      await sendMail("send-admin-otp", mailVaribles, admins.email);

      await Admin.updateOne(
        { _id: admins._id, isDeleted: false },
        { $set: { OTP: otp } }
      );

      return res.status(200).send({
        id: admins._id,
        message: "OTP sent Successfully",
      });
    }
  } catch (error) {
    APIErrorLog.error("Error while login the admin");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const logOut = async (req, res) => {
  try {
    // get token from headers
    const { 1: token } = req.headers.authorization.split(" ");
    const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECERT);

    await Admin.updateOne(
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

const testAdmin = async (req, res) => {
  try {
    const admin = await Admin.findOne({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    return res.status(200).send({
      admin: req.user,
      message: `welcome ${admin?.firstName}`,
    });
  } catch (error) {
    APIErrorLog.error("Error while get the data of the dashboard admin");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const artistRegister = async (req, res) => {
  try {
    const { id } = req.params;
    const fileData = await fileUploadFunc(req, res);

    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);

    if (!admin) {
      return res.status(400).send({
        message: `Admin not found`,
      });
    }

    let obj = {};
    let artist = {};
    if (req?.params?.id) {
      artist = await Artist.findOne(
        { _id: req.params.id },
        { pageCount: 1 }
      ).lean(true);
    }

    let count = null;
    if (fileData.data === undefined) {
      count = req.body.count;
    } else if (Object.keys(fileData.data).includes("profileImage")) {
      count = 4;
    } else {
      count = 7;
    }

    let user = true;
    switch (count) {
      case 1:
        obj = {
          artistName: req.body.artistName
            .toLowerCase()
            .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
            .trim(),
          // artistId: req.body.artistId,
          phone: req.body.phone.replace(/[- )(]/g, "").trim(),
          email: req.body.email.toLowerCase(),
          gender: req.body.gender,
          notes: req?.body?.notes,
          role: "user",
          uesrId: generateRandomId(user),
        };

        if (req?.body?.language.length) {
          obj["language"] = req.body.language;
        }

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

        if (req?.body?.nickName) {
          obj["nickName"] = req.body.nickName
            .toLowerCase()
            .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
            .trim();
        }

        obj["address"] = {
          residentialAddress: req.body.residentialAddress,
          country: req.body.country,
          zipCode: String(req.body.zipCode),
          city: req.body.city,
          state: req.body.state,
        };

        // obj["artworkStatus"] = {
        //   artwork: req.body.artwork,
        //   product: req.body.product,
        // };

        if (req.body.count > artist?.pageCount) {
          obj["pageCount"] = req.body.count;
        }

        break;

      case 2:
        obj["highlights"] = {
          addHighlights: req.body.highlights.trim(),
        };

        if (req?.body?.cvData.length) {
          obj["highlights"]["cv"] = req?.body?.cvData;
        }

        if (req.body.count > artist.pageCount) {
          obj["pageCount"] = req.body.count;
        }

        break;

      case 3:
        obj["aboutArtist"] = {
          about: req.body.about.trim(),
        };

        if (req?.body?.artistCategory.length) {
          obj["aboutArtist"]["category"] = req?.body?.artistCategory;
        }

        if (req.body.count > artist.pageCount) {
          obj["pageCount"] = req.body.count;
        }

        break;

      case 4:
        if (fileData.type !== "success") {
          return res.status(fileData.status).send({
            message:
              fileData?.type === "fileNotFound"
                ? "Please upload the documents"
                : fileData.type,
          });
        }

        // console.log("this is body", req.body);
        // console.log("this is data", fileData.data);

        obj["profile"] = {
          mainImage: fileData.data.profileImage
            ? fileData.data.profileImage[0].filename
            : null,
          additionalImage: fileData.data.additionalImage
            ? fileData.data.additionalImage[0].filename
            : [],
          inProcessImage: fileData.data.inProcessImage
            ? fileData.data.inProcessImage[0].filename
            : null,
          mainVideo: fileData.data.mainVideo
            ? fileData.data.mainVideo[0].filename
            : null,
          additionalVideo: fileData.data.additionalVideo
            ? fileData.data.additionalVideo[0].filename
            : [],
        };

        if (count > artist.pageCount) {
          obj["pageCount"] = count;
        }
        break;

      case 5:
        obj["invoice"] = {
          taxNumber: req.body.taxNumber.trim(),
          taxLegalName: req.body.taxLegalName
            .toLowerCase()
            .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
            .trim(),
          taxAddress: req.body.taxAddress,
          taxZipCode: String(req.body.taxZipCode),
          taxCity: req.body.taxCity,
          taxProvince: req.body.taxProvince,
          taxCountry: req.body.taxCountry,
          taxEmail: req.body.taxEmail.toLowerCase(),
          taxPhone: req.body.taxPhone.replace(/[- )(]/g, "").trim(),
          taxBankIBAN: req.body.taxBankIBAN,
          taxBankName: req.body.taxBankName,
        };

        if (req.body.count > artist.pageCount) {
          obj["pageCount"] = req.body.count;
        }

        break;

      case 6:
        obj["logistics"] = {
          logName: req.body.logName
            .toLowerCase()
            .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
            .trim(),
          logAddress: req.body.logAddress,
          logZipCode: String(req.body.logZipCode),
          logCity: req.body.logCity,
          logProvince: req.body.logProvince,
          logCountry: req.body.logCountry,
          logEmail: req.body.logEmail.toLowerCase(),
          logPhone: req.body.logPhone.replace(/[- )(]/g, "").trim(),
          logNotes: req?.body?.logNotes,
        };

        if (req.body.count > artist.pageCount) {
          obj["pageCount"] = req.body.count;
        }
        break;

      case 7:
        if (fileData.type !== "success") {
          return res.status(fileData.status).send({
            message:
              fileData?.type === "fileNotFound"
                ? "Please upload the documents"
                : fileData.type,
          });
        }

        obj["document"] = {
          documentPath: fileData.data.uploadDocs[0].filename,
          documentName: req.body.documentName,
        };

        if (req.body.isManagerDetails == "true") {
          obj["isManagerDetails"] = true;
          obj["managerDetails"] = {
            artistName: req.body.managerArtistName
              .toLowerCase()
              .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
              .trim(),
            artistSurname1: req.body.managerArtistSurnameOther1
              .toLowerCase()
              .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
              .trim(),
            artistSurname2: req.body.managerArtistSurname2
              .toLowerCase()
              .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
              .trim(),
            artistNickname: req.body.managerArtistNickname
              .toLowerCase()
              .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
              .trim(),
            artistContactTo: req.body.managerArtistContactTo,
            // .replace(/[- )(]/g, "")
            // .trim(),
            artistPhone: req.body.managerArtistPhone
              .replace(/[- )(]/g, "")
              .trim(),
            artistEmail: req.body.managerArtistEmail.toLowerCase(),
            artistGender: req.body.managerArtistGender,
            address: {
              address: req.body.address,
              city: req.body.managerCity,
              state: req.body.managerState,
              zipCode: String(req.body.managerZipCode),
              country: req.body.managerCountry,
              extraInfo1: req.body.managerExtraInfo1,
              extraInfo2: req.body.managerExtraInfo2,
              extraInfo3: req.body.managerExtraInfo3,
            },
          };

          if (req.body.managerArtistLanguage.length) {
            obj["managerDetails"]["language"] = Array.isArray(
              req.body.managerArtistLanguage
            )
              ? req.body.managerArtistLanguage
              : [req.body.managerArtistLanguage];
          }

          if (count > artist.pageCount) {
            obj["pageCount"] = count;
          }

          obj["role"] = "artist";
          obj["artistId"] = generateRandomId();
        }
        break;
    }

    let condition = {
      $set: obj,
    };

    let newArtist = null;

    if (id) {
      // const isExistingAritst = await Artist.findOne({
      //   email: req.body.email.toLowerCase(),
      //   isDeleted: false,
      // });
      // if (
      //   isExistingAritst.email.toLowerCase() !== req.body.email.toLowerCase()
      // ) {
      //   return res
      //     .status(400)
      //     .send({ message: "Artist already exist with this email" });
      // }
      Artist.updateOne({ _id: req.params.id }, condition).then();
    } else {
      const isExistingAritst = await Artist.countDocuments({
        email: req.body.email.toLowerCase(),
        isDeleted: false,
      });

      if (isExistingAritst) {
        return res
          .status(400)
          .send({ message: "Artist already exist with this email" });
      }

      newArtist = await Artist.create(obj);

      await Artist.updateOne(
        { _id: newArtist._id, isDeleted: false },
        {
          $set: {
            isArtistRequest: false,
          },
        }
      );
    }

    return res.status(200).send({
      id: id ? id : newArtist._id,
      popUpFlag: count === 7 ? true : false,
      message: "Artist Registered successfully",
    });
  } catch (error) {
    APIErrorLog.error("Error while registered the artist by admin");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const listArtworkStyle = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);

    if (!admin) {
      return res.status(400).send({
        message: `Admin not found`,
      });
    }

    const data = await getListArtworks(req.params.response);

    if (data.length) {
      for (let elem of data) {
        elem["createdAt"] = moment(elem.createdAt).format("DD MMM YYYY");
      }
    }

    return res.status(200).send({
      data: data,
      message: data.length ? "success" : "No record found",
    });
  } catch (error) {
    APIErrorLog.error("Error while registered the artist by admin");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const listDiscipline = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);

    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const data = await Category.find(
      { isDeleted: false },
      {
        categoryName: 1,
        categorySpanishName: 1,
        description: 1,
      }
    ).lean(true);

    if (data.length) {
      for (let elem of data) {
        elem["createdAt"] = moment(elem.createdAt).format("DD MMM YYYY");
      }
    }

    return res.status(200).send({
      data: data,
      message: "Discipline List successfully received",
    });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the discipline");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const createInsignias = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);

    if (!admin) {
      return res.status(400).send({ message: `Admin not found` });
    }

    const fileData = await fileUploadFunc(req, res);

    if (fileData.type !== "success") {
      return res.status(fileData.status).send({
        message:
          fileData?.type === "fileNotFound"
            ? "Please upload the image"
            : fileData.type,
      });
    }

    const obj = {
      areaName: req.body.credentialName.trim(),
      group: req.body.credentialGroup.trim(),
      priority: req.body.credentialPriority.trim(),
      isActive: JSON.parse(req.body.isActive),
    };

    obj["uploadImage"] = fileData.data.insigniaImage[0]?.filename;

    await Insignia.create(obj);
    return res.status(200).send({
      message: "Insignia created successfully",
    });
  } catch (error) {
    APIErrorLog.error("Error while created the insignia by admin");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getRegisterArtist = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);

    if (!admin) {
      return res.status(400).send({ message: `Admin not found` });
    }

    const data = await Artist.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).lean(true);

    if (data) {
      return res
        .status(200)
        .send({ data: data, message: "Artist data received successfully" });
    }
    return res.status(400).send({ message: "Artist not found" });
  } catch (error) {
    APIErrorLog.error("Error while get the artist data");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getInsignias = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);

    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const data = await Insignia.find({ isDeleted: false }).lean(true);

    if (data.length) {
      for (let elem of data) {
        elem["createdAt"] = moment(elem.createdAt).format("DD MMM YYYY");
      }
    }

    return res
      .status(200)
      .send({ data: data, message: "Insignia List received successfully" });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const activateArtist = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);

    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const artist = await Artist.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!artist) return res.status(400).send({ message: "Artist not found" });
    if (artist.isActivated) {
      return res.status(400).send({ message: "Artist already activated" });
    }
    if (artist.pageCount < 7) {
      return res
        .status(400)
        .send({ message: "Admin must complete the full form" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    await Artist.updateOne(
      { _id: req.params.id },
      {
        $set: {
          isActivated: true,
          passwordLinkToken: token,
        },
      }
    );

    const link = `${process.env.FRONTEND_URL}/reset-password?id=${artist._id}&token=${token}`;
    const mailVaribles = {
      "%fullName%": artist.artistName,
      "%email%": artist.email,
      "%phone%": artist.phone,
      "%link%": link,
    };

    if (!artist?.password) {
      await sendMail(
        "Become-an-artist-credentials",
        mailVaribles,
        artist.email
      );
    } else {
      await sendMail("Become-an-artist-mail", mailVaribles, artist.email);
    }

    return res.status(200).send({ message: "Artist activated successfully" });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getAllArtists = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const artists = await Artist.find({
      isDeleted: false,
      pageCount: { $gt: 0 },
    })
      .sort({ createdAt: -1 })
      .lean(true);

    return res.status(200).send({ data: artists });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getAllCompletedArtists = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const getArtists = await Artist.find({
      isActivated: true,
      isDeleted: false,
      // role: "artist",
    })
      .sort({ createdAt: -1 })
      .lean(true);

    res.status(200).send({ data: getArtists });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getArtistRequestList = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const artistlist = await Artist.find({
      isDeleted: false,
      isArtistRequest: true,
      pageCount: 0,
    })
      .sort({ createdAt: -1 })
      .lean(true);

    res.status(200).send({ data: artistlist });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getArtistPendingList = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const artistlist = await Artist.find({
      isDeleted: false,
      pageCount: { $gt: 0 },
      isArtistRequest: false,
    })
      .sort({ createdAt: -1 })
      .lean(true);

    res.status(200).send({ data: artistlist });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getUserFromId = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    });
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const artist = await Artist.findOne({ _id: id, isDeleted: false }).lean(
      true
    );
    if (!artist)
      return res.status(400).send({ message: `Artist Request not found` });

    const userId = artist.userId ? artist.userId : null;

    return res.status(200).send({ data: artist, userId: userId });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const createNewUser = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const fileData = await fileUploadFunc(req, res);
    if (fileData.type !== "success") {
      return res.status(fileData.status).send({
        message:
          fileData?.type === "fileNotFound"
            ? "Please upload the documents"
            : fileData.type,
      });
    }

    if (req.body.value === "new") {
      const isExitingUser = await Artist.countDocuments({
        email: req.body.email.toLowerCase(),
      });

      if (isExitingUser) {
        return res
          .status(400)
          .send({ message: "User with this email already exists" });
      }
    }

    const user = await Artist.create({
      artistName: req.body.name,
      email: req.body.email,
      phone: req.body.phoneNumber,
      avatar: fileData.data.avatar[0].filename,
      role: "user",
      address: {
        residentialAddress: req.body.address,
        country: req.body.country,
        city: req.body.city,
        state: req.body.state,
        zipCode: req.body.zipCode,
      },
    });

    await Artist.updateOne(
      { _id: user._id },
      { $set: { userId: generateRandomId(user._id) } }
    );

    return res
      .status(200)
      .send({ message: "User created successfully", id: user._id });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const suspendedArtist = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const suspendedList = await Artist.find({
      isDeleted: true,
    });

    return res.status(200).send({ data: suspendedList });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const serachUser = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { userId } = req.query;
    const query = {};

    if (userId) {
      query.userId = { $regex: userId, $options: "i" };
    }

    const users = await Artist.find({
      isDeleted: false,
      role: "user",
      ...query,
    }).lean(true);
    return res.status(200).send({ data: users });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const users = await Artist.find({
      isDeleted: false,
      userId: { $exists: true },
    })
      .sort({ createdAt: -1 })
      .lean(true);

    return res.status(200).send({ data: users });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const suspendArtist = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const user = await Artist.findOne({ _id: req.params.id }).lean(true);
    if (!user) return res.status(400).send({ message: `User not found` });
    if (user.isDeleted)
      return res.status(400).send({ message: `User already suspended` });

    Artist.updateOne(
      { _id: req.params.id },
      { $set: { isDeleted: true } }
    ).then();

    return res.status(200).send({ message: "Artist suspended successfully" });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const unSuspendArtist = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const user = await Artist.findOne({ _id: req.params.id }).lean(true);
    if (!user) return res.status(400).send({ message: `User not found` });
    if (!user.isDeleted)
      return res.status(400).send({ message: `User already unsuspended` });

    Artist.updateOne(
      { _id: req.params.id },
      { $set: { isDeleted: false } }
    ).then();

    return res.status(200).send({ message: "Artist unsuspended successfully" });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const changeArtistPassword = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.params;
    const { password, newPassword } = req.body;

    const user = await Artist.countDocuments({
      _id: id,
      isDeleted: false,
    }).lean(true);
    if (!user) {
      return res.status(400).send({ message: "Artist not found" });
    }

    if (password !== newPassword) {
      return res.status(400).send({ message: "Password does not match" });
    }

    Artist.updateOne(
      { _id: id, isDeleted: false },
      { $set: { password: md5(password) } }
    ).then();

    return res.status(200).send({ message: "Password changed successfully" });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

module.exports = {
  sendLoginOTP,
  validateOTP,
  resendOTP,
  logOut,
  testAdmin,
  artistRegister,
  listArtworkStyle,
  listDiscipline,
  createInsignias,
  getRegisterArtist,
  getInsignias,
  activateArtist,
  getAllCompletedArtists,
  getAllArtists,
  getArtistRequestList,
  getArtistPendingList,
  getUserFromId,
  createNewUser,
  serachUser,
  getAllUsers,
  suspendedArtist,
  suspendArtist,
  unSuspendArtist,
  changeArtistPassword,
};
