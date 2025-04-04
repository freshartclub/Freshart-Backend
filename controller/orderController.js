const catchAsyncError = require("../functions/catchAsyncError");
const Artist = require("../models/artistModel");
const ArtWork = require("../models/artWorksModel");
const objectId = require("mongoose").Types.ObjectId;
const { fileUploadFunc, generateRandomOrderId, generateSchedulerRef } = require("../functions/common");
const Order = require("../models/orderModel");
const crypto = require("crypto");
const countries = require("i18n-iso-countries");
const Transaction = require("../models/transactionModel");
const Plan = require("../models/plansModel");
const Subscription = require("../models/subscriptionModel");
const { v4: uuidv4 } = require("uuid");
const { Builder, parseStringPromise } = require("xml2js");
const axios = require("axios");
const Invite = require("../models/inviteModel");
const SubscriptionTransaction = require("../models/subscriptionTransaction");

function getTimestamp() {
  const now = new Date();
  return now
    .toISOString()
    .replace(/[-T:.Z]/g, "")
    .slice(0, 14);
}

const createOrder = catchAsyncError(async (req, res, next) => {
  const user = await Artist.findOne({ _id: req.user._id }, { cart: 1, billingInfo: 1 }).lean();
  if (!user) return res.status(400).send({ message: "User not found" });
  const { time, currency } = req.body;
  const orderId = uuidv4();

  let items = [];
  let fullItemsDetails = [];

  if (req.body?.items?.length == 0) {
    return res.status(400).send({ message: "Please select artwork" });
  }

  const defaultBilling = user.billingInfo.find((i) => i.isDefault == true);
  let address;

  if (req.body?.shippingAddress) {
    address = req.body.shippingAddress;
  } else {
    address = {
      email: defaultBilling?.billingDetails?.billingEmail,
      address: defaultBilling?.billingDetails?.billingAddress,
      city: defaultBilling?.billingDetails?.billingCity,
      state: defaultBilling?.billingDetails?.billingState,
      zipCode: defaultBilling?.billingDetails?.billingZipCode,
      country: defaultBilling?.billingDetails?.billingCountry,
      phone: defaultBilling?.billingDetails?.billingPhone,
    };
  }

  let subTotal = 0;
  let totalDiscount = 0;
  let total = 0;

  function getNumericCountryCode(countryName) {
    const alpha2 = countries.getAlpha3Code(countryName, "en");
    return alpha2 ? countries.alpha3ToNumeric(alpha2) : "Unknown";
  }

  const isoCountry = getNumericCountryCode(defaultBilling.billingDetails.billingCountry);

  if (req.body.type === "purchase") {
    for (const item of req.body.items) {
      const artwork = await ArtWork.findOne(
        { _id: item, status: "published", "commercialization.activeTab": "purchase", "inventoryShipping.comingSoon": false },
        { status: 1, pricing: 1 }
      ).lean();
      if (artwork && artwork.status == "published") {
        items.push(item);

        subTotal += Number(artwork.pricing.basePrice);
        totalDiscount += (artwork.pricing.dpersentage / 100) * Number(artwork.pricing.basePrice);

        fullItemsDetails.push({
          _id: item,
          subTotal: Number(artwork.pricing.basePrice),
          totalDiscount: (artwork.pricing.dpersentage / 100) * Number(artwork.pricing.basePrice),
          discount: artwork.pricing.dpersentage,
        });
      }
    }

    if (items.length == 0) return res.status(400).send({ message: "Please select artwork" });

    total = subTotal - totalDiscount + Number(req.body.shipping);
    const taxAmount = (total * Number(req.body.tax)) / 100;
    total = total + Number(taxAmount.toFixed(2));

    await Order.create({
      orderId: orderId,
      type: "purchase",
      user: user._id,
      status: "created",
      tax: req.body.tax,
      taxAmount: taxAmount,
      billingAddress: defaultBilling.billingDetails,
      shippingAddress: address,
      shipping: req.body.shipping,
      discount: totalDiscount,
      subTotal: subTotal,
      total: total,
      items: fullItemsDetails.map((i) => {
        return {
          artwork: i._id,
          other: {
            subTotal: i.subTotal,
            totalDiscount: i.totalDiscount,
            discount: i.discount,
          },
        };
      }),
      currency: currency,
      note: req.body.note,
    });

    const amountRound = total * 100;

    const hashString = `${time}.${process.env.MERCHANT_ID}.${orderId}.${amountRound}.${currency}`;
    const hash1 = crypto.createHash("sha1").update(hashString).digest("hex");

    const finalString = `${hash1}.${process.env.SECRET}`;
    const sha1Hash = crypto.createHash("sha1").update(finalString).digest("hex");

    return res
      .status(200)
      .send({ message: "Order Created Successfully", data: sha1Hash, orderId: orderId, amount: amountRound, currency: currency, iso: isoCountry });
  } else {
    for (const item of req.body.items) {
      const artwork = await ArtWork.findOne(
        { _id: item, status: "published", "commercialization.activeTab": "subscription" },
        { status: 1, pricing: 1 }
      ).lean();
      if (artwork && artwork.status == "published") items.push(item);

      subTotal += Number(artwork.pricing.basePrice);
      totalDiscount += (artwork.pricing.dpersentage / 100) * Number(artwork.pricing.basePrice);

      fullItemsDetails.push({
        _id: item,
        subTotal: Number(artwork.pricing.basePrice),
        totalDiscount: (artwork.pricing.dpersentage / 100) * Number(artwork.pricing.basePrice),
        discount: artwork.pricing.dpersentage,
      });
    }

    if (items.length == 0) return res.status(400).send({ message: "Please select artwork" });

    total = subTotal - totalDiscount + Number(req.body.shipping);
    const taxAmount = (total * Number(req.body.tax)) / 100;
    total = total + Number(taxAmount.toFixed(2));

    await Order.create({
      orderId: orderId,
      type: "subscription",
      user: user._id,
      status: "created",
      tax: 0,
      taxAmount: 0,
      billingAddress: defaultBilling.billingDetails,
      shippingAddress: address,
      shipping: req.body.shipping,
      discount: 0,
      subTotal: 0,
      total: 0,
      items: fullItemsDetails.map((i) => {
        return {
          artwork: i._id,
          other: {
            subTotal: i.subTotal,
            totalDiscount: i.totalDiscount,
            discount: i.discount,
          },
        };
      }),
      note: req.body.note,
    });

    const amountRound = total * 100;

    const hashString = `${time}.${process.env.MERCHANT_ID}.${orderId}.${amountRound}.${currency}`;
    const hash1 = crypto.createHash("sha1").update(hashString).digest("hex");

    const finalString = `${hash1}.${process.env.SECRET}`;
    const sha1Hash = crypto.createHash("sha1").update(finalString).digest("hex");

    return res
      .status(200)
      .send({ message: "Order Created Successfully", data: sha1Hash, orderId: orderId, amount: amountRound, currency: currency, iso: isoCountry });
  }
});

