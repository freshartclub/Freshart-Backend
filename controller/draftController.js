// when card is not stored...
// const createPayerSubscribeUser = catchAsyncError(async (req, res, next) => {
//   const user = await Artist.findOne({ _id: req.user._id }, { artistName: 1, card: 1, invite: 1, userId: 1, isSubscribed: 1 }).lean();
//   if (!user) return res.status(400).send({ message: "User not found" });

//   if (user?.isSubscribed && user?.isSubscribed == true) {
//     return res.status(400).send({ message: "You can not hit this api" });
//   }

//   function decryptData(encryptedData, encryptionKey) {
//     const [ivBase64, ciphertext, receivedHmacBase64] = encryptedData.split(":");

//     const iv = Buffer.from(ivBase64, "base64");
//     const receivedHmac = Buffer.from(receivedHmacBase64, "base64");

//     const calculatedHmac = crypto.createHmac("sha256", encryptionKey).update(ciphertext).digest();

//     if (!crypto.timingSafeEqual(calculatedHmac, receivedHmac)) {
//       throw new Error("HMAC verification failed. Data may have been tampered with.");
//     }

//     const decipher = crypto.createDecipheriv("aes-256-cbc", encryptionKey, iv);
//     let decrypted = decipher.update(ciphertext, "base64", "utf8");
//     decrypted += decipher.final("utf8");

//     return JSON.parse(decrypted);
//   }

//   const SERVER_SECRET = process.env.CRYPTO_KEY;
//   const SALT = "hggci8y97tdyrhty087et786stge78r6rt867vui9u097t86rth";

//   const derivedKey = crypto.pbkdf2Sync(SERVER_SECRET, SALT, 100000, 32, "sha256");

//   const encryptedCardData = req.body.plan;
//   const decryptedData = decryptData(encryptedCardData, derivedKey);

//   if (!decryptedData) {
//     return res.status(400).json({ error: "Invalid encryption or tampered data" });
//   }

//   const allowedTypes = ["VISA", "MASTERCARD", "AMEX", "DISCOVER"];
//   if (!allowedTypes.includes(decryptedData.cardType.toUpperCase())) {
//     return res.status(400).send({ message: "Unsupported card type" });
//   }

//   if (!decryptedData.type) {
//     return res.status(400).send({ message: "Provide valid Plan Type" });
//   }

//   const validTypes = ["yearly", "monthly"];
//   if (!validTypes.includes(decryptedData.type)) {
//     return res.status(400).send({ message: "Provide valid Plan Type" });
//   }

//   if (user && !user?.card?.pay_ref) {
//     return res.status(400).send({ message: "Your Basic information not found" });
//   }

//   if (user && user?.card?.card_stored == true) {
//     return res.status(400).send({ message: "Card Info already exist" });
//   }

//   const plan = await Plan.findOne({ _id: decryptedData.planId }, { planName: 1, currentPrice: 1, currentYearlyPrice: 1 }).lean();
//   if (!plan) return res.status(400).send({ message: "Plan not found" });

//   const MERCHANT_ID = process.env.MERCHANT_ID;
//   const SECRET = process.env.SECRET;

//   // -------------------------- one time payment ----------------------
//   const payTime = getTimestamp();
//   const payOrderId = generateRandomOrderId();
//   const payType = decryptedData.type;
//   const payAmount = String(payType == "yearly" ? plan.currentYearlyPrice * 100 : plan.currentPrice * 100);
//   const payCurr = "EUR";

//   const payHashString = `${payTime}.${MERCHANT_ID}.${payOrderId}.${payAmount}.${payCurr}.${decryptedData.cardNumber}`;
//   const payHash1 = crypto.createHash("sha1").update(payHashString).digest("hex");

//   const payFinalString = `${payHash1}.${SECRET}`;
//   const paySha1Hash = crypto.createHash("sha1").update(payFinalString).digest("hex");

