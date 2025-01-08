const { validationResult } = require("express-validator");
const ExcelJS = require("exceljs");
const jwt = require("jsonwebtoken");
const md5 = require("md5");
const moment = require("moment");
const Admin = require("../models/adminModel");
const Insignia = require("../models/insigniasModel");
const Artist = require("../models/artistModel");
const Ticket = require("../models/ticketModel");
const PickList = require("../models/pickListModel");
const Discipline = require("../models/disciplineModel");
const {
  createLog,
  fileUploadFunc,
  generateRandomOTP,
  generateRandomId,
} = require("../functions/common");
const objectId = require("mongoose").Types.ObjectId;
const APIErrorLog = createLog("API_error_log");
const { checkValidations } = require("../functions/checkValidation");
const { sendMail } = require("../functions/mailer");
const crypto = require("crypto");
const TicketReply = require("../models/ticketReplyModel");
const Style = require("../models/styleModel");
const Technic = require("../models/technicModel");
const Theme = require("../models/themeModel");
const MediaSupport = require("../models/mediaSupportModel");
const FAQ = require("../models/faqModel");
const KB = require("../models/kbModel");
const mongoose = require("mongoose");
const Catalog = require("../models/catalogModel");
const ArtWork = require("../models/artWorksModel");
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

const sendLoginOTP = async (req, res) => {
  try {
    const errors = validationResult(req);

    const checkValid = await checkValidations(errors);
    if (checkValid.type === "error") {
      return res.status(400).send({
        message: checkValid.errors.msg,
      });
    }

    const { email, password } = req.body;

    const admins = await Admin.findOne(
      { email: email.toLowerCase(), isDeleted: false, status: "active" },
      { email: 1, password: 1, roles: 1, firstName: 1 }
    );

    if (admins && admins.password === md5(password)) {
      const otp = await generateRandomOTP();

      const findEmail = await EmailType.findOne({
        emailType: "send-admin-login-otp",
      }).lean(true);

      const mailVaribles = {
        "%head%": findEmail.emailHead,
        "%email%": admins.email,
        "%msg%": findEmail.emailDesc,
        "%name%": admins.firstName,
        "%otp%": otp,
      };

      sendMail("sample-email", mailVaribles, admins.email);

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

      const findEmail = await EmailType.findOne({
        emailType: "send-admin-login-otp",
      }).lean(true);

      const mailVaribles = {
        "%head%": findEmail.emailHead,
        "%email%": admins.email,
        "%msg%": findEmail.emailDesc,
        "%name%": admins.firstName,
        "%otp%": otp,
      };

      sendMail("sample-email", mailVaribles, admins.email);

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
    const { id } = req?.params;
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
        {
          pageCount: 1,
          artistId: 1,
          profile: 1,
          commercilization: 1,
        }
      ).lean(true);
    }

    let additionalImages = [];
    let additionalVideos = [];
    let uploadDocs = [];
    let docsArr = [];

    if (fileData?.data?.additionalImage) {
      fileData.data?.additionalImage.forEach((element) => {
        additionalImages.push(element.filename);
      });
    }

    if (fileData?.data?.additionalVideo) {
      fileData.data?.additionalVideo.forEach((element) => {
        additionalVideos.push(element.filename);
      });
    }

    if (fileData?.data?.uploadDocs) {
      fileData.data?.uploadDocs.forEach((element) => {
        uploadDocs.push(element.filename);
      });
    }

    if (req.body?.uploadDocs) {
      if (typeof req.body?.uploadDocs === "string") {
        if (!isNaN(req.body?.uploadDocs) && isFinite(req.body?.uploadDocs)) {
          docsArr.push({
            documentName: req.body?.documentName,
            uploadDocs: uploadDocs,
          });
        } else {
          const filename = req.body?.uploadDocs.replace(
            "https://dev.freshartclub.com/images/documents/",
            ""
          );
          docsArr.push({
            documentName: req.body?.documentName,
            uploadDocs: filename,
          });
        }
      } else {
        req.body?.uploadDocs.forEach((element, i) => {
          if (!isNaN(element) && isFinite(element)) {
            docsArr.push({
              documentName: req.body?.documentName[i],
              uploadDocs: uploadDocs[0],
            });
            uploadDocs.shift();
          } else {
            const filename = element.replace(
              "https://dev.freshartclub.com/images/documents/",
              ""
            );
            docsArr.push({
              documentName: req.body?.documentName[i],
              uploadDocs: filename,
            });
          }
        });
      }
    }

    if (req?.body?.existingImages !== undefined) {
      if (typeof req?.body?.existingImages === "string") {
        additionalImages.push(req?.body?.existingImages);
      } else {
        for (let i = 0; i < req?.body?.existingImages.length; i++) {
          additionalImages.push(req?.body?.existingImages[i]);
        }
      }
    }

    if (req?.body?.existingVideos !== undefined) {
      if (typeof req?.body?.existingVideos === "string") {
        additionalVideos.push(req?.body?.existingVideos);
      } else {
        for (let i = 0; i < req?.body?.existingVideos.length; i++) {
          additionalVideos.push(req?.body?.existingVideos[i]);
        }
      }
    }

    const newImageArr =
      additionalImages?.map((element) => {
        if (
          typeof element === "string" &&
          element.includes("https://dev.freshartclub.com/images/users")
        ) {
          return element.replace(
            "https://dev.freshartclub.com/images/users/",
            ""
          );
        }
        return element;
      }) || [];

    const newVideoArr =
      additionalVideos?.map((element) => {
        if (
          typeof element === "string" &&
          element.includes("https://dev.freshartclub.com/images/users")
        ) {
          return element.replace(
            "https://dev.freshartclub.com/images/users/",
            ""
          );
        }
        return element;
      }) || [];

    const count = fileData?.data
      ? req.body.count === "4"
        ? 4
        : 7
      : Number(req.body.count);

    switch (count) {
      case 1:
        obj = {
          artistName: req.body.artistName
            .toLowerCase()
            .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
            .trim(),
          artistSurname1: req.body.artistSurname1
            .toLowerCase()
            .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
            .trim(),
          phone: req.body.phone.replace(/[- )(]/g, "").trim(),
          email: req.body.email.toLowerCase(),
          gender: req.body.gender,
          notes: req.body?.notes,
          language: req.body?.language,
          currency: req.body?.currency,
        };

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

        if (artist && artist.pageCount === 0) {
          obj["profileStatus"] = "inactive";
        }

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

        if (req?.body?.link?.length) {
          obj["links"] = req?.body?.link;
        }

        if (req.body?.insignia?.length) {
          obj["insignia"] = req.body.insignia;
        }

        if (req?.body?.discipline.length) {
          obj["aboutArtist"]["discipline"] = req?.body?.discipline;
        }

        if (req.body.count > artist.pageCount) {
          obj["pageCount"] = req.body.count;
        }

        break;

      case 4:
        obj["profile"] = {
          mainImage: fileData.data?.profileImage
            ? fileData.data.profileImage[0].filename
            : req.body?.hasMainImg === "true"
            ? artist?.profile?.mainImage
            : null,
          additionalImage: newImageArr,
          inProcessImage: fileData.data?.inProcessImage
            ? fileData.data.inProcessImage[0].filename
            : req.body?.hasInProcessImg === "true"
            ? artist?.profile?.inProcessImage
            : null,
          mainVideo: fileData.data?.mainVideo
            ? fileData.data.mainVideo[0].filename
            : req.body?.hasMainVideo === "true"
            ? artist?.profile?.mainVideo
            : null,
          additionalVideo: newVideoArr,
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
          vatAmount: req.body.vatAmount,
        };

        obj["commercilization"] = {
          customOrder: req.body.CustomOrder,
          artistLevel: req.body.artistLevel,
          artProvider: req.body.artProvider,
          scoreProfessional: req.body.scoreProfessional,
          scorePlatform: req.body.scorePlatform,
          artistPlus: req.body.ArtistPlus,
          minNumberOfArtwork: req.body.MinNumberOfArtwork,
          maxNumberOfArtwork: req.body.MaxNumberOfArtwork,
        };

        if (Array.isArray(req.body.PublishingCatalog)) {
          obj["commercilization"]["publishingCatalog"] =
            req.body.PublishingCatalog.map((item) => ({
              PublishingCatalog: objectId(item.PublishingCatalog),
              ArtistFees: item.ArtistFees,
            }));
        } else {
          obj["commercilization"]["publishingCatalog"] = [];
        }

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
        obj["documents"] = docsArr;
        obj["otherTags"] = {
          intTags:
            typeof req.body.intTags === "string"
              ? [req.body.intTags]
              : req.body.intTags,
          extTags:
            typeof req.body.extTags === "string"
              ? [req.body.extTags]
              : req.body.extTags,
        };
        obj["lastRevalidationDate"] = req.body.lastRevalidationDate;
        obj["profileStatus"] = "active";
        obj["nextRevalidationDate"] = req.body.nextRevalidationDate;
        obj["extraInfo"] = {
          extraInfo1: req.body.extraInfo1,
          extraInfo2: req.body.extraInfo2,
          extraInfo3: req.body.extraInfo3,
        };

        obj["emergencyInfo"] = {
          emergencyContactName: req.body.emergencyContactName,
          emergencyContactEmail: req.body.emergencyContactEmail,
          emergencyContactPhone: req.body.emergencyContactPhone,
          emergencyContactRelation: req.body.emergencyContactRelation,
          emergencyContactAddress: req.body.emergencyContactAddress,
        };

        if (req.body.isManagerDetails == "true") {
          obj["isManagerDetails"] = true;
          obj["managerDetails"] = {
            managerName: req.body.managerName
              .toLowerCase()
              .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
              .trim(),
            managerPhone: req.body.managerArtistPhone
              .replace(/[- )(]/g, "")
              .trim(),
            managerEmail: req.body.managerArtistEmail.toLowerCase(),
            managerGender: req.body.managerArtistGender,
            address: {
              address: req.body.address,
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

        if (count > artist.pageCount) {
          obj["pageCount"] = count;
        }
        break;
    }

    let condition = {
      $set: obj,
    };

    let newArtist = null;

    if (id) {
      Artist.updateOne({ _id: req.params.id }, condition).then();

      if (count === 5 && Array.isArray(req.body.PublishingCatalog)) {
        const artistId = objectId(req.params.id);
        await Promise.all(
          req.body.PublishingCatalog.map(async (item) => {
            await Catalog.updateMany(
              { artProvider: artistId },
              { $pull: { artProvider: artistId } }
            );

            await Catalog.updateOne(
              { _id: item.PublishingCatalog },
              { $addToSet: { artProvider: artistId } }
            );
          })
        );
      }
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

      obj["isArtistRequestStatus"] = "processing";
      newArtist = await Artist.create(obj);
    }

    return res.status(200).send({
      id: id ? id : newArtist._id,
      popUpFlag: count === 7 ? true : false,
      message: "Artist Registered successfully",
    });
  } catch (error) {
    APIErrorLog.error("Error while registered the artist by admin");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const addDiscipline = async (req, res) => {
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

    const { id } = req.query;
    const fileData = await fileUploadFunc(req, res);

    if (id !== undefined) {
      const isExisting = await Discipline.countDocuments({ _id: id });
      if (isExisting && isExisting !== 1) {
        return res.status(400).send({ message: "Discipline not found" });
      }
    } else {
      const isExisting = await Discipline.countDocuments({
        disciplineName: req.body.name,
      });

      if (isExisting) {
        return res
          .status(400)
          .send({ message: "Discipline with this name already exist." });
      }
    }

    let obj = {
      disciplineName: req.body.name,
      disciplineDescription: req.body.description,
      isDeleted: req.body.isDeleted,
    };

    if (fileData.data !== undefined) {
      obj["disciplineImage"] = fileData.data.disciplineImage[0].filename;
    }

    let condition = {
      $set: obj,
    };

    if (id === undefined) {
      await Discipline.create(obj);
      res.status(200).send({ message: "Discipline added successfully" });
    } else {
      Discipline.updateOne({ _id: id }, condition).then();
      res.status(200).send({ message: "Discipline updated successfully" });
    }
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getDisciplineById = async (req, res) => {
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

    const discipline = await Discipline.findOne({
      _id: req.params.id,
    }).lean(true);

    res
      .status(200)
      .send({ data: discipline, url: "https://dev.freshartclub.com/images" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const addStyles = async (req, res) => {
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

    const { id } = req.query;

    if (id !== undefined) {
      const isExisting = await Style.countDocuments({
        _id: id,
      });

      if (isExisting !== 1) {
        return res.status(400).send({ message: "Style not found" });
      }
    } else {
      const isExisting = await Style.countDocuments({
        styleName: req.body.name,
      });

      if (isExisting) {
        return res
          .status(400)
          .send({ message: "Style with this name already exist." });
      }
    }

    const obj = {
      styleName: req.body.name,
      discipline: req.body.discipline,
      isDeleted: req.body.isDeleted,
    };

    let condition = {
      $set: obj,
    };

    if (id === undefined) {
      await Style.create(obj);
      res.status(200).send({ message: "Style added successfully" });
    } else {
      Style.updateOne({ _id: id }, condition).then();
      res.status(200).send({ message: "Style updated successfully" });
    }
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getStyleById = async (req, res) => {
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

    const style = await Style.findOne({
      _id: req.params.id,
      // isDeleted: false,
    })
      .populate("discipline", { disciplineName: 1 })
      .lean(true);

    res.status(200).send({ data: style });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const addTechnic = async (req, res) => {
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

    const { id } = req.query;

    if (id !== undefined) {
      const isExisting = await Technic.countDocuments({
        _id: id,
      });

      if (isExisting !== 1) {
        return res.status(400).send({ message: "Technic not found" });
      }
    } else {
      const isExisting = await Technic.countDocuments({
        technicName: req.body.name,
      });

      if (isExisting) {
        return res
          .status(400)
          .send({ message: "Technic with this name already exist." });
      }
    }

    const obj = {
      technicName: req.body.name,
      discipline: req.body.discipline,
      isDeleted: req.body.isDeleted,
    };

    let condition = {
      $set: obj,
    };

    if (id === undefined) {
      await Technic.create(obj);
      res.status(200).send({ message: "Technic added successfully" });
    } else {
      Technic.updateOne({ _id: id }, condition).then();
      res.status(200).send({ message: "Technic updated successfully" });
    }
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getTechnicById = async (req, res) => {
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

    const technic = await Technic.findOne({
      _id: req.params.id,
      // isDeleted: false,
    })
      .populate("discipline", { disciplineName: 1 })
      .lean(true);

    res.status(200).send({ data: technic });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const addTheme = async (req, res) => {
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

    const { id } = req.query;

    if (id !== undefined) {
      const isExisting = await Theme.countDocuments({
        _id: id,
      });

      if (isExisting !== 1) {
        return res.status(400).send({ message: "Theme not found" });
      }
    } else {
      const isExisting = await Theme.countDocuments({
        themeName: req.body.name,
      });

      if (isExisting) {
        return res
          .status(400)
          .send({ message: "Theme with this name already exist." });
      }
    }

    const obj = {
      themeName: req.body.name,
      discipline: req.body.discipline,
      isDeleted: req.body.isDeleted,
    };

    let condition = {
      $set: obj,
    };

    if (id === undefined) {
      await Theme.create(obj);
      res.status(200).send({ message: "Theme added successfully" });
    } else {
      Theme.updateOne({ _id: id }, condition).then();
      res.status(200).send({ message: "Theme updated successfully" });
    }
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getThemeById = async (req, res) => {
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

    const theme = await Theme.findOne({
      _id: req.params.id,
      // isDeleted: false,
    })
      .populate("discipline", { disciplineName: 1 })
      .lean(true);

    res.status(200).send({ data: theme });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const addMediaSupport = async (req, res) => {
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

    const { id } = req.query;

    if (id !== undefined) {
      const isExisting = await MediaSupport.countDocuments({
        _id: id,
      });

      if (isExisting && isExisting !== 1) {
        return res.status(400).send({ message: "Media not found" });
      }
    } else {
      const isExisting = await MediaSupport.countDocuments({
        mediaName: req.body.name,
      });

      if (isExisting) {
        return res
          .status(400)
          .send({ message: "Media with this name already exist." });
      }
    }

    const obj = {
      mediaName: req.body.name,
      discipline: req.body.discipline,
      isDeleted: req.body.isDeleted,
    };

    let condition = {
      $set: obj,
    };

    if (id === undefined) {
      await MediaSupport.create(obj);
      res.status(200).send({ message: "Media added successfully" });
    } else {
      MediaSupport.updateOne({ _id: id }, condition).then();
      res.status(200).send({ message: "Media updated successfully" });
    }
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getMediaById = async (req, res) => {
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

    const media = await MediaSupport.findOne({
      _id: req.params.id,
      // isDeleted: false,
    })
      .populate("discipline", { disciplineName: 1 })
      .lean(true);

    res.status(200).send({ data: media });
  } catch (error) {
    APIErrorLog.error(error);
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

    const { id } = req.query;
    const fileData = await fileUploadFunc(req, res);

    if (id !== undefined) {
      const isExisting = await Insignia.countDocuments({
        _id: id,
      });

      if (isExisting && isExisting !== 1) {
        return res.status(400).send({ message: "Insignia not found" });
      }
    } else {
      const isExisting = await Insignia.countDocuments({
        credentialName: req.body.credentialName,
      });

      if (isExisting) {
        return res
          .status(400)
          .send({ message: "Discipline with this name already exist." });
      }
    }

    let obj = {
      credentialName: req.body.credentialName.trim(),
      credentialGroup: req.body.credentialGroup.trim(),
      credentialPriority: req.body.credentialPriority.trim(),
      isActive: JSON.parse(req.body.isActive) ? true : false,
      isDeleted: JSON.parse(req.body.isActive) ? false : true,
    };

    if (fileData.data !== undefined) {
      obj["insigniaImage"] = fileData.data.insigniaImage[0]?.filename;
    }

    let condition = {
      $set: obj,
    };

    if (id === undefined) {
      await Insignia.create(obj);
      res.status(200).send({ message: "Insignia created successfully" });
    } else {
      Insignia.updateOne({ _id: id }, condition).then();
      res.status(200).send({ message: "Insignia updated successfully" });
    }
  } catch (error) {
    APIErrorLog.error(error);
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
      return res.status(200).send({
        data: data,
        url: "https://dev.freshartclub.com/images",
      });
    }
    return res.status(400).send({ message: "Artist not found" });
  } catch (error) {
    APIErrorLog.error(error);
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

    let { s } = req.query;

    if (s == "undefined") {
      s = "";
    } else if (typeof s === "undefined") {
      s = "";
    }

    const data = await Insignia.aggregate([
      {
        $match: {
          $or: [
            { credentialName: { $regex: s, $options: "i" } },
            { credentialGroup: { $regex: s, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          credentialName: 1,
          credentialGroup: 1,
          credentialPriority: 1,
          isActive: 1,
          isDeleted: 1,
          insigniaImage: 1,
          _id: 1,
          createdAt: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    if (data.length) {
      for (let elem of data) {
        elem["createdAt"] = moment(elem.createdAt).format("DD MMM YYYY");
      }
    }

    return res.status(200).send({
      data: data,
      message: "Insignia List received successfully",
      url: "https://dev.freshartclub.com/images",
    });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getInsigniaById = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);

    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const data = await Insignia.findOne({
      _id: req.params.id,
      // isDeleted: false,
    }).lean(true);

    if (data.length) {
      for (let elem of data) {
        elem["createdAt"] = moment(elem.createdAt).format("DD MMM YYYY");
      }
    }

    return res.status(200).send({
      data: data,
      message: "Insignia received successfully",
      url: "https://dev.freshartclub.com/images",
    });
  } catch (error) {
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const deleteInsignia = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);

    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.params;
    const found = await Insignia.findOne(
      {
        _id: id,
        // isDeleted: false,
      },
      { isDeleted: 1 }
    ).lean(true);

    if (!found) {
      return res.status(400).send({ message: "Insignia not found" });
    }

    if (found.isDeleted) {
      return res.status(400).send({ message: "Insignia already deleted" });
    }

    Insignia.updateOne(
      { _id: id },
      { $set: { isDeleted: true, isActive: false } }
    ).then();
    return res.status(200).send({ message: "Insignia deleted successfully" });
  } catch (error) {
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

    const artist = await Artist.findOne(
      {
        _id: req.params.id,
        isDeleted: false,
      },
      {
        isActivated: 1,
        email: 1,
        userId: 1,
        artistName: 1,
        phone: 1,
      }
    ).lean(true);

    if (!artist) return res.status(400).send({ message: "Artist not found" });
    if (artist.isActivated) {
      return res.status(400).send({ message: "Artist already activated" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    if (artist.password !== undefined) {
      let obj = {
        isActivated: true,
        isArtistRequestStatus: "approved",
      };

      if (artist.userId == undefined) {
        obj["userId"] = "UID-" + generateRandomId(true);
      }

      let condition = { $set: obj };

      await Artist.updateOne({ _id: req.params.id }, condition);
    } else {
      await Artist.updateOne(
        { _id: req.params.id },
        {
          $set: {
            isArtistRequestStatus: "approved",
            isActivated: true,
            passwordLinkToken: token,
          },
        }
      );
    }

    const url = "https://test.freshartclub.com";
    const link = `${url}/reset-password?id=${artist._id}&token=${token}`;

    const findEmail = await EmailType.findOne({
      emailType: "become-an-artist",
      isDeleted: false,
    }).lean(true);

    const mailVariable = {
      "%head%": findEmail.emailHead,
      "%msg%": findEmail.emailDesc,
      "%email%": artist.email,
      "%name%": artist.artistName,
      "%link%": link,
    };

    await sendMail("sample-email", mailVariable, artist.email);

    return res.status(200).send({ message: "Artist activated successfully" });
  } catch (error) {
    APIErrorLog.error(error);
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

    let { s, date, status } = req.query;

    if (status === "All") status = "";

    let weeksAgo;
    if (date === "All") {
      date = "";
    } else {
      weeksAgo = new Date();
      weeksAgo.setDate(weeksAgo.getDate() - Number(date * 7));
    }

    const artists = await Artist.aggregate([
      {
        $match: {
          isDeleted: false,
          role: "artist",
          ...(weeksAgo ? { nextRevalidationDate: { $lte: weeksAgo } } : {}),
          ...(status ? { profileStatus: status } : {}),
          $or: [
            { artistId: { $regex: s, $options: "i" } },
            { artistName: { $regex: s, $options: "i" } },
            { email: { $regex: s, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          artistName: 1,
          artistSurname1: 1,
          nickName: 1,
          artistSurname2: 1,
          avatar: 1,
          email: 1,
          phone: 1,
          createdAt: 1,
          isActivated: 1,
          profileStatus: 1,
          userId: 1,
          profile: 1,
          artistId: 1,
          nextRevalidationDate: 1,
          lastRevalidationDate: 1,
          city: "$address.city",
          country: "$address.country",
          state: "$address.state",
          status: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return res
      .status(200)
      .send({ data: artists, url: "https://dev.freshartclub.com/images" });
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

    let { s } = req.query;
    let filter = {};

    if (s) {
      filter = {
        $or: [
          { artistId: { $regex: s, $options: "i" } },
          { artistName: { $regex: s, $options: "i" } },
          { email: { $regex: s, $options: "i" } },
        ],
      };
    }

    const getArtists = await Artist.find(
      {
        isActivated: true,
        isDeleted: false,
        ...filter,
      },
      {
        artistName: 1,
        avatar: 1,
        artistSurname1: 1,
        nickName: 1,
        artistSurname2: 1,
        email: 1,
        phone: 1,
        profile: 1,
        createdAt: 1,
        isActivated: 1,
        userId: 1,
        artistId: 1,
        status: 1,
      }
    )
      .sort({ createdAt: -1 })
      .lean(true);

    res
      .status(200)
      .send({ data: getArtists, url: "https://dev.freshartclub.com/images" });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
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

    let { s, status } = req.query;

    if (status === "All") {
      status = "";
    } else {
      status = status.toLowerCase();
    }

    const searchStatus = ["pending", "ban", "rejected"];

    const statusFilter =
      status && searchStatus.includes(status)
        ? { isArtistRequestStatus: { $regex: status, $options: "i" } }
        : { isArtistRequestStatus: { $in: searchStatus } };

    const artists = await Artist.aggregate([
      {
        $match: {
          isDeleted: false,
          ...statusFilter,
          $or: [
            { artistName: { $regex: s, $options: "i" } },
            { artistSurname1: { $regex: s, $options: "i" } },
            { artistSurname2: { $regex: s, $options: "i" } },
            { email: { $regex: s, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          artistName: 1,
          artistSurname1: 1,
          isArtistRequestStatus: 1,
          profileStatus: 1,
          nickName: 1,
          artistSurname2: 1,
          discipline: "$aboutArtist.discipline",
          avatar: 1,
          email: 1,
          phone: 1,
          createdAt: 1,
          links: 1,
          profile: 1,
          isActivated: 1,
          documents: 1,
          userId: 1,
          artistId: 1,
          city: "$address.city",
          country: "$address.country",
          zipCode: "$address.zipCode",
          state: "$address.state",
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    res
      .status(200)
      .send({ data: artists, url: "https://dev.freshartclub.com/images" });
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

    let { s } = req.query;

    const artistlist = await Artist.aggregate([
      {
        $match: {
          isDeleted: false,
          isActivated: false,
          pageCount: { $gt: 0 },
          $or: [
            { artistId: { $regex: s, $options: "i" } },
            { artistName: { $regex: s, $options: "i" } },
            { email: { $regex: s, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          artistName: 1,
          artistSurname1: 1,
          nickName: 1,
          artistSurname2: 1,
          email: 1,
          phone: 1,
          profile: 1,
          createdAt: 1,
          isActivated: 1,
          userId: 1,
          artistId: 1,
          city: "$address.city",
          country: "$address.country",
          state: "$address.state",
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    res
      .status(200)
      .send({ data: artistlist, url: "https://dev.freshartclub.com/images" });
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
    const { id } = req?.params;
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    let checkUser = null;
    if (id !== "null") {
      checkUser = await Artist.findOne(
        { _id: id },
        { profile: 1, isArtistRequestStatus: 1, pageCount: 1 }
      ).lean(true);

      if (checkUser.pageCount > 0)
        return res
          .status(400)
          .send({ message: `Artist Account already created` });
    }

    const fileData = await fileUploadFunc(req, res);
    const isfileData = fileData.data ? true : false;

    const isArtist = req.body?.isArtist === "true" ? true : false;

    let obj = {
      artistName: req.body.name
        .toLowerCase()
        .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
        .trim(),
      artistSurname1: req.body.artistSurname1
        .toLowerCase()
        .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
        .trim(),
      artistSurname2: req.body.artistSurname2
        .toLowerCase()
        .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
        .trim(),
      phone: req.body.phoneNumber.replace(/[- )(]/g, "").trim(),
      email: req.body.email.toLowerCase(),
    };

    obj["profile"] = {
      mainImage: isfileData
        ? fileData.data.avatar[0].filename
        : checkUser?.profile?.mainImage
        ? checkUser?.profile?.mainImage
        : null,
    };

    obj["address"] = {
      residentialAddress: req.body.address,
      city: req.body.city,
      state: req.body.state,
      country: req.body.country,
      zipCode: String(req.body.zipCode),
    };

    const findEmail = await EmailType.findOne({
      emailType: "admin-create-user",
    }).lean(true);

    const mailVaribles = {
      "%head%": findEmail.emailHead,
      "%email%": obj.email,
      "%msg%": findEmail.emailDesc,
      "%name%": obj.artistName,
      "%phone%": obj.phone,
    };

    let nUser = true;
    if (req.body.value === "new") {
      if (id === "null") {
        const isExitingUser = await Artist.countDocuments({
          email: req.body.email.toLowerCase(),
        });

        if (isExitingUser) {
          return res
            .status(400)
            .send({ message: "User with this email already exists" });
        }

        obj["userId"] = "UID-" + generateRandomId(nUser);
        obj["pageCount"] = isArtist ? 1 : 0;
        obj["role"] = isArtist ? "artist" : "user";
        isArtist && (obj["artistId"] = "AID-" + generateRandomId());

        const user = await Artist.create(obj);
        sendMail("sample-email", mailVaribles, user.email);

        return res
          .status(200)
          .send({ message: "User created successfully", id: user._id });
      } else {
        obj["userId"] = "UID-" + generateRandomId(nUser);
        obj["pageCount"] = 1;
        obj["role"] = "artist";
        obj["isArtistRequestStatus"] = "processing";
        obj["artistId"] = "AID-" + generateRandomId();

        let condition = { $set: obj };
        Artist.updateOne({ _id: id, isDeleted: false }, condition).then();

        return res
          .status(200)
          .send({ message: "User created successfully", id: id });
      }
    } else {
      obj["pageCount"] = 1;
      obj["role"] = "artist";
      obj["isArtistRequestStatus"] = "processing";
      obj["artistId"] = "AID-" + generateRandomId();

      let condition = { $set: obj };
      Artist.updateOne(
        { _id: id === "null" ? req.body._id : id, isDeleted: false },
        condition
      ).then();

      return res.status(200).send({
        message: "User created successfully",
        id: id === "null" ? req.body._id : id,
      });
    }
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const suspendedArtistList = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    let { s } = req.query;

    const suspendedList = await Artist.aggregate([
      {
        $match: {
          isDeleted: true,
          $or: [
            { artistId: { $regex: s, $options: "i" } },
            { artistName: { $regex: s, $options: "i" } },
            { email: { $regex: s, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          artistName: 1,
          artistSurname1: 1,
          nickName: 1,
          artistSurname2: 1,
          avatar: 1,
          email: 1,
          phone: 1,
          createdAt: 1,
          isActivated: 1,
          userId: 1,
          artistId: 1,
          city: "$address.city",
          country: "$address.country",
          state: "$address.state",
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return res.status(200).send({
      data: suspendedList,
      url: "https://dev.freshartclub.com/images",
    });
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
    let query = {};

    if (userId) {
      query = {
        $or: [
          { userId: { $regex: userId, $options: "i" } },
          { artistName: { $regex: userId, $options: "i" } },
          { artistSurname1: { $regex: userId, $options: "i" } },
          { email: { $regex: userId, $options: "i" } },
        ],
      };
    }

    const users = await Artist.find(
      {
        isDeleted: false,
        role: "user",
        ...query,
      },
      {
        userId: 1,
        email: 1,
        artistName: 1,
        artistSurname1: 1,
        artistSurname2: 1,
        phone: 1,
        address: 1,
        artistId: 1,
        profile: 1,
        url: "https://dev.freshartclub.com/images",
      }
    ).lean(true);

    return res.status(200).send({ data: users });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const serachUserByQueryInput = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    let { s } = req.query;

    const artists = await Artist.aggregate([
      {
        $match: {
          isDeleted: false,
          $or: [
            { userId: { $regex: s, $options: "i" } },
            { artistName: { $regex: s, $options: "i" } },
            { email: { $regex: s, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          artistName: 1,
          artistSurname1: 1,
          artistSurname2: 1,
          userId: 1,
          mainImage: "$profile.mainImage",
          email: 1,
        },
      },
    ]);

    return res
      .status(200)
      .send({ data: artists, url: "https://dev.freshartclub.com/images" });
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

    let { s } = req.query;

    const users = await Artist.aggregate([
      {
        $match: {
          isDeleted: false,
          userId: { $exists: true },
          $or: [
            { userId: { $regex: s, $options: "i" } },
            { artistName: { $regex: s, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          artistName: 1,
          artistSurname1: 1,
          artistSurname2: 1,
          role: 1,
          email: 1,
          phone: 1,
          createdAt: 1,
          userId: 1,
          profile: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return res
      .status(200)
      .send({ data: users, url: "https://dev.freshartclub.com/images" });
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

    const artist = await Artist.findOne(
      { _id: req.params.id },
      { isDeleted: 1, email: 1, artistName: 1 }
    ).lean(true);
    if (!artist) return res.status(400).send({ message: `artist not found` });
    if (artist.isDeleted)
      return res.status(400).send({ message: `Artist already suspended` });

    Artist.updateOne(
      { _id: req.params.id },
      { $set: { isDeleted: true } }
    ).then();

    const findEmail = await EmailType.findOne({
      emailType: "artist-suspended-mail",
    }).lean(true);

    const mailVaribles = {
      "%head%": findEmail.emailHead,
      "%email%": artist.email,
      "%msg%": findEmail.emailDesc,
      "%name%": artist.artistName,
    };

    sendMail("sample-email", mailVaribles, artist.email);

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

    const artist = await Artist.findOne(
      { _id: req.params.id },
      { isDeleted: 1, email: 1, artistName: 1 }
    ).lean(true);
    if (!artist) return res.status(400).send({ message: `artist not found` });
    if (!artist.isDeleted)
      return res.status(400).send({ message: `artist already unsuspended` });

    Artist.updateOne(
      { _id: req.params.id },
      { $set: { isDeleted: false } }
    ).then();

    const findEmail = await EmailType.findOne({
      emailType: "artist-unsuspended-mail",
    }).lean(true);

    const mailVaribles = {
      "%head%": findEmail.emailHead,
      "%email%": artist.email,
      "%msg%": findEmail.emailDesc,
      "%name%": artist.artistName,
    };

    sendMail("sample-email", mailVaribles, artist.email);

    return res.status(200).send({ message: "Artist unsuspended successfully" });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const rejectArtistRequest = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const user = await Artist.findOne(
      { _id: req.params.id },
      { isArtistRequestStatus: 1 }
    ).lean(true);
    if (!user) return res.status(400).send({ message: `User not found` });

    if (user.isArtistRequestStatus === "rejected") {
      return res
        .status(400)
        .send({ message: `Artsit request already rejected` });
    }

    Artist.updateOne(
      { _id: req.params.id },
      { $set: { isArtistRequestStatus: "rejected" } }
    ).then();

    return res
      .status(200)
      .send({ message: "Artist request rejected successfully" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const unRejectArtistRequest = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const user = await Artist.findOne(
      { _id: req.params.id },
      { isArtistRequestStatus: 1 }
    ).lean(true);
    if (!user) return res.status(400).send({ message: `User not found` });

    if (user.isArtistRequestStatus === "pending") {
      return res
        .status(400)
        .send({ message: `Artist request already in pending` });
    }

    Artist.updateOne(
      { _id: req.params.id },
      { $set: { isArtistRequestStatus: "pending" } }
    ).then();

    return res
      .status(200)
      .send({ message: "Artist request un-rejected successfully" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const banArtistRequest = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const user = await Artist.findOne(
      { _id: req.params.id },
      { isArtistRequestStatus: 1 }
    ).lean(true);
    if (!user) return res.status(400).send({ message: `User not found` });

    if (user.isArtistRequestStatus === "ban") {
      return res.status(400).send({ message: `Artsit requset already banned` });
    }

    Artist.updateOne(
      { _id: req.params.id },
      { $set: { isArtistRequestStatus: "ban" } }
    ).then();

    return res
      .status(200)
      .send({ message: "Artist request banned successfully" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const unBanArtistRequest = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const user = await Artist.findOne(
      { _id: req.params.id },
      { isArtistRequestStatus: 1 }
    ).lean(true);
    if (!user) return res.status(400).send({ message: `User not found` });

    if (user.isArtistRequestStatus === "pending") {
      return res
        .status(400)
        .send({ message: `Artsit requset already in pending` });
    }

    Artist.updateOne(
      { _id: req.params.id },
      { $set: { isArtistRequestStatus: "pending" } }
    ).then();

    return res
      .status(200)
      .send({ message: "Artist request un-banned successfully" });
  } catch (error) {
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
    const { newPassword, confirmPassword } = req.body;

    const user = await Artist.findOne(
      {
        _id: id,
        isDeleted: false,
      },
      { email: 1, artistName: 1, gender: 1 }
    ).lean(true);
    if (!user) {
      return res.status(400).send({ message: "Artist not found" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).send({
        message:
          "Password must contain one Uppercase, Lowercase, Numeric and Special Character",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).send({ message: "Password does not match" });
    }

    const findEmail = await EmailType.findOne({
      emailType: "admin-changed-passsword",
    }).lean(true);

    const mailVaribles = {
      "%head%": findEmail.emailHead,
      "%email%": user.email,
      "%msg%": findEmail.emailDesc,
      "%password%": newPassword,
      "%name%": user.artistName,
    };

    await Promise.all([
      Artist.updateOne(
        { _id: id, isDeleted: false },
        { $set: { password: md5(newPassword) } }
      ),
      sendMail("sample-email", mailVaribles, user.email),
    ]);

    return res.status(200).send({ message: "Password changed successfully" });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the artist");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const addTicket = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const fileData = await fileUploadFunc(req, res);

    const {
      id,
      ticketType,
      status,
      impact,
      urgency,
      priority,
      subject,
      message,
    } = req.body;

    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    const year = new Date().getFullYear();
    const ticketId = `TI# ${year}-CS${randomNumber}`;

    await Ticket.create({
      user: id,
      ticketId,
      ticketType,
      status,
      urgency,
      impact,
      priority,
      subject,
      ticketImg: fileData.data?.ticketImg[0].filename,
      message,
    });

    return res.status(200).send({ message: "Ticket added successfully" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const ticketList = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    let { search, status, days, filterType, filterOption } = req.query;
    if (status === "All") {
      status = "";
    }

    if (filterType === "All") {
      filterType = "";
    } else {
      filterType = filterType.toLowerCase().split(" ")[1];
    }

    if (days === "All") {
      days = "";
    }

    let filter = {};
    if (days) {
      const dateLimit = new Date();

      if (days === "1 Day") {
        dateLimit.setDate(dateLimit.getDate() - 1);
        filter["createdAt"] = { $gte: dateLimit };
      } else if (days === "1 Week") {
        dateLimit.setDate(dateLimit.getDate() - 7);
        filter["createdAt"] = { $gte: dateLimit };
      } else if (days === "1 Month") {
        dateLimit.setMonth(dateLimit.getMonth() - 1);
        filter["createdAt"] = { $gte: dateLimit };
      } else if (days === "1 Quarter") {
        dateLimit.setMonth(dateLimit.getMonth() - 3);
        filter["createdAt"] = { $gte: dateLimit };
      } else if (days === "1 Year") {
        dateLimit.setFullYear(dateLimit.getFullYear() - 1);
        filter["createdAt"] = { $gte: dateLimit };
      }
    }

    const pipeline = [
      {
        $match: {
          ...(filterType && filterOption ? { [filterType]: filterOption } : {}),
          ...(search ? { ticketId: { $regex: search, $options: "i" } } : {}),
          ...(status ? { status: { $regex: status, $options: "i" } } : {}),
          ...(filter.createdAt ? { createdAt: filter.createdAt } : {}),
        },
      },

      {
        $lookup: {
          from: "artists",
          localField: "user",
          foreignField: "_id",
          as: "artistInfo",
        },
      },
      {
        $unwind: {
          path: "$artistInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          ticketId: 1,
          createdAt: 1,
          artistName: "$artistInfo.artistName",
          artistSurname1: "$artistInfo.artistSurname1",
          artistSurname2: "$artistInfo.artistSurname2",
          email: "$artistInfo.email",
          mainImage: "$artistInfo.profile.mainImage",
          ticketType: 1,
          status: 1,
          subject: 1,
          message: 1,
          region: 1,
          ticketImg: 1,
          ticketFeedback: 1,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ];

    const getData = await Ticket.aggregate(pipeline);

    return res.status(200).send({
      data: getData,
      url: "https://dev.freshartclub.com/images",
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const ticketDetail = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.params;
    const ticketData = await Ticket.findById(id)
      .populate("user", "email artistName artistSurname1 artistSurname2")
      .lean(true);

    return res.status(201).send({
      data: ticketData,
      url: "https://dev.freshartclub.com/images",
    });
  } catch (error) {
    return res.status(500).send({ message: "Server error" });
  }
};

const replyTicket = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.params;
    if (!id) return res.status(400).send({ message: `Ticket id not found` });

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
      userType,
      ticket: id,
      ticketType,
      ticketImg: fileData?.data?.ticketImg
        ? fileData.data.ticketImg[0].filename
        : null,
      status,
      message,
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

const getTicketReplies = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.params;

    const replies = await TicketReply.aggregate([
      {
        $match: { ticket: objectId(id) },
      },
      {
        $lookup: {
          from: "artists",
          localField: "user",
          foreignField: "_id",
          as: "ownerInfo",
        },
      },
      {
        $unwind: {
          path: "$ownerInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          ticket: 1,
          createdAt: 1,
          artistName: {
            $cond: [
              { $eq: ["$userType", "user"] },
              "$ownerInfo.artistName",
              null,
            ],
          },
          email: {
            $cond: [{ $eq: ["$userType", "user"] }, "$ownerInfo.email", null],
          },
          avatar: {
            $cond: [{ $eq: ["$userType", "user"] }, "$ownerInfo.avatar", null],
          },
          ticketType: 1,
          ticketImg: 1,
          userType: 1,
          status: 1,
          message: 1,
        },
      },
    ]);

    return res.status(201).send({
      message: "Ticket replies retrieved successfully",
      data: replies,
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const addFAQ = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.query;

    let obj = {
      faqGrp: req.body.faqGrp,
      faqQues: req.body.faqQues,
      faqAns: req.body.faqAns,
      tags: req.body.tags,
    };

    const condition = {
      $set: obj,
    };

    if (id === undefined) {
      await FAQ.create(obj);
      return res.status(201).send({ message: "FAQ added successfully" });
    } else {
      FAQ.updateOne({ _id: id }, condition).then();
      return res.status(201).send({ message: "FAQ updated successfully" });
    }
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getFAQList = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);

    if (!admin) {
      return res.status(400).send({ message: `Admin not found` });
    }

    let { s, grp } = req.query;
    if (grp === "All") {
      grp = "";
    }

    const faqList = await FAQ.aggregate([
      {
        $match: {
          isDeleted: false,
          faqGrp: { $regex: grp, $options: "i" },
          $or: [
            { faqQues: { $regex: s, $options: "i" } },
            {
              tags: { $regex: s, $options: "i" },
            },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          faqGrp: 1,
          faqQues: 1,
          faqAns: 1,
          tags: 1,
          createdAt: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    res.status(201).send({
      message: "FAQ list retrieved successfully",
      data: faqList,
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getFAQById = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.params;
    const faq = await FAQ.findOne({ _id: id }).lean(true);

    if (!faq) {
      return res.status(400).send({ message: "FAQ not found" });
    }

    return res.status(201).send({
      message: "FAQ retrieved successfully",
      data: faq,
      // url: "https://dev.freshartclub.com/images",
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const addKB = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.query;

    let obj = {
      kbGrp: req.body.kbGrp,
      kbTitle: req.body.kbTitle,
      kbDesc: req.body.kbDesc,
      tags: req.body.tags,
    };

    const condition = {
      $set: obj,
    };

    if (id === undefined) {
      await KB.create(obj);
      return res.status(201).send({ message: "KB added successfully" });
    } else {
      KB.updateOne({ _id: id }, condition).then();
      return res.status(201).send({ message: "KB updated successfully" });
    }
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getKBList = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);

    if (!admin) {
      return res.status(400).send({ message: `Admin not found` });
    }

    let { s, grp } = req.query;
    if (grp === "All") {
      grp = "";
    }

    const kbList = await KB.aggregate([
      {
        $match: {
          isDeleted: false,
          kbGrp: { $regex: grp, $options: "i" },
          $or: [
            { kbTitle: { $regex: s, $options: "i" } },
            {
              tags: { $regex: s, $options: "i" },
            },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          kbGrp: 1,
          kbTitle: 1,
          kbDesc: 1,
          tags: 1,
          createdAt: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    res.status(201).send({
      message: "KB list retrieved successfully",
      data: kbList,
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getKBById = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.params;
    const kb = await KB.findOne({ _id: id }).lean(true);

    if (!kb) {
      return res.status(400).send({ message: "KB not found" });
    }

    return res.status(201).send({
      message: "KB retrieved successfully",
      data: kb,
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getReviewDetailArtist = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.params;

    const artist = await Artist.findOne({
      _id: id,
      profileStatus: "under-review",
      isDeleted: false,
    }).lean(true);

    if (!artist) {
      return res.status(400).send({ message: "Artist not found" });
    }

    const sendData = {
      artistId: artist.artistId,
      artistName: artist.artistName,
      artistSurname1: artist.artistSurname1,
      artistSurname2: artist.artistSurname2,
      nickName: artist.nickName,
      email: artist.email,
      gender: artist.gender,
      language: artist.language,
      phone: artist.phone,
      // dob: artist.dob,
      address: artist.address,
      aboutArtist: artist.aboutArtist,
      highlights: artist.highlights,
      profile: artist.profile,
      address: artist.address,
      links: artist.links,
      managerDetails: artist.managerDetails,
      isManagerDetails: artist.isManagerDetails,
      reviewDetails: artist.reviewDetails,
    };

    return res
      .status(200)
      .send({ data: sendData, url: "https://dev.freshartclub.com/images" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const approveArtistChanges = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.params;
    const artist = await Artist.findOne(
      {
        _id: id,
        profileStatus: "under-review",
        isDeleted: false,
      },
      { email: 1, artistName: 1 }
    ).lean(true);

    if (!artist) {
      return res.status(400).send({ message: "Artist not found" });
    }

    const data = req.body;
    if (!data.note)
      return res.status(400).send({ message: "Note is required" });

    let obj = {};

    if (data.isApproved == true) {
      obj = {
        artistName: data.artistName,
        artistSurname1: data.artistSurname1,
        artistSurname2: data.artistSurname2,
        nickName: data.nickName,
        email: data.email,
        gender: data.gender,
        language: data.language,
        phone: data.phone,
        aboutArtist: data?.aboutArtist,
        highlights: data?.highlights,
        profile: data?.profile,
        address: data?.address,
        links: data?.links,
        managerDetails: data?.managerDetails,
        isManagerDetails: data?.isManagerDetails,
        profileStatus: "active",
      };
    } else {
      obj = {
        profileStatus: "active",
      };
    }

    const findEmail = await EmailType.findOne({
      emailType: "admin-artist-profile-status-change",
    }).lean(true);

    const mailVaribles = {
      "%head%": findEmail.emailHead,
      "%email%": artist.email,
      "%msg%": findEmail.emailDesc,
      "%name%": artist.artistName,
      "%note%": data.note,
      "%status%": data.isApproved ? "Approved" : "Rejected",
    };

    await Promise.all([
      sendMail("sample-email", mailVaribles, artist.email),
      Artist.updateOne(
        { _id: id },
        {
          $set: obj,
          $unset: {
            reviewDetails: "",
          },
        }
      ),
    ]);

    return res.status(200).send({
      message: `Artist Profile Changes ${
        req.body.isApproved ? "Approved" : "Rejected"
      }`,
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getReviewDetailArtwork = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.params;

    let artwork = await ArtWork.aggregate([
      {
        $match: {
          _id: objectId(id),
          status: "modified",
          isDeleted: false,
        },
      },
      {
        $set: {
          catalogField: {
            $ifNull: [
              "$commercialization.purchaseCatalog",
              "$commercialization.subscriptionCatalog",
            ],
          },
        },
      },
      {
        $set: {
          catalogReviewField: {
            $ifNull: [
              "$reviewDetails.commercialization.purchaseCatalog",
              "$reviewDetails.commercialization.subscriptionCatalog",
            ],
          },
        },
      },
      {
        $lookup: {
          from: "artists",
          localField: "owner",
          foreignField: "_id",
          as: "ownerInfo",
        },
      },
      {
        $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "catalogs",
          localField: "catalogField",
          foreignField: "_id",
          as: "catalogInfo",
        },
      },
      {
        $lookup: {
          from: "catalogs",
          localField: "catalogReviewField",
          foreignField: "_id",
          as: "catalogReviewInfo",
        },
      },
      {
        $unwind: { path: "$catalogInfo", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: {
          path: "$catalogReviewInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          status: 1,
          artworkId: 1,
          isArtProvider: 1,
          provideArtistName: 1,
          owner: {
            _id: "$ownerInfo._id",
            artistName: "$ownerInfo.artistName",
            artistId: "$ownerInfo.artistId",
            artistSurname1: "$ownerInfo.artistSurname1",
            artistSurname2: "$ownerInfo.artistSurname2",
          },
          artworkName: 1,
          artworkCreationYear: 1,
          artworkSeries: 1,
          productDescription: 1,
          collectionList: 1,
          media: 1,
          additionalInfo: 1,
          commercialization: {
            $mergeObjects: [
              "$commercialization",
              {
                publishingCatalog: {
                  _id: "$catalogInfo._id",
                  catalogName: "$catalogInfo.catalogName",
                },
              },
            ],
          },
          pricing: 1,
          inventoryShipping: 1,
          discipline: 1,
          promotions: 1,
          restriction: 1,
          tags: 1,
          reviewDetails: 1,
          catalogReviewInfo: 1,
        },
      },
    ]);

    if (artwork.length == 0) {
      return res.status(400).send({ message: "Artwork not found" });
    }

    artwork = artwork[0];

    const sendData = {
      status: artwork.status,
      owner: artwork.owner,
      artworkId: artwork.artworkId,
      artworkName: artwork.artworkName,
      reviewDetails: artwork.reviewDetails,
      catalogReviewInfo: artwork.catalogReviewInfo.catalogName,
      commercialization: artwork.commercialization,
      isArtProvider: artwork.isArtProvider,
      provideArtistName: artwork.provideArtistName,
      artworkName: artwork.artworkName,
      artworkCreationYear: artwork.artworkCreationYear,
      artworkSeries: artwork.artworkSeries,
      productDescription: artwork.productDescription,
      collectionList: artwork.collectionList,
      media: artwork.media,
      additionalInfo: artwork.additionalInfo,
      pricing: artwork.pricing,
      inventoryShipping: artwork.inventoryShipping,
      discipline: artwork.discipline,
      promotions: artwork.promotions,
      tags: artwork.tags,
    };

    return res
      .status(200)
      .send({ data: sendData, url: "https://dev.freshartclub.com/images" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const approveArtworkChanges = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.params;
    const artwork = await ArtWork.findOne(
      {
        _id: id,
        status: "modified",
        isDeleted: false,
      },
      {
        owner: 1,
        artworkId: 1,
        artworkName: 1,
        reviewDetails: 1,
        commercialization: 1,
      }
    ).lean(true);

    if (!artwork) {
      return res.status(400).send({ message: "Artwork not found" });
    }

    const artist = await Artist.findOne(
      {
        _id: artwork.owner,
        isDeleted: false,
      },
      { email: 1, artistName: 1 }
    ).lean(true);

    if (!artist) {
      return res.status(400).send({ message: "Artist not found" });
    }

    const data = req.body;
    if (!data.note)
      return res.status(400).send({ message: "Note is required" });

    let obj = {};

    if (data.isApproved == true) {
      obj = {
        artworkName: data.artworkName,
        artworkCreationYear: data.artworkCreationYear,
        artworkSeries: data.artworkSeries,
        productDescription: data.productDescription,
        isArtProvider: data.isArtProvider,
        media: data.media,
        additionalInfo: data.additionalInfo,
        pricing: data.pricing,
        inventoryShipping: data.inventoryShipping,
        discipline: data.discipline,
        restriction: data.restriction,
        tags: data.tags,
        lastModified: data?.lastModified,
        status: "published",
      };

      if (data?.commercialization?.activeTab === "subscription") {
        obj["commercialization"] = {
          activeTab: data?.commercialization?.activeTab,
          purchaseOption: data?.commercialization?.purchaseOption,
          subscriptionCatalog: objectId(
            data?.commercialization?.subscriptionCatalog
          ),
        };
      } else {
        obj["commercialization"] = {
          activeTab: data?.commercialization?.activeTab,
          purchaseCatalog: objectId(data?.commercialization?.purchaseCatalog),
          purchaseType: data?.commercialization?.purchaseType,
        };
      }

      const newCatalogId =
        data.commercialization?.activeTab === "subscription"
          ? data.commercialization?.subscriptionCatalog
          : data.commercialization?.purchaseCatalog;

      const existingCatalogId =
        artwork.commercialization?.purchaseCatalog ||
        artwork.commercialization?.subscriptionCatalog;

      if (newCatalogId !== existingCatalogId) {
        Promise.all([
          Catalog.updateOne(
            { _id: existingCatalogId, artworkList: artwork._id },
            { $pull: { artworkList: artwork._id } }
          ),
          Catalog.updateOne(
            { _id: newCatalogId, artworkList: { $ne: artwork._id } },
            { $push: { artworkList: artwork._id } }
          ),
        ]);
      }
    } else {
      obj = {
        status: "published",
      };
    }

    const artName = artwork.artworkName + " (" + artwork.artworkId + ")";

    const findEmail = await EmailType.findOne({
      emailType: "admin-artwork-status-change",
    }).lean(true);

    const mailVaribles = {
      "%head%": findEmail.emailHead,
      "%email%": artist.email,
      "%msg%": findEmail.emailDesc,
      "%name%": artist.artistName,
      "%artwork%": artName,
      "%note%": data.note,
      "%status%": data.isApproved ? "Approved" : "Rejected",
    };

    await Promise.all([
      sendMail("sample-email", mailVaribles, artist.email),
      ArtWork.updateOne(
        { _id: artwork._id },
        {
          $set: obj,
          $unset: {
            reviewDetails: "",
          },
        }
      ),
    ]);

    return res.status(200).send({
      message: `Artwork Changes ${data.isApproved ? "Approved" : "Rejected"}`,
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const reValidateArtist = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.params;
    const artist = await Artist.findOne(
      {
        _id: id,
        isDeleted: false,
      },
      { email: 1, artistName: 1, nextRevalidationDate: 1 }
    ).lean(true);

    if (!artist) {
      return res.status(400).send({ message: "Artist not found" });
    }

    const findEmail = await EmailType.findOne({
      emailType: "profile-revalidated",
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

const deleteArtistSeries = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.params;
    const artist = await Artist.findOne(
      {
        _id: id,
        isDeleted: false,
      },
      { artistSeriesList: 1 }
    ).lean(true);

    let { name } = req.body;
    if (!name) {
      return res.status(400).send({ message: "Series name is required" });
    }
    name = name.trim();

    if (!artist.artistSeriesList.includes(name)) {
      return res
        .status(400)
        .send({ message: "Series not found in artist's series list" });
    }

    const existingArtwork = await ArtWork.findOne(
      { owner: artist._id, artworkSeries: name.trim() },
      { _id: 1 }
    ).lean(true);

    if (existingArtwork) {
      return res.status(400).send({ message: "Series used in other artworks" });
    }

    await Artist.updateOne({ _id: id }, { $pull: { artistSeriesList: name } });

    return res.status(200).send({ message: "Series deleted successfully" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const downloadArtworkDataCSV = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Artwork List");

    worksheet.columns = [
      { header: "Artwork Name", key: "artworkName", width: 25 },
      { header: "Artwork ID", key: "artworkId", width: 25 },
      { header: "Artist Name", key: "artistName", width: 25 },
      { header: "Discipline", key: "discipline", width: 25 },
      { header: "Commercialization", key: "commercialization", width: 25 },
      { header: "Created At", key: "createdAt", width: 25 },
      { header: "Status", key: "status", width: 25 },
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    let { s, status, days } = req.query;
    if (status == "All") {
      status = "";
    }

    if (s == "undefined") {
      s = "";
    } else if (typeof s === "undefined") {
      s = "";
    }

    if (days === "All") {
      days = "";
    }

    let filter = {};
    if (days) {
      const dateLimit = new Date();

      if (days === "1 Day") {
        dateLimit.setDate(dateLimit.getDate() - 1);
        filter["createdAt"] = { $gte: dateLimit };
      } else if (days === "1 Week") {
        dateLimit.setDate(dateLimit.getDate() - 7);
        filter["createdAt"] = { $gte: dateLimit };
      } else if (days === "1 Month") {
        dateLimit.setMonth(dateLimit.getMonth() - 1);
        filter["createdAt"] = { $gte: dateLimit };
      } else if (days === "1 Quarter") {
        dateLimit.setMonth(dateLimit.getMonth() - 3);
        filter["createdAt"] = { $gte: dateLimit };
      } else if (days === "1 Year") {
        dateLimit.setFullYear(dateLimit.getFullYear() - 1);
        filter["createdAt"] = { $gte: dateLimit };
      }
    }

    const artworkList = await ArtWork.aggregate([
      {
        $match: {
          isDeleted: false,
          status: { $regex: status, $options: "i" },
          ...(filter.createdAt ? { createdAt: filter.createdAt } : {}),
        },
      },
      {
        $lookup: {
          from: "artists",
          localField: "owner",
          foreignField: "_id",
          as: "ownerInfo",
        },
      },
      {
        $unwind: {
          path: "$ownerInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          $or: [
            { artworkName: { $regex: s, $options: "i" } },
            { artworkId: { $regex: s, $options: "i" } },
            { "ownerInfo.artistName": { $regex: s, $options: "i" } },
            { "ownerInfo.artistId": { $regex: s, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          artworkId: 1,
          artworkName: 1,
          artistName: "$ownerInfo.artistName",
          artistSurname1: "$ownerInfo.artistSurname1",
          artistSurname2: "$ownerInfo.artistSurname2",
          discipline: "$discipline.artworkDiscipline",
          commercialization: "$commercialization.activeTab",
          createdAt: 1,
          status: 1,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);
    artworkList.forEach((item) => {
      const fullArtistName = [
        item.artistName,
        item.artistSurname1 || "",
        item.artistSurname2 || "",
      ]
        .filter(Boolean)
        .join(" ");

      worksheet.addRow({
        artworkName: item.artworkName || "N/A",
        artworkId: item.artworkId || "N/A",
        artistName: fullArtistName || "Unknown Artist",
        discipline: item.discipline || "N/A",
        commercialization: item.commercialization || "N/A",
        createdAt: item.createdAt
          ? new Date(item.createdAt).toLocaleDateString()
          : "N/A",
        status: item.status || "N/A",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Artwork_List.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const downloadArtistDataCSV = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("All Artist List");

    worksheet.columns = [
      { header: "Artist Name", key: "artistName", width: 30 },
      { header: "Email", key: "email", width: 30 },
      { header: "Artist ID", key: "artistId", width: 18 },
      { header: "User ID", key: "userId", width: 18 },
      { header: "Phone No.", key: "phone", width: 15 },
      { header: "City", key: "city", width: 15 },
      { header: "Province", key: "province", width: 15 },
      { header: "Country", key: "country", width: 15 },
      { header: "Suspended", key: "suspended", width: 15 },
      { header: "Created At", key: "createdAt", width: 25 },
      { header: "Status", key: "status", width: 25 },
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    let { s, date, status } = req.query;

    if (status === "All") status = "";

    let weeksAgo;
    if (date === "All") {
      date = "";
    } else {
      weeksAgo = new Date();
      weeksAgo.setDate(weeksAgo.getDate() - Number(date * 7));
    }

    const artists = await Artist.aggregate([
      {
        $match: {
          role: "artist",
          ...(weeksAgo ? { nextRevalidationDate: { $lte: weeksAgo } } : {}),
          ...(status ? { profileStatus: status } : {}),
          $or: [
            { artistId: { $regex: s, $options: "i" } },
            { artistName: { $regex: s, $options: "i" } },
            { email: { $regex: s, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          artistName: 1,
          artistSurname1: 1,
          nickName: 1,
          artistSurname2: 1,
          email: 1,
          phone: 1,
          createdAt: 1,
          userId: 1,
          profile: 1,
          artistId: 1,
          isDeleted: 1,
          city: "$address.city",
          country: "$address.country",
          state: "$address.state",
          isActivated: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    artists.forEach((item) => {
      const fullArtistName = [
        item.artistName,
        item.nickName ? `"${item.nickName}"` : "",
        item.artistSurname1 || "",
        item.artistSurname2 || "",
      ]
        .filter(Boolean)
        .join(" ");

      worksheet.addRow({
        artistName: fullArtistName || "Unknown Artist",
        email: item.email || "N/A",
        artistId: item.artistId || "N/A",
        userId: item.userId || "N/A",
        phone: item.phone || "N/A",
        city: item.city || "N/A",
        province: item.state || "N/A",
        country: item.country || "N/A",
        suspended: item.isDeleted ? "Suspended" : "No",
        createdAt: item.createdAt
          ? new Date(item.createdAt).toLocaleDateString()
          : "N/A",
        status: item.isActivated ? "Active" : "Inactive",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="All_Artist_List.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const downloadDisciplineDataCSV = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Discipline List");

    worksheet.columns = [
      { header: "Discipline Name", key: "disciplineName", width: 20 },
      { header: "Description", key: "disciplineDescription", width: 30 },
      { header: "Created At", key: "createdAt", width: 25 },
      { header: "Status", key: "status", width: 25 },
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    let { s } = req.query;
    if (typeof s === "undefined") {
      s = "";
    }

    let disciplineList = await Discipline.aggregate([
      {
        $match: {
          disciplineName: { $regex: s, $options: "i" },
        },
      },
      {
        $project: {
          disciplineName: 1,
          createdAt: 1,
          isDeleted: 1,
          disciplineDescription: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    disciplineList.forEach((item) => {
      worksheet.addRow({
        disciplineName: item.disciplineName || "N/A",
        disciplineDescription: item.disciplineDescription || "N/A",
        createdAt: item.createdAt
          ? new Date(item.createdAt).toLocaleDateString()
          : "N/A",
        status: item.isDeleted ? "In-Active" : "Active",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Discipline_List.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const downloadCategoryDataCSV = async (req, res) => {
  try {
    const { fieldName, type } = req.query;
    let { s } = req.query;

    if (!fieldName || !type) {
      return res.status(400).send({ message: "Invalid request data" });
    }

    s = s === "undefined" || typeof s === "undefined" ? "" : s;

    const Model = mongoose.models[type];
    if (!Model) {
      return res.status(400).send({ message: "Invalid model type" });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${type} List`);

    worksheet.columns = [
      { header: `${type} Name`, key: `${fieldName}`, width: 20 },
      { header: "Discipline", key: "discipline", width: 50 },
      { header: "Created At", key: "createdAt", width: 25 },
      { header: "Status", key: "status", width: 25 },
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    const categoryList = await Model.aggregate([
      {
        $lookup: {
          from: "disciplines",
          localField: "discipline",
          foreignField: "_id",
          as: "discipline",
        },
      },
      {
        $match: {
          $or: [
            { [fieldName]: { $regex: s, $options: "i" } },
            { "discipline.disciplineName": { $regex: s, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          [fieldName]: 1,
          isDeleted: 1,
          createdAt: 1,
          discipline: {
            $map: {
              input: "$discipline",
              as: "disc",
              in: {
                disciplineName: "$$disc.disciplineName",
              },
            },
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    categoryList.forEach((item) => {
      worksheet.addRow({
        [fieldName]: item[fieldName] || "N/A",
        discipline:
          item.discipline.map((d) => d.disciplineName).join(", \n") || "N/A",
        createdAt: item.createdAt
          ? new Date(item.createdAt).toLocaleDateString()
          : "N/A",
        status: item.isDeleted ? "In-Active" : "Active",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Discipline_List.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const downloadPicklistDataCSV = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Picklist");

    worksheet.columns = [
      { header: "Picklist Name", key: "picklistName", width: 35 },
      { header: "Picklist Items", key: "picklist", width: 60 },
      { header: "Created At", key: "createdAt", width: 25 },
      { header: "Status", key: "status", width: 25 },
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    let { s } = req.query;
    s = s === "undefined" || typeof s === "undefined" ? "" : s;

    if (s === "All") s = "";

    let picklist = await PickList.aggregate([
      {
        $match: {
          picklistName: { $regex: s, $options: "i" },
        },
      },
      {
        $project: {
          picklistName: 1,
          createdAt: 1,
          isDeleted: 1,
          picklist: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    picklist.forEach((item) => {
      worksheet.addRow({
        picklistName: item.picklistName || "N/A",
        picklist: item.picklist.map((d) => d.name).join(", \n") || "N/A",
        createdAt: item.createdAt
          ? new Date(item.createdAt).toLocaleDateString()
          : "N/A",
        status: item.isDeleted ? "In-Active" : "Active",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Picklist_List.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const downloadInsigniaDataCSV = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Insignia List");

    worksheet.columns = [
      { header: "Insignia Name", key: "credentialName", width: 20 },
      { header: "Insignia Group", key: "credentialGroup", width: 20 },
      { header: "Insignia Priority", key: "credentialPriority", width: 20 },
      { header: "Created At", key: "createdAt", width: 20 },
      { header: "Status", key: "status", width: 20 },
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    let { s } = req.query;
    s = s === "undefined" || typeof s === "undefined" ? "" : s;

    const insigniaList = await Insignia.aggregate([
      {
        $match: {
          $or: [
            { credentialName: { $regex: s, $options: "i" } },
            { credentialGroup: { $regex: s, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          credentialName: 1,
          credentialGroup: 1,
          credentialPriority: 1,

          isDeleted: 1,

          createdAt: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    insigniaList.forEach((item) => {
      worksheet.addRow({
        credentialName: item.credentialName || "N/A",
        credentialGroup: item.credentialGroup || "N/A",
        credentialPriority: item.credentialPriority || "N/A",
        createdAt: item.createdAt
          ? new Date(item.createdAt).toLocaleDateString()
          : "N/A",
        status: item.isDeleted ? "In-Active" : "Active",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Insignia_List.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
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
  addDiscipline,
  getDisciplineById,
  addStyles,
  getStyleById,
  addTechnic,
  getTechnicById,
  addMediaSupport,
  getMediaById,
  addTheme,
  getThemeById,
  createInsignias,
  getInsigniaById,
  deleteInsignia,
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
  serachUserByQueryInput,
  getAllUsers,
  suspendedArtistList,
  suspendArtist,
  unSuspendArtist,
  rejectArtistRequest,
  unRejectArtistRequest,
  banArtistRequest,
  unBanArtistRequest,
  changeArtistPassword,
  addTicket,
  ticketList,
  ticketDetail,
  replyTicket,
  getTicketReplies,
  addFAQ,
  getFAQList,
  getFAQById,
  addKB,
  getKBList,
  getKBById,
  getReviewDetailArtist,
  approveArtistChanges,
  getReviewDetailArtwork,
  approveArtworkChanges,
  reValidateArtist,
  deleteArtistSeries,
  downloadArtworkDataCSV,
  downloadArtistDataCSV,
  downloadDisciplineDataCSV,
  downloadCategoryDataCSV,
  downloadPicklistDataCSV,
  downloadInsigniaDataCSV,
};
