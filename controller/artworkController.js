const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const Artist = require("../models/artistModel");
const ArtWork = require("../models/artWorksModel");
const RecentlyView = require("../models/recentlyView");
const { fileUploadFunc } = require("../functions/common");

const adminCreateArtwork = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { artworkId } = req.query;

  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);
  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const artist = await Artist.findOne({ _id: id }, { isActivated: 1 }).lean(
    true
  );
  if (!artist) return res.status(400).send({ message: `Artist not found` });
  if (!artist.isActivated) {
    return res.status(400).send({ message: `Artist not activated` });
  }

  const artwork = await ArtWork.findOne(
    { _id: artworkId, isDeleted: false },
    { media: 1, status: 1 }
  ).lean(true);

  const isArtwork = artwork ? true : false;

  if (isArtwork && artwork.status !== "draft")
    return res.status(400).send({ message: `You can't edit this artwork` });

  const fileData = await fileUploadFunc(req, res);

  let images = [];
  let videos = [];

  if (fileData.data?.images) {
    fileData.data?.images.forEach((element) => {
      images.push(element.filename);
    });
  }

  if (fileData.data?.otherVideo) {
    fileData.data?.otherVideo.forEach((element) => {
      videos.push(element.filename);
    });
  }

  if (req?.body?.existingImages !== undefined) {
    if (typeof req?.body?.existingImages === "string") {
      images.push(req?.body?.existingImages);
    } else {
      for (let i = 0; i < req?.body?.existingImages.length; i++) {
        images.push(req?.body?.existingImages[i]);
      }
    }
  }

  if (req?.body?.existingVideos !== undefined) {
    if (typeof req?.body?.existingVideos === "string") {
      videos.push(req?.body?.existingVideos);
    } else {
      for (let i = 0; i < req?.body?.existingVideos.length; i++) {
        videos.push(req?.body?.existingVideos[i]);
      }
    }
  }

  const newImageArr =
    images?.map((element) => {
      if (
        typeof element === "string" &&
        element.includes("https://dev.freshartclub.com/images/users")
      ) {
        return element.replace(
          "https://dev.freshartclub.com/images/users/",
          ""
        );
      }
      return element;
    }) || [];

  const newVideoArr =
    videos?.map((element) => {
      if (
        typeof element === "string" &&
        element.includes("https://dev.freshartclub.com/images/videos")
      ) {
        return element.replace(
          "https://dev.freshartclub.com/images/videos/",
          ""
        );
      }
      return element;
    }) || [];

  let obj = {
    artworkName: req.body.artworkName,
    artworkCreationYear: req.body.artworkCreationYear,
    artworkSeries: req.body.artworkSeries,
    productDescription: req.body.productDescription,
    collectionList: req.body.collectionList,
    isArtProvider: req.body.isArtProvider,
    owner: id,
  };

  if (req.body?.isArtProvider === "yes") {
    obj["provideArtistName"] = req.body.provideArtistName;
  }
  obj["media"] = {
    backImage: fileData.data?.backImage
      ? fileData.data?.backImage[0].filename
      : artwork?.media?.backImage,
    images: newImageArr,
    inProcessImage: fileData.data?.inProcessImage
      ? fileData.data?.inProcessImage[0].filename
      : artwork?.media?.inProcessImage,
    mainImage: fileData.data?.mainImage
      ? fileData.data?.mainImage[0].filename
      : artwork?.media?.mainImage,
    mainVideo: fileData.data?.mainVideo
      ? fileData.data?.mainVideo[0].filename
      : artwork?.media?.mainVideo,
    otherVideo: newVideoArr,
  };

  obj["additionalInfo"] = {
    artworkTechnic: req.body.artworkTechnic,
    artworkTheme: req.body.artworkTheme,
    artworkOrientation: req.body.artworkOrientation,
    material: req.body.material,
    weight: req.body.weight,
    length: req.body.lenght,
    height: req.body.height,
    width: req.body.width,
    hangingAvailable: req.body.hangingAvailable,
    hangingDescription: req.body.hangingDescription,
    framed: req.body.framed,
    framedDescription: req.body.framedDescription,
    frameHeight: req.body.frameHeight,
    frameLength: req.body.frameLenght,
    frameWidth: req.body.frameWidth,
    artworkStyle:
      typeof req.body.artworkStyle === "string"
        ? [req.body.artworkStyle]
        : req.body.artworkStyle,
    emotions:
      typeof req.body.emotions === "string"
        ? [req.body.emotions]
        : req.body.emotions,
    colors:
      typeof req.body.colors === "string" ? [req.body.colors] : req.body.colors,
    offensive: req.body.offensive,
  };

  if (req?.body?.activeTab === "subscription") {
    obj["commercialization"] = {
      activeTab: req.body.activeTab,
      purchaseOption: req.body.purchaseOption,
      subscriptionCatalog: req.body.subscriptionCatalog,
    };
  } else {
    obj["commercialization"] = {
      activeTab: req.body.activeTab,
      purchaseCatalog: req.body.purchaseCatalog,
      artistbaseFees: req.body.artistbaseFees,
      downwardOffer: req.body.downwardOffer,
      upworkOffer: req.body.upworkOffer,
      acceptOfferPrice: req.body.acceptOfferPrice,
      priceRequest: req.body.priceRequest,
    };
  }

  obj["pricing"] = {
    currency: req.body.currency,
    basePrice: req.body.basePrice,
    dpersentage: req.body.dpersentage,
    vatAmount: req.body.vatAmount,
    artistFees: req.body.artistFees,
  };

  obj["inventoryShipping"] = {
    pCode: req.body.pCode,
    location: req.body.location,
  };

  obj["discipline"] = {
    artworkDiscipline: req.body.artworkDiscipline,
    artworkTags:
      typeof req.body.artworkTags === "string"
        ? [req.body.artworkTags]
        : req.body.artworkTags,
  };

  obj["promotions"] = {
    promotion: req.body.promotion,
    promotionScore: req.body.promotionScore,
  };

  obj["restriction"] = {
    availableTo: req.body.availableTo,
    discountAcceptation: req.body.discountAcceptation,
  };

  let condition = {
    $set: obj,
  };

  if (artworkId) {
    ArtWork.updateOne({ _id: artworkId }, condition).then();
    return res.status(200).send({
      message: "Artwork Editted Sucessfully",
      data: { _id: artworkId },
    });
  } else {
    const artwork = await ArtWork.create(obj);
    res
      .status(200)
      .send({ message: "Artwork Added Sucessfully", data: artwork });
  }
});