//   function generatePaymentXmlRequest(paymentData) {
//     const builder = new Builder({ headless: true });
//     const xmlObj = {
//       request: {
//         $: { type: "auth", timestamp: payTime },
//         merchantid: MERCHANT_ID,
//         account: "internet",
//         channel: "ECOM",
//         orderid: payOrderId,
//         amount: { _: payAmount, $: { currency: payCurr } },
//         card: {
//           number: paymentData.cardNumber,
//           expdate: paymentData.expiry,
//           chname: paymentData.cardHolder,
//           type: paymentData.cardType,
//           cvn: {
//             number: paymentData.cardCVV,
//             presind: "1",
//           },
//         },
//         autosettle: { $: { flag: "1" } },
//         comments: {
//           comment: [{ $: { id: "1" }, _: "Payment Done" }],
//         },
//         sha1hash: paySha1Hash,
//       },
//     };

//     const xmlBody = builder.buildObject(xmlObj);
//     return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;
//   }

//   const payData = {
//     cardNumber: decryptedData.cardNumber,
//     expiry: decryptedData.expiry.split("/").join(""),
//     cardHolder: decryptedData.cardHolder,
//     cardType: decryptedData.cardType.toUpperCase(),
//     cardCVV: decryptedData.cvv,
//   };

//   const payXmlRequest = generatePaymentXmlRequest(payData);
//   const payResponse = await axios.post(`${url}`, payXmlRequest, {
//     headers: {
//       "Content-Type": "text/xml",
//     },
//   });

//   const parsePayResponse = await parseStringPromise(payResponse.data);

//   if (parsePayResponse.response.result[0] !== "00") {
//     return res.status(400).send({ message: "Card store failed" });
//   }

//   const subOrder = await Subscription.create({
//     user: user._id,
//     plan: plan._id,
//     status: "active",
//     start_date: new Date(),
//     isScheduled: false,
//     orderId: parsePayResponse.response.orderid[0],
//     type: payType,
//   });

//   await Promise.all([
//     SubscriptionTransaction.create({
//       order: subOrder._id,
//       user: user._id,
//       status: "success",
//       amount: payType == "yearly" ? plan.currentYearlyPrice : plan.currentPrice,
//       discount: 0,
//       transcationId: parsePayResponse.response.pasref[0],
//       timestamp: payTime,
//       currency: "EUR",
//       sha1hash: paySha1Hash,
//     }),
//     Artist.updateOne({ _id: user._id }, { $set: { isSubscribed: true } }),
//   ]);

//   // --------------------------- store card ---------------------------
//   const amount = "";
//   const currency = "";

//   const timestamp = getTimestamp();
//   const orderId = generateRandomOrderId();
//   const pmt_ref = uuidv4();

//   const hashString = `${timestamp}.${MERCHANT_ID}.${orderId}.${amount}.${currency}.${user.card.pay_ref}.${decryptedData.cardHolder}.${decryptedData.cardNumber}`;
//   const hash1 = crypto.createHash("sha1").update(hashString).digest("hex");

//   const finalString = `${hash1}.${SECRET}`;
//   const sha1Hash = crypto.createHash("sha1").update(finalString).digest("hex");

//   function generateXmlRequest(paymentData) {
//     const builder = new Builder({ headless: true });
//     const xmlObj = {
//       request: {
//         $: { type: "card-new", timestamp },
//         merchantid: MERCHANT_ID,
//         account: "internet",
//         orderid: orderId,
//         amount: { _: amount, $: { currency: currency } },
//         card: {
//           ref: pmt_ref,
//           payerref: user.card.pay_ref,
//           number: paymentData.cardNumber,
//           expdate: paymentData.expiry,
//           chname: paymentData.cardHolder,
//           type: paymentData.cardType,
//         },
//         comments: {
//           comment: [{ $: { id: "1" }, _: "Card Stored" }],
//         },
//         sha1hash: sha1Hash,
//       },
//     };

//     const xmlBody = builder.buildObject(xmlObj);
//     return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;
//   }

//   const paymentData = {
//     cardNumber: decryptedData.cardNumber,
//     expiry: decryptedData.expiry.split("/").join(""),
//     cardHolder: decryptedData.cardHolder,
//     cardType: decryptedData.cardType.toUpperCase(),
//     cardCVV: decryptedData.cvv,
//   };

//   const xmlRequest = generateXmlRequest(paymentData);

//   const storeResponse = await axios.post(`${url}`, xmlRequest, {
//     headers: {
//       "Content-Type": "text/xml",
//     },
//   });

//   const parseStoreResponse = await parseStringPromise(storeResponse.data);
//   if (parseStoreResponse.response.result[0] !== "00") {
//     return res.status(400).send({ message: parseStoreResponse.response.message[1] });
//   }
//   // --------------------------- store card ---------------------------

