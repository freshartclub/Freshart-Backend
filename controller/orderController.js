const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const Artist = require("../models/artistModel");
const ArtWork = require("../models/artWorksModel");
const objectId = require("mongoose").Types.ObjectId;
const { fileUploadFunc } = require("../functions/common");
const Order = require("../models/orderModel");
const { getAccessToken } = require("../functions/getAccessToken");

const createOrder = catchAsyncError(async (req, res, next) => {
  const user = await Artist.findOne({ _id: req.user._id }, { cart: 1 }).lean(true);
  if (!user) return res.status(400).send({ message: "User not found" });
  let items = [];

  const orderID = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { type } = req.query;

  if (req.body.items) {
    items = req.body.items.map((item) => {
      return {
        artWork: objectId(item.id),
        quantity: 1,
      };
    });
  }

  let subTotal = 0;
  let totalDiscount = 0;
  let total = 0;

  let order;
  if (type === "purchase") {
    for (const item of items) {
      const artWork = await ArtWork.findOne({ _id: item.artWork }, { pricing: 1 }).lean(true);

      if (!artWork) {
        return res.status(400).send({ message: "Artwork not found" });
      }

      const itemTotal = Number(artWork.pricing.basePrice) * item.quantity;
      const itemDiscount = (artWork.pricing.dpersentage / 100) * itemTotal;
      subTotal += itemTotal;
      totalDiscount += itemDiscount;
    }

    total = subTotal - totalDiscount + req.body.shipping;
    const taxAmount = (total * Number(req.body.tax)) / 100;
    total = total + taxAmount;

    order = await Order.create({
      orderID: orderID,
      type: "purchase",
      user: user._id,
      status: "pending",
      tax: req.body.tax,
      taxAmount: taxAmount,
      billingAddress: req.body.billingAddress,
      shippingAddress: req.body.shippingAddress,
      shipping: req.body.shipping,
      discount: totalDiscount,
      subTotal: subTotal,
      total: total,
      items: items,
      note: req.body.note,
    });
  } else {
    order = await Order.create({
      orderID: orderID,
      type: "subscription",
      user: user._id,
      status: "pending",
      tax: 0,
      taxAmount: 0,
      billingAddress: req.body.billingAddress,
      shippingAddress: req.body.shippingAddress,
      shipping: 0,
      discount: 0,
      subTotal: 0,
      total: 0,
      items: items,
      note: req.body.note,
    });
  }

  const itemIds = items.map((item) => objectId(item.artWork));
  await Artist.updateOne({ _id: user._id }, { $pull: { cart: { item: { $in: itemIds } } } });

  return res.status(200).send({ message: "Order Created Successfully", data: order });
});

