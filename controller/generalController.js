const Style = require("../models/styleModel");
const Technic = require("../models/technicModel");
const Theme = require("../models/themeModel");
const MediaSupport = require("../models/mediaSupportModel");
const Discipline = require("../models/disciplineModel");
const Artist = require("../models/artistModel");
const { createLog } = require("../functions/common");
const APIErrorLog = createLog("API_error_log");
const Admin = require("../models/adminModel");
const objectId = require("mongoose").Types.ObjectId;
const moment = require("moment");
const KB = require("../models/kbModel");
const FAQ = require("../models/faqModel");

const listArtworkStyle = async (req, res) => {
  try {
    let { s } = req.query;

    if (s == "undefined") {
      s = "";
    } else if (typeof s === "undefined") {
      s = "";
    }

    let data = await Style.aggregate([
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
            { styleName: { $regex: s, $options: "i" } },
            { "discipline.disciplineName": { $regex: s, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          styleName: 1,
          isDeleted: 1,
          createdAt: 1,
          discipline: {
            // Map over each discipline in the array to only include _id and disciplineName
            $map: {
              input: "$discipline",
              as: "disc",
              in: {
                _id: "$$disc._id",
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

    if (data.length) {
      for (let elem of data) {
        elem["createdAt"] = moment(elem.createdAt).format("DD MMM YYYY");
      }
    }

    data = data.sort((a, b) => (a.isDeleted > b.isDeleted ? 1 : -1));

    return res.status(200).send({
      data: data,
      message: "Style List successfully received",
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const listDiscipline = async (req, res) => {
  try {
    let { s } = req.query;

    if (typeof s === "undefined") {
      s = "";
    }

    let data = await Discipline.aggregate([
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
          disciplineImage: 1,
          disciplineDescription: 1,
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

    data = data.sort((a, b) => (a.isDeleted > b.isDeleted ? 1 : -1));

    return res.status(200).send({
      data: data,
      url: "https://dev.freshartclub.com/images",
    });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the discipline");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const listTechnic = async (req, res) => {
  try {
    let { s } = req.query;

    if (s == "undefined") {
      s = "";
    } else if (typeof s === "undefined") {
      s = "";
    }

    let data = await Technic.aggregate([
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
            { technicName: { $regex: s, $options: "i" } },
            { "discipline.disciplineName": { $regex: s, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          technicName: 1,
          createdAt: 1,
          isDeleted: 1,
          discipline: {
            // Map over each discipline in the array to only include _id and disciplineName
            $map: {
              input: "$discipline",
              as: "disc",
              in: {
                _id: "$$disc._id",
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

    if (data.length) {
      for (let elem of data) {
        elem["createdAt"] = moment(elem.createdAt).format("DD MMM YYYY");
      }
    }

    data = data.sort((a, b) => (a.isDeleted > b.isDeleted ? 1 : -1));

    return res.status(200).send({
      data: data,
      message: "Technic List successfully received",
    });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the discipline");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const listTheme = async (req, res) => {
  try {
    let { s } = req.query;

    if (s == "undefined") {
      s = "";
    } else if (typeof s === "undefined") {
      s = "";
    }

    let data = await Theme.aggregate([
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
            { themeName: { $regex: s, $options: "i" } },
            { "discipline.disciplineName": { $regex: s, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          themeName: 1,
          createdAt: 1,
          isDeleted: 1,
          discipline: {
            // Map over each discipline in the array to only include _id and disciplineName
            $map: {
              input: "$discipline",
              as: "disc",
              in: {
                _id: "$$disc._id",
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

    if (data.length) {
      for (let elem of data) {
        elem["createdAt"] = moment(elem.createdAt).format("DD MMM YYYY");
      }
    }

    data = data.sort((a, b) => (a.isDeleted > b.isDeleted ? 1 : -1));

    return res.status(200).send({
      data: data,
      message: "Theme List successfully received",
    });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the discipline");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const listMediaSupport = async (req, res) => {
  try {
    let { s } = req.query;

    if (s == "undefined") {
      s = "";
    } else if (typeof s === "undefined") {
      s = "";
    }

    let data = await MediaSupport.aggregate([
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
            { mediaName: { $regex: s, $options: "i" } },
            { "discipline.disciplineName": { $regex: s, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          mediaName: 1,
          createdAt: 1,
          isDeleted: 1,
          discipline: {
            // Map over each discipline in the array to only include _id and disciplineName
            $map: {
              input: "$discipline",
              as: "disc",
              in: {
                _id: "$$disc._id",
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

    if (data.length) {
      for (let elem of data) {
        elem["createdAt"] = moment(elem.createdAt).format("DD MMM YYYY");
      }
    }

    data = data.sort((a, b) => (a.isDeleted > b.isDeleted ? 1 : -1));

    return res.status(200).send({
      data: data,
      message: "Media List successfully received",
    });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the discipline");
    APIErrorLog.error(error);
    // error response
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const deleteDiscipline = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.params;
    const found = await Discipline.findOne(
      {
        _id: id,
        isDeleted: false,
      },
      { isDeleted: 1 }
    ).lean(true);

    if (!found) {
      return res.status(400).send({ message: "Discipline not found" });
    }

    if (found.isDeleted) {
      return res.status(400).send({ message: "Discipline already deleted" });
    }

    Discipline.updateOne({ _id: id }, { $set: { isDeleted: true } }).then();
    return res.status(200).send({ message: "Discipline deleted successfully" });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the discipline");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const deleteStyle = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.params;
    const found = await Style.findOne(
      {
        _id: id,
        isDeleted: false,
      },
      { isDeleted: 1 }
    ).lean(true);

    if (!found) {
      return res.status(400).send({ message: "Discipline not found" });
    }

    if (found.isDeleted) {
      return res.status(400).send({ message: "Discipline already deleted" });
    }

    Style.updateOne({ _id: id }, { $set: { isDeleted: true } }).then();
    return res.status(200).send({ message: "Style deleted successfully" });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the Style");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const deleteTheme = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.params;
    const found = await Theme.findOne(
      {
        _id: id,
        isDeleted: false,
      },
      { isDeleted: 1 }
    ).lean(true);

    if (!found) {
      return res.status(400).send({ message: "Discipline not found" });
    }

    if (found.isDeleted) {
      return res.status(400).send({ message: "Discipline already deleted" });
    }

    Theme.updateOne({ _id: id }, { $set: { isDeleted: true } }).then();
    return res.status(200).send({ message: "Theme deleted successfully" });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the discipline");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const deleteTechnic = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.params;
    const found = await Technic.findOne(
      {
        _id: id,
        isDeleted: false,
      },
      { isDeleted: 1 }
    ).lean(true);

    if (!found) {
      return res.status(400).send({ message: "Discipline not found" });
    }

    if (found.isDeleted) {
      return res.status(400).send({ message: "Discipline already deleted" });
    }

    Technic.updateOne({ _id: id }, { $set: { isDeleted: true } }).then();
    return res.status(200).send({ message: "Technic deleted successfully" });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the discipline");
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const deleteMedia = async (req, res) => {
  try {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);
    if (!admin) return res.status(400).send({ message: `Admin not found` });

    const { id } = req.params;
    const found = await MediaSupport.findOne(
      {
        _id: id,
        isDeleted: false,
      },
      { isDeleted: 1 }
    ).lean(true);

    if (!found) {
      return res.status(400).send({ message: "Discipline not found" });
    }

    if (found.isDeleted) {
      return res.status(400).send({ message: "Discipline already deleted" });
    }

    MediaSupport.updateOne({ _id: id }, { $set: { isDeleted: true } }).then();
    return res.status(200).send({ message: "Media deleted successfully" });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getAllSeriesList = async (req, res) => {
  try {
    let { id } = req.params;
    if (!id) id = req.user._id;

    const seriesList = await Artist.aggregate([
      {
        $match: {
          _id: objectId(id),
          isDeleted: false,
        },
      },
      {
        $unwind: {
          path: "$commercilization.publishingCatalog",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "catalogs",
          localField: "commercilization.publishingCatalog.PublishingCatalog",
          foreignField: "_id",
          as: "publishCatalog",
        },
      },
      {
        $unwind: {
          path: "$publishCatalog",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          artistSeriesList: 1,
          discipline: "$aboutArtist.discipline",
          vatAmount: "$invoice.vatAmount",
          commercilization: {
            artistFees: "$commercilization.publishingCatalog.ArtistFees",
            _id: "$publishCatalog._id",
            catalogName: "$publishCatalog.catalogName",
            details: "$publishCatalog.details",
            catalogCommercialization:
              "$publishCatalog.catalogCommercialization",
          },
        },
      },
      {
        $group: {
          _id: {
            artistId: "$_id",
            catalogCommercialization:
              "$commercilization.catalogCommercialization",
          },
          artistSeriesList: { $first: "$artistSeriesList" },
          vatAmount: { $first: "$vatAmount" },
          discipline: { $first: "$discipline" },
          commercilization: {
            $push: {
              _id: "$commercilization._id",
              details: "$commercilization.details",
              artistFees: "$commercilization.artistFees",
              catalogName: "$commercilization.catalogName",
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id.artistId",
          artistSeriesList: { $first: "$artistSeriesList" },
          vatAmount: { $first: "$vatAmount" },
          discipline: { $first: "$discipline" },
          commercilization: {
            $push: {
              catalogCommercialization: "$_id.catalogCommercialization",
              details: "$commercilization",
            },
          },
        },
      },
      {
        $project: {
          artistSeriesList: 1,
          commercilization: 1,
          discipline: 1,
          vatAmount: 1,
        },
      },
    ]);

    return res.status(200).send({
      seriesList: seriesList[0]?.artistSeriesList,
      discipline: seriesList[0]?.discipline,
      purchaseCatalog: seriesList[0].commercilization
        ? seriesList[0].commercilization.filter(
            (item) => item.catalogCommercialization === "Purchase"
          )[0]?.details
        : [],
      subscriptionCatalog: seriesList[0].commercilization
        ? seriesList[0].commercilization.filter(
            (item) => item.catalogCommercialization === "Subscription"
          )[0]?.details
        : [],
      vatAmount: seriesList[0]?.vatAmount,
    });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getGeneralKBList = async (req, res) => {
  try {
    let { s } = req.query;

    if (s == "undefined") {
      s = "";
    } else if (typeof s === "undefined") {
      s = "";
    }

    const kbList = await KB.aggregate([
      {
        $match: {
          isDeleted: false,
          // kbGrp: { $regex: grp, $options: "i" },
          $or: [
            { kbTitle: { $regex: s, $options: "i" } },
            { tags: { $regex: s, $options: "i" } },
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
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    res.status(200).send({ data: kbList });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const getFAQGeneralList = async (req, res) => {
  try {
    const faqList = await FAQ.aggregate([
      {
        $match: {
          isDeleted: false,
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

const getKBById = async (req, res) => {
  try {
    const { id } = req.params;
    if(!id) return res.status(400).send({ message: "Id not found" });

    const kb = await KB.findOne({ _id: id }).lean(true);
    return res.status(200).send({ data: kb });
  } catch (error) {
    APIErrorLog.error(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

module.exports = {
  listArtworkStyle,
  listDiscipline,
  listTechnic,
  listTheme,
  listMediaSupport,
  deleteStyle,
  deleteDiscipline,
  deleteTechnic,
  deleteTheme,
  deleteMedia,
  getAllSeriesList,
  getGeneralKBList,
  getFAQGeneralList,
  getKBById,
};