const artistCreateArtwork = catchAsyncError(async (req, res, next) => {
  const artist = await Artist.findOne(
    { _id: req.user._id, isDeleted: false },
    { isActivated: 1 }
  ).lean(true);
  if (!artist) return res.status(400).send({ message: `Artist not found` });

  const { id } = req?.params;

  if (!artist.isActivated) {
    return res.status(400).send({ message: `Artist not activated` });
  }

  let artworkData = null;
  if (id !== "null") {
    artworkData = await ArtWork.findOne(
      { _id: id, isDeleted: false },
      { media: 1, status: 1 }
    ).lean(true);

    if (!artworkData) {
      return res.status(400).send({ message: `Artwork not found` });
    }
  }

  if (artworkData && artworkData.status !== "draft") {
    return res.status(400).send({ message: `You cannot edit this artwork` });
  }
  const fileData = await fileUploadFunc(req, res);

  let images = [];
  let videos = [];

  if (fileData.data?.images) {
    fileData.data?.images.forEach((element) => {
      images.push(element.filename);
    });
  }

  if (fileData.data?.otherVideo) {
    fileData.data?.otherVideo.forEach((element) => {
      videos.push(element.filename);
    });
  }

  const cleanArray = (inputArray) => {
    if (!Array.isArray(inputArray)) return inputArray;
    return inputArray.map((image) => image.replace(/^"|"$/g, ""));
  };

  if (req?.body?.existingImage) {
    if (typeof req?.body?.existingImage === "string") {
      images.push(req?.body?.existingImage.replace(/^"|"$/g, ""));
    } else {
      const cleanedImages = cleanArray(req?.body?.existingImage);
      images = [...images, ...cleanedImages];
    }
  }

  if (req?.body?.existingVideo) {
    if (typeof req?.body?.existingVideo === "string") {
      videos.push(req?.body?.existingVideo.replace(/^"|"$/g, ""));
    } else {
      const cleanedVideo = cleanArray(req?.body?.existingVideo);
      videos = [...videos, ...cleanedVideo];
    }
  }

  let styleArr = [];
  let colorsArr = [];
  let emotionsArr = [];
  let tagsArr = [];

  if (req.body.emotions) {
    const emotions = Array.isArray(req.body.emotions)
      ? req.body.emotions.map((item) => JSON.parse(item))
      : req.body.emotions;

    if (typeof emotions === "string") {
      const obj = JSON.parse(emotions);
      emotionsArr.push(obj.value);
    } else {
      emotions.forEach((element) => {
        emotionsArr.push(element.value);
      });
    }
  }

  if (req.body.artworkTags) {
    const artworkTags = Array.isArray(req.body.artworkTags)
      ? req.body.artworkTags.map((item) => JSON.parse(item))
      : req.body.artworkTags;

    if (typeof artworkTags === "string") {
      tagsArr.push(artworkTags.replace(/^"|"$/g, ""));
    } else {
      artworkTags.forEach((element) => {
        tagsArr.push(element);
      });
    }
  }

  if (req.body.artworkStyleType) {
    const styleType = Array.isArray(req.body.artworkStyleType)
      ? req.body.artworkStyleType.map((item) => JSON.parse(item))
      : req.body.artworkStyleType;

    if (typeof styleType === "string") {
      const obj = JSON.parse(styleType);
      styleArr.push(obj.value);
    } else {
      styleType.forEach((element) => {
        styleArr.push(element.value);
      });
    }
  }

  if (req.body.colors) {
    const colors = Array.isArray(req.body.colors)
      ? req.body.colors.map((item) => JSON.parse(item))
      : req.body.colors;

    if (typeof colors === "string") {
      const obj = JSON.parse(colors);
      colorsArr.push(obj.value);
    } else {
      colors.forEach((element) => {
        colorsArr.push(element.value);
      });
    }
  }

  let obj = {
    artworkName: req.body.artworkName,
    artworkCreationYear: req.body.artworkCreationYear,
    artworkSeries: req.body.artworkSeries,
    productDescription: req.body.productDescription,
    collectionList: req.body.collectionList,
    isArtProvider: req.body.isArtProvider,
    owner: artist._id,
  };

  if (req.body?.isArtProvider === "yes") {
    obj["provideArtistName"] = req.body.provideArtistName;
  }

  obj["media"] = {
    backImage: fileData.data?.backImage
      ? fileData.data?.backImage[0].filename
      : artworkData?.media?.backImage,
    images: images,
    inProcessImage: fileData.data?.inProcessImage
      ? fileData.data?.inProcessImage[0].filename
      : artworkData?.media?.inProcessImage,
    mainImage: fileData.data?.mainImage
      ? fileData.data?.mainImage[0].filename
      : artworkData?.media?.mainImage,
    mainVideo: fileData.data?.mainVideo
      ? fileData.data?.mainVideo[0].filename
      : artworkData?.media?.mainVideo,
    otherVideo: videos,
  };

  obj["additionalInfo"] = {
    artworkTechnic: req.body.artworkTechnic,
    artworkTheme: req.body.artworkTheme,
    artworkOrientation: req.body.artworkOrientation,
    material: req.body.material,
    weight: req.body.weight,
    length: req.body.length,
    height: req.body.height,
    width: req.body.width,
    hangingAvailable: req.body.hangingAvailable,
    hangingDescription: req.body.hangingDescription,
    framed: req.body.framed,
    framedDescription: req.body.framedDescription,
    frameHeight: req.body.frameHeight,
    frameLength: req.body.frameLength,
    frameWidth: req.body.frameWidth,
    artworkStyle: styleArr,
    emotions: emotionsArr,
    colors: colorsArr,
    offensive: req.body.offensive,
  };

  if (req?.body?.activeTab === "subscription") {
    obj["commercialization"] = {
      activeTab: req.body.activeTab,
      purchaseOption: req.body.purchaseOption,
      subscriptionCatalog: req.body.subscriptionCatalog,
    };
  } else {
    obj["commercialization"] = {
      activeTab: req.body.activeTab,
      purchaseCatalog: req.body.purchaseCatalog,
      artistbaseFees: req.body.artistbaseFees,
      downwardOffer: req.body.downwardOffer,
      upworkOffer: req.body.upworkOffer,
      acceptOfferPrice: req.body.acceptOfferPrice,
      priceRequest: req.body.priceRequest,
    };
  }

  obj["pricing"] = {
    currency: req.body.currency,
    basePrice: req.body.basePrice,
    dpersentage: req.body.dpersentage,
    vatAmount: req.body.vatAmount,
    artistFees: req.body.artistFees,
  };

  obj["inventoryShipping"] = {
    pCode: req.body.pCode,
    location: req.body.location,
  };

  obj["discipline"] = {
    artworkDiscipline: req.body.artworkDiscipline,
    artworkTags: tagsArr,
  };

  obj["promotions"] = {
    promotion: req.body.promotion,
    promotionScore: req.body.promotionScore,
  };

  obj["restriction"] = {
    availableTo: req.body.availableTo,
    discountAcceptation: req.body.discountAcceptation,
  };

  let condition = {
    $set: obj,
  };

  let artwork = null;

  if (id !== "null") {
    ArtWork.updateOne({ _id: id }, condition).then();
    return res.status(200).send({ message: "Artwork Editted Sucessfully" });
  } else {
    artwork = await ArtWork.create(obj);
    return res
      .status(200)
      .send({ message: "Artwork Added Sucessfully", artwork });
  }
});