const getAllOrders = catchAsyncError(async (req, res, next) => {
  let { s } = req.query;
  s = s === "undefined" || typeof s === "undefined" ? "" : s;

  const orders = await Order.aggregate([
    {
      $unwind: "$items",
    },
    {
      $lookup: {
        from: "artworks",
        localField: "items.artWork",
        foreignField: "_id",
        as: "artWorkData",
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "user",
        foreignField: "_id",
        as: "userData",
      },
    },
    {
      $unwind: { path: "$userData", preserveNullAndEmptyArrays: true },
    },
    {
      $match: {
        $or: [
          { "userData.userId": { $regex: s, $options: "i" } },
          { "userData.artistId": { $regex: s, $options: "i" } },
          { "userData.artistName": { $regex: s, $options: "i" } },
          { orderID: { $regex: s, $options: "i" } },
        ],
      },
    },
    {
      $group: {
        _id: "$_id",
        orderID: { $first: "$orderID" },
        type: { $first: "$type" },
        status: { $first: "$status" },
        tax: { $first: "$tax" },
        shipping: { $first: "$shipping" },
        discount: { $first: "$discount" },
        total: { $first: "$total" },
        subTotal: { $first: "$subTotal" },
        createdAt: { $first: "$createdAt" },
        updatedAt: { $first: "$updatedAt" },
        user: { $first: "$userData" },
        items: {
          $push: {
            quantity: "$items.quantity",
            artWork: {
              _id: { $arrayElemAt: ["$artWorkData._id", 0] },
              artworkId: { $arrayElemAt: ["$artWorkData.artworkId", 0] },
              artworkName: { $arrayElemAt: ["$artWorkData.artworkName", 0] },
              media: { $arrayElemAt: ["$artWorkData.media.mainImage", 0] },
              inventoryShipping: {
                $arrayElemAt: ["$artWorkData.inventoryShipping", 0],
              },
              pricing: { $arrayElemAt: ["$artWorkData.pricing", 0] },
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        orderID: 1,
        type: 1,
        status: 1,
        tax: 1,
        shipping: 1,
        total: 1,
        discount: 1,
        subTotal: 1,
        createdAt: 1,
        updatedAt: 1,
        items: 1,
        "user.artistName": 1,
        "user.artistSurname1": 1,
        "user.artistSurname2": 1,
        "user.email": 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  return res.status(200).send({ data: orders });
});

const getAllUserOrders = catchAsyncError(async (req, res, next) => {
  const orders = await Order.aggregate([
    { $match: { user: req.user._id } },
    {
      $lookup: {
        from: "artworks",
        localField: "items.artWork",
        foreignField: "_id",
        as: "artWorkData",
      },
    },
    {
      $addFields: {
        items: {
          $cond: {
            if: { $isArray: "$items" },
            then: {
              $map: {
                input: "$items",
                as: "item",
                in: {
                  quantity: "$$item.quantity",
                  artWork: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$artWorkData",
                          as: "artWork",
                          cond: { $eq: ["$$artWork._id", "$$item.artWork"] },
                        },
                      },
                      0,
                    ],
                  },
                },
              },
            },
            else: [],
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        user: 1,
        type: 1,
        status: 1,
        orderID: 1,
        discount: 1,
        tax: 1,
        shipping: 1,
        subTotal: 1,
        createdAt: 1,
        updatedAt: 1,
        "items.quantity": 1,
        "item.artWorkId": 1,
        "items.artWork._id": 1,
        "items.artWork.artworkName": 1,
        "items.artWork.media.mainImage": 1,
        "items.artWork.inventoryShipping": 1,
        "items.artWork.pricing": 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  const transformOrders = (orders) => {
    return orders.flatMap((order) =>
      order.items.map((item) => ({
        _id: order._id,
        user: order.user,
        type: order.type,
        status: order.status,
        orderID: order.orderID,
        discount: order.discount,
        tax: order.tax,
        shipping: order.shipping,
        subTotal: order.subTotal,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        artwork: {
          _id: item.artWork._id,
          artWorkId: item.artWork.artworkId,
          quantity: item.quantity,
          type: item.type,
          artworkName: item.artWork.artworkName,
          media: item.artWork.media.mainImage,
          inventoryShipping: item.artWork.inventoryShipping,
          pricing: item.artWork.pricing,
        },
      }))
    );
  };

  const transformOrderList = transformOrders(orders);

  return res.status(200).send({
    data: transformOrderList,
  });
});

const getArtistOrders = catchAsyncError(async (req, res, next) => {
  const loggedUserId = req.user._id;

  const user = await Artist.findOne({ _id: loggedUserId }, { role: 1 }).lean(true);
  if (!user) return res.status(400).send({ message: "Artist not found" });
  if (user.role !== "artist") return res.status(400).send({ message: "You are not authorized to access this page" });

  const orders = await Order.aggregate([
    {
      $lookup: {
        from: "artworks",
        localField: "items.artWork",
        foreignField: "_id",
        as: "artWorkDetails",
      },
    },
    { $unwind: "$artWorkDetails" },
    {
      $lookup: {
        from: "artists",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $match: {
        "artWorkDetails.owner": user._id,
      },
    },
    {
      $project: {
        _id: 1,
        status: 1,
        type: 1,
        tax: 1,
        taxAmount: 1,
        shipping: 1,
        discount: 1,
        subTotal: 1,
        items: 1,
        image: "$artWorkDetails.media.mainImage",
        artWorkName: "$artWorkDetails.artworkName",
        currency: "$artWorkDetails.pricing.currency",
        artistName: "$user.artistName",
        artistSurname1: "$user.artistSurname1",
        artistSurname2: "$user.artistSurname2",
        email: "$user.email",
        length: "$artWorkDetails.additionalInfo.length",
        height: "$artWorkDetails.additionalInfo.height",
        width: "$artWorkDetails.additionalInfo.width",
        orderID: 1,
        createdAt: 1,
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  return res.status(200).send({ data: orders });
});

const getArtistSingleOrder = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  if (!id) return res.status(400).send({ message: "Please provide valid order id" });

  const artistId = req.user._id;
  const artist = await Artist.countDocuments({ _id: artistId }).lean(true);
  if (!artist) return res.status(400).send({ message: "Artist not found" });

  const order = await Order.aggregate([
    {
      $match: {
        _id: objectId(id),
      },
    },
    {
      $unwind: "$items",
    },
    {
      $lookup: {
        from: "artworks",
        localField: "items.artWork",
        foreignField: "_id",
        as: "artWorkData",
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "user",
        foreignField: "_id",
        as: "userData",
      },
    },
    {
      $unwind: { path: "$userData", preserveNullAndEmptyArrays: true },
    },
    {
      $addFields: {
        "items.artWork": {
          _id: { $arrayElemAt: ["$artWorkData._id", 0] },
          artWorkId: { $arrayElemAt: ["$artWorkData.artworkId", 0] },
          owner: { $arrayElemAt: ["$artWorkData.owner", 0] },
          artworkName: { $arrayElemAt: ["$artWorkData.artworkName", 0] },
          media: { $arrayElemAt: ["$artWorkData.media.mainImage", 0] },
          inventoryShipping: {
            $arrayElemAt: ["$artWorkData.inventoryShipping", 0],
          },
          pricing: { $arrayElemAt: ["$artWorkData.pricing", 0] },
        },
      },
    },
    {
      $match: {
        $expr: {
          $eq: ["$items.artWork.owner", objectId(artistId)],
        },
      },
    },
    {
      $group: {
        _id: "$_id",
        orderID: { $first: "$orderID" },
        type: { $first: "$type" },
        status: { $first: "$status" },
        tax: { $first: "$tax" },
        shipping: { $first: "$shipping" },
        discount: { $first: "$discount" },
        total: { $first: "$total" },
        taxAmount: { $first: "$taxAmount" },
        subTotal: { $first: "$subTotal" },
        createdAt: { $first: "$createdAt" },
        user: { $first: "$userData" },
        items: {
          $push: {
            quantity: "$items.quantity",
            evidenceImg: "$items.evidenceImg",
            isCancelled: "$items.isCancelled",
            cancelReason: "$items.cancelReason",
            artWork: "$items.artWork",
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        orderID: 1,
        status: 1,
        total: 1,
        taxAmount: 1,
        tax: 1,
        shipping: 1,
        discount: 1,
        subTotal: 1,
        createdAt: 1,
        updatedAt: 1,
        items: 1,
        user: {
          artistName: "$user.artistName",
          artistSurname1: "$user.artistSurname1",
          artistSurname2: "$user.artistSurname2",
          email: "$user.email",
          mainImage: "$user.profile.mainImage",
        },
      },
    },
  ]);

  return res.status(200).send({
    data: order[0],
  });
});

const getUserSingleOrder = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { artworkId } = req.query;

  if (!id || !artworkId) return res.status(400).send({ message: "Please provide valid orderId" });

  const order = await Order.aggregate([
    {
      $match: {
        user: objectId(req.user._id),
        _id: objectId(id),
      },
    },
    {
      $unwind: "$items",
    },
    {
      $lookup: {
        from: "artworks",
        localField: "items.artWork",
        foreignField: "_id",
        as: "artWorkData",
      },
    },
    {
      $project: {
        _id: 1,
        orderID: 1,
        status: 1,
        tax: 1,
        type: 1,
        shipping: 1,
        discount: 1,
        subTotal: 1,
        createdAt: 1,
        updatedAt: 1,
        shippingAddress: 1,
        billingAddress: 1,
        note: 1,
        items: {
          quantity: "$items.quantity",
          rating: "$items.rating",
          review: "$items.review",
          evidenceImg: "$items.evidenceImg",
          isCancelled: "$items.isCancelled",
          cancelReason: "$items.cancelReason",
          artWork: {
            _id: { $arrayElemAt: ["$artWorkData._id", 0] },
            artworkId: { $arrayElemAt: ["$artWorkData.artworkId", 0] },
            owner: { $arrayElemAt: ["$artWorkData.owner", 0] },
            artworkName: { $arrayElemAt: ["$artWorkData.artworkName", 0] },
            media: { $arrayElemAt: ["$artWorkData.media.mainImage", 0] },
            inventoryShipping: {
              $arrayElemAt: ["$artWorkData.inventoryShipping", 0],
            },
            pricing: { $arrayElemAt: ["$artWorkData.pricing", 0] },
          },
        },
      },
    },
  ]);

  const getArtwork = order.find((item) => item.items.artWork._id == artworkId);

  const getOtherArtwork = order.filter((item) => item.items.artWork._id != artworkId);

  return res.status(200).send({
    foundArt: getArtwork,
    otherArt: getOtherArtwork,
  });
});

const acceptRejectOrderRequest = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  let { status } = req.body;

  if (!id) return res.status(404).send({ message: "OrderId not found" });

  if (status !== "accept" && status !== "reject") return res.status(400).send({ message: "Please provide valid status" });

  if (status === "accept") {
    status = "accepted";
  } else {
    status = "rejected";
  }

  await Order.updateOne({ _id: id }, { $set: { status: status } });
  return res.status(200).send({ message: `Order Request ${status}` });
});

const getAdminOrderDetails = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return res.status(404).send({ message: "OrderId not found" });

  const order = await Order.aggregate([
    {
      $match: {
        _id: objectId(id),
      },
    },
    {
      $unwind: "$items",
    },
    {
      $lookup: {
        from: "artworks",
        localField: "items.artWork",
        foreignField: "_id",
        as: "artWorkData",
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "user",
        foreignField: "_id",
        as: "userData",
      },
    },
    {
      $unwind: { path: "$userData", preserveNullAndEmptyArrays: true },
    },
    {
      $group: {
        _id: "$_id",
        orderID: { $first: "$orderID" },
        status: { $first: "$status" },
        type: { $first: "$type" },
        tax: { $first: "$tax" },
        shipping: { $first: "$shipping" },
        discount: { $first: "$discount" },
        subTotal: { $first: "$subTotal" },
        shippingAddress: { $first: "$shippingAddress" },
        billingAddress: { $first: "$billingAddress" },
        total: { $first: "$total" },
        createdAt: { $first: "$createdAt" },
        updatedAt: { $first: "$updatedAt" },
        user: { $first: "$userData" },
        items: {
          $push: {
            quantity: "$items.quantity",
            evidenceImg: "$items.evidenceImg",
            isCancelled: "$items.isCancelled",
            cancelReason: "$items.cancelReason",

            artWork: {
              _id: { $arrayElemAt: ["$artWorkData._id", 0] },
              artworkId: { $arrayElemAt: ["$artWorkData.artworkId", 0] },
              artworkName: { $arrayElemAt: ["$artWorkData.artworkName", 0] },
              media: { $arrayElemAt: ["$artWorkData.media.mainImage", 0] },
              inventoryShipping: {
                $arrayElemAt: ["$artWorkData.inventoryShipping", 0],
              },
              pricing: { $arrayElemAt: ["$artWorkData.pricing", 0] },
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        orderID: 1,
        status: 1,
        type: 1,
        tax: 1,
        shipping: 1,
        discount: 1,
        subTotal: 1,
        total: 1,
        shippingAddress: 1,
        billingAddress: 1,
        createdAt: 1,
        updatedAt: 1,
        items: 1,
        "user.artistName": 1,
        "user.artistSurname1": 1,
        "user.artistSurname2": 1,
        "user.email": 1,
        "user.profile.mainImage": 1,
      },
    },
  ]);

  return res.status(200).send({ data: order[0] });
});

const uploadEvedience = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return res.status(404).send({ message: "OrderId not found" });

  let imgArr = [];
  const fileData = await fileUploadFunc(req, res);
  if (fileData.status === 400) return res.status(400).send({ message: "Please provide evidence image" });

  if (fileData.data?.evidenceImg) {
    fileData.data?.evidenceImg.forEach((img) => imgArr.push(img.filename));
  }

  const { artworkId } = req.body;

  if (!artworkId) return res.status(400).send({ message: "Please provide artworkId" });

  const existingImg = await Order.findOne(
    {
      _id: id,
      "items.artWork": objectId(artworkId),
    },
    { items: 1 }
  ).lean(true);

  const selectedItem = existingImg.items.find((item) => item.artWork.toString() === artworkId);

  if (selectedItem.evidenceImg && selectedItem.evidenceImg.length > 0) {
    for (let i = 0; i < selectedItem.evidenceImg.length; i++) {
      imgArr.push(selectedItem.evidenceImg[i]);
    }
  }

  await Order.updateOne({ _id: id, "items.artWork": objectId(artworkId) }, { $set: { "items.$.evidenceImg": imgArr } });

  return res.status(200).send({ message: "Evidence Uploaded" });
});

const cancelParticularItemFromOrder = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return res.status(404).send({ message: "OrderId not found" });

  const { reason, description, artworkId, title } = req.body;
  if (!artworkId) return res.status(400).send({ message: "Please provide artworkId" });

  let obj = {
    reason: reason,
    description: description,
  };

  const alreadyCancelled = await Order.findOne({
    _id: id,
    "items.artWork": objectId(artworkId),
    "items.isCancelled": true,
  });

  if (alreadyCancelled) {
    return res.status(400).send({ message: "Item already cancelled" });
  }

  await OrderModel.updateOne(
    { _id: id, "items.artWork": objectId(artworkId) },
    { $set: { "items.$.isCancelled": true, "items.$.cancelReason": obj } }
  );

  return res.status(200).send({ message: `Artwork - "${title}" cancelled successfully` });
});

const giveReview = catchAsyncError(async (req, res, next) => {
  const { id, artworkId } = req.params;
  if (!id || !artworkId) return res.status(404).send({ message: "OrderId not found" });

  const { rating, review } = req.body;
  if (!rating || !review) return res.status(400).send({ message: "Please provide rating and review" });

  const updateResult = await Order.updateOne(
    { _id: id, "items.artWork": objectId(artworkId) },
    {
      $set: {
        "items.$.rating": rating,
        "items.$.review": review,
      },
    }
  );

  if (updateResult.modifiedCount === 0) {
    return res.status(404).send({ message: "Artwork not found in the order" });
  }

  return res.status(200).send({ message: "Review given successfully" });
});

const getToken = catchAsyncError(async (req, res, next) => {
  const token = await getAccessToken();

  return res.status(200).send({ token: token });
});

module.exports = {
  createOrder,
  getAllOrders,
  getAllUserOrders,
  getArtistSingleOrder,
  getArtistOrders,
  acceptRejectOrderRequest,
  uploadEvedience,
  cancelParticularItemFromOrder,
  getAdminOrderDetails,
  getUserSingleOrder,
  giveReview,
  getToken,
};
