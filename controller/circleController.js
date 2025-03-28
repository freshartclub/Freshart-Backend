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
const Like = require("../models/likeModel");
const Comment = require("../models/commentModel");
const mongoose = require("mongoose");
const FollowRequest = require("../models/followRequestModel");
const Notification = require("../models/notificationModel");
const Follower = require("../models/followerModel");
const deleteRemovedMedia = require("../functions/deleteMedia");

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
  if (!s || s === "undefined") s = "";

  let { sortType } = req.query;

  let sort = {
    ...(sortType == "post" && { postCount: -1 }),
    ...(sortType == "follower" && { followerCount: -1 }),
    ...(sortType == "view" && { viewCount: -1 }),
    ...(sortType == "none" && { createdAt: -1 }),
    ...(sortType == "name" && { title: 1 }),
  };

  const circles = await Circle.aggregate([
    {
      $match: {
        $or: [{ title: { $regex: s, $options: "i" } }, { categories: { $elemMatch: { $regex: s, $options: "i" } } }],
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
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "circle",
        pipeline: [{ $sort: { createdAt: -1 } }, { $limit: 1 }, { $project: { createdAt: 1, _id: 0 } }],
        as: "latestPost",
      },
    },
    {
      $project: {
        title: 1,
        isDeleted: 1,
        description: 1,
        content: 1,
        mainImage: 1,
        coverImage: 1,
        type: 1,
        categories: 1,
        createdAt: 1,
        viewCount: 1,
        foradmin: 1,
        status: 1,
        postCount: 1,
        followerCount: 1,
        latestPost: { $first: "$latestPost" },
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
    { $sort: sort },
  ]);

  return res.status(200).send({ data: circles });
});

