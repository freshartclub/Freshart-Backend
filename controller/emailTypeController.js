const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const EmailType = require("../models/emailTypeModel");
const NotificationType = require("../models/notificationTypeModel");

const addEmailType = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) {
    return res.status(400).send({ message: `Admin not found` });
  }

  const { id } = req.params;

  const { emailType, emailDesc, emailHead, emailLang } = req.body;
  if (!emailType || !emailDesc || !emailHead || !emailLang) {
    return res.status(400).send({ message: `All fields are required` });
  }

  if (id) {
    await EmailType.updateOne(
      { _id: id },
      { $set: { emailType, emailDesc, emailHead, emailLang } }
    );
    return res.status(200).send({ message: "Email Type updated successfully" });
  } else {
    await EmailType.create({
      emailType,
      emailDesc,
      emailLang,
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
        $or: [
          { emailType: { $regex: s, $options: "i" } },
          { emailLang: { $regex: s } },
        ],
      },
    },
    {
      $project: {
        emailType: 1,
        emailLang: 1,
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

const addNotificationType = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id } = req.params;

  const { notificationType, message, subject, lang } = req.body;
  if (!notificationType || !message || !subject || !lang) {
    return res.status(400).send({ message: `All fields are required` });
  }

  if (id) {
    await NotificationType.updateOne(
      { _id: id },
      { $set: { notificationType, message, subject, lang } }
    );
    return res
      .status(200)
      .send({ message: "Notification Type updated successfully" });
  } else {
    await notificationType.create({
      notificationType,
      message,
      lang,
      subject,
    });
    return res
      .status(200)
      .send({ message: "Notification Type added successfully" });
  }
});

const listNotificationType = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  let { s } = req.query;
  s = s === "undefined" || typeof s === "undefined" ? "" : s;

  let data = await NotificationType.aggregate([
    {
      $match: {
        isDeleted: false,
        $or: [
          { notificationType: { $regex: s, $options: "i" } },
          { lang: { $regex: s } },
        ],
      },
    },
    {
      $project: {
        notificationType: 1,
        lang: 1,
        message: 1,
        subject: 1,
        createdAt: 1,
        isDeleted: 1,
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  return res.status(200).send({
    data: data,
  });
});

const getNotificationType = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id } = req.params;
  const data = await NotificationType.findById(id).lean(true);
  return res.status(200).send({ data: data });
});

module.exports = {
  addEmailType,
  listEmailType,
  getEmailType,
  addNotificationType,
  listNotificationType,
  getNotificationType,
};