const publishArtwork = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const artwork = await ArtWork.findOne(
    { _id: id, isDeleted: false },
    { status: 1 }
  ).lean(true);
  if (!artwork) return res.status(400).send({ message: "Artwork not found" });

  if (artwork.status === "draft") {
    ArtWork.updateOne({ _id: id }, { status: "pending" }).then();
    return res
      .status(200)
      .send({ message: "Artwork Published Sucessfully", data: artwork._id });
  } else {
    return res.status(400).send({ message: "Artwork Already Published" });
  }
});

const getArtistById = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { nameEmail } = req.query;
  const query = {};

  if (nameEmail) {
    query.$or = [
      { artistName: { $regex: nameEmail, $options: "i" } },
      { artistSurname1: { $regex: nameEmail, $options: "i" } },
      { artistSurname2: { $regex: nameEmail, $options: "i" } },
      { email: { $regex: nameEmail, $options: "i" } },
    ];
  }

  const artists = await Artist.find(
    {
      isDeleted: false,
      isActivated: true,
      ...query,
    },
    {
      email: 1,
      artistName: 1,
      artistSurname1: 1,
      artistSurname2: 1,
      artProvider: "$commercilization.artProvider",
      artistId: 1,
      userId: 1,
      avatar: 1,
    }
  ).lean(true);

  res.status(200).send({ data: artists });
});

