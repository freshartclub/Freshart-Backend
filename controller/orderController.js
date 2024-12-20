const Admin = require("../models/adminModel");
const catchAsyncError = require("../functions/catchAsyncError");
const Artist = require("../models/artistModel");
const ArtWork = require("../models/artWorksModel");
const SubscriptionOrder = require("../models/subscriptionOrderModel");
const PurchaseOrder = require("../models/purchaseOrderModel");
const objectId = require("mongoose").Types.ObjectId;
const { fileUploadFunc } = require("../functions/common");

const createOrder = catchAsyncError(async (req, res, next) => {
  const user = await Artist.findOne({ _id: req.user._id }, { cart: 1 }).lean(
    true
  );
  if (!user) return res.status(400).send({ message: "User not found" });
  let items = [];

  const orderID = Math.random().toString(36).substring(2, 8).toUpperCase();

  if (req.body.items) {
    items = req.body.items.map((item) => {
      return {
        artWork: objectId(item.id),
        quantity: item.quantity,
      };
    });
  }

  const orderType = req.body.orderType;

  const OrderModel =
    orderType === "subscription" ? SubscriptionOrder : PurchaseOrder;

  // let price = 0;
  // for (let i = 0; i < items.length; i++) {
  //   const artWork = await ArtWork.findOne(
  //     { _id: items[i].artWork },
  //     { pricing: 1 }
  //   ).lean(true);
  //   price += artWork.price * items[i].quantity;
  // }

  const order = await OrderModel.create({
    orderID: orderID,
    user: user._id,
    status: "pending",
    tax: req.body.tax,
    shipping: req.body.shipping,
    discount: req.body.discount,
    subTotal: req.body.subTotal,
    total: req.body.total,
    items: items,
  });

  const itemIds = items.map((item) => objectId(item.artWork));
  await Artist.updateOne(
    { _id: user._id },
    { $pull: { cart: { item: { $in: itemIds } } } }
  );

  return res
    .status(200)
    .send({ message: "Order Created Successfully", data: order });
});

const collectBilling = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { orderType } = req.query;

  if (!id || !orderType) {
    return res.status(404).send({ message: "OrderId not found" });
  }

  const OrderModel =
    orderType === "subscription" ? SubscriptionOrder : PurchaseOrder;
  const order = await OrderModel.findOne({ _id: id }, { _id: 1 }).lean(true);
  if (!order) return res.status(400).send({ message: "Order not found" });

  let obj = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address,
    city: req.body.city,
    state: req.body.state,
    country: req.body.country,
    zipCode: req.body.zipCode,
    companyName: req.body.companyName,
  };

  await OrderModel.updateOne({ _id: id }, { $set: { billing: obj } });

  return res.status(200).send({ message: "Billing Info Added" });
});