const checkPayerExist = catchAsyncError(async (req, res, next) => {
  const user = await Artist.findOne({ _id: req.user._id }, { artistName: 1, card: 1, billingInfo: 1, isSubscribed: 1 }).lean();
  if (!user) return res.status(400).send({ message: "User not found" });

  if (!user?.card?.pay_ref) {
    if (user.billingInfo.length > 0) {
      const findDefaultBilling = user.billingInfo.find((i) => i.isDefault == true);
      return res.status(200).send({ data: false, billing: findDefaultBilling.billingDetails });
    }
    return res.status(200).send({ data: false, billing: {} });
  }

  if (user?.card?.pay_ref && user?.card?.card_stored == false) {
    return res.status(200).send({ data: true, status: "inactive", store: false });
  }

  if (user?.isSubscribed && user?.isSubscribed == true) {
    return res.status(200).send({ data: true, status: "active", store: true });
  }

  return res.status(200).send({ data: true, status: "inactive", store: true });
});

const createPayer = catchAsyncError(async (req, res, next) => {
  const user = await Artist.findOne({ _id: req.user._id }, { artistName: 1, card: 1, billingInfo: 1 }).lean();
  if (!user) return res.status(400).send({ message: "User not found" });

  if (user && user?.card?.pay_ref) {
    return res.status(400).send({ message: "Payer already exist" });
  }

  const MERCHANT_ID = process.env.MERCHANT_ID;
  const SECRET = process.env.SECRET;

  const timestamp = getTimestamp();
  const orderId = generateRandomOrderId();
  const amount = "";
  const currency = "";
  const pay_ref = uuidv4();

  // -------------- hash -------------
  const hashString = `${timestamp}.${MERCHANT_ID}.${orderId}.${amount}.${currency}.${pay_ref}`;
  const hash1 = crypto.createHash("sha1").update(hashString).digest("hex");

  const finalString = `${hash1}.${SECRET}`;
  const sha1Hash = crypto.createHash("sha1").update(finalString).digest("hex");
  // -------------- hash -------------

  function getCountryCode(countryName) {
    return countries.getAlpha2Code(countryName, "en");
  }

  const isoCountry = getCountryCode(req.body.country);
  const state50Char = req.body.state.length > 47 ? req.body.state.substring(0, 47) : req.body.billingState;

  // --------------------- XML Request ---------------------
  function generateXmlRequest() {
    const builder = new Builder({ headless: true });
    const xmlObj = {
      request: {
        $: { type: "payer-new", timestamp },
        merchantid: MERCHANT_ID,
        account: "internet",
        orderid: orderId,
        payer: {
          $: { ref: pay_ref, type: "Retail" },
          title: "Sr.",
          firstname: req.body.firstName,
          surname: req.body.lastName,
          company: "Addon Payments",
          address: {
            line1: req.body.address,
            city: req.body.city,
            county: state50Char,
            postcode: req.body.zipCode,
            country: { $: { code: isoCountry }, _: req.body.country },
          },
          phonenumbers: {
            mobile: req.body.phone,
          },
          email: req.body.email,
        },
        comments: {
          comment: [{ $: { id: "1" }, _: "Payment Done" }],
        },
        sha1hash: sha1Hash,
      },
    };

    const xmlBody = builder.buildObject(xmlObj);
    return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;
  }

  const xmlRequest = generateXmlRequest();

  const response = await axios.post(`https://remote.sandbox.addonpayments.com/remote`, xmlRequest, {
    headers: {
      "Content-Type": "text/xml",
    },
  });

  const parseResponse = await parseStringPromise(response.data);

  if (parseResponse.response.result[0] !== "00") {
    return res.status(400).send({ message: parseResponse.response.message[1] });
  }

  await Artist.updateOne(
    { _id: req.user._id },
    {
      $set: {
        card: {
          pay_ref: pay_ref,
          card_stored: false,
        },
      },
    }
  );

  return res.status(200).send({ message: "Payer created successfully" });
});

