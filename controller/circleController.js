const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const Artist = require("../models/artistModel");
const ArtWork = require("../models/artWorksModel");
const { fileUploadFunc } = require("../functions/common");
const Circle = require("../models/circleModel");
const objectId = require("mongoose").Types.ObjectId;
const EmailType = require("../models/emailTypeModel");
const { sendMail } = require("../functions/mailer");
const Post = require("../models/postsModel");
const Comment = require("../models/commentModel");

const addCircle = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id } = req.params;
  const fileData = await fileUploadFunc(req, res);

  let obj = {
    title: req.body.title,
    description: req.body.description,
    content: req.body.content,
    categories: JSON.parse(req.body.categories),
    status: req.body.status,
    type: req.body.type,
  };

  if (req.body?.foradmin == "true") {
    obj["foradmin"] = true;
  } else {
    obj["foradmin"] = false;
    obj["managers"] = JSON.parse(req.body.managers);
  }

  if (id) {
    const circle = await Circle.findOne({ _id: id }, { mainImage: 1, coverImage: 1, title: 1, managers: 1, foradmin: 1 }).lean(true);

    obj["mainImage"] = fileData.data?.mainImage ? fileData.data?.mainImage[0]?.filename : circle.mainImage;
    obj["coverImage"] = fileData.data?.backImage ? fileData.data?.backImage[0]?.filename : circle.coverImage;

    const newManagers = JSON.parse(req.body.managers);
    const existingManagers = circle?.managers ? circle.managers.map((m) => String(m)) : [];

    const addedManagers = newManagers.filter((manager) => !existingManagers.includes(manager));
    const removedManagers = existingManagers.filter((manager) => !newManagers.includes(manager));

    await Circle.updateOne({ _id: id }, { $set: obj });

    if (addedManagers.length > 0) {
      const addedArtists = await Artist.find({ _id: { $in: addedManagers } }, { email: 1, artistName: 1 }).lean(true);

      const assignEmailTemplate = await EmailType.findOne({
        emailType: "circle-assign-manager",
      }).lean(true);

      addedArtists.forEach((artist) => {
        const mailVariables = {
          "%head%": assignEmailTemplate.emailHead,
          "%email%": artist.email,
          "%msg%": assignEmailTemplate.emailDesc,
          "%name%": artist.artistName,
          "%title%": req.body.title,
        };

        sendMail("sample-email", mailVariables, artist.email);
      });
    }

    if (removedManagers.length > 0) {
      const removedArtists = await Artist.find({ _id: { $in: removedManagers } }, { email: 1, artistName: 1 }).lean(true);

      const revokeEmailTemplate = await EmailType.findOne({
        emailType: "circle-access-revoked",
      }).lean(true);

      removedArtists.forEach((artist) => {
        const mailVariables = {
          "%head%": revokeEmailTemplate.emailHead,
          "%email%": artist.email,
          "%msg%": revokeEmailTemplate.emailDesc,
          "%name%": artist.artistName,
          "%title%": req.body.title,
        };

        sendMail("sample-email", mailVariables, artist.email);
      });
    }

    return res.status(200).send({ message: "Circle updated successfully" });
  } else {
    obj["mainImage"] = fileData.data?.mainImage[0]?.filename;
    obj["coverImage"] = fileData.data?.backImage[0]?.filename;

    await Circle.create(obj);

    const artists = await Artist.find({ _id: { $in: JSON.parse(req.body.managers) } }, { email: 1, artistName: 1 }).lean(true);

    const findEmail = await EmailType.findOne({
      emailType: "circle-assign-manager",
    }).lean(true);

    artists.forEach((artist) => {
      const mailVariables = {
        "%head%": findEmail.emailHead,
        "%email%": artist.email,
        "%msg%": findEmail.emailDesc,
        "%name%": artist.artistName,
        "%title%": req.body.title,
      };

      sendMail("sample-email", mailVariables, artist.email);
    });

    return res.status(200).send({ message: "Circle added successfully" });
  }
});

const getCircle = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id } = req.params;
  if (!id) return res.status(400).send({ message: `Circle id not found` });

  const circle = await Circle.aggregate([
    {
      $match: {
        _id: objectId(id),
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "managers",
        foreignField: "_id",
        as: "managers",
      },
    },
    {
      $project: {
        title: 1,
        description: 1,
        type: 1,
        content: 1,
        mainImage: 1,
        coverImage: 1,
        categories: 1,
        foradmin: 1,
        status: 1,
        managers: {
          $map: {
            input: "$managers",
            as: "manager",
            in: {
              _id: "$$manager._id",
              artistName: "$$manager.artistName",
              artistSurname1: "$$manager.artistSurname1",
              artistSurname2: "$$manager.artistSurname2",
              userId: "$$manager.userId",
              img: "$$manager.profile.mainImage",
            },
          },
        },
      },
    },
  ]);

  return res.status(200).send({ data: circle[0] });
});