const getAllSubscriptionOrder = catchAsyncError(async (req, res, next) => {
  const orders = await SubscriptionOrder.aggregate([
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
        orderType: { $first: "$orderType" },
        status: { $first: "$status" },
        tax: { $first: "$tax" },
        shipping: { $first: "$shipping" },
        discount: { $first: "$discount" },
        subTotal: { $first: "$subTotal" },
        createdAt: { $first: "$createdAt" },
        updatedAt: { $first: "$updatedAt" },
        user: { $first: "$userData" },
        items: {
          $push: {
            quantity: "$items.quantity",
            artWork: {
              _id: { $arrayElemAt: ["$artWorkData._id", 0] },
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
        orderType: 1,
        status: 1,
        tax: 1,
        shipping: 1,
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

  return res
    .status(200)
    .send({ data: orders, url: "https://dev.freshartclub.com/images" });
});

const getAllPurchaseOrder = catchAsyncError(async (req, res, next) => {
  const orders = await PurchaseOrder.aggregate([
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
        orderType: { $first: "$orderType" },
        tax: { $first: "$tax" },
        shipping: { $first: "$shipping" },
        discount: { $first: "$discount" },
        subTotal: { $first: "$subTotal" },
        createdAt: { $first: "$createdAt" },
        updatedAt: { $first: "$updatedAt" },
        user: { $first: "$userData" },
        items: {
          $push: {
            quantity: "$items.quantity",
            artWork: {
              _id: { $arrayElemAt: ["$artWorkData._id", 0] },
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
        orderType: 1,
        status: 1,
        tax: 1,
        shipping: 1,
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

  return res
    .status(200)
    .send({ data: orders, url: "https://dev.freshartclub.com/images" });
});

const getAllUserOrder = catchAsyncError(async (req, res, next) => {
  const subOrdersPipeline = [
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
        status: 1,
        orderType: 1,
        orderID: 1,
        discount: 1,
        tax: 1,
        shipping: 1,
        subTotal: 1,
        createdAt: 1,
        updatedAt: 1,
        "items.quantity": 1,
        "items.artWork._id": 1,
        "items.artWork.artworkName": 1,
        "items.artWork.media.mainImage": 1,
        "items.artWork.inventoryShipping": 1,
        "items.artWork.pricing": 1,
      },
    },
  ];

  const purchaseOrdersPipeline = [
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
        status: 1,
        orderType: 1,
        orderID: 1,
        discount: 1,
        tax: 1,
        shipping: 1,
        subTotal: 1,
        createdAt: 1,
        updatedAt: 1,
        "items.quantity": 1,
        "items.artWork._id": 1,
        "items.artWork.artworkName": 1,
        "items.artWork.media.mainImage": 1,
        "items.artWork.inventoryShipping": 1,
        "items.artWork.pricing": 1,
      },
    },
  ];

  // Execute pipelines
  const [subOrders, purchaseOrders] = await Promise.all([
    SubscriptionOrder.aggregate(subOrdersPipeline),
    PurchaseOrder.aggregate(purchaseOrdersPipeline),
  ]);

  const transformOrders = (orders, type) => {
    return orders.flatMap((order) =>
      order.items.map((item) => ({
        _id: order._id,
        user: order.user,
        status: order.status,
        orderType: order.orderType,
        orderID: order.orderID,
        discount: order.discount,
        tax: order.tax,
        shipping: order.shipping,
        subTotal: order.subTotal,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        artwork: {
          _id: item.artWork._id,
          quantity: item.quantity,
          artworkName: item.artWork.artworkName,
          media: item.artWork.media.mainImage,
          inventoryShipping: item.artWork.inventoryShipping,
          pricing: item.artWork.pricing,
        },
      }))
    );
  };

  const transformedSubOrders = transformOrders(subOrders, "subscription");
  const transformedPurchaseOrders = transformOrders(purchaseOrders, "purchase");

  return res.status(200).send({
    subscription: transformedSubOrders,
    purchase: transformedPurchaseOrders,
    url: "https://dev.freshartclub.com/images",
  });
});

const getArtistOrder = catchAsyncError(async (req, res, next) => {
  const loggedUserId = req.user._id;

  const user = await Artist.findOne({ _id: loggedUserId }, { role: 1 }).lean(
    true
  );
  if (!user) return res.status(400).send({ message: "Artist not found" });
  if (user.role !== "artist")
    return res
      .status(400)
      .send({ message: "You are not authorized to access this page" });

  const [subOrder, purchaseOrder] = await Promise.all([
    SubscriptionOrder.aggregate([
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
          "artWorkDetails.owner": objectId(loggedUserId),
        },
      },
      {
        $project: {
          _id: 1,
          status: 1,
          tax: 1,
          shipping: 1,
          subTotal: 1,
          items: 1,
          image: "$artWorkDetails.media.mainImage",
          artWorkName: "$artWorkDetails.artworkName",
          artistName: "$user.artistName",
          artistSurname1: "$user.artistSurname1",
          artistSurname2: "$user.artistSurname2",
          email: "$user.email",
          length: "$artWorkDetails.additionalInfo.length",
          height: "$artWorkDetails.additionalInfo.height",
          width: "$artWorkDetails.additionalInfo.width",
          orderID: 1,
          orderType: 1,
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]),
    PurchaseOrder.aggregate([
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
          "artWorkDetails.owner": objectId(loggedUserId),
        },
      },
      {
        $project: {
          _id: 1,
          status: 1,
          tax: 1,
          image: "$artWorkDetails.media.mainImage",
          artWorkName: "$artWorkDetails.artworkName",
          artistName: "$user.artistName",
          artistSurname1: "$user.artistSurname1",
          artistSurname2: "$user.artistSurname2",
          email: "$user.email",
          length: "$artWorkDetails.additionalInfo.length",
          height: "$artWorkDetails.additionalInfo.height",
          width: "$artWorkDetails.additionalInfo.width",
          shipping: 1,
          subTotal: 1,
          orderID: 1,
          items: 1,
          orderType: 1,
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]),
  ]);

  return res.status(200).send({
    subscription: subOrder,
    purchase: purchaseOrder,
    url: "https://dev.freshartclub.com/images",
  });
});

const getArtistSingleOrder = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { orderType } = req.query;

  if (!id || !orderType)
    return res
      .status(400)
      .send({ message: "Please provide valid order id and order type" });

  const artistId = req.user._id;
  const artist = await Artist.countDocuments({ _id: artistId }).lean(true);
  if (!artist) return res.status(400).send({ message: "Artist not found" });

  const OrderModel =
    orderType === "subscription" ? SubscriptionOrder : PurchaseOrder;

  const order = await OrderModel.aggregate([
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
        status: { $first: "$status" },
        tax: { $first: "$tax" },
        orderType: { $first: "$orderType" },
        shipping: { $first: "$shipping" },
        discount: { $first: "$discount" },
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
        tax: 1,
        shipping: 1,
        orderType: 1,
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

  return res
    .status(200)
    .send({ data: order[0], url: "https://dev.freshartclub.com/images" });
});

const getUserSingleOrder = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { orderType, artworkId } = req.query;

  if (!id || !orderType || !artworkId)
    return res
      .status(400)
      .send({ message: "Please provide valid order id and order type" });

  const OrderModel =
    orderType === "subscription" ? SubscriptionOrder : PurchaseOrder;

  const order = await OrderModel.aggregate([
    {
      $match: {
        user: objectId(req.user._id),
        _id: objectId(id),
        "items.artWork": objectId(artworkId),
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
        shipping: 1,
        orderType: 1,
        discount: 1,
        subTotal: 1,
        createdAt: 1,
        updatedAt: 1,
        items: {
          quantity: "$items.quantity",
          evidenceImg: "$items.evidenceImg",
          isCancelled: "$items.isCancelled",
          cancelReason: "$items.cancelReason",
          artWork: {
            _id: { $arrayElemAt: ["$artWorkData._id", 0] },
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

  return res
    .status(200)
    .send({ data: order[0], url: "https://dev.freshartclub.com/images" });
});

const acceptRejectOrderRequest = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { orderType } = req.query;
  let { status } = req.body;

  if (!id || !orderType)
    return res.status(404).send({ message: "OrderId not found" });

  if (status !== "accept" && status !== "reject")
    return res.status(400).send({ message: "Please provide valid status" });

  if (status === "accept") {
    status = "accepted";
  } else {
    status = "rejected";
  }

  if (orderType.toLowerCase() === "subscription") {
    await SubscriptionOrder.updateOne(
      { _id: id },
      { $set: { status: status } }
    );

    return res.status(200).send({ message: `Order Request ${status}` });
  } else if (orderType.toLowerCase() === "purchase") {
    await PurchaseOrder.updateOne({ _id: id }, { $set: { status: status } });

    return res.status(200).send({ message: `Order Request ${status}` });
  } else {
    return res.status(400).send({ message: "Please provide valid order type" });
  }
});

const getAdminOrderDetails = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { orderType } = req.query;

  if (!id || !orderType)
    return res.status(404).send({ message: "OrderId not found" });

  const OrderModel =
    orderType === "subscription" ? SubscriptionOrder : PurchaseOrder;

  const order = await OrderModel.aggregate([
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
        tax: { $first: "$tax" },
        orderType: { $first: "$orderType" },
        shipping: { $first: "$shipping" },
        discount: { $first: "$discount" },
        subTotal: { $first: "$subTotal" },
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
        tax: 1,
        shipping: 1,
        orderType: 1,
        discount: 1,
        subTotal: 1,
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

  return res
    .status(200)
    .send({ data: order[0], url: "https://dev.freshartclub.com/images" });
});

const uploadEvedience = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { orderType } = req.query;

  let imgArr = [];
  const fileData = await fileUploadFunc(req, res);

  if (fileData.data?.evidenceImg) {
    fileData.data?.evidenceImg.forEach((img) => imgArr.push(img.filename));
  }

  const { artworkId } = req.body;

  const OrderModel =
    orderType === "subscription" ? SubscriptionOrder : PurchaseOrder;

  await OrderModel.updateOne(
    { _id: id, "items.artWork": objectId(artworkId) },
    { $set: { "items.$.evidenceImg": imgArr } }
  );

  return res.status(200).send({ message: "Evidence Uploaded" });
});

const cancelParticularItemFromOrder = catchAsyncError(
  async (req, res, next) => {
    const { id } = req.params;
    const { orderType } = req.query;

    const { reason, description, artworkId, title } = req.body;
    if (!artworkId)
      return res.status(400).send({ message: "Please provide artwork id" });

    let obj = {
      reason: reason,
      description: description,
    };

    const OrderModel =
      orderType === "subscription" ? SubscriptionOrder : PurchaseOrder;

    const alreadyCancelled = await OrderModel.findOne({
      _id: id,
      "items.artWork": objectId(artworkId),
      "items.isCancelled": true,
    });

    if (alreadyCancelled) {
      return res.status(400).send({ message: "Artwork already cancelled" });
    }

    await OrderModel.updateOne(
      { _id: id, "items.artWork": objectId(artworkId) },
      { $set: { "items.$.isCancelled": true, "items.$.cancelReason": obj } }
    );

    return res
      .status(200)
      .send({ message: `Artwork - "${title}" cancelled successfully` });
  }
);

module.exports = {
  createOrder,
  getAllSubscriptionOrder,
  getAllPurchaseOrder,
  getAllUserOrder,
  getArtistSingleOrder,
  getArtistOrder,
  acceptRejectOrderRequest,
  // getCombinedArtistOrder,
  uploadEvedience,
  cancelParticularItemFromOrder,
  getAdminOrderDetails,
  getUserSingleOrder,
};