// when card is not stored...
const createPayerSubscribeUser = catchAsyncError(async (req, res, next) => {
  const user = await Artist.findOne({ _id: req.user._id }, { artistName: 1, card: 1, invite: 1, userId: 1, isSubscribed: 1 }).lean();
  if (!user) return res.status(400).send({ message: "User not found" });

  if (user?.isSubscribed && user?.isSubscribed == true) {
    return res.status(400).send({ message: "You already have an active subscription" });
  }

  function decryptData(encryptedData, encryptionKey) {
    const [ivBase64, ciphertext, receivedHmacBase64] = encryptedData.split(":");

    const iv = Buffer.from(ivBase64, "base64");
    const receivedHmac = Buffer.from(receivedHmacBase64, "base64");

    const calculatedHmac = crypto.createHmac("sha256", encryptionKey).update(ciphertext).digest();

    if (!crypto.timingSafeEqual(calculatedHmac, receivedHmac)) {
      throw new Error("HMAC verification failed. Data may have been tampered with.");
    }

    const decipher = crypto.createDecipheriv("aes-256-cbc", encryptionKey, iv);
    let decrypted = decipher.update(ciphertext, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted);
  }

  const SERVER_SECRET = process.env.CRYPTO_KEY;
  const SALT = "hggci8y97tdyrhty087et786stge78r6rt867vui9u097t86rth";

  const derivedKey = crypto.pbkdf2Sync(SERVER_SECRET, SALT, 100000, 32, "sha256");

  const encryptedCardData = req.body.plan;
  const decryptedData = decryptData(encryptedCardData, derivedKey);

  if (!decryptedData) {
    return res.status(400).json({ error: "Invalid encryption or tampered data" });
  }

  if (decryptedData.cardType == "") {
    return res.status(400).send({ message: "Card Type not detected. Only Visa, Mastercard, Amex and Discover card are supported" });
  }

  if (user && !user?.card?.pay_ref) {
    return res.status(400).send({ message: "Your Basic information not found" });
  }

  if (user && user?.card?.card_stored == true) {
    return res.status(400).send({ message: "Card Info already exist" });
  }

  const plan = await Plan.findOne({ _id: decryptedData.planId }, { planName: 1, standardPrice: 1, standardYearlyPrice: 1 }).lean();
  if (!plan) return res.status(400).send({ message: "Plan not found" });

  const MERCHANT_ID = process.env.MERCHANT_ID;
  const SECRET = process.env.SECRET;

  // -------------------------- one time payment ----------------------
  const payTime = getTimestamp();
  const payOrderId = generateRandomOrderId();
  const payAmount = String(plan.standardPrice * 100);
  const payCurr = "EUR";

  const payHashString = `${payTime}.${MERCHANT_ID}.${payOrderId}.${payAmount}.${payCurr}.${decryptedData.cardNumber}`;
  const payHash1 = crypto.createHash("sha1").update(payHashString).digest("hex");

  const payFinalString = `${payHash1}.${SECRET}`;
  const paySha1Hash = crypto.createHash("sha1").update(payFinalString).digest("hex");

  function generatePaymentXmlRequest(paymentData) {
    const builder = new Builder({ headless: true });
    const xmlObj = {
      request: {
        $: { type: "auth", timestamp: payTime },
        merchantid: MERCHANT_ID,
        account: "internet",
        channel: "ECOM",
        orderid: payOrderId,
        amount: { _: payAmount, $: { currency: payCurr } },
        card: {
          number: paymentData.cardNumber,
          expdate: paymentData.expiry,
          chname: paymentData.cardHolder,
          type: paymentData.cardType,
          cvn: {
            number: paymentData.cardCVV,
            presind: "1",
          },
        },
        autosettle: { $: { flag: "1" } },
        comments: {
          comment: [{ $: { id: "1" }, _: "Payment Done" }],
        },
        sha1hash: paySha1Hash,
      },
    };

    const xmlBody = builder.buildObject(xmlObj);
    return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;
  }

  const payData = {
    cardNumber: decryptedData.cardNumber,
    expiry: decryptedData.expiry.split("/").join(""),
    cardHolder: decryptedData.cardHolder,
    cardType: decryptedData.cardType.toUpperCase(),
    cardCVV: decryptedData.cvv,
  };

  const payXmlRequest = generatePaymentXmlRequest(payData);
  const payResponse = await axios.post(`https://remote.sandbox.addonpayments.com/remote`, payXmlRequest, {
    headers: {
      "Content-Type": "text/xml",
    },
  });

  const parsePayResponse = await parseStringPromise(payResponse.data);

  if (parsePayResponse.response.result[0] !== "00") {
    return res.status(400).send({ message: "Card stored failed" });
  }

  const subOrder = await Subscription.create({
    user: user._id,
    plan: plan._id,
    status: "active",
    schedule_type: "monthly",
    orderId: parsePayResponse.response.orderid[0],
    type: "one_time",
  });

  await Promise.all([
    SubscriptionTransaction.create({
      order: subOrder._id,
      user: user._id,
      plan: plan._id,
      status: "success",
      amount: plan.standardPrice,
      discount: 0,
      transcationId: parsePayResponse.response.pasref[0],
      timestamp: payTime,
      currency: "EUR",
      sha1hash: paySha1Hash,
    }),
    Artist.updateOne({ _id: user._id }, { $set: { isSubscribed: true } }),
  ]);

  // --------------------------- store card ---------------------------
  const amount = "";
  const currency = "";

  const timestamp = getTimestamp();
  const orderId = generateRandomOrderId();
  const pmt_ref = uuidv4();

  const hashString = `${timestamp}.${MERCHANT_ID}.${orderId}.${amount}.${currency}.${user.card.pay_ref}.${decryptedData.cardHolder}.${decryptedData.cardNumber}`;
  const hash1 = crypto.createHash("sha1").update(hashString).digest("hex");

  const finalString = `${hash1}.${SECRET}`;
  const sha1Hash = crypto.createHash("sha1").update(finalString).digest("hex");

  function generateXmlRequest(paymentData) {
    const builder = new Builder({ headless: true });
    const xmlObj = {
      request: {
        $: { type: "card-new", timestamp },
        merchantid: MERCHANT_ID,
        account: "internet",
        orderid: orderId,
        amount: { _: amount, $: { currency: currency } },
        card: {
          ref: pmt_ref,
          payerref: user.card.pay_ref,
          number: paymentData.cardNumber,
          expdate: paymentData.expiry,
          chname: paymentData.cardHolder,
          type: paymentData.cardType,
        },
        comments: {
          comment: [{ $: { id: "1" }, _: "Card Stored" }],
        },
        sha1hash: sha1Hash,
      },
    };

    const xmlBody = builder.buildObject(xmlObj);
    return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;
  }

  const paymentData = {
    cardNumber: decryptedData.cardNumber,
    expiry: decryptedData.expiry.split("/").join(""),
    cardHolder: decryptedData.cardHolder,
    cardType: decryptedData.cardType.toUpperCase(),
    cardCVV: decryptedData.cvv,
  };

  const xmlRequest = generateXmlRequest(paymentData);

  const storeResponse = await axios.post(`https://remote.sandbox.addonpayments.com/remote`, xmlRequest, {
    headers: {
      "Content-Type": "text/xml",
    },
  });

  const parseStoreResponse = await parseStringPromise(storeResponse.data);
  if (parseStoreResponse.response.result[0] !== "00") {
    return res.status(400).send({ message: parseStoreResponse.response.message[1] });
  }
  // --------------------------- store card ---------------------------

  // --------------------------- create subscription ------------------

  const newTimestamp = getTimestamp();
  const sheduleRef = generateSchedulerRef();
  const newCurr = "EUR";
  const newAmount = String(plan.standardPrice * 100);
  const schedule = "monthly";

  const newHashString = `${newTimestamp}.${MERCHANT_ID}.${sheduleRef}.${newAmount}.${newCurr}.${user.card.pay_ref}.${schedule}`;
  const newHash1 = crypto.createHash("sha1").update(newHashString).digest("hex");

  const newFinalString = `${newHash1}.${SECRET}`;
  const newSha1Hash = crypto.createHash("sha1").update(newFinalString).digest("hex");

  function generateScheduleXmlRequest() {
    const builder = new Builder({ headless: true });
    const xmlObj = {
      request: {
        $: { type: "schedule-new", timestamp: newTimestamp },
        merchantid: MERCHANT_ID,
        channel: "ECOM",
        account: "internet",
        scheduleref: sheduleRef,
        alias: "Fresh Art Club Subscription",
        orderidstub: "freshart",
        transtype: "auth",
        schedule: schedule,
        numtimes: "1",
        payerref: user.card.pay_ref,
        paymentmethod: pmt_ref,
        amount: { _: newAmount, $: { currency: newCurr } },
        prodid: user.artistName,
        varref: user._id,
        customer: user.userId,
        comment: "Subscription of Fresh Art Club",
        sha1hash: newSha1Hash,
      },
    };

    const xmlBody = builder.buildObject(xmlObj);
    return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;
  }

  const newXmlRequest = generateScheduleXmlRequest();
  const newScheduleResponse = await axios.post(`https://remote.sandbox.addonpayments.com/remote`, newXmlRequest, {
    headers: {
      "Content-Type": "text/xml",
    },
  });

  const parseNewScheduleResponse = await parseStringPromise(newScheduleResponse.data);
  if (parseNewScheduleResponse.response.result[0] !== "00") {
    return res.status(400).send({ message: parseNewScheduleResponse.response.message[1] });
  }

  function getNextMonthDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    const nextMonth = (month + 1) % 12;
    const nextMonthYear = month === 11 ? year + 1 : year;

    const lastDayOfNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
    const validDay = Math.min(day, lastDayOfNextMonth);
    return new Date(nextMonthYear, nextMonth, validDay);
  }

  function getEndDate(schedule_start, cycles) {
    const startDay = schedule_start.getDate();
    const startMonth = schedule_start.getMonth();
    const startYear = schedule_start.getFullYear();

    const totalMonths = startMonth + cycles - 1;
    const endYear = startYear + Math.floor(totalMonths / 12);
    const endMonth = totalMonths % 12;

    const endDateObj = new Date(endYear, endMonth + 1, 0);
    const lastDay = endDateObj.getDate();

    const validDay = Math.min(startDay, lastDay);
    return new Date(endYear, endMonth, validDay);
  }

  const schedule_start = getNextMonthDate();
  const schedule_end = getEndDate(schedule_start, 1);

  const newSubOrder = await Subscription.create({
    status: "not_started",
    plan: plan._id,
    user: req.user._id,
    schedule_type: schedule,
    schedule_defined: 1,
    schedule_completed: 0,
    schedule_start: schedule_start,
    schedule_end: schedule_end,
    otherSchedule: subOrder._id,
  });

  await Promise.all([
    Artist.updateOne(
      { _id: req.user._id },
      {
        $set: {
          card: {
            pay_ref: user.card.pay_ref,
            pmt_ref: pmt_ref,
            card_stored: true,
            exp_date: paymentData.expiry,
          },
        },
      }
    ),
    SubscriptionTransaction.create({
      order: newSubOrder._id,
      user: req.user._id,
      plan: plan._id,
      status: "success",
      sha1hash: parseNewScheduleResponse.response.sha1hash[0],
    }),
  ]);

  return res.status(200).send({ message: "Payment and subscription created successfully" });
});