//   // --------------------------- create subscription ------------------

//   const newTimestamp = getTimestamp();
//   const sheduleRef = generateSchedulerRef();
//   const newCurr = "EUR";
//   const schedule = decryptedData.type;
//   const newAmount = String(schedule == "yearly" ? plan.currentYearlyPrice * 100 : plan.currentPrice * 100);

//   const newHashString = `${newTimestamp}.${MERCHANT_ID}.${sheduleRef}.${newAmount}.${newCurr}.${user.card.pay_ref}.${schedule}`;
//   const newHash1 = crypto.createHash("sha1").update(newHashString).digest("hex");

//   const newFinalString = `${newHash1}.${SECRET}`;
//   const newSha1Hash = crypto.createHash("sha1").update(newFinalString).digest("hex");

//   function generateScheduleXmlRequest() {
//     const builder = new Builder({ headless: true });
//     const xmlObj = {
//       request: {
//         $: { type: "schedule-new", timestamp: newTimestamp },
//         merchantid: MERCHANT_ID,
//         channel: "ECOM",
//         account: "internet",
//         scheduleref: sheduleRef,
//         alias: "Fresh Art Club Subscription",
//         orderidstub: "freshart",
//         transtype: "auth",
//         schedule: schedule,
//         numtimes: "1",
//         payerref: user.card.pay_ref,
//         paymentmethod: pmt_ref,
//         amount: { _: newAmount, $: { currency: newCurr } },
//         prodid: user.artistName,
//         varref: user._id,
//         customer: user.userId,
//         comment: "Subscription of Fresh Art Club",
//         sha1hash: newSha1Hash,
//       },
//     };

//     const xmlBody = builder.buildObject(xmlObj);
//     return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;
//   }

//   const newXmlRequest = generateScheduleXmlRequest();
//   const newScheduleResponse = await axios.post(`${url}`, newXmlRequest, {
//     headers: {
//       "Content-Type": "text/xml",
//     },
//   });

//   const parseNewScheduleResponse = await parseStringPromise(newScheduleResponse.data);
//   if (parseNewScheduleResponse.response.result[0] !== "00") {
//     return res.status(400).send({ message: parseNewScheduleResponse.response.message[1] });
//   }

//   function getLastDayOfMonth(year, month) {
//     return new Date(year, month + 1, 0).getDate();
//   }

//   function getScheduleStartDate(type) {
//     const today = new Date();
//     const day = today.getDate();
//     const month = today.getMonth();
//     const year = today.getFullYear();

//     if (type === "monthly") {
//       const nextMonth = (month + 1) % 12;
//       const nextYear = month === 11 ? year + 1 : year;
//       const lastDayOfNextMonth = getLastDayOfMonth(nextYear, nextMonth);

//       if (day >= 29) {
//         return new Date(nextYear, nextMonth, lastDayOfNextMonth);
//       }

//       return new Date(nextYear, nextMonth, day);
//     }

//     if (type === "yearly") {
//       const nextYear = year + 1;

//       // Feb 29 case (Leap year issue)
//       const isLeapFeb29 = month === 1 && day === 29;
//       if (isLeapFeb29) {
//         return new Date(nextYear, 1, 28); // 28 Feb next year
//       }

//       const lastDayOfTargetMonth = getLastDayOfMonth(nextYear, month);
//       const finalDay = Math.min(day, lastDayOfTargetMonth);

//       return new Date(nextYear, month, finalDay);
//     }

//     throw new Error("Invalid type provided");
//   }

//   function getScheduleEndDate(type, startDate, cycles) {
//     const day = startDate.getDate();
//     let month = startDate.getMonth();
//     let year = startDate.getFullYear();

//     if (type === "monthly") {
//       for (let i = 0; i < cycles - 1; i++) {
//         month += 1;
//         if (month > 11) {
//           month = 0;
//           year += 1;
//         }
//       }

//       const lastDay = getLastDayOfMonth(year, month);
//       const finalDay = day >= 29 ? lastDay : Math.min(day, lastDay);
//       return new Date(year, month, finalDay);
//     }

//     if (type === "yearly") {
//       const finalYear = year + (cycles - 1);

