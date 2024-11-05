const Style = require("../models/styleModel");
const Technic = require("../models/technicModel");
const Theme = require("../models/themeModel");
const MediaSupport = require("../models/mediaSupportModel");
const Discipline = require("../models/disciplineModel");
const { createLog } = require("../functions/common");
const APIErrorLog = createLog("API_error_log");
const moment = require("moment");

const listArtworkStyle = async (req, res) => {
  try {
    const data = await Style.find({ isDeleted: false })
      .populate("discipline", { disciplineName: 1 })
      .sort({ createdAt: -1 })
      .lean(true);

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
    const data = await Discipline.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .lean(true);

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

const listTechnic = async (req, res) => {
  try {
    const data = await Technic.find({ isDeleted: false })
      .populate("discipline", { disciplineName: 1 })
      .sort({ createdAt: -1 })
      .lean(true);

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
    const data = await Theme.find({ isDeleted: false })
      .populate("discipline", { disciplineName: 1 })
      .sort({ createdAt: -1 })
      .lean(true);

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
    const data = await MediaSupport.find({ isDeleted: false })
      .populate("discipline", { disciplineName: 1 })
      .sort({ createdAt: -1 })
      .lean(true);

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

module.exports = {
  listArtworkStyle,
  listDiscipline,
  listTechnic,
  listTheme,
  listMediaSupport,
};