// when card is stored...
const createSubscribeUser = catchAsyncError(async (req, res, next) => {
  const user = await Artist.findOne({ _id: req.user._id }, { artistName: 1, card: 1, invite: 1, userId: 1, isSubscribed: 1 }).lean();
  if (!user) return res.status(400).send({ message: "User not found" });

  const { planId, user_num } = req.body;

  if (user?.isSubscribed && user?.isSubscribed == true) {
    return res.status(400).send({ message: "You already have an active subscription" });
  }

  if (user && !user?.card?.pay_ref) {
    return res.status(400).send({ message: "Your Basic information not found" });
  }

  if (user && user?.card?.card_stored == true) {
    return res.status(400).send({ message: "Card Info already exist" });
  }

  const plan = await Plan.findOne({ _id: planId }, { planName: 1, standardPrice: 1, standardYearlyPrice: 1 }).lean();
  if (!plan) return res.status(400).send({ message: "Plan not found" });

  const MERCHANT_ID = process.env.MERCHANT_ID;
  const SECRET = process.env.SECRET;

  // -------------------------- one time payment ----------------------
  const payTime = getTimestamp();
  const payOrderId = generateRandomOrderId();
  const payAmount = String(plan.standardPrice * 100);
  const payCurr = "EUR";

  const payHashString = `${payTime}.${MERCHANT_ID}.${payOrderId}.${payAmount}.${payCurr}.${user.card.pay_ref}`;
  const payHash1 = crypto.createHash("sha1").update(payHashString).digest("hex");

  const payFinalString = `${payHash1}.${SECRET}`;
  const paySha1Hash = crypto.createHash("sha1").update(payFinalString).digest("hex");

  function generatePaymentXmlRequest() {
    const builder = new Builder({ headless: true });
    const xmlObj = {
      request: {
        $: { type: "receipt-in", timestamp: payTime },
        merchantid: MERCHANT_ID,
        account: "internet",
        channel: "ECOM",
        orderid: payOrderId,
        amount: { _: payAmount, $: { currency: payCurr } },
        payerref: user.card.pay_ref,
        paymentmethod: user.card.pmt_ref,
        paymentdata: {
          cvn: {
            number: user_num,
          },
        },
        autosettle: { $: { flag: "1" } },
        comments: {
          comment: [{ $: { id: "1" }, _: "Payment Done" }],
        },
        sha1hash: paySha1Hash,
      },
    };

    const xmlBody = builder.buildObject(xmlObj);
    return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;
  }

  const payXmlRequest = generatePaymentXmlRequest();
  const payResponse = await axios.post(`https://remote.sandbox.addonpayments.com/remote`, payXmlRequest, {
    headers: {
      "Content-Type": "text/xml",
    },
  });

  const parsePayResponse = await parseStringPromise(payResponse.data);

  if (parsePayResponse.response.result[0] !== "00") {
    return res.status(400).send({ message: "Payment Failed" });
  }

  const subOrder = await Subscription.create({
    user: user._id,
    plan: plan._id,
    status: "active",
    schedule_type: "monthly",
    orderId: parsePayResponse.response.orderid[0],
    type: "one_time",
  });

  await Promise.all([
    SubscriptionTransaction.create({
      order: subOrder._id,
      user: user._id,
      plan: plan._id,
      status: "success",
      amount: plan.standardPrice,
      discount: 0,
      transcationId: parsePayResponse.response.pasref[0],
      timestamp: payTime,
      currency: "EUR",
      sha1hash: paySha1Hash,
    }),
    Artist.updateOne({ _id: user._id }, { $set: { isSubscribed: true } }),
  ]);

  // --------------------------- create subscription ------------------
  const newTimestamp = getTimestamp();
  const sheduleRef = generateSchedulerRef();
  const newCurr = "EUR";
  const newAmount = String(plan.standardPrice * 100);
  const schedule = "monthly";

  const newHashString = `${newTimestamp}.${MERCHANT_ID}.${sheduleRef}.${newAmount}.${newCurr}.${user.card.pay_ref}.${schedule}`;
  const newHash1 = crypto.createHash("sha1").update(newHashString).digest("hex");

  const newFinalString = `${newHash1}.${SECRET}`;
  const newSha1Hash = crypto.createHash("sha1").update(newFinalString).digest("hex");

  function generateScheduleXmlRequest() {
    const builder = new Builder({ headless: true });
    const xmlObj = {
      request: {
        $: { type: "schedule-new", timestamp: newTimestamp },
        merchantid: MERCHANT_ID,
        channel: "ECOM",
        account: "internet",
        scheduleref: sheduleRef,
        alias: "Fresh Art Club Subscription",
        orderidstub: "freshart",
        transtype: "auth",
        schedule: schedule,
        numtimes: "1",
        payerref: user.card.pay_ref,
        paymentmethod: pmt_ref,
        amount: { _: newAmount, $: { currency: newCurr } },
        prodid: user.artistName,
        varref: user._id,
        customer: user.userId,
        comment: "Subscription of Fresh Art Club",
        sha1hash: newSha1Hash,
      },
    };

    const xmlBody = builder.buildObject(xmlObj);
    return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;
  }

  const newXmlRequest = generateScheduleXmlRequest();
  const newScheduleResponse = await axios.post(`https://remote.sandbox.addonpayments.com/remote`, newXmlRequest, {
    headers: {
      "Content-Type": "text/xml",
    },
  });

  const parseNewScheduleResponse = await parseStringPromise(newScheduleResponse.data);
  if (parseNewScheduleResponse.response.result[0] !== "00") {
    return res.status(400).send({ message: parseNewScheduleResponse.response.message[1] });
  }

  function getNextMonthDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    const nextMonth = (month + 1) % 12;
    const nextMonthYear = month === 11 ? year + 1 : year;

    const lastDayOfNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
    const validDay = Math.min(day, lastDayOfNextMonth);
    return new Date(nextMonthYear, nextMonth, validDay);
  }

  function getEndDate(schedule_start, cycles) {
    const startDay = schedule_start.getDate();
    const startMonth = schedule_start.getMonth();
    const startYear = schedule_start.getFullYear();

    const totalMonths = startMonth + cycles - 1;
    const endYear = startYear + Math.floor(totalMonths / 12);
    const endMonth = totalMonths % 12;

    const endDateObj = new Date(endYear, endMonth + 1, 0);
    const lastDay = endDateObj.getDate();

    const validDay = Math.min(startDay, lastDay);
    return new Date(endYear, endMonth, validDay);
  }

  const schedule_start = getNextMonthDate();
  const schedule_end = getEndDate(schedule_start, 1);

  const newSubOrder = await Subscription.create({
    status: "not_started",
    plan: plan._id,
    user: req.user._id,
    schedule_type: schedule,
    schedule_defined: 1,
    schedule_completed: 0,
    schedule_start: schedule_start,
    schedule_end: schedule_end,
    otherSchedule: subOrder._id,
  });

  await Promise.all([
    Artist.updateOne(
      { _id: req.user._id },
      {
        $set: {
          card: {
            pay_ref: user.card.pay_ref,
            pmt_ref: pmt_ref,
            card_stored: true,
            exp_date: paymentData.expiry,
          },
        },
      }
    ),
    SubscriptionTransaction.create({
      order: newSubOrder._id,
      user: req.user._id,
      plan: plan._id,
      status: "success",
      sha1hash: parseNewScheduleResponse.response.sha1hash[0],
    }),
  ]);

  return res.status(200).send({ message: "Subscription created successfully" });
});