//       const isLeapFeb29 = month === 1 && day === 29;
//       if (isLeapFeb29) {
//         return new Date(finalYear, 1, 28); // Feb 28 in non-leap years
//       }

//       const lastDay = getLastDayOfMonth(finalYear, month);
//       const finalDay = Math.min(day, lastDay);
//       return new Date(finalYear, month, finalDay);
//     }

//     throw new Error("Invalid type provided");
//   }

//   const schedule_start = getScheduleStartDate(schedule);
//   const schedule_end = getScheduleEndDate(schedule, schedule_start, 2);

//   const newSubOrder = await Subscription.create({
//     status: "not_started",
//     plan: plan._id,
//     user: req.user._id,
//     type: schedule,
//     schedule_defined: 1,
//     isScheduled: true,
//     start_date: schedule_start,
//     end_date: schedule_end,
//     otherSchedule: subOrder._id,
//   });

//   await Promise.all([
//     Artist.updateOne(
//       { _id: req.user._id },
//       {
//         $set: {
//           card: {
//             pay_ref: user.card.pay_ref,
//             pmt_ref: pmt_ref,
//             card_stored: true,
//             exp_date: paymentData.expiry,
//           },
//         },
//       }
//     ),
//     Subscription.updateOne({ _id: subOrder._id }, { $set: { end_date: schedule_start } }),
//     SubscriptionTransaction.create({
//       order: newSubOrder._id,
//       user: req.user._id,
//       status: "success",
//       sha1hash: parseNewScheduleResponse.response.sha1hash[0],
//     }),
//   ]);

//   return res.status(200).send({ message: "Payment and subscription created successfully" });
// });

// when card is stored...
// const createSubscribeUser = catchAsyncError(async (req, res, next) => {
//   const errors = validationResult(req);
//   const checkValid = await checkValidations(errors);

//   if (checkValid.type === "error") {
//     return res.status(400).send({
//       message: checkValid.errors.msg,
//     });
//   }

//   const user = await Artist.findOne({ _id: req.user._id }, { artistName: 1, card: 1, invite: 1, userId: 1, isSubscribed: 1 }).lean();
//   if (!user) return res.status(400).send({ message: "User not found" });

//   const { planId, user_num, plan_type } = req.body;

//   if (!user?.card?.pay_ref && !user?.card?.pmt_ref) {
//     return res.status(400).send({ message: "Your Basic information/Payment method not found" });
//   }

//   if (user?.card?.card_stored == false) {
//     return res.status(400).send({ message: "Card Info not exist" });
//   }

//   const plan = await Plan.findOne({ _id: planId }, { planName: 1, currentPrice: 1, currentYearlyPrice: 1 }).lean();
//   if (!plan) return res.status(400).send({ message: "Plan not found" });

//   const MERCHANT_ID = process.env.MERCHANT_ID;
//   const SECRET = process.env.SECRET;

//   const user_suscriptions = await Subscription.find({ user: user._id, status: { $in: ["active", "not_started"] } })
//     .sort({ createdAt: -1 })
//     .lean();

//   let subOrder = null;
//   if (user_suscriptions.length == 0) {
//     // -------------------------- one time payment ----------------------
//     const payTime = getTimestamp();
//     const payOrderId = generateRandomOrderId();
//     const payAmount = String(plan.standardPrice * 100);
//     const payCurr = "EUR";

//     const payHashString = `${payTime}.${MERCHANT_ID}.${payOrderId}.${payAmount}.${payCurr}.${user.card.pay_ref}`;
//     const payHash1 = crypto.createHash("sha1").update(payHashString).digest("hex");

//     const payFinalString = `${payHash1}.${SECRET}`;
//     const paySha1Hash = crypto.createHash("sha1").update(payFinalString).digest("hex");

//     function generatePaymentXmlRequest() {
//       const builder = new Builder({ headless: true });
//       const xmlObj = {
//         request: {
//           $: { type: "receipt-in", timestamp: payTime },
//           merchantid: MERCHANT_ID,
//           account: "internet",
//           channel: "ECOM",
//           orderid: payOrderId,
//           amount: { _: payAmount, $: { currency: payCurr } },
//           payerref: user.card.pay_ref,
//           paymentmethod: user.card.pmt_ref,
//           paymentdata: {
//             cvn: {
//               number: user_num,
//             },
//           },
//           autosettle: { $: { flag: "1" } },
//           comments: {
//             comment: [{ $: { id: "1" }, _: "Payment Done" }],
//           },
//           sha1hash: paySha1Hash,
//         },
//       };