const adminFollowerList = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id } = req.params;
  if (!id) return res.status(400).send({ message: `Circle id not found` });

  const members = await Follower.aggregate([
    {
      $match: {
        circle: objectId(id),
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $project: {
        _id: 1,
        createdAt: 1,
        user: {
          _id: "$user._id",
          artistName: "$user.artistName",
          artistSurname1: "$user.artistSurname1",
          artistSurname2: "$user.artistSurname2",
          email: "$user.email",
          userId: "$user.userId",
          img: "$user.profile.mainImage",
        },
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  return res.status(200).send({ data: members });
});

const deleteCircle = catchAsyncError(async (req, res) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { id } = req.params;
  if (!id) return res.status(400).send({ message: `Circle ID not found` });

  const circle = await Circle.findOne({ _id: id }).lean(true);
  if (!circle) return res.status(404).send({ message: "Circle not found" });

  await Circle.updateOne({ _id: id }, { $set: { isDeleted: !circle.isDeleted } });
  return res.status(200).send({ message: `Circle ${!circle.isDeleted ? "deleted" : "restored"} successfully` });
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
      $match: {
        managers: { $in: [objectId(req.user._id)] },
        isDeleted: false,
        foradmin: false,
        $or: [{ title: { $regex: s, $options: "i" } }, { description: { $regex: s, $options: "i" } }],
      },
    },
    {
      $project: {
        title: 1,
        type: 1,
        description: 1,
        postCount: 1,
        followerCount: 1,
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
  const _id = req.user._id;
  const { view } = req.query;

  const [circle, followCount] = await Promise.all([
    Circle.aggregate([
      {
        $match: {
          _id: objectId(req.params.id),
          isDeleted: false,
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
          _id: 1,
          title: 1,
          description: 1,
          content: 1,
          mainImage: 1,
          type: 1,
          coverImage: 1,
          postCount: 1,
          followerCount: 1,
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
    ]),

    Follower.countDocuments({ circle: req.params.id }).lean(),
  ]);

  if (circle.length == 0) return res.status(400).send({ message: "Circle not found" });

  const isMember = await Follower.exists({ circle: req.params.id, user: _id });
  const authorise = circle[0].managers.find((manager) => manager._id.toString() == _id);

  if (circle[0].type == "Private") {
    if (!authorise && !isMember) return res.status(400).send({ message: "Access Denied" });
  }

  if (view == "see" && !authorise) {
    await Circle.updateOne({ _id: circle[0]._id }, { $inc: { viewCount: 1 } });
  }

  return res.status(200).send({ data: circle[0], followCount: followCount, authorise: authorise ? true : false, isMember: isMember ? true : false });
});

const getUserCircleList = catchAsyncError(async (req, res) => {
  const id = req.user._id;
  if (!id) return res.status(400).send({ message: "User Not Found" });

  const [circles, follow, followRequset] = await Promise.all([
    Circle.aggregate([
      {
        $match: { isDeleted: false },
      },
      {
        $project: {
          title: 1,
          description: 1,
          content: 1,
          mainImage: 1,
          followerCount: 1,
          postCount: 1,
          viewCount: 1,
          managers: 1,
          type: 1,
          categories: 1,
          status: 1,
          followers: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]),
    Follower.findOne({ user: id }).lean(),
    FollowRequest.find({ user: id }).lean(),
  ]);

  return res.status(200).send({ data: circles, follow: follow, followRequset: followRequset });
});

const createPostInCircle = catchAsyncError(async (req, res) => {
  const _id = req.user._id;
  if (!_id) return res.status(400).send({ message: "User Not Found" });

  const { id } = req.params;
  const circle = await Circle.findById(id, { managers: 1 }).lean(true);
  if (!circle) return res.status(400).send({ message: "Circle not found" });

  if (!circle.managers.map((id) => id.toString()).includes(req.user._id.toString())) {
    return res.status(400).send({ message: "You don't have access to the resource" });
  }

  const fileData = await fileUploadFunc(req, res);

  if (req.body?.postId) {
    let files = [];
    let obj = {
      title: req.body.title,
      content: req.body.content,
    };

    if (req.body.existingFiles) {
      if (typeof req.body.existingFiles === "string") {
        const filename = req.body.existingFiles.split("/").pop();
        files.push(filename);
      } else {
        req.body.existingFiles.forEach((item) => {
          files.push(item.split("/").pop());
        });
      }
    }

    if (fileData?.data !== undefined) {
      fileData?.data.circleFile.forEach((item) => {
        files.push(item.filename);
      });
    }

    obj["file"] = files;

    const previousPost = await Post.findOneAndUpdate({ _id: req.body.postId }, { $set: obj }, { returnDocument: "before" });
    if (!previousPost) return res.status(400).send({ message: "Post Not Found" });

    let previousFiles = previousPost.file || [];
    const filesToDelete = previousFiles.filter((file) => !files.includes(file));

    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];

    const imgFiles = filesToDelete.filter((file) => imageExtensions.some((ext) => file.toLowerCase().endsWith(ext)));
    const videoFiles = filesToDelete.filter((file) => videoExtensions.some((ext) => file.toLowerCase().endsWith(ext)));

    if (videoFiles.length > 0 || imgFiles.length > 0) {
      await deleteRemovedMedia(imgFiles, videoFiles);
    }

    return res.status(200).send({ message: "Post Editted" });
  } else {
    let images = [];

    if (fileData?.data && fileData?.data?.circleFile.length > 0) {
      images = fileData.data.circleFile.map((image) => image.filename);
    }

    await Promise.all([
      Post.create({
        circle: circle._id,
        title: req.body.title,
        owner: req.user._id,
        content: req.body.content,
        file: images,
      }),
      Circle.updateOne({ _id: circle._id }, { $inc: { postCount: 1 } }),
    ]);
  }
  return res.status(200).send({ message: "Post Created" });
});

const getAllPostOfCircle = catchAsyncError(async (req, res) => {
  const { id } = req.params;

  const circle = await Circle.findById(id).lean();
  if (!circle) return res.status(400).send({ message: "Circle not found" });

  let userId = null;
  if (req.user && req.user._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
    userId = objectId(req.user._id);
  }

  const pipeline = [
    {
      $match: {
        circle: objectId(id),
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "owner",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              _id: 1,
              artistName: 1,
              artistSurname1: 1,
              artistSurname2: 1,
              "profile.mainImage": 1,
            },
          },
        ],
        as: "ownerInfo",
      },
    },
    {
      $unwind: {
        path: "$ownerInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "likes",
        let: { postId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$post", "$$postId"] },
            },
          },
          {
            $group: {
              _id: null,
              totalLikes: { $sum: 1 },
              likeCount: { $sum: { $cond: [{ $eq: ["$reaction", "like"] }, 1, 0] } },
              loveCount: { $sum: { $cond: [{ $eq: ["$reaction", "love"] }, 1, 0] } },
              hahaCount: { $sum: { $cond: [{ $eq: ["$reaction", "haha"] }, 1, 0] } },
              wowCount: { $sum: { $cond: [{ $eq: ["$reaction", "wow"] }, 1, 0] } },
              sadCount: { $sum: { $cond: [{ $eq: ["$reaction", "sad"] }, 1, 0] } },
              angryCount: { $sum: { $cond: [{ $eq: ["$reaction", "angry"] }, 1, 0] } },
            },
          },
        ],
        as: "likesSummary",
      },
    },
    {
      $lookup: {
        from: "likes",
        let: { postId: "$_id", userId: userId },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ["$post", "$$postId"] }, { $eq: ["$owner", "$$userId"] }],
              },
            },
          },
          {
            $project: { _id: 0, reaction: 1 },
          },
        ],
        as: "userLike",
      },
    },
    {
      $project: {
        owner: {
          _id: 1,
          artistName: "$ownerInfo.artistName",
          artistSurname1: "$ownerInfo.artistSurname1",
          artistSurname2: "$ownerInfo.artistSurname2",
          image: "$ownerInfo.profile.mainImage",
        },
        content: 1,
        createdAt: 1,
        file: 1,
        title: 1,
        commentCount: 1,
        totalLikes: { $ifNull: [{ $arrayElemAt: ["$likesSummary.totalLikes", 0] }, 0] },
        reaction: {
          like: { $ifNull: [{ $arrayElemAt: ["$likesSummary.likeCount", 0] }, 0] },
          love: { $ifNull: [{ $arrayElemAt: ["$likesSummary.loveCount", 0] }, 0] },
          haha: { $ifNull: [{ $arrayElemAt: ["$likesSummary.hahaCount", 0] }, 0] },
          wow: { $ifNull: [{ $arrayElemAt: ["$likesSummary.wowCount", 0] }, 0] },
          sad: { $ifNull: [{ $arrayElemAt: ["$likesSummary.sadCount", 0] }, 0] },
          angry: { $ifNull: [{ $arrayElemAt: ["$likesSummary.angryCount", 0] }, 0] },
        },
        isLiked: { $gt: [{ $size: "$userLike" }, 0] },
        reactType: {
          $ifNull: [{ $arrayElemAt: ["$userLike.reaction", 0] }, null],
        },
        _id: 1,
      },
    },
    { $sort: { createdAt: -1 } },
  ];

  const postsWithLikes = await Post.aggregate(pipeline);
  return res.status(200).send({ data: postsWithLikes });
});