const getAdminArtworkList = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const artworkList = await ArtWork.aggregate([
    {
      $match: {
        isDeleted: false,
        status: { $in: ["pending", "published", "rejected"] },
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "owner",
        foreignField: "_id",
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
      $project: {
        _id: 1,
        artistName: "$ownerInfo.artistName",
        artistSurname1: "$ownerInfo.artistSurname1",
        artistSurname2: "$ownerInfo.artistSurname2",
        isDeleted: 1,
        status: 1,
        media: 1,
        discipline: 1,
        artworkName: 1,
        artworkCreationYear: 1,
        artworkSeries: 1,
        productDescription: 1,
        artworkTechnic: "$additionalInfo.artworkTechnic",
        upworkOffer: "$commercialization.upworkOffer",
        createdAt: 1,
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  res
    .status(200)
    .send({ data: artworkList, url: "https://dev.freshartclub.com/images" });
});

const removeArtwork = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  await ArtWork.updateOne({ _id: id }, { $set: { status: "rejected" } });

  res.status(200).send({ message: "Artwork Removed Sucessfully" });
});

const getArtistArtwork = catchAsyncError(async (req, res, next) => {
  let { artworkType } = req.query;

  const matchQuery = {
    owner: req.user._id,
    isDeleted: false,
  };

  const groupByField =
    artworkType === "series"
      ? "$artworkSeries"
      : artworkType === "discipline"
      ? "$discipline.artworkDiscipline"
      : artworkType === "artprovider"
      ? "$provideArtistName"
      : null;

  let artworks = [];

  if (!groupByField) {
    artworks = await ArtWork.aggregate([
      { $match: matchQuery },
      // {
      //   $lookup: {
      //     from: "artists",
      //     localField: "owner",
      //     foreignField: "_id",
      //     as: "ownerInfo",
      //   },
      // },
      // { $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          status: 1,
          media: "$media.mainImage",
          artworkTechnic: "$additionalInfo.artworkTechnic",
          discipline: 1,
          artworkName: 1,
          createdAt: 1,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    return res
      .status(200)
      .send({ data: artworks, url: "https://dev.freshartclub.com/images" });
  } else {
    artworks = await ArtWork.aggregate([
      { $match: matchQuery },
      // {
      //   $lookup: {
      //     from: "artists",
      //     localField: "owner",
      //     foreignField: "_id",
      //     as: "ownerInfo",
      //   },
      // },
      { $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: groupByField,
          artworks: {
            $push: {
              _id: "$_id",
              status: "$status",
              media: "$media.mainImage",
              provideArtistName: "$provideArtistName",
              discipline: "$discipline",
              artworkName: "$artworkName",
              artworkTechnic: "$additionalInfo.artworkTechnic",
              discipline: "$discipline",
              artworkSeries: "$artworkSeries",
              createdAt: "$createdAt",
            },
          },
        },
      },
      {
        $project: {
          groupName: "$_id",
          artworks: 1,
          _id: 0,
        },
      },
      { $sort: { groupName: 1 } },
    ]);

    return res.status(200).send({
      data: artworks,
      url: "https://dev.freshartclub.com/images",
    });
  }
});

const getArtworkById = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  let artwork = null;
  let artworks = [];

  if (req.user?.roles && req.user?.roles === "superAdmin") {
    artwork = await ArtWork.findOne({ _id: id })
      .populate("owner", {
        artistName: 1,
        artistId: 1,
        artistSurname1: 1,
        artistSurname2: 1,
      })
      .lean(true);
  } else {
    artwork = await ArtWork.findOne({ _id: id })
      .populate("owner", {
        artistName: 1,
        artistSurname1: 1,
        artistSurname2: 1,
        address: 1,
        aboutArtist: 1,
        profile: 1,
      })
      .lean(true);

    artworks = await ArtWork.find({ owner: artwork.owner._id })
      .sort({ createdAt: -1 })
      .lean(true);
  }

  res.status(200).send({
    data: artwork,
    artworks: artworks,
    url: "https://dev.freshartclub.com/images",
  });
});