//       const xmlBody = builder.buildObject(xmlObj);
//       return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;
//     }

//     const payXmlRequest = generatePaymentXmlRequest();
//     const payResponse = await axios.post(`${url}`, payXmlRequest, {
//       headers: {
//         "Content-Type": "text/xml",
//       },
//     });

//     const parsePayResponse = await parseStringPromise(payResponse.data);

//     if (parsePayResponse.response.result[0] !== "00") {
//       return res.status(400).send({ message: "Payment Failed" });
//     }

//     subOrder = await Subscription.create({
//       user: user._id,
//       plan: plan._id,
//       status: "active",
//       isScheduled: false,
//       start_date: new Date(),
//       orderId: parsePayResponse.response.orderid[0],
//       type: plan_type,
//     });

//     await Promise.all([
//       SubscriptionTransaction.create({
//         order: subOrder._id,
//         user: user._id,
//         status: "success",
//         amount: plan.standardPrice,
//         discount: 0,
//         transcationId: parsePayResponse.response.pasref[0],
//         timestamp: payTime,
//         currency: "EUR",
//         sha1hash: paySha1Hash,
//       }),
//       Artist.updateOne({ _id: user._id }, { $set: { isSubscribed: true } }),
//     ]);
//   }

//   // --------------------------- create subscription ------------------
//   const newTimestamp = getTimestamp();
//   const sheduleRef = generateSchedulerRef();
//   const newCurr = "EUR";
//   const newAmount = String(plan.currentPrice * 100);
//   const schedule = plan_type;

//   const newHashString = `${newTimestamp}.${MERCHANT_ID}.${sheduleRef}.${newAmount}.${newCurr}.${user.card.pay_ref}.${schedule}`;
//   const newHash1 = crypto.createHash("sha1").update(newHashString).digest("hex");

//   const newFinalString = `${newHash1}.${SECRET}`;
//   const newSha1Hash = crypto.createHash("sha1").update(newFinalString).digest("hex");

//   function formatToYYYYMMDD(date) {
//     const d = new Date(date);
//     const year = d.getFullYear();
//     const month = String(d.getMonth() + 1).padStart(2, "0");
//     const day = String(d.getDate()).padStart(2, "0");

//     return `${year}${month}${day}`;
//   }

//   function getLastDayOfMonth(year, month) {
//     return new Date(year, month + 1, 0).getDate();
//   }

//   function getScheduleStartDate(type) {
//     const today = new Date();
//     const day = today.getDate();
//     const month = today.getMonth();
//     const year = today.getFullYear();

//     if (type === "monthly") {
//       const nextMonth = (month + 1) % 12;
//       const nextYear = month === 11 ? year + 1 : year;
//       const lastDayOfNextMonth = getLastDayOfMonth(nextYear, nextMonth);

//       if (day >= 29) {
//         return new Date(nextYear, nextMonth, lastDayOfNextMonth);
//       }

//       return new Date(nextYear, nextMonth, day);
//     }

//     if (type === "yearly") {
//       const nextYear = year + 1;

//       // Feb 29 case (Leap year issue)
//       const isLeapFeb29 = month === 1 && day === 29;
//       if (isLeapFeb29) {
//         return new Date(nextYear, 1, 28); // 28 Feb next year
//       }

//       const lastDayOfTargetMonth = getLastDayOfMonth(nextYear, month);
//       const finalDay = Math.min(day, lastDayOfTargetMonth);

//       return new Date(nextYear, month, finalDay);
//     }

//     throw new Error("Invalid type provided");
//   }

//   function getScheduleEndDate(type, startDate, cycles) {
//     const day = startDate.getDate();
//     let month = startDate.getMonth();
//     let year = startDate.getFullYear();

//     if (type === "monthly") {
//       for (let i = 0; i < cycles - 1; i++) {
//         month += 1;
//         if (month > 11) {
//           month = 0;
//           year += 1;
//         }
//       }

//       const lastDay = getLastDayOfMonth(year, month);
//       const finalDay = day >= 29 ? lastDay : Math.min(day, lastDay);
//       return new Date(year, month, finalDay);
//     }

//     if (type === "yearly") {
//       const finalYear = year + (cycles - 1);

