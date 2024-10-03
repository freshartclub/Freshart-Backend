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
} = require("../functions/common");
const APIErrorLog = createLog("API_error_log");
const { checkValidations } = require("../functions/checkValidation");

const login = async (req, res) => {
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
    ).lean(true);

    if (admins && admins.password === md5(password)) {
      // Create token
      const token = jwt.sign(
        { user: admins },
        process.env.ACCESS_TOKEN_SECERT,
        { expiresIn: "30d" }
      );

      Admin.updateOne(
        { _id: admins._id, isDeleted: false },
        { $push: { tokens: token } }
      ).then();

      return res.status(200).send({
        token,
        message: "Admin login Successfully",
      });
    }
    return res.status(400).send({ message: "Invalid Username and Password" });
  } catch (error) {
    APIErrorLog.error("Error while login the admin");
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

    switch (req.body.count) {
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
          // latitude: req.body.latitude,
          // longitude: req.body.longitude,
        };

        obj["artworkStatus"] = {
          artwork: req.body.artwork,
          product: req.body.product,
        };

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
        const fileData = await fileUploadFunc(req, res);

        if (fileData.type !== "success") {
          return res.status(fileData.status).send({
            message:
              fileData?.type === "fileNotFound"
                ? "Please upload the documents"
                : fileData.type,
          });
        }

        obj["profile"] = {
          mainImage: fileData.data.profileImage[0].filename,
          additionalImage: fileData.data.additionalImage[0].filename,
          inProcessImage: fileData.data.inProcessImage[0].filename,
          mainVideo: fileData.data.mainVideo[0].filename,
          additionalVideo: fileData.data.additionalVideo[0].filename,
        };

        if (req.body.count > artist.pageCount) {
          obj["pageCount"] = req.body.count;
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
        if (JSON.parse(req.body.isManagerDetails)) {
          obj["managerDetails"] = {
            artistName: req.body.managerArtistName
              .toLowerCase()
              .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
              .trim(),
            artistSurname: req.body.managerArtistSurname
              .toLowerCase()
              .replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase())
              .trim(),
            artistPhone: req.body.managerArtistPhone
              .replace(/[- )(]/g, "")
              .trim(),
            artistEmail: req.body.managerArtistEmail.toLowerCase(),
            artistGender: req.body.managerArtistGender,
          };
          obj["managerDetails"] = {
            address: {
              address1: req.body.address1,
              city: req.body.managerCity,
              state: req.body.managerState,
              zipCode: String(req.body.managerZipCode),
              country: req.body.managerCountry,
            },
          };

          if (req.body.managerArtistLanguage.length) {
            obj["managerDetails"]["language"] = req.body.managerArtistLanguage;
          }
        }
        break;
    }

    let condition = {
      $set: obj,
    };
    if (req.body.count > 6) {
      condition["$unset"] = { pageCount: "" };
    }

    let dataArtist = {};
    req?.params?.id
      ? Artist.updateOne({ _id: req.params.id }, condition).then()
      : (dataArtist = await Artist.create(obj));

    return res.status(200).send({
      id: req?.params?.id ? req.params.id : dataArtist._id,
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

module.exports = {
  login,
  testAdmin,
  artistRegister,
  listArtworkStyle,
  listDiscipline,
  createInsignias,
  getRegisterArtist,
  getInsignias,
};