const getHomeArtwork = catchAsyncError(async (req, res, next) => {
  const [newAdded, highlighted, artists] = await Promise.all([
    ArtWork.find(
      {
        status: "published",
        isDeleted: false,
        updatedAt: { $gt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      },
      {
        media: 1,
        artworkName: 1,
        additionalInfo: 1,
        discipline: 1,
      }
    )
      .populate("owner", "artistName artistSurname1 artistSurname2")
      .lean(true),
    ArtWork.find(
      {
        status: "published",
      },
      {
        media: 1,
        artworkName: 1,
        additionalInfo: 1,
        discipline: 1,
      }
    )
      .populate("owner", "artistName artistSurname1 artistSurname2")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(true),
    Artist.find(
      {
        isActivated: true,
        isDeleted: false,
      },
      {
        artistName: 1,
        artistSurname1: 1,
        artistSurname2: 1,
        aboutArtist: 1,
        profile: 1,
      }
    )
      .limit(15)
      .lean(true),
  ]);

  res.status(200).send({
    newAdded,
    highlighted,
    artists,
    url: "https://dev.freshartclub.com/images",
  });
});

const addToRecentView = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const artwork = await ArtWork.countDocuments({ _id: id }).lean(true);
  if (!artwork) return res.status(400).send({ message: "Artwork not found" });

  const recentView = await RecentlyView.findOne({ owner: req.user._id }).lean(
    true
  );

  if (recentView) {
    if (recentView.artworks.includes(id)) {
      return res.status(200).send({ message: "Artwork Already Added" });
    } else {
      if (recentView.artworks.length < 15) {
        await RecentlyView.updateOne(
          { owner: req.user._id },
          { $push: { artworks: id } }
        );
      } else {
        await RecentlyView.updateOne(
          { owner: req.user._id },
          { $pop: { artworks: -1 }, $push: { artworks: id } }
        );
      }
    }
  } else {
    await RecentlyView.create({ owner: req.user._id, artworks: [id] });
  }

  res.status(200).send({ message: "Artwork Added to Recent View" });
});