//       const isLeapFeb29 = month === 1 && day === 29;
//       if (isLeapFeb29) {
//         return new Date(finalYear, 1, 28); // Feb 28 in non-leap years
//       }

//       const lastDay = getLastDayOfMonth(finalYear, month);
//       const finalDay = Math.min(day, lastDay);
//       return new Date(finalYear, month, finalDay);
//     }

//     throw new Error("Invalid type provided");
//   }

//   let schedule_start, schedule_end;

//   if (user_suscriptions.length === 0) {
//     schedule_start = getScheduleStartDate(schedule);
//     schedule_end = getScheduleEndDate(schedule, schedule_start, 2);
//   } else if (user_suscriptions.length === 1) {
//     const endDate = new Date(user_suscriptions[0].end_date);
//     const today = new Date();

//     const isToday = endDate.getDate() === today.getDate() && endDate.getMonth() === today.getMonth() && endDate.getFullYear() === today.getFullYear();

//     if (isToday) {
//       const nextDay = new Date(endDate);
//       nextDay.setDate(endDate.getDate() + 1);

//       schedule_start = nextDay;
//       schedule_end = getScheduleEndDate(schedule, schedule_start, 2);
//     } else {
//       schedule_start = endDate;
//       schedule_end = getScheduleEndDate(schedule, schedule_start, 2);
//     }
//   } else {
//     schedule_start = new Date(user_suscriptions[0].end_date);
//     schedule_end = getScheduleEndDate(schedule, schedule_start, 2);
//   }

//   function generateScheduleXmlRequest() {
//     const builder = new Builder({ headless: true });
//     const xmlObj = {
//       request: {
//         $: { type: "schedule-new", timestamp: newTimestamp },
//         merchantid: MERCHANT_ID,
//         channel: "ECOM",
//         account: "internet",
//         scheduleref: sheduleRef,
//         alias: "Fresh Art Club Subscription",
//         orderidstub: "freshart",
//         transtype: "auth",
//         schedule: schedule,
//         numtimes: "1",
//         payerref: user.card.pay_ref,
//         paymentmethod: user.card.pmt_ref,
//         amount: { _: newAmount, $: { currency: newCurr } },
//         prodid: user.artistName,
//         varref: user._id,
//         customer: user.userId,
//         comment: "Subscription of Fresh Art Club",
//         sha1hash: newSha1Hash,
//       },
//     };

//     if (user_suscriptions.length > 0) {
//       const formatted = formatToYYYYMMDD(schedule_end);

//       xmlObj.request["startdate"] = { _: formatted };
//     }

//     const xmlBody = builder.buildObject(xmlObj);
//     return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;
//   }

//   const newXmlRequest = generateScheduleXmlRequest();
//   const newScheduleResponse = await axios.post(`${url}`, newXmlRequest, {
//     headers: {
//       "Content-Type": "text/xml",
//     },
//   });

//   const parseNewScheduleResponse = await parseStringPromise(newScheduleResponse.data);
//   if (parseNewScheduleResponse.response.result[0] !== "00") {
//     return res.status(400).send({ message: parseNewScheduleResponse.response.message[1] });
//   }

//   let obj = {
//     status: "not_started",
//     plan: plan._id,
//     user: req.user._id,
//     type: schedule,
//     schedule_defined: 1,
//     isScheduled: true,
//     start_date: schedule_start,
//     end_date: schedule_end,
//   };

//   if (user_suscriptions.length == 0) {
//     obj["otherSchedule"] = subOrder._id;
//   }

//   const newSubOrder = await Subscription.create(obj);

//   if (user_suscriptions.length == 0) {
//     await Promise.all([
//       Subscription.updateOne({ _id: subOrder._id }, { $set: { end_date: schedule_end } }),
//       SubscriptionTransaction.create({
//         order: newSubOrder._id,
//         user: req.user._id,
//         status: "success",
//         sha1hash: parseNewScheduleResponse.response.sha1hash[0],
//       }),
//     ]);
//   } else {
//     await SubscriptionTransaction.create({
//       order: newSubOrder._id,
//       user: req.user._id,
//       status: "success",
//       sha1hash: parseNewScheduleResponse.response.sha1hash[0],
//     });
//   }

//   return res.status(200).send({ message: "Subscription created successfully" });
// });
