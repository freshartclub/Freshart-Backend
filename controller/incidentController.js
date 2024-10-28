const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const Incident = require("../models/incidentModel");

const addIncident = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const payload = {
    incType: req.body.incType,
    incGroup: req.body.incGroup,
    description: req.body.description,
    title: req.body.title,
    severity: req.body.severity,
    date: req.body.date,
    status: req.body.status,
    note: req.body.note,
    initTime: req.body.initTime,
    endTime: req.body.endTime,
  };

  const incident = await Incident.create(payload);

  res.status(200).send({ message: "Incident Added Sucessfully", incident });
});

const getAllIncident = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const incidents = await Incident.find({}).lean(true);

  res
    .status(200)
    .send({ message: "Incident Fetched Sucessfully", data: incidents });
});

module.exports = {
  addIncident,
  getAllIncident,
};
