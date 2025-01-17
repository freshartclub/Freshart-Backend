const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const Incident = require("../models/incidentModel");
const objectId = require("mongoose").Types.ObjectId;

const addIncident = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id } = req?.params;

  const payload = {
    incType: req.body.incType,
    incGroup: req.body.incGroup,
    description: req.body.description,
    title: req.body.title,
    severity: req.body.severity,
    status: req.body.status,
    note: req.body.note,
    initTime: req.body.initTime,
    endTime: req.body.endTime,
  };

  if (id) {
    await Incident.updateOne({ _id: id }, { $set: payload });
  } else {
    await Incident.create(payload);
  }

  res
    .status(200)
    .send({ message: `Incident ${id ? "Updated" : "Added"} Successfully` });
});

const getAllIncident = catchAsyncError(async (req, res, next) => {
  if (req.user?.roles && req.user?.roles === "superAdmin") {
    const admin = await Admin.countDocuments({
      _id: req.user._id,
      isDeleted: false,
    }).lean(true);

    if (!admin) return res.status(400).send({ message: `Admin not found` });
  }

  let { s } = req.query;
  s = s === "undefined" || typeof s === "undefined" ? "" : s;

  const incidents = await Incident.aggregate([
    {
      $match: {
        isDeleted: false,
        $or: [
          { incGroup: { $regex: s, $options: "i" } },
          { incType: { $regex: s, $options: "i" } },
          { title: { $regex: s, $options: "i" } },
        ],
      },
    },
    {
      $project: {
        incGroup: 1,
        incType: 1,
        title: 1,
        description: 1,
        severity: 1,
        status: 1,
        note: 1,
        initTime: 1,
        endTime: 1,
        createdAt: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  res.status(200).send({ data: incidents });
});

const getIncidentById = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const incident = await Incident.findOne({
    _id: req.params.id,
    isDeleted: false,
  }).lean(true);

  res.status(200).send({ data: incident });
});

const getActiveIncident = catchAsyncError(async (req, res, next) => {
  const incident = await Incident.find({
    isDeleted: false,
    status: "Active",
  });

  res.status(200).send({ data: incident });
});

module.exports = {
  addIncident,
  getAllIncident,
  getIncidentById,
  getActiveIncident,
};
