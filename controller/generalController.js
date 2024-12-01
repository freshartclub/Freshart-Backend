const Style = require("../models/styleModel");
const Technic = require("../models/technicModel");
const Theme = require("../models/themeModel");
const MediaSupport = require("../models/mediaSupportModel");
const Discipline = require("../models/disciplineModel");
const Artist = require("../models/artistModel");
const { createLog } = require("../functions/common");
const APIErrorLog = createLog("API_error_log");
const Admin = require("../models/adminModel");
const moment = require("moment");

const listArtworkStyle = async (req, res) => {
  try {
    let { s } = req.query;

    if (s == "undefined") {
      s = "";
    } else if (typeof s === "undefined") {
      s = "";
    }

    const data = await Style.aggregate([
      {
        $match: {
          styleName: { $regex: s, $options: "i" },
        },
      },
      {
        $lookup: {
          from: "disciplines",
          localField: "discipline",
          foreignField: "_id",
          as: "discipline",
        },
      },
      {
        $project: {
          styleName: 1,
          isDeleted: 1,
          createdAt: 1,
          spanishStyleName: 1,
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

    return res.status(200).send({
      data: data,
      message: "Style List successfully received",
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
    let { s } = req.query;

    if (typeof s === "undefined") {
      s = "";
    }

    const data = await Discipline.aggregate([
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
          disciplineSpanishName: 1,
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

    return res.status(200).send({
      data: data,
      url: "https://dev.freshartclub.com/images",
      message: "Discipline List successfully received",
    });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the discipline");
    APIErrorLog.error(error);
    // error response
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

    const data = await Technic.aggregate([
      {
        $match: {
          // isDeleted: false,
          technicName: { $regex: s, $options: "i" },
        },
      },
      {
        $lookup: {
          from: "disciplines",
          localField: "discipline",
          foreignField: "_id",
          as: "discipline",
        },
      },
      {
        $project: {
          technicName: 1,
          createdAt: 1,
          isDeleted: 1,
          spanishTechnicName: 1,
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

    return res.status(200).send({
      data: data,
      message: "Technic List successfully received",
    });
  } catch (error) {
    APIErrorLog.error("Error while get the list of the discipline");
    APIErrorLog.error(error);
    // error response
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

    const data = await Theme.aggregate([
      {
        $match: {
          // isDeleted: false,
          themeName: { $regex: s, $options: "i" },
        },
      },
      {
        $lookup: {
          from: "disciplines",
          localField: "discipline",
          foreignField: "_id",
          as: "discipline",
        },
      },
      {
        $project: {
          themeName: 1,
          createdAt: 1,
          isDeleted: 1,
          spanishThemeName: 1,
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

    const data = await MediaSupport.aggregate([
      {
        $match: {
          mediaName: { $regex: s, $options: "i" },
        },
      },
      {
        $lookup: {
          from: "disciplines",
          localField: "discipline",
          foreignField: "_id",
          as: "discipline",
        },
      },
      {
        $project: {
          mediaName: 1,
          createdAt: 1,
          spanishMediaName: 1,
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
    const { id } = req.params;
    const seriesList = await Artist.findOne(
      {
        _id: id,
        isDeleted: false,
      },
      { artistSeriesList: 1 }
    ).lean(true);

    return res.status(200).send({ data: seriesList.artistSeriesList });
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
};