const postCommentInCircle = catchAsyncError(async (req, res) => {
  const { id } = req.params;
  const { comment, commentFile, postId } = req.body;

  const circle = await Circle.findById(id, { managers: 1 }).lean();
  if (!circle) return res.status(404).send({ message: "Circle not found" });

  if (circle.type == "Private") {
    const isMember = await Follower.exists({ user: req.user._id, circle: id });
    if (!isMember) return res.status(403).send({ message: "Follow this circle to comment" });
  }

  await Promise.all([
    Comment.create({
      comment,
      owner: req.user._id,
      post: postId,
      commentFile,
    }),
    Post.updateOne({ _id: postId }, { $inc: { commentCount: 1 } }),
  ]);

  return res.status(201).send({
    message: "Comment posted successfully",
  });
});

const getAllComments = catchAsyncError(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send({ message: "Post Id not found" });

  const comments = await Comment.aggregate([
    {
      $match: {
        post: objectId(id),
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $unwind: { path: "$owner", preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        comment: 1,
        file: 1,
        owner: {
          artistName: "$owner.artistName",
          artistSurname1: "$owner.artistSurname1",
          artistSurname2: "$owner.artistSurname2",
          artistId: "$owner.artistId",
          img: "$owner.profile.mainImage",
        },
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  res.status(200).send({
    data: comments,
  });
});

const likePost = catchAsyncError(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send({ message: "Post Id not found" });

  const post = await Post.exists({ _id: id });
  if (!post) return res.status(400).send({ message: "Post not found" });

  const findLike = await Like.findOne({ post: id, owner: req.user._id }).lean();

  if (findLike) {
    if (findLike.reaction == req.body.reaction) {
      await Like.deleteOne({ post: id, owner: req.user._id });
    } else {
      await Like.updateOne({ post: id, owner: req.user._id, reaction: req.body.reaction });
    }
  } else {
    await Like.create({ post: id, owner: req.user._id, reaction: req.body.reaction });
  }

  return res.status(200).send({ message: "Success" });
});

const likeCount = catchAsyncError(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send({ message: "Post Id not found" });

  const postExists = await Post.exists({ _id: id });
  if (!postExists) return res.status(400).send({ message: "Post not found" });

  const likeCountPromise = Like.countDocuments({ post: id });

  const ownerLikePromise = req.user && req.user._id ? Like.countDocuments({ post: id, owner: req.user._id }) : Promise.resolve(0);
  const [totalLikes, ownerLike] = await Promise.all([likeCountPromise, ownerLikePromise]);

  return res.status(200).send({ data: totalLikes, isLiked: ownerLike > 0 });
});

const sendFollowRequest = catchAsyncError(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send({ message: "Circle Id not found" });

  const circle = await Circle.findById(id, { title: 1, type: 1, managers: 1 }).lean();
  if (!circle) return res.status(400).send({ message: "Circle not found" });

  if (circle.managers.map(String).includes(String(req.user._id))) return res.status(400).send({ message: "You are manager of this circle" });

  const requestExists = await FollowRequest.exists({ circle: id, user: req.user._id });
  if (requestExists) return res.status(400).send({ message: "You have already sent a follow request" });

  const alreadyFollower = await Follower.exists({ user: req.user._id, circle: id });
  if (alreadyFollower) return res.status(400).send({ message: "You are already following this circle" });

  if (circle.type === "Private") {
    await FollowRequest.create({ circle: id, user: req.user._id });
    return res.status(200).send({ message: "Follow Request Sent" });
  }

  await Promise.all([
    Follower.updateOne({ user: req.user._id }, { $addToSet: { circle: id } }, { upsert: true }),
    Circle.updateOne({ _id: id }, { $inc: { followerCount: 1 } }),
  ]);

  return res.status(200).send({ message: "Circle Followed" });
});

const getFollowRequsetOfCircle = catchAsyncError(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send({ message: "Circle Id not found" });

  const circle = await Circle.findById(id, { managers: 1 }).lean();
  if (!circle) return res.status(400).send({ message: "Circle not found" });

  if (!circle.managers.map(String).includes(String(req.user._id))) return res.status(400).send({ message: "You are not a manager of this circle" });

  const requestExists = await FollowRequest.aggregate([
    {
      $match: {
        circle: objectId(id),
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: { path: "$user", preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        _id: 1,
        user: {
          artistName: "$user.artistName",
          artistSurname1: "$user.artistSurname1",
          artistSurname2: "$user.artistSurname2",
          img: "$user.profile.mainImage",
          location: {
            city: "$user.address.city",
            country: "$user.address.country",
          },
        },
      },
    },
    { $sort: { createdAt: 1 } },
  ]);

  return res.status(200).send({ data: requestExists });
});

const approveFollowRequest = catchAsyncError(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send({ message: "Circle Id not found" });

  const circle = await Circle.findById(id, { managers: 1 }).lean();
  if (!circle) return res.status(400).send({ message: "Circle not found" });

  if (!circle.managers.map(String).includes(String(req.user._id))) return res.status(400).send({ message: "You are not a manager of this circle" });

  const request = await FollowRequest.findByIdAndDelete(req.body.requestId);
  if (!request) return res.status(400).send({ message: "Follow Request not found" });

  const result = await Follower.updateOne({ user: request.user }, { $addToSet: { circle: request.circle } }, { upsert: true });
  if (result.modifiedCount === 0 && result.upsertedCount === 0) return res.status(400).send({ message: "Follow Request not found" });

  if (result.modifiedCount !== 0) {
    await Circle.updateOne({ _id: request.circle }, { $inc: { followerCount: 1 } });
  }

  return res.status(200).send({ message: "Follow Request Approved" });
});