const createSubcribeOrder = catchAsyncError(async (req, res, next) => {
  const user = await Artist.findOne({ _id: req.user._id }, { artistName: 1 }).lean();
  if (!user) return res.status(400).send({ message: "User not found" });

  const { time, currency, country, planId, type } = req.body;
  const orderId = uuidv4();

  const plan = await Plan.findById(planId, { currentPrice: 1, currentYearlyPrice: 1, standardYearlyPrice: 1 });

  function getNumericCountryCode(countryName) {
    const alpha2 = countries.getAlpha3Code(countryName, "en");
    return alpha2 ? countries.alpha3ToNumeric(alpha2) : null;
  }

  const isoCountry = getNumericCountryCode(country);
  if (!isoCountry) return res.status(400).send({ message: "Please select country" });

  const pay_ref = uuidv4();
  const pmt_ref = uuidv4();

  await Subscription.create({
    orderId: orderId,
    user: user._id,
    plan: plan._id,
    pay_ref: pay_ref,
    pmt_ref: pmt_ref,
    status: "created",
  });

  const amount = type == "monthly" ? plan.currentPrice : plan.currentYearlyPrice;
  const amountRound = amount * 100;

  const hashString = `${time}.${process.env.MERCHANT_ID}.${orderId}.${amountRound}.${currency}.${pay_ref}.${pmt_ref}`;
  const hash1 = crypto.createHash("sha1").update(hashString).digest("hex");

  const finalString = `${hash1}.${process.env.SECRET}`;
  const sha1Hash = crypto.createHash("sha1").update(finalString).digest("hex");

  return res.status(200).send({
    message: "Order Created Successfully",
    data: sha1Hash,
    orderId: orderId,
    amount: amountRound,
    currency: currency,
    iso: isoCountry,
    pay_ref: pay_ref,
    pmt_ref: pmt_ref,
  });
});