const getRecentlyView = catchAsyncError(async (req, res, next) => {
  const recentViewd = await RecentlyView.findOne({ owner: req.user._id }).lean(
    true
  );

  const artworks = await ArtWork.find(
    { _id: { $in: recentViewd.artworks } },
    {
      media: 1,
      artworkName: 1,
      additionalInfo: 1,
      discipline: 1,
    }
  )
    .populate("owner", "artistName artistSurname1 artistSurname2")
    .lean(true);

  res.status(200).send({
    data: artworks,
    url: "https://dev.freshartclub.com/images",
  });
});

const validateArtwork = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const artwork = await ArtWork.findOne({ _id: id }, { status: 1 }).lean(true);
  if (!artwork) return res.status(400).send({ message: "Artwork not found" });

  if (artwork.status === "pending") {
    ArtWork.updateOne({ _id: id }, { status: "published" }).then();
    return res.status(200).send({ message: "Artwork successfully validated" });
  } else {
    return res
      .status(400)
      .send({ message: "Artwork is in draft or already validated" });
  }
});

const searchArtwork = catchAsyncError(async (req, res, next) => {
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

  const artworks = await ArtWork.find(
    {
      isDeleted: false,
      status: "published",
      artworkName: { $regex: s, $options: "i" },
    },
    { artworkName: 1, media: 1, inventoryShipping: 1 }
  ).lean(true);

  res.status(200).send({
    data: artworks,
    url: "https://dev.freshartclub.com/images",
  });
});

const getArtworkList = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);
  if (!admin) return res.status(400).send({ message: `Admin not found` });

  const { discipline, option } = req.query;
  let query = {};

  if (discipline) {
    query.discipline = { artworkDiscipline: discipline };
  }

  if (option) {
    query.commercialization = { activeTab: option };
  }

  const artworkList = await ArtWork.aggregate([
    {
      $match: {
        isDeleted: false,
        status: "success",
        ...query,
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "owner",
        foreignField: "_id",
        as: "ownerInfo",
      },
    },
    {
      $project: {
        _id: 1,
        artistName: "$ownerInfo.artistName",
        artistSurname1: "$ownerInfo.artistSurname1",
        artistSurname2: "$ownerInfo.artistSurname2",
        isDeleted: 1,
        status: 1,
        media: 1,
        discipline: 1,
        artworkName: 1,
        artworkCreationYear: 1,
        artworkSeries: 1,
        productDescription: 1,
        artworkTechnic: "$additionalInfo.artworkTechnic",
        upworkOffer: "$commercialization.upworkOffer",
        createdAt: 1,
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  res
    .status(200)
    .send({ data: artworkList, url: "https://dev.freshartclub.com/images" });
});

const addSeriesToArtist = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { seriesName } = req.body;

  const artist = await Artist.findOne(
    { _id: id },
    { artistSeriesList: 1 }
  ).lean(true);
  if (!artist) return res.status(400).send({ message: "Artist not found" });

  if (
    artist.artistSeriesList &&
    artist.artistSeriesList.length > 0 &&
    artist.artistSeriesList.find((item) => item == seriesName) !== undefined
  ) {
    return res.status(400).send({ message: "Series already exists" });
  }

  await Artist.updateOne(
    { _id: id },
    { $push: { artistSeriesList: seriesName } }
  );

  return res.status(200).send({ message: "Series added successfully" });
});

module.exports = {
  adminCreateArtwork,
  artistCreateArtwork,
  getAdminArtworkList,
  getArtistById,
  removeArtwork,
  getArtworkById,
  getArtistArtwork,
  publishArtwork,
  getHomeArtwork,
  addToRecentView,
  getRecentlyView,
  validateArtwork,
  searchArtwork,
  addSeriesToArtist,
};