const rejectFollowRequest = catchAsyncError(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send({ message: "Circle Id not found" });

  const circle = await Circle.findById(id, { managers: 1 }).lean();
  if (!circle) return res.status(400).send({ message: "Circle not found" });

  if (!circle.managers.map(String).includes(String(req.user._id))) return res.status(400).send({ message: "You are not a manager of this circle" });

  const request = await FollowRequest.deleteOne(objectId(req.body.requestId));
  if (request.deletedCount === 0) return res.status(400).send({ message: "Follow Request not found" });

  return res.status(200).send({ message: "Follow Request Rejected" });
});

const getAllFollowerOfCircle = catchAsyncError(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send({ message: "Circle Id not found" });

  const circle = await Circle.findById(id, { managers: 1 }).lean();
  if (!circle) return res.status(400).send({ message: "Circle not found" });

  const followers = await Follower.aggregate([
    {
      $match: {
        circle: { $in: [objectId(id)] },
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: { path: "$user", preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        _id: 1,
        user: {
          _id: "$user._id",
          artistName: "$user.artistName",
          artistSurname1: "$user.artistSurname1",
          artistSurname2: "$user.artistSurname2",
          img: "$user.profile.mainImage",
          location: {
            city: "$user.address.city",
            country: "$user.address.country",
          },
        },
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  return res.status(200).send({ data: followers });
});

const unfollowCircle = catchAsyncError(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send({ message: "Circle Id not found" });

  const circle = await Circle.findById(id, { managers: 1 }).lean();
  if (!circle) return res.status(400).send({ message: "Circle not found" });

  const result = await Follower.updateOne({ user: req.user._id, circle: objectId(id) }, { $pull: { circle: id } });
  if (result.modifiedCount === 0 && result.upsertedCount === 0) return res.status(400).send({ message: "Already unfollowed" });

  if (result.modifiedCount !== 0) {
    await Circle.updateOne({ _id: id }, { $inc: { followerCount: -1 } });
  }

  return res.status(200).send({ message: "Circle Unfollowed" });
});

const removeFollower = catchAsyncError(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send({ message: "Circle Id not found" });

  const circle = await Circle.findById(id, { managers: 1 }).lean();
  if (!circle) return res.status(400).send({ message: "Circle not found" });

  if (!circle.managers.map(String).includes(String(req.user._id))) return res.status(400).send({ message: "You are not a manager of this circle" });

  const result = await Follower.updateOne({ user: req.body.userId }, { $pull: { circle: id } });
  if (result.modifiedCount === 0) return res.status(400).send({ message: "Already removed" });

  if (result.modifiedCount !== 0) {
    await Circle.updateOne({ _id: id }, { $inc: { followerCount: -1 } });
  }

  return res.status(200).send({ message: "Follower removed" });
});

module.exports = {
  addCircle,
  getCircle,
  getCircleList,
  adminFollowerList,
  deleteCircle,
  getArtistCircleList,
  getUserCircleList,
  getCircleById,
  createPostInCircle,
  getAllPostOfCircle,
  postCommentInCircle,
  getAllComments,
  likePost,
  likeCount,
  sendFollowRequest,
  getFollowRequsetOfCircle,
  approveFollowRequest,
  getAllFollowerOfCircle,
  rejectFollowRequest,
  unfollowCircle,
  removeFollower,
};