const getCircleList = catchAsyncError(async (req, res) => {
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

  const circle = await Circle.aggregate([
    {
      $match: {
        $or: [{ title: { $regex: s, $options: "i" } }, { description: { $regex: s, $options: "i" } }],
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "managers",
        foreignField: "_id",
        as: "managers",
      },
    },
    {
      $project: {
        title: 1,
        description: 1,
        content: 1,
        mainImage: 1,
        coverImage: 1,
        type: 1,
        categories: 1,
        createdAt: 1,
        foradmin: 1,
        status: 1,
        managers: {
          $map: {
            input: "$managers",
            as: "manager",
            in: {
              _id: "$$manager._id",
              artistName: "$$manager.artistName",
              artistSurname1: "$$manager.artistSurname1",
              artistSurname2: "$$manager.artistSurname2",
              artistId: "$$manager.artistId",
              img: "$$manager.profile.mainImage",
            },
          },
        },
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  return res.status(200).send({ data: circle });
});

const getArtistCircleList = catchAsyncError(async (req, res) => {
  let { s } = req.query;

  if (s == "undefined") {
    s = "";
  } else if (typeof s === "undefined") {
    s = "";
  }

  const circle = await Circle.aggregate([
    {
      $lookup: {
        from: "artists",
        localField: "managers",
        foreignField: "_id",
        as: "managers",
      },
    },
    {
      $match: {
        managers: { $elemMatch: { _id: objectId(req.user._id) } },
        foradmin: false,
        $or: [{ title: { $regex: s, $options: "i" } }, { description: { $regex: s, $options: "i" } }],
      },
    },
    {
      $project: {
        title: 1,
        type: 1,
        description: 1,
        content: 1,
        mainImage: 1,
        categories: 1,
        status: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  return res.status(200).send({ data: circle });
});

const getCircleById = catchAsyncError(async (req, res) => {
  const circle = await Circle.aggregate([
    {
      $match: {
        _id: objectId(req.params.id),
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "managers",
        foreignField: "_id",
        as: "managers",
      },
    },
    {
      $project: {
        title: 1,
        description: 1,
        content: 1,
        mainImage: 1,
        type: 1,
        coverImage: 1,
        foradmin: 1,
        categories: 1,
        status: 1,
        managers: {
          $map: {
            input: "$managers",
            as: "manager",
            in: {
              _id: "$$manager._id",
              artistName: "$$manager.artistName",
              artistSurname1: "$$manager.artistSurname1",
              artistSurname2: "$$manager.artistSurname2",
              artistId: "$$manager.artistId",
              img: "$$manager.profile.mainImage",
              address: {
                city: "$$manager.address.city",
                country: "$$manager.address.country",
              },
            },
          },
        },
      },
    },
  ]);

  return res.status(200).send({ data: circle[0] });
});

const getUserCircleList = catchAsyncError(async (req, res) => {
  const id = req.user._id;
  if (!id) return res.status(400).send({ message: "User Not Found" });

  const circles = await Circle.aggregate([
    {
      $lookup: {
        from: "artists",
        localField: "managers",
        foreignField: "_id",
        as: "managers",
      },
    },
    {
      $project: {
        title: 1,
        description: 1,
        content: 1,
        mainImage: 1,
        type: 1,
        categories: 1,
        status: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  return res.status(200).send({ data: circles });
});

const createPostInCircle = catchAsyncError(async (req, res) => {
  const { id, postId } = req.params;

  const circle = await Circle.findById({ _id: id }).lean(true);
  if (!circle) {
    return res.status(400).send({ message: "Circle not found" });
  }

  if (!circle.managers.map((id) => id.toString()).includes(req.user._id.toString())) {
    return res.status(400).send({ message: "You don't have access to the resource" });
  }

  if (postId) {
    const post = await Post.updateOne(
      { circle: circle._id, owner: req.user._id },
      {
        $set: {
          content: req.body.content,
        },
      }
    );

    if (post.modifiedCount === 0) {
      return res.status(400).send({ message: "Post Not Found" });
    }

    return res.status(400).send({ message: "Post Editted" });
  } else {
    const fileData = await fileUploadFunc(req, res);

    await Post.create({
      circle: circle._id,
      owner: req.user._id,
      content: req.body.content,
      circleFile: fileData.data?.circleFile[0]?.filename,
    });
  }
  return res.status(200).send({ message: "Post Created" });
});

const getAllPostOfCircle = catchAsyncError(async (req, res) => {
  const { id } = req.params;
  const circle = await Circle.findById({ _id: id }).lean(true);
  if (!circle) {
    return res.status(400).send({ message: "Circle not found" });
  }

  const allPosts = await Post.find({ circle: circle._id });

  return res.status(200).send({ data: allPosts });
});

const postCommentInCircle = catchAsyncError(async (req, res) => {
  const { id, postId } = req.params;
  const { comment, commentFiles, name } = req.body;

  const circle = await Circle.findById(id).lean();
  if (!circle) {
    return res.status(404).json({
      success: false,
      message: "Circle not found",
    });
  }

  const isManager = circle.managers.map((id) => id.toString()).includes(req.user._id.toString());

  if (!isManager) {
    return res.status(403).json({
      success: false,
      message: "You don't have permission to post comments in this circle",
    });
  }

  await Comment.create({
    comment,
    owner: req.user._id,
    postId: postId,
    commentUser: name,
    commentFiles,
  });

  return res.status(201).json({
    success: true,
    message: "Comment posted successfully",
  });
});

const getAllComments = catchAsyncError(async (req, res) => {
  const { id, postId } = req.params;

  const circle = await Circle.findById(id).lean();
  if (!circle) {
    return res.status(404).json({
      success: false,
      message: "Circle not found",
    });
  }

  const isManager = circle.managers.map((id) => id.toString()).includes(req.user._id.toString());

  if (!isManager) {
    return res.status(403).json({
      success: false,
      message: "You don't have permission to view comments in this circle",
    });
  }

  const comments = await Comment.find({ post: postId }).sort({ createdAt: -1 }).lean();

  console.log(comments);

  return res.status(200).json({
    success: true,
    message: "Comments retrieved successfully",
    data: {
      comments,
      total: comments.length,
    },
  });
});

module.exports = {
  addCircle,
  getCircle,
  getCircleList,
  getArtistCircleList,
  getUserCircleList,
  getCircleById,
  createPostInCircle,
  getAllPostOfCircle,
  postCommentInCircle,
  getAllComments,
};