const getAllOrders = catchAsyncError(async (req, res, next) => {
  let { s, limit, cursor, direction, currPage } = req.query;
  s = s === "undefined" || typeof s === "undefined" ? "" : s;

  limit = parseInt(limit) || 10;
  cursor = cursor || null;

  const matchStage = {
    status: { $ne: "created" },
    $or: [
      { "userData.userId": { $regex: s, $options: "i" } },
      { "userData.artistId": { $regex: s, $options: "i" } },
      { "userData.artistName": { $regex: s, $options: "i" } },
      { orderId: { $regex: s, $options: "i" } },
    ],
  };

  const totalCount = await Order.countDocuments(matchStage);

  if (cursor) {
    if (direction === "next") {
      matchStage._id = { $lt: objectId(cursor) };
    } else if (direction === "prev") {
      matchStage._id = { $gt: objectId(cursor) };
    }
  }

  let orders = await Order.aggregate([
    {
      $unwind: "$items",
    },
    {
      $lookup: {
        from: "artworks",
        localField: "items.artwork",
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
        pipeline: [{ $project: { _id: 1, artistName: 1, artistSurname1: 1, artistSurname2: 1, email: 1 } }],
      },
    },
    {
      $unwind: { path: "$userData", preserveNullAndEmptyArrays: true },
    },
    { $match: matchStage },
    {
      $group: {
        _id: "$_id",
        orderId: { $first: "$orderId" },
        type: { $first: "$type" },
        status: { $first: "$status" },
        tax: { $first: "$tax" },
        shipping: { $first: "$shipping" },
        discount: { $first: "$discount" },
        total: { $first: "$total" },
        subTotal: { $first: "$subTotal" },
        createdAt: { $first: "$createdAt" },
        user: { $first: "$userData" },
        items: {
          $push: {
            other: "$items.other",
            artwork: {
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
        orderId: 1,
        type: 1,
        status: 1,
        tax: 1,
        shipping: 1,
        total: 1,
        discount: 1,
        subTotal: 1,
        createdAt: 1,
        items: 1,
        "user.artistName": 1,
        "user.artistSurname1": 1,
        "user.artistSurname2": 1,
        "user.email": 1,
      },
    },
    { $sort: { _id: direction === "prev" ? 1 : -1 } },
    { $limit: limit + 1 },
  ]);

  const hasNextPage = (currPage == 1 && orders.length > limit) || orders.length > limit || (direction === "prev" && orders.length === limit);

  if (hasNextPage && direction) {
    if (direction === "next") orders.pop();
  } else if (hasNextPage) {
    orders.pop();
  }
  const hasPrevPage = currPage == 1 ? false : true;

  if (direction === "prev" && currPage != 1) {
    orders.reverse().shift();
  } else if (direction === "prev") {
    orders.reverse();
  }

  const nextCursor = hasNextPage ? orders[orders.length - 1]._id : null;
  const prevCursor = hasPrevPage ? orders[0]._id : null;

  return res.status(200).send({
    data: orders,
    nextCursor,
    prevCursor,
    hasNextPage,
    hasPrevPage,
    totalCount,
  });
});

const getArtistOrders = catchAsyncError(async (req, res, next) => {
  const loggedUserId = req.user._id;

  const user = await Artist.findOne({ _id: loggedUserId }, { role: 1 }).lean(true);
  if (!user) return res.status(400).send({ message: "Artist not found" });
  if (user.role !== "artist") return res.status(400).send({ message: "You are not authorized to access this page" });

  const orders = await Order.aggregate([
    {
      $match: { status: { $ne: "created" } },
    },
    {
      $lookup: {
        from: "artworks",
        localField: "items.artwork",
        foreignField: "_id",
        as: "artWorkDetails",
        pipeline: [{ $project: { _id: 1, owner: 1, artworkName: 1, media: "$media.mainImage", additionalInfo: 1, pricing: 1 } }],
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "user",
        foreignField: "_id",
        as: "user",
        pipeline: [{ $project: { _id: 1, artistName: 1, artistSurname1: 1, artistSurname2: 1, email: 1 } }],
      },
    },
    { $unwind: "$user" },
    {
      $set: {
        // Attach correct artwork details to each item in `items` array
        items: {
          $map: {
            input: "$items",
            as: "item",
            in: {
              $mergeObjects: [
                "$$item",
                {
                  artworkDetails: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$artWorkDetails",
                          as: "art",
                          cond: { $eq: ["$$art._id", "$$item.artwork"] },
                        },
                      },
                      0,
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },
    {
      $set: {
        // Keep only items where the artwork owner is the logged-in artist
        items: {
          $filter: {
            input: "$items",
            as: "item",
            cond: { $eq: ["$$item.artworkDetails.owner", user._id] },
          },
        },
      },
    },
    {
      $match: {
        "items.0": { $exists: true }, // Ensure orders with at least one matching item
      },
    },
    {
      $project: {
        _id: 1,
        status: 1,
        type: 1,
        // tax: 1,
        // taxAmount: 1,
        // shipping: 1,
        // discount: 1,
        // total: 1,
        // subTotal: 1,
        user: 1,
        items: 1, // Only items owned by the logged-in artist
        orderId: 1,
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
        status: { $ne: "created" },
      },
    },
    {
      $unwind: "$items",
    },
    {
      $lookup: {
        from: "artworks",
        localField: "items.artwork",
        foreignField: "_id",
        as: "artWorkData",
        pipeline: [{ $project: { _id: 1, owner: 1, artworkName: 1, media: "$media.mainImage", additionalInfo: 1, pricing: 1 } }],
      },
    },
    {
      $lookup: {
        from: "artists",
        localField: "user",
        foreignField: "_id",
        pipeline: [{ $project: { _id: 1, artistName: 1, profile: 1, artistSurname1: 1, artistSurname2: 1, email: 1 } }],
        as: "userData",
      },
    },
    {
      $unwind: { path: "$userData", preserveNullAndEmptyArrays: true },
    },
    {
      $addFields: {
        "items.artwork": {
          _id: { $arrayElemAt: ["$artWorkData._id", 0] },
          owner: { $arrayElemAt: ["$artWorkData.owner", 0] },
          artworkName: { $arrayElemAt: ["$artWorkData.artworkName", 0] },
          media: { $arrayElemAt: ["$artWorkData.media", 0] },
          pricing: { $arrayElemAt: ["$artWorkData.pricing", 0] },
        },
      },
    },
    {
      $match: {
        $expr: {
          $eq: ["$items.artwork.owner", objectId(artistId)],
        },
      },
    },
    {
      $group: {
        _id: "$_id",
        orderId: { $first: "$orderId" },
        type: { $first: "$type" },
        status: { $first: "$status" },
        // tax: { $first: "$tax" },
        // shipping: { $first: "$shipping" },
        // discount: { $first: "$discount" },
        // total: { $first: "$total" },
        // taxAmount: { $first: "$taxAmount" },
        // subTotal: { $first: "$subTotal" },
        createdAt: { $first: "$createdAt" },
        user: { $first: "$userData" },
        items: {
          $push: {
            other: "$items.other",
            artwork: "$items.artwork",
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        orderId: 1,
        status: 1,
        type: 1,
        // total: 1,
        // taxAmount: 1,
        // tax: 1,
        // shipping: 1,
        // discount: 1,
        // subTotal: 1,
        createdAt: 1,
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

const getAllUserOrders = catchAsyncError(async (req, res, next) => {
  const orders = await Order.aggregate([
    { $match: { user: req.user._id, status: { $ne: "created" } } },
    {
      $lookup: {
        from: "artworks",
        localField: "items.artwork",
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
                  artwork: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$artWorkData",
                          as: "artwork",
                          cond: { $eq: ["$$artwork._id", "$$item.artwork"] },
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
        orderId: 1,
        discount: 1,
        tax: 1,
        shipping: 1,
        subTotal: 1,
        total: 1,
        createdAt: 1,
        updatedAt: 1,
        "items.artwork._id": 1,
        "items.artwork.artworkName": 1,
        "items.artwork.media.mainImage": 1,
        "items.artwork.inventoryShipping": 1,
        "items.artwork.pricing": 1,
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
        orderId: order.orderId,
        discount: order.discount,
        tax: order.tax,
        shipping: order.shipping,
        subTotal: order.subTotal,
        total: order.total,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        artwork: {
          _id: item.artwork._id,
          type: item.type,
          artworkName: item.artwork.artworkName,
          media: item.artwork.media.mainImage,
          inventoryShipping: item.artwork.inventoryShipping,
          pricing: item.artwork.pricing,
        },
      }))
    );
  };

  const transformOrderList = transformOrders(orders);

  return res.status(200).send({
    data: transformOrderList,
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
        status: { $ne: "created" },
      },
    },
    {
      $unwind: "$items",
    },
    {
      $lookup: {
        from: "artworks",
        localField: "items.artwork",
        foreignField: "_id",
        as: "artWorkData",
      },
    },
    {
      $project: {
        _id: 1,
        orderId: 1,
        status: 1,
        tax: 1,
        type: 1,
        shipping: 1,
        discount: 1,
        total: 1,
        subTotal: 1,
        createdAt: 1,
        updatedAt: 1,
        shippingAddress: 1,
        billingAddress: 1,
        note: 1,
        items: {
          other: "$items.other",
          artwork: {
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

  const getArtwork = order.find((item) => item.items.artwork._id == artworkId);
  const getOtherArtwork = order.filter((item) => item.items.artwork._id != artworkId);

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
        status: { $ne: "created" },
      },
    },
    {
      $unwind: "$items",
    },
    {
      $lookup: {
        from: "artworks",
        localField: "items.artwork",
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
        pipeline: [{ $project: { _id: 1, artistName: 1, artistSurname1: 1, mainImage: "$profile.mainImage", artistSurname2: 1, email: 1 } }],
      },
    },
    {
      $unwind: { path: "$userData", preserveNullAndEmptyArrays: true },
    },
    {
      $group: {
        _id: "$_id",
        orderId: { $first: "$orderId" },
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
        user: { $first: "$userData" },
        items: {
          $push: {
            other: "$items.other",

            artwork: {
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
        orderId: 1,
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
        items: 1,
        "user.artistName": 1,
        "user.artistSurname1": 1,
        "user.artistSurname2": 1,
        "user.email": 1,
        "user.mainImage": 1,
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
      "items.artwork": objectId(artworkId),
    },
    { "items.$": 1 }
  ).lean(true);

  if (!existingImg || !existingImg.items || existingImg.items.length === 0) {
    return res.status(404).send({ message: "Artwork not found in order" });
  }

  const selectedItem = existingImg.items[0];
  if (selectedItem.other?.evidenceImg?.length > 0) {
    imgArr = [...selectedItem.other.evidenceImg, ...imgArr];
  }

  await Order.updateOne({ _id: id, "items.artwork": objectId(artworkId) }, { $set: { "items.$.other.evidenceImg": imgArr } });
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

  const existingOrder = await Order.findOne(
    {
      _id: id,
      "items.artwork": objectId(artworkId),
    },
    { "items.$": 1 }
  ).lean(true);

  if (!existingOrder || !existingOrder.items || existingOrder.items.length === 0) {
    return res.status(404).send({ message: "Artwork not found in order" });
  }

  const selectedItem = existingOrder.items[0];

  if (selectedItem.other?.isCancelled) {
    return res.status(400).send({ message: "Item already cancelled" });
  }

  await Order.updateOne(
    { _id: id, "items.artwork": objectId(artworkId) },
    { $set: { "items.$.other.isCancelled": true, "items.$.other.cancelReason": obj } }
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

const generateHash = catchAsyncError(async (req, res, next) => {
  const { time, amount, currency } = req.query;

  const orderId = uuidv4();

  const hashString = `${time}.${process.env.MERCHANT_ID}.${orderId}.${amount}.${currency}`;
  const hash1 = crypto.createHash("sha1").update(hashString).digest("hex");

  const finalString = `${hash1}.${process.env.SECRET}`;
  const sha1Hash = crypto.createHash("sha1").update(finalString).digest("hex");

  return res.status(200).send({ data: sha1Hash, orderID: orderId, amount: amount, currency: currency });
});

const getResponData = catchAsyncError(async (req, res, next) => {
  if (req.body.RESULT !== "00") {
    await Order.updateOne(
      { orderId: req.body?.ORDER_ID },
      {
        $set: {
          status: "failed",
        },
      }
    );

    return res.status(200).send({ message: "Payment Failed" });
  }

  const order = await Order.findOneAndUpdate(
    { orderId: req.body?.ORDER_ID },
    {
      $set: { status: "successfull" },
    }
  ).lean();

  await Transaction.create({
    transcationId: req.body?.PASREF,
    user: order.user,
    status: "successfull",
    orderId: order.orderId,
    timestamp: req.body?.TIMESTAMP,
    amount: req.body?.AMOUNT,
    sha1hash: req.body?.SHA1HASH,
  });

  const artworks = order.items.map((item) => item.artwork);

  await Artist.updateOne({ _id: order.user }, { $pull: { cart: { item: { $in: artworks } } } });
  res.status(200).send({ message: "Payment Successfull. Wait for 5-10 seconds..." });
});

const getKey = catchAsyncError(async (req, res, next) => {
  const SERVER_SECRET = process.env.CRYPTO_KEY;
  const SALT = "hggci8y97tdyrhty087et786stge78r6rt867vui9u097t86rth";

  const key = crypto.pbkdf2Sync(SERVER_SECRET, SALT, 100000, 32, "sha256").toString("hex");
  return res.status(200).send({ data: key });
});

const getStaus = catchAsyncError(async (req, res, next) => {
  if (!req.query.orderId) return res.status(400).send({ message: "OrderId not found" });
  const order = await Transaction.findOne({ orderId: req.query.orderId });

  if (!order) {
    return res.status(400).json({ status: "pending" });
  }

  if (order.status == "successfull") {
    return res.status(200).send({ status: "success" });
  } else {
    return res.status(200).send({ status: "fail" });
  }
});

module.exports = {
  createOrder,
  checkPayerExist,
  createPayer,
  createSubcribeOrder,
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
  generateHash,
  getResponData,
  createPayerSubscribeUser,
  createSubscribeUser,
  getStaus,
  getKey,
};
