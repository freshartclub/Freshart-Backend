const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const Artist = require("../models/artistModel");
const ArtWork = require("../models/artWorksModel");
const { fileUploadFunc } = require("../functions/common");
const Circle = require("../models/circleModel");
const objectId = require("mongoose").Types.ObjectId;
const EmailType = require("../models/emailTypeModel");
const { sendMail } = require("../functions/mailer");
const Post = require("../models/postModel");

const addCircle = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id } = req.params;
  const fileData = await fileUploadFunc(req, res);

  if (id) {
    const circle = await Circle.findOne(
      { _id: id },
      { mainImage: 1, coverImage: 1, title: 1, managers: 1 }
    ).lean(true);

    const newManagers = JSON.parse(req.body.managers);
    const existingManagers = circle.managers.map((m) => String(m));

    const addedManagers = newManagers.filter(
      (manager) => !existingManagers.includes(manager)
    );
    const removedManagers = existingManagers.filter(
      (manager) => !newManagers.includes(manager)
    );

    await Circle.updateOne(
      { _id: id },
      {
        $set: {
          title: req.body.title,
          description: req.body.description,
          content: req.body.content,
          mainImage: fileData.data?.mainImage
            ? fileData.data?.mainImage[0]?.filename
            : circle.mainImage,
          coverImage: fileData.data?.backImage
            ? fileData.data?.backImage[0]?.filename
            : circle.coverImage,
          managers: JSON.parse(req.body.managers),
          categories: JSON.parse(req.body.categories),
          status: req.body.status,
        },
      }
    );

    if (addedManagers.length > 0) {
      const addedArtists = await Artist.find(
        { _id: { $in: addedManagers } },
        { email: 1, artistName: 1 }
      ).lean(true);

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
      const removedArtists = await Artist.find(
        { _id: { $in: removedManagers } },
        { email: 1, artistName: 1 }
      ).lean(true);

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
    await Circle.create({
      title: req.body.title,
      description: req.body.description,
      content: req.body.content,
      mainImage: fileData.data?.mainImage[0]?.filename,
      coverImage: fileData.data?.backImage[0]?.filename,
      managers: JSON.parse(req.body.managers),
      categories: JSON.parse(req.body.categories),
      status: req.body.status,
    });

    const artists = await Artist.find(
      { _id: { $in: JSON.parse(req.body.managers) } },
      { email: 1, artistName: 1 }
    ).lean(true);

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
        content: 1,
        mainImage: 1,
        coverImage: 1,
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
        $or: [
          { title: { $regex: s, $options: "i" } },
          { description: { $regex: s, $options: "i" } },
        ],
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
        categories: 1,
        createdAt: 1,
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
        $or: [
          { title: { $regex: s, $options: "i" } },
          { description: { $regex: s, $options: "i" } },
        ],
      },
    },
    {
      $project: {
        title: 1,
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
    // {
    //   $lookup: {
    //     from: "posts",
    //     localField: "posts",
    //     foreignField: "_id",
    //     as: "post",
    //   },
    // },
    {
      $project: {
        title: 1,
        description: 1,
        content: 1,
        mainImage: 1,
        coverImage: 1,
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

const createPostInCircle = catchAsyncError(async (req, res) => {
  const { id, postId } = req.params;
  const circle = await Circle.findById({ _id: id }).lean(true);
  if (!circle) {
    return res.status(400).send({ message: "Circle not found" });
  }

  if (!circle.managers.includes(req.user._id)) {
    return res
      .status(400)
      .send({ message: "You don't have access to the resource" });
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

module.exports = {
  addCircle,
  getCircle,
  getCircleList,
  getArtistCircleList,
  getCircleById,
};
