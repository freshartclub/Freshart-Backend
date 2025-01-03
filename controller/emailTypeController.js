const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const EmailType = require("../models/emailTypeModel");

const addEmailType = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  const { id } = req.params;

  const { emailType, emailDesc, emailHead } = req.body;
  if (!emailType || !emailDesc || !emailHead) {
    return res.status(400).send({ message: `All fields are required` });
  }

  if (!id) {
    const found = await EmailType.findOne(
      { emailType: emailType },
      { isDeleted: 1 }
    ).lean(true);

    if (found) {
      return res.status(400).send({ message: "Email Type already exist" });
    }
  }

  if (id) {
    await EmailType.updateOne(
      { _id: id },
      { $set: { emailType, emailDesc, emailHead } }
    );
    return res.status(200).send({ message: "Email Type updated successfully" });
  } else {
    await EmailType.create({
      emailType,
      emailDesc,
      emailHead,
    });
    return res.status(200).send({ message: "Email Type added successfully" });
  }
});

const listEmailType = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  let { s } = req.query;

  if (s == "undefined") {
    s = "";
  } else if (typeof s === "undefined") {
    s = "";
  }

  let data = await EmailType.aggregate([
    {
      $match: {
        isDeleted: false,
        emailType: { $regex: s, $options: "i" },
      },
    },
    {
      $project: {
        emailType: 1,
        emailDesc: 1,
        emailHead: 1,
        createdAt: 1,
        isDeleted: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  return res.status(200).send({
    data: data,
  });
});

const getEmailType = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  const { id } = req.params;
  const data = await EmailType.findById(id).lean(true);
  return res.status(200).send({ data: data });
});

module.exports = {
  addEmailType,
  listEmailType,
  getEmailType,
};
