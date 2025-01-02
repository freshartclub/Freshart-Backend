const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const Artist = require("../models/artistModel");
const ArtWork = require("../models/artWorksModel");
const RecentlyView = require("../models/recentlyView");
const { fileUploadFunc, generateRandomId } = require("../functions/common");
const objectId = require("mongoose").Types.ObjectId;
const Catalog = require("../models/catalogModel");

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
    { media: 1, status: 1, artworkId: 1, commercialization: 1, lastModified: 1 }
  ).lean(true);

  const isArtwork = artwork ? true : false;

  if (isArtwork && artwork.status === "modified") {
    return res.status(400).send({
      message: `Artwork already modified. First approve the changes.`,
    });
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
    artworkCreationYear: req.body.artworkCreationYear
      ? req.body.artworkCreationYear
      : new Date().getFullYear(),
    artworkSeries: req.body.artworkSeries ? req.body.artworkSeries : "N/A",
    productDescription: req.body.productDescription,
    isArtProvider: req.body.isArtProvider,
    artworkId: isArtwork ? artwork?.artworkId : "ARW-" + generateRandomId(),
    owner: id,
  };

  if (req.body?.isArtProvider === "Yes") {
    obj["provideArtistName"] = req.body.provideArtistName;
  }

  obj["media"] = {
    backImage: fileData.data?.backImage?.length
      ? fileData.data?.backImage[0].filename
      : req.body?.hasBackImg === "true"
      ? artwork?.media?.backImage
      : null,
    images: newImageArr,
    inProcessImage: fileData.data?.inProcessImage?.length
      ? fileData.data?.inProcessImage[0].filename
      : req.body?.hasInProcessImg === "true"
      ? artwork?.media?.inProcessImage
      : null,
    mainImage: fileData.data?.mainImage?.length
      ? fileData.data?.mainImage[0].filename
      : req.body?.hasMainImg === "true"
      ? artwork?.media?.mainImage
      : null,
    mainVideo: fileData.data?.mainVideo?.length
      ? fileData.data?.mainVideo[0].filename
      : req.body?.hasMainVideo === "true"
      ? artwork?.media?.mainVideo
      : null,
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
      subscriptionCatalog: objectId(req.body.subscriptionCatalog),
    };
  } else {
    obj["commercialization"] = {
      activeTab: req.body.activeTab,
      purchaseCatalog: objectId(req.body.purchaseCatalog),
      purchaseType: req.body.purchaseType,
    };
  }

  if (req.body?.activeTab === "subscription") {
    obj["pricing"] = {
      currency: req.body.currency,
      basePrice: req.body.basePrice,
      dpersentage: Number(req.body.dpersentage),
      vatAmount: Number(req.body.vatAmount),
      artistFees: req.body.artistFees,
    };
  } else {
    obj["pricing"] = {
      currency: req.body.currency,
      basePrice: req.body.basePrice,
      acceptOfferPrice: req.body.acceptOfferPrice,
      dpersentage: Number(req.body.dpersentage),
      vatAmount: Number(req.body.vatAmount),
      artistFees: req.body.artistFees,
    };
  }

  obj["inventoryShipping"] = {
    pCode: req.body.pCode,
    location: req.body.location,
    comingSoon: Boolean(req.body.comingSoon),
    packageMaterial: req.body.packageMaterial,
    packageWeight: req.body.packageWeight,
    packageLength: req.body.packageLength,
    packageHeight: req.body.packageHeight,
    packageWidth: req.body.packageWidth,
  };

  obj["discipline"] = {
    artworkDiscipline: req.body.artworkDiscipline,
  };

  obj["promotions"] = {
    promotion: req.body.promotion,
    promotionScore: Number(req.body.promotionScore),
  };

  obj["restriction"] = {
    availableTo: req.body.availableTo,
    discountAcceptation: req.body.discountAcceptation,
  };

  obj["tags"] = {
    intTags:
      typeof req.body.intTags === "string"
        ? [req.body.intTags]
        : req.body.intTags,
    extTags:
      typeof req.body.extTags === "string"
        ? [req.body.extTags]
        : req.body.extTags,
  };

  let date = [];

  if (isArtwork && artwork.lastModified) {
    date = [...artwork.lastModified];
  }
  date.push(new Date());

  if (isArtwork && artwork.status === "published") {
    obj["lastModified"] = date;
  }

  let condition = {
    $set: obj,
  };

  if (artworkId) {
    ArtWork.updateOne({ _id: artworkId }, condition).then();

    const newCatalogId =
      req.body.activeTab === "subscription"
        ? req.body.subscriptionCatalog
        : req.body.purchaseCatalog;

    const existingCatalogId =
      artwork.commercialization?.purchaseCatalog ||
      artwork.commercialization?.subscriptionCatalog;

    if (newCatalogId !== existingCatalogId) {
      Promise.all([
        Catalog.updateOne(
          { _id: existingCatalogId, artworkList: artworkId },
          { $pull: { artworkList: artworkId } }
        ),
        Catalog.updateOne(
          { _id: newCatalogId, artworkList: { $ne: artworkId } },
          { $push: { artworkList: artworkId } }
        ),
      ]);
    }

    return res.status(200).send({
      message: "Artwork Editted Sucessfully",
      data: { _id: artworkId },
    });
  } else {
    const artwork = await ArtWork.create(obj);

    const catalogId = req.body.subscriptionCatalog
      ? req.body.subscriptionCatalog
      : req.body.purchaseCatalog;

    await Catalog.updateOne(
      { _id: catalogId },
      { $push: { artworkList: artwork._id } }
    );

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
      { media: 1, status: 1, artworkId: 1, lastModified: 1 }
    ).lean(true);

    if (!artworkData) {
      return res.status(400).send({ message: `Artwork not found` });
    }
  }

  if (artworkData && artworkData.status !== "draft") {
    return res.status(400).send({
      message: `You already published/modified this artwork.`,
    });
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
  let intTagsArr = [];
  let extTagsArr = [];

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

  if (req.body.intTags) {
    const intTags = Array.isArray(req.body.intTags)
      ? req.body.intTags.map((item) => JSON.parse(item))
      : req.body.intTags;

    if (typeof intTags === "string") {
      intTagsArr.push(intTags.replace(/^"|"$/g, ""));
    } else {
      intTags.forEach((element) => {
        intTagsArr.push(element);
      });
    }
  }

  if (req.body.extTags) {
    const extTags = Array.isArray(req.body.extTags)
      ? req.body.extTags.map((item) => JSON.parse(item))
      : req.body.extTags;

    if (typeof extTags === "string") {
      extTagsArr.push(extTags.replace(/^"|"$/g, ""));
    } else {
      extTags.forEach((element) => {
        extTagsArr.push(element);
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
    artworkSeries: req.body.artworkSeries ? req.body.artworkSeries : "N/A",
    productDescription: req.body.productDescription,
    isArtProvider: req.body.isArtProvider,
    artworkId:
      artworkData === null
        ? "ARW-" + generateRandomId()
        : artworkData?.artworkId,
    owner: artist._id,
  };

  if (req.body?.isArtProvider === "Yes") {
    obj["provideArtistName"] = req.body.provideArtistName;
  }

  obj["media"] = {
    backImage: fileData.data?.backImage?.length
      ? fileData.data?.backImage[0].filename
      : req.body?.hasBackImg === "true"
      ? artworkData?.media?.backImage
      : null,
    images: images,
    inProcessImage: fileData.data?.inProcessImage?.length
      ? fileData.data?.inProcessImage[0].filename
      : req.body?.hasInProcessImg === "true"
      ? artworkData?.media?.inProcessImage
      : null,
    mainImage: fileData.data?.mainImage?.length
      ? fileData.data?.mainImage[0].filename
      : req.body?.hasMainImg === "true"
      ? artworkData?.media?.mainImage
      : null,
    mainVideo: fileData.data?.mainVideo?.length
      ? fileData.data?.mainVideo[0].filename
      : req.body?.hasMainVideo === "true"
      ? artworkData?.media?.mainVideo
      : null,
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
      subscriptionCatalog: objectId(req.body.subscriptionCatalog),
    };
  } else {
    obj["commercialization"] = {
      activeTab: req.body.activeTab,
      purchaseCatalog: objectId(req.body.purchaseCatalog),
      purchaseType: req.body.purchaseType,
    };
  }

  if (req.body?.activeTab === "subscription") {
    obj["pricing"] = {
      currency: req.body.currency,
      basePrice: req.body.basePrice,
      dpersentage: Number(req.body.dpersentage),
      vatAmount: Number(req.body.vatAmount),
      artistFees: req.body.artistFees,
    };
  } else {
    obj["pricing"] = {
      currency: req.body.currency,
      basePrice: req.body.basePrice,
      acceptOfferPrice: req.body.acceptOfferPrice,
      dpersentage: Number(req.body.dpersentage),
      vatAmount: Number(req.body.vatAmount),
      artistFees: req.body.artistFees,
    };
  }

  obj["inventoryShipping"] = {
    pCode: req.body.pCode,
    location: req.body.location,
    comingSoon: req.body.comingSoon === "true" ? true : false,
    packageMaterial: req.body.packageMaterial,
    packageWeight: req.body.packageWeight,
    packageLength: req.body.packageLength,
    packageHeight: req.body.packageHeight,
    packageWidth: req.body.packageWidth,
  };

  obj["discipline"] = {
    artworkDiscipline: req.body.artworkDiscipline,
  };

  obj["restriction"] = {
    availableTo: req.body.availableTo,
    discountAcceptation: req.body.discountAcceptation,
  };

  obj["tags"] = {
    intTags: intTagsArr,
    extTags: extTagsArr,
  };

  let date = [];

  if (artworkData && artworkData.lastModified) {
    date = [...artworkData.lastModified];
  }
  date.push(new Date());

  if (artworkData && artworkData.status === "published") {
    obj["status"] = "modified";
    obj["lastModified"] = date;
  }

  let condition = {
    $set: obj,
  };

  let artwork = null;

  if (id !== "null") {
    ArtWork.updateOne({ _id: id }, condition).then();

    const newCatalogId =
      req.body.activeTab === "subscription"
        ? req.body.subscriptionCatalog
        : req.body.purchaseCatalog;

    const existingCatalogId =
      artworkData.commercialization?.purchaseCatalog ||
      artworkData.commercialization?.subscriptionCatalog;

    if (newCatalogId !== existingCatalogId) {
      Promise.all([
        Catalog.updateOne(
          { _id: existingCatalogId, artworkList: artworkData._id },
          { $pull: { artworkList: artworkData._id } }
        ),
        Catalog.updateOne(
          { _id: newCatalogId, artworkList: { $ne: artworkData._id } },
          { $push: { artworkList: artworkData._id } }
        ),
      ]);
    }

    return res.status(200).send({ message: "Artwork Editted Sucessfully" });
  } else {
    artwork = await ArtWork.create(obj);

    const catalogId = req.body.subscriptionCatalog
      ? req.body.subscriptionCatalog
      : req.body.purchaseCatalog;

    await Catalog.updateOne(
      { _id: catalogId },
      { $push: { artworkList: artwork._id } }
    );

    return res
      .status(200)
      .send({ message: "Artwork Added Sucessfully", artwork });
  }
});

const artistModifyArtwork = catchAsyncError(async (req, res, next) => {
  const artist = await Artist.findOne(
    { _id: req.user._id, isDeleted: false },
    { isActivated: 1 }
  ).lean(true);
  if (!artist) return res.status(400).send({ message: `Artist not found` });

  const { id } = req.params;

  if (!artist.isActivated) {
    return res.status(400).send({ message: `Artist not activated` });
  }

  let artworkData = await ArtWork.findOne(
    { _id: id, isDeleted: false },
    { media: 1, status: 1, artworkId: 1, lastModified: 1 }
  ).lean(true);

  if (!artworkData) {
    return res.status(400).send({ message: `Artwork not found` });
  }

  if (artworkData.status === "modified") {
    return res.status(400).send({
      message: `You already modified this artwork. Wait for admin approval`,
    });
  }

  if (artworkData.status !== "published") {
    return res.status(400).send({
      message: `You cannot modify this artwork.`,
    });
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
  let intTagsArr = [];
  let extTagsArr = [];

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

  if (req.body.intTags) {
    const intTags = Array.isArray(req.body.intTags)
      ? req.body.intTags.map((item) => JSON.parse(item))
      : req.body.intTags;

    if (typeof intTags === "string") {
      intTagsArr.push(intTags.replace(/^"|"$/g, ""));
    } else {
      intTags.forEach((element) => {
        intTagsArr.push(element);
      });
    }
  }

  if (req.body.extTags) {
    const extTags = Array.isArray(req.body.extTags)
      ? req.body.extTags.map((item) => JSON.parse(item))
      : req.body.extTags;

    if (typeof extTags === "string") {
      extTagsArr.push(extTags.replace(/^"|"$/g, ""));
    } else {
      extTags.forEach((element) => {
        extTagsArr.push(element);
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
    artworkSeries: req.body.artworkSeries ? req.body.artworkSeries : "N/A",
    productDescription: req.body.productDescription,
    isArtProvider: req.body.isArtProvider ? req.body.isArtProvider : "No",
  };

  if (req.body?.isArtProvider === "Yes") {
    obj["provideArtistName"] = req.body.provideArtistName;
  }

  obj["media"] = {
    backImage: fileData.data?.backImage?.length
      ? fileData.data?.backImage[0].filename
      : req.body?.hasBackImg === "true"
      ? artworkData?.media?.backImage
      : null,
    images: images,
    inProcessImage: fileData.data?.inProcessImage?.length
      ? fileData.data?.inProcessImage[0].filename
      : req.body?.hasInProcessImg === "true"
      ? artworkData?.media?.inProcessImage
      : null,
    mainImage: fileData.data?.mainImage?.length
      ? fileData.data?.mainImage[0].filename
      : req.body?.hasMainImg === "true"
      ? artworkData?.media?.mainImage
      : null,
    mainVideo: fileData.data?.mainVideo?.length
      ? fileData.data?.mainVideo[0].filename
      : req.body?.hasMainVideo === "true"
      ? artworkData?.media?.mainVideo
      : null,
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
      subscriptionCatalog: objectId(req.body.subscriptionCatalog),
    };
  } else {
    obj["commercialization"] = {
      activeTab: req.body.activeTab,
      purchaseCatalog: objectId(req.body.purchaseCatalog),
      purchaseType: req.body.purchaseType,
    };
  }

  if (req.body?.activeTab === "subscription") {
    obj["pricing"] = {
      currency: req.body.currency,
      basePrice: req.body.basePrice,
      dpersentage: Number(req.body.dpersentage),
      vatAmount: Number(req.body.vatAmount),
      artistFees: req.body.artistFees,
    };
  } else {
    obj["pricing"] = {
      currency: req.body.currency,
      basePrice: req.body.basePrice,
      acceptOfferPrice: req.body.acceptOfferPrice,
      dpersentage: Number(req.body.dpersentage),
      vatAmount: Number(req.body.vatAmount),
      artistFees: req.body.artistFees,
    };
  }

  obj["inventoryShipping"] = {
    pCode: req.body.pCode,
    location: req.body.location,
    comingSoon: req.body.comingSoon === "true" ? true : false,
    packageMaterial: req.body.packageMaterial,
    packageWeight: req.body.packageWeight,
    packageLength: req.body.packageLength,
    packageHeight: req.body.packageHeight,
    packageWidth: req.body.packageWidth,
  };

  obj["discipline"] = {
    artworkDiscipline: req.body.artworkDiscipline,
  };

  obj["restriction"] = {
    availableTo: req.body.availableTo,
    discountAcceptation: req.body.discountAcceptation,
  };

  obj["tags"] = {
    intTags: intTagsArr,
    extTags: extTagsArr,
  };

  let date = [];
  if (artworkData.lastModified) date = [...artworkData.lastModified];
  date.push(new Date());

  obj["lastModified"] = date;

  ArtWork.updateOne(
    { _id: id, isDeleted: false },
    { $set: { reviewDetails: obj, status: "modified" } }
  ).then();

  return res.status(200).send({ message: "Artwork Modified Successfully" });
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

  const artists = await Artist.aggregate([
    {
      $match: {
        isDeleted: false,
        isActivated: true,
        $or: [
          { artistName: { $regex: nameEmail, $options: "i" } },
          { artistSurname1: { $regex: nameEmail, $options: "i" } },
          { artistSurname2: { $regex: nameEmail, $options: "i" } },
          { email: { $regex: nameEmail, $options: "i" } },
        ],
      },
    },
    {
      $project: {
        email: 1,
        artistName: 1,
        nickName: 1,
        artistSurname1: 1,
        artistSurname2: 1,
        artProvider: "$commercilization.artProvider",
        mainImage: "$profile.mainImage",
        artistId: 1,
        userId: 1,
        _id: 1,
      },
    },
  ]);

  res
    .status(200)
    .send({ data: artists, url: "https://dev.freshartclub.com/images" });
});

const getAdminArtworkList = catchAsyncError(async (req, res, next) => {
  const admin = await Admin.countDocuments({
    _id: req.user._id,
    isDeleted: false,
  }).lean(true);

  if (!admin) return res.status(400).send({ message: `Admin not found` });

  let { s, status, days } = req.query;
  if (status == "All") {
    status = "";
  }

  if (s == "undefined") {
    s = "";
  } else if (typeof s === "undefined") {
    s = "";
  }

  if (days === "All") {
    days = "";
  }

  let filter = {};
  if (days) {
    const dateLimit = new Date();

    if (days === "1 Day") {
      dateLimit.setDate(dateLimit.getDate() - 1);
      filter["createdAt"] = { $gte: dateLimit };
    } else if (days === "1 Week") {
      dateLimit.setDate(dateLimit.getDate() - 7);
      filter["createdAt"] = { $gte: dateLimit };
    } else if (days === "1 Month") {
      dateLimit.setMonth(dateLimit.getMonth() - 1);
      filter["createdAt"] = { $gte: dateLimit };
    } else if (days === "1 Quarter") {
      dateLimit.setMonth(dateLimit.getMonth() - 3);
      filter["createdAt"] = { $gte: dateLimit };
    } else if (days === "1 Year") {
      dateLimit.setFullYear(dateLimit.getFullYear() - 1);
      filter["createdAt"] = { $gte: dateLimit };
    }
  }

  const artworkList = await ArtWork.aggregate([
    {
      $match: {
        isDeleted: false,
        status: { $regex: status, $options: "i" },
        ...(filter.createdAt ? { createdAt: filter.createdAt } : {}),
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
      $match: {
        $or: [
          { artworkName: { $regex: s, $options: "i" } },
          { artworkId: { $regex: s, $options: "i" } },
          { "ownerInfo.artistName": { $regex: s, $options: "i" } },
          { "ownerInfo.artistId": { $regex: s, $options: "i" } },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        artworkId: 1,
        artistId: "$ownerInfo.artistId",
        artistName: "$ownerInfo.artistName",
        artistSurname1: "$ownerInfo.artistSurname1",
        artistSurname2: "$ownerInfo.artistSurname2",
        isDeleted: 1,
        status: 1,
        media: 1,
        discipline: 1,
        artworkName: 1,
        artworkCreationYear: 1,
        isArtProvider: 1,
        artworkSeries: 1,
        productDescription: 1,
        artworkTechnic: "$additionalInfo.artworkTechnic",
        upworkOffer: "$commercialization.upworkOffer",
        activeTab: "$commercialization.activeTab",
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
  if (!id) return res.status(400).send({ message: "Artwork Id is required" });

  const artwork = await ArtWork.findOne({ _id: id }).lean(true);
  if (!artwork) return res.status(400).send({ message: "Artwork not found" });

  if (artwork.status === "rejected") {
    return res
      .status(400)
      .send({ message: "Artwork already rejected or removed" });
  }

  await ArtWork.updateOne({ _id: id }, { $set: { status: "rejected" } });

  res.status(200).send({ message: "Artwork Removed Sucessfully" });
});

const moveArtworkToPending = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return res.status(400).send({ message: "Artwork Id is required" });

  const artwork = await ArtWork.findOne({ _id: id }).lean(true);
  if (!artwork) return res.status(400).send({ message: "Artwork not found" });

  if (artwork.status !== "rejected") {
    return res
      .status(400)
      .send({ message: "Artwork already in pending status" });
  }

  await ArtWork.updateOne({ _id: id }, { $set: { status: "pending" } });

  res.status(200).send({ message: "Artwork Moved to Pending Sucessfully" });
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
  let { preview } = req.query;

  let artwork = null;
  let artworks = [];

  if (req.user?.roles && req.user?.roles === "superAdmin") {
    artwork = await ArtWork.aggregate([
      {
        $match: {
          _id: objectId(id),
          isDeleted: false,
        },
      },
      {
        $set: {
          catalogField: {
            $ifNull: [
              "$commercialization.purchaseCatalog",
              "$commercialization.subscriptionCatalog",
            ],
          },
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
        $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "catalogs",
          localField: "catalogField",
          foreignField: "_id",
          as: "catalogInfo",
        },
      },
      {
        $unwind: { path: "$catalogInfo", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 1,
          status: 1,
          artworkId: 1,
          isHighlighted: 1,
          isArtProvider: 1,
          provideArtistName: 1,
          owner: {
            _id: "$ownerInfo._id",
            artistName: "$ownerInfo.artistName",
            artistId: "$ownerInfo.artistId",
            artistSurname1: "$ownerInfo.artistSurname1",
            artistSurname2: "$ownerInfo.artistSurname2",
          },
          rejectReason: 1,
          artworkName: 1,
          artworkCreationYear: 1,
          artworkSeries: 1,
          productDescription: 1,
          collectionList: 1,
          media: 1,
          additionalInfo: 1,
          commercialization: {
            $mergeObjects: [
              "$commercialization",
              {
                publishingCatalog: {
                  _id: "$catalogInfo._id",
                  catalogName: "$catalogInfo.catalogName",
                },
              },
            ],
          },
          pricing: 1,
          inventoryShipping: 1,
          discipline: 1,
          promotions: 1,
          restriction: 1,
          tags: 1,
          catalogInfo: 1,
        },
      },
    ]);
  } else {
    artwork = await ArtWork.aggregate([
      {
        $match: {
          _id: objectId(id),
        },
      },
      {
        $set: {
          catalogField: {
            $ifNull: [
              "$commercialization.purchaseCatalog",
              "$commercialization.subscriptionCatalog",
            ],
          },
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
        $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "catalogs",
          localField: "catalogField",
          foreignField: "_id",
          as: "catalogInfo",
        },
      },
      {
        $unwind: { path: "$catalogInfo", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 1,
          status: 1,
          artworkId: 1,
          isHighlighted: 1,
          isArtProvider: 1,
          provideArtistName: 1,
          owner: {
            _id: "$ownerInfo._id",
            artistName: "$ownerInfo.artistName",
            artistId: "$ownerInfo.artistId",
            artistSurname1: "$ownerInfo.artistSurname1",
            artistSurname2: "$ownerInfo.artistSurname2",
            address: "$ownerInfo.address",
            aboutArtist: "$ownerInfo.aboutArtist",
            profile: "$ownerInfo.profile",
          },
          rejectReason: 1,
          artworkName: 1,
          artworkCreationYear: 1,
          artworkSeries: 1,
          productDescription: 1,
          collectionList: 1,
          media: 1,
          additionalInfo: 1,
          commercialization: {
            $mergeObjects: [
              "$commercialization",
              {
                publishingCatalog: {
                  _id: "$catalogInfo._id",
                  catalogName: "$catalogInfo.catalogName",
                },
              },
            ],
          },
          pricing: 1,
          inventoryShipping: 1,
          discipline: 1,
          promotions: 1,
          restriction: 1,
          tags: 1,
        },
      },
    ]);

    if (preview == "false") {
      artworks = await ArtWork.find({ owner: artwork[0].owner._id })
        .limit(7)
        .sort({ createdAt: -1 })
        .lean(true);
    }
  }

  res.status(200).send({
    data: artwork[0],
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

  const artworks = await ArtWork.aggregate([
    {
      $lookup: {
        from: "artists",
        localField: "owner",
        foreignField: "_id",
        as: "artist",
      },
    },
    {
      $match: {
        isDeleted: false,
        status: "published",
        $or: [
          { artworkName: { $regex: s, $options: "i" } },
          { artworkId: { $regex: s, $options: "i" } },
          { "artist.artistName": { $regex: s, $options: "i" } },
        ],
      },
    },

    {
      $project: {
        artworkId: 1,
        artworkName: 1,
        artistName: "$artist.artistName",
        artistSurname1: "$artist.artistSurname1",
        artistSurname2: "$artist.artistSurname2",
        nickname: "$artist.nickName",
        media: "$media.mainImage",
        inventoryShipping: 1,
      },
    },
  ]);

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
  let { id } = req.params;
  if (!id) id = req.user._id;
  const { seriesName } = req.body;

  if (!seriesName)
    return res.status(400).send({ message: "Series name is required" });

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
    { $push: { artistSeriesList: seriesName.trim() } }
  );

  return res.status(200).send({ message: "Series added successfully" });
});

const getAllArtworks = catchAsyncError(async (req, res, next) => {
  const artist = await Artist.findOne(
    { _id: req.user._id },
    { role: 1 }
  ).lean();
  if (!artist) return res.status(400).send({ message: "Artist not found" });

  let {
    type,
    page = 1,
    limit = 10,
    search,
    discipline,
    theme,
    technic,
  } = req.query;

  if (!type)
    return res.status(400).send({ message: "Artwork Type is required" });
  type = type.toLowerCase();
  search = search ? search : "";

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;

  if (pageNum < 1 || limitNum < 1) {
    return res
      .status(400)
      .send({ message: "Page and limit must be positive integers" });
  }

  const totalItems = await ArtWork.countDocuments({
    isDeleted: false,
    "commercialization.activeTab": type,
  });

  const totalPages = Math.ceil(totalItems / limitNum);

  const artworks = await ArtWork.aggregate([
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
      $match: {
        isDeleted: false,
        status: "published",
        "commercialization.activeTab": type,
        $or: [
          { "ownerInfo.artistName": { $regex: search, $options: "i" } },
          { "ownerInfo.artistSurname1": { $regex: search, $options: "i" } },
          { "ownerInfo.artistSurname2": { $regex: search, $options: "i" } },
          { artworkName: { $regex: search, $options: "i" } },
        ],
        ...(discipline && { "discipline.artworkDiscipline": discipline }),
        ...(theme && { "additionalInfo.artworkTheme": theme }),
        ...(technic && { "additionalInfo.artworkTechnic": technic }),
      },
    },
    {
      $project: {
        _id: 1,
        artworkName: 1,
        artistName: "$ownerInfo.artistName",
        artistSurname1: "$ownerInfo.artistSurname1",
        artistSurname2: "$ownerInfo.artistSurname2",
        provideArtistName: "$provideArtistName",
        media: "$media.mainImage",
        artworkId: 1,
        artworkCreationYear: 1,
        artworkSeries: 1,
        discipline: "$discipline.artworkDiscipline",
        pricing: 1,
        artworkTechnic: 1,
        additionalInfo: 1,
        commercialization: 1,
        owner: 1,
        status: 1,
      },
    },
    { $skip: (pageNum - 1) * limitNum },
    { $limit: limitNum },
    { $sort: { createdAt: -1 } },
  ]);

  res.status(200).send({
    data: artworks,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems,
    },
    url: "https://dev.freshartclub.com/images",
  });
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
  moveArtworkToPending,
  artistModifyArtwork,
  getAllArtworks,
};
