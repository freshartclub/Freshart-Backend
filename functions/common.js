const Artist = require('../models/artistModel')
const User = require('../models/userModel')
const Plan = require('../models/planModel')
const Payment = require('../models/paymentModel')
const Cart = require('../models/cartModel')
const jwt = require("jsonwebtoken");
const { userProfile, getStateNativeAmerican } = require("./config");
const { phoneArray } = require('../config/config')
const moment = require('moment')
const { sendMail } = require('../functions/mailer')
const { twilio } = require('../functions/twilio')
const { uploadFile, getImageFile } = require("../functions/aws-sdk");
const { cancelSubscribe, createCustomer } = require('../functions/payment');
const axios = require('axios')
const objectId = require("mongoose").Types.ObjectId;


module.exports.createLog = (logName) => {
	try {
		return require("simple-node-logger").createRollingFileLogger({
			logDirectory: "logs", // NOTE: folder must exist and be writable...
			fileNamePattern: logName + "_<DATE>.log",
			dateFormat: "YYYY_MM_DD",
			timestampFormat: "YYYY-MM-DD HH:mm:ss",
		});
	} catch (error) {
		throw error;
	}
};

module.exports.userProfilePercentage = (user) => {
	try {
		let count = 0;
		let calcPercentage = 0;
		let obj = {};

		if (user?.address) {
			for (const [key, value] of Object.entries(user.address)) {
				obj = { ...obj, [key]: value };
			}
			user = { ...user, ...obj };
		}
		for (let data in user) {
			if (userProfile.includes(data)) {
				count += 1;
			}
		}
		calcPercentage = (count / userProfile.length) * 100;
		return Math.round(calcPercentage);
	} catch (error) {
		throw error;
	}
};

module.exports.getLength = (idLength) => {
	try {
		let length = String(idLength).length
		if (parseInt(length) <= 3) {
			length = 3;
		}
		return length;
	} catch (error) {
		throw error;
	}
};

module.exports.checkCredentialsForUser = (phone, email) => {
	return new Promise(async function (resolve, reject) {
		try {
			const [checkPhone, isVerified, isCheckPhoneArtist, checkEmail, isCheckEmailArtist, checkBannedArtist, checkBannedUser] = await Promise.all([
				User.countDocuments({ phone: phone, isDeleted: false, isVerified: true }),
				User.findOne({ $or: [{ phone: phone }, { email: email }], isDeleted: false, isVerified: false }).lean(true),
				Artist.countDocuments({ phone: phone, isDeleted: false }),
				User.countDocuments({ email: email, isDeleted: false, isVerified: true }),
				Artist.countDocuments({ email: email, isDeleted: false }),
				Artist.countDocuments({ $or: [{ phone: phone }, { email: email }], isDeleted: true }),
				User.countDocuments({ $or: [{ phone: phone }, { email: email }], isDeleted: true }),
			]);

			if (checkPhone || isCheckPhoneArtist) {
				return resolve({
					type: 'error',
					status: 400,
					message: "The phone number you entered is already registered. Please try another phone number."
				})
			}

			if (checkEmail || isCheckEmailArtist) {
				return resolve({
					type: 'error',
					status: 400,
					message: "The Email address you entered is already registered. Please try another email address.",
				});
			}

			if (checkBannedArtist || checkBannedUser) {
				return resolve({
					type: 'error',
					status: 400,
					message: "These credentials have been banned. Please contact the administrator."
				})
			}

			if (isVerified) {
				await User.deleteOne({ _id: isVerified._id });
			}

			return resolve({
				type: 'success',
				status: 200,
			});

		} catch (error) {
			return reject(error);
		}
	})
}

module.exports.checkCredentialsForArtist = (phone, email) => {
	return new Promise(async function (resolve, reject) {
		try {
			const [checkPhone, isVerified, isCheckPhoneArtist, checkEmail, isCheckEmailArtist, checkBannedArtist, checkBannedUser] = await Promise.all([
				Artist.countDocuments({ phone: phone, isDeleted: false, isVerified: true }),
				Artist.findOne({ $or: [{ phone: phone }, { email: email }], isDeleted: false, isVerified: false }).lean(true),
				User.countDocuments({ phone: phone, isDeleted: false }),
				Artist.countDocuments({ email: email, isDeleted: false, isVerified: true }),
				User.countDocuments({ email: email, isDeleted: false }),
				Artist.countDocuments({ $or: [{ phone: phone }, { email: email }], isDeleted: true }),
				User.countDocuments({ $or: [{ phone: phone }, { email: email }], isDeleted: true }),
			]);

			if (checkPhone || isCheckPhoneArtist) {
				return resolve({
					type: 'error',
					status: 400,
					message: "The phone number you entered is already registered. Please try another phone number."
				})
			}

			if (checkEmail || isCheckEmailArtist) {
				return resolve({
					type: 'error',
					status: 400,
					message: "The Email address you entered is already registered. Please try another email address.",
				});
			}

			if (checkBannedArtist || checkBannedUser) {
				return resolve({
					type: 'error',
					status: 400,
					message: "These credentials have been banned. Please use different credentials."
				})
			}

			if (isVerified) {
				await Artist.deleteOne({ _id: isVerified._id });
			}

			return resolve({
				type: 'success',
				status: 200,
			});

		} catch (error) {
			return reject(error)
		}
	})
}

module.exports.codeRem = (phone) => {
	try {
		for (let data of phoneArray) {
			phone = phone.replace(data, '');
		}
		return phone;
	} catch (error) {
		throw error;
	}
};

module.exports.generatePassword = () => {
	try {
		let length = 8,
			charset = "abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 @/\_-&*#$!()",
			charsetArr = charset.split(' ');
		let retVal = "";
		charsetArr.forEach(chars => {
			for (let i = 0, n = chars.length; i < length / charsetArr.length; ++i) {
				retVal += chars.charAt(Math.floor(Math.random() * n));
			}
		})
		return retVal;
	} catch (error) {
		throw error;
	}
};

module.exports.filterArtist = (data) => {

	//Declare the blank object
	let condition = { '$or': [] };

	if (data && data?.search) {

		//Remove space
		data.search = (data.search).replace(/[^a-zA-Z 0-9_@./&-]/g, '').trim();

		condition['$or'].push({
			artistIdStr: {
				'$regex': data.search,
				'$options': 'i'
			},
		})

		condition['$or'].push({
			email: {
				'$regex': data.search,
				'$options': 'i'
			},
		})

		if (/^\d+$/.test(data.search)) {
			condition['$or'].push({
				phone: {
					'$regex': data.search,
					'$options': 'i'
				},
			})
		}

		//Split the string
		const splitSearch = ((data.search).replace(/[^a-zA-Z ]/g, '').trim()).split(" ");

		if (splitSearch.length > 1 && splitSearch[0] != '') {
			condition['$or'].push({
				$and: [
					{
						firstName: {
							'$regex': splitSearch[0],
							'$options': 'i'
						}
					}, {
						lastName: {
							'$regex': splitSearch[1],
							'$options': 'i'
						}
					}
				]
			})
		} else if (splitSearch[0] != '') {
			condition['$or'].push({
				firstName: {
					'$regex': splitSearch.join(' '),
					'$options': 'i'
				}
			}, {
				lastName: {
					'$regex': splitSearch.join(' '),
					'$options': 'i'
				}
			})
		}
	}

	if (!condition['$or'].length) {
		delete condition['$or']
	}

	//Resolve the process
	return condition;
};

module.exports.signupFunc = (id, data, role) => {
	return new Promise(async function (resolve, reject) {
		try {
			let dataObj;

			if (role === 'users') {
				dataObj = await User.findOne({ _id: id, isDeleted: false }).lean(true)
			} else {
				dataObj = await Artist.findOne({ _id: id, isDeleted: false }).lean(true);
			}

			if (!dataObj) {
				return resolve({
					status: 400,
					message: role === 'users' ? "User not found" : "Artist not found"
				})
			}

			if (!dataObj?.isVerified) {
				return resolve({ status: 400, message: 'Your account is not verified please verified first' })
			}

			if (!data?.file) {
				return resolve({ status: 400, message: 'Please upload the profile image' })
			}

			let date = moment(new Date(data.body.dob)).format("YYYY-MM-DD[T00:00:00.000Z]");
			let getDate = date;
			date = date.split("-");

			if (parseInt(date[0]) < 1900 || parseInt(date[0]) > new Date().getFullYear()) {
				return resolve({ status: 400, message: "Please add the valid date" });
			}

			const currDate = moment();
			const diffDate = currDate.diff(getDate, "years");

			if (diffDate < 18) {
				return resolve({ status: 400, message: "To sign up, you must be 18 years of age or older." })
			}

			let obj = {
				_id: id,
				firstName: data?.body?.firstName.toLowerCase().replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase()).trim(),
				lastName: data?.body?.lastName.toLowerCase().replace(/(^\w{1})|(\s{1}\w{1})/g, (match) => match.toUpperCase()).trim(),
				email: dataObj?.email,
				dob: moment(data.body.dob).format("YYYY-MM-DD[T00:00:00.000Z]"),
				roles: role === 'users' ? 'user' : 'artist',
			};

			if (dataObj?.roles === 'artist') {
				obj['artistId'] = dataObj?.artistId
			} else {
				obj['userId'] = dataObj?.userId
				obj['status'] = 'active'
				obj['customerId'] = await createCustomer({ name: `${obj.firstName} ${obj.lastName}`, email: obj.email })
			}

			const imgData = await uploadFile(data.file, process.env.BUCKET_NAME, role);
			obj["profileImage"] = imgData.imageURL;

			const token = jwt.sign({ user: obj }, process.env.ACCESS_TOKEN_SECERT, { expiresIn: "30d" });

			if (role === 'users') {
				User.updateOne({ _id: id, isDeleted: false }, { $set: obj, $push: { tokens: token } }).then()
			} else {
				Artist.updateOne({ _id: id, isDeleted: false }, { $set: obj, $push: { tokens: token } }).then();
			}

			return resolve({
				status: 200,
				data: obj,
				token,
				message: role === 'users' ? "User Profile updated successfully" : "Artist Profile updated successfully"
			});

		} catch (error) {
			return reject(error);
		}
	})
}

module.exports.resentOTP = (data, roles) => {
	return new Promise(async function (resolve, reject) {
		try {
			const pattern = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
			const result = pattern.test(data);

			let dataObj = {
				isDeleted: false
			};

			if (result) {
				dataObj["email"] = data;
			} else {
				dataObj["phone"] = data;
			}

			let objData;
			if (roles === 'artist') {
				objData = await Artist.findOne(dataObj).lean(true);
				if (!objData) {
					return resolve({
						status: 400,
						message: "Artist not found"
					})
				}
			} else {
				objData = await User.findOne(dataObj).lean(true);
				if (!objData) {
					return resolve({
						status: 400,
						message: "User not found"
					})
				}
			}

			dataObj["OTP"] = String(Math.floor(100000 + Math.random() * 900000));
			if (dataObj?.email) {
				const mailVariable = {
					"%otp%": dataObj.OTP,
				};
				sendMail("otp-verify", mailVariable, dataObj.email);
			} else {
				await twilio(dataObj);
			}

			if (roles === 'artist') {
				Artist.updateOne({ _id: objData._id }, { $set: { OTP: dataObj["OTP"] } }).then();
			} else {
				User.updateOne({ _id: objData._id }, { $set: { OTP: dataObj["OTP"] } }).then();
			}

			return resolve({
				status: 200,
				message: "Resent otp sent successfully"
			});

		} catch (error) {
			return reject(error);
		}
	})
}

module.exports.getPlansFunc = (role) => {
	return new Promise(async function (resolve, reject) {
		try {
			const plans = await Plan.find({ planRoles: role }).lean(true)

			if (plans.length) {
				return resolve({
					status: 200,
					data: plans,
					message: "Plans received successfully",
				})
			}

			return resolve({
				status: 200,
				data: [],
				message: "Plans not found",
			});

		} catch (error) {
			return reject(error);
		}
	})
}

module.exports.subscribeCancelFunc = (id, subscribeId, userId) => {
	return new Promise(async function (resolve, reject) {
		try {
			await Promise.all([
				Payment.updateOne({ _id: id, isDeleted: false }, {
					$set: {
						isDeleted: true,
						status: 'cancelled',
						cancelSubscriptionDate: new Date(),
						updatedBy: userId
					}
				}),
				cancelSubscribe(subscribeId)
			])

			return resolve({
				status: 200,
				message: "Subscription deleted successfully",
			});

		} catch (error) {
			return reject(error);
		}
	})
}

module.exports.getArtistFilter = (query) => {
	return new Promise(async function (resolve, reject) {
		try {

			let condition = {
				isDeleted: false
			}

			if (query?.selfIdentification?.length) {
				condition["selfIdentification"] = { $elemMatch: { name: { $in: query?.selfIdentification }, val: { $ne: "" } } }
			}

			if (query?.formate) {
				if (query?.formate === 'isArtistCurated') {
					condition["isArtistCurated"] = true;
				}

				if (query?.formate === 'isCommission') {
					condition["additionalInfo.isCommissions"] = true
				}
			}

			if (query?.location) {
				if (query?.location?.country) {
					condition["address.country"] = {
						$regex: query.location.country,
						$options: "i",
					};
				}

				if (query?.location?.state) {
					condition["address.state"] = {
						$regex: query.location.state,
						$options: "i",
					};
				}

				if (query?.location?.city) {
					condition["address.city"] = {
						$regex: query.location.city,
						$options: "i",
					};
				}

			}

			const artist = await Artist.find(condition, { _id: 1 }).lean(true)
			if (artist.length) {
				const mapArtist = artist.map((data) => data._id);
				return resolve({
					status: 200,
					data: mapArtist,
					message: "Artist received successfully",
				})
			}

			return resolve({
				status: 200,
				data: [],
				message: "Artist not found",
			});

		} catch (error) {
			return reject(error);
		}
	})
}

module.exports.uploadIncomeLevel = (artist) => {
	return new Promise(async function (resolve, reject) {
		try {
			const geoData = await axios.get(`https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${artist.longitude}&y=${artist.latitude}&benchmark=4&vintage=4`);
			let census = '';
			if (geoData?.data?.result?.geographies?.['Incorporated Places']) {
				census = geoData?.data?.result?.geographies?.['Incorporated Places'][0]
			} else {
				if (geoData?.data?.result?.geographies?.['Census Designated Places']) {
					census = geoData?.data?.result?.geographies?.['Census Designated Places'][0]
				}
			}
			const baseUrl = 'https://api.census.gov/data/2022/acs/acs5';

			// Define the parameters for the request
			const params = {
				get: 'NAME,B19013_001E',
				for: `place:${census?.PLACE ? census?.PLACE : undefined}`,
				in: `state:${census?.STATE ? census?.STATE : census?.['STATE CODE'] ? census?.['STATE CODE'] : undefined}`,
			};
			const response = await axios.get(baseUrl, { params });
			const data = response?.data;

			if (data.length > 1) {
				const medianIncome = parseInt(data[1][1]);
				let level;
				if (medianIncome > 84941) {
					level = 'high'
				} else if (medianIncome > 56627 && medianIncome < 84941) {
					level = 'moderate'
				} else {
					level = 'low'
				}
				return resolve({
					type: 'success',
					data: {
						level,
						income: medianIncome
					}
				});
			}
			return resolve({ data: 'data not found' });
		} catch (error) {
			return reject(error);
		}
	})
}

module.exports.nativePlace = (obj) => {
	return new Promise(async function (resolve, reject) {
		try {

			const isNativeCity = await getStateNativeAmerican({ city: obj.city, state: obj.state })
			if (isNativeCity) {
				// URL to get information about the territory based on latitude and longitude
				const url = `https://native-land.ca/wp-json/nativeland/v1/api/index.php?maps=territories&position=${obj.latitude},${obj.longitude}`;

				const response = await axios.get(url);
				const data = response?.data;
				if (data.length > 0) {
					const array = data.map((element) => {
						return element.properties.Name
					});
					return resolve({ data: array, isNative: true })
				}
			}
			return resolve({ data: [], isNative: false })
		} catch (error) {
			return reject(error);
		}
	})
}

module.exports.getCertificateData = (data) => {
	return new Promise(async function (resolve, reject) {
		try {

			let obj = {
				isOriginal : false,
				isPrintLimitedEdition: false
			}

			if(data?.original) {
				obj['isOriginal'] = true
			}

			if(data?.print === 'limitedEdition') {
				obj['isPrintLimitedEdition'] = true
			}

			return resolve(obj)

		} catch (error) {
			return reject(error);
		}
	})
}

module.exports.filterArt = (data) => {

	//Declare the blank object
	let condition = { '$or': [] };

	if (data && data?.search) {

		//Remove space
		data.search = (data.search).replace(/[^a-zA-Z 0-9_@./&-]/g, '').trim();

		condition['$or'].push({
			artName: {
				'$regex': data.search,
				'$options': 'i'
			}
		}, {
			artId: {
				'$regex': data.search,
				'$options': 'i'
			}
		}, {
			series: {
				'$regex': data.search,
				'$options': 'i'
			}
		})

	}

	if (!condition['$or'].length) {
		delete condition['$or']
	}

	//Resolve the process
	return condition;
};

module.exports.getCartFunc = (user) => {
	return new Promise(async function (resolve, reject) {
		try {
			let condition = {
				isDeleted: false
			}

			if (user?.cartId) {
				condition['_id'] = objectId(user.cartId)
			} else {
				condition['addedBy'] = objectId(user.id)
			}

			const cart = await Cart.aggregate([{
				$match: condition,
			},
			{
				$lookup: {
					from: "arts",
					let: { artId: "$artId" },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ["$_id", "$$artId"],
										}, {
											$eq: ["$isDeleted", false]
										}
									]

								},
							},
						},
						{
							$project: {
								artImage: 1,
								artSeriesImages: 1,
								_id: 0
							},
						},
					],
					as: "arts",
				},
			},
			{
				$unwind: {
					path: "$arts",
					preserveNullAndEmptyArrays: false
				},
			}
			])

			if (cart.length) {
				let total = 0
				for (let data of cart) {
					
					total += (data?.price * data?.quantity)

					if (data.arts.artImage.length) {
						const profile = await getImageFile(process.env.BUCKET_NAME, data.arts.artImage[0]);
						data.arts.artImage = profile.imageUrl;
					}

					if (data.arts.artSeriesImages.length) {
							const profile = await getImageFile(process.env.BUCKET_NAME, data.arts.artSeriesImages[0].imageUrl);
							data.arts.artSeriesImages = profile.imageUrl;
						}
					}

				return resolve({
					status: 200,
					data: cart,
					price: total,
					message: "Cart received successfully",
				})
			}

			return resolve({
				status: 200,
				data: [],
				price: 0,
				message: "No cart found",
			});

		} catch (error) {
			return reject(error);
		}
	})
}

module.exports.getCurrencyByCountry = (data) => {
	return new Promise(async function (resolve, reject) {
		try {
			
			let obj = {
				"Afghanistan": "AFN",
				"Albania": "ALL",
				"Algeria": "DZD",
				"American Samoa": "USD",
				"Andorra": "EUR",
				"Angola": "AOA",
				"Anguilla": "XCD",
				"Antarctica": "XCD",
				"Antigua and Barbuda": "XCD",
				"Argentina": "ARS",
				"Armenia": "AMD",
				"Aruba": "AWG",
				"Australia": "AUD",
				"Austria": "EUR",
				"Azerbaijan": "AZN",
				"Bahamas": "BSD",
				"Bahrain": "BHD",
				"Bangladesh": "BDT",
				"Barbados": "BBD",
				"Belarus": "BYR",
				"Belgium": "EUR",
				"Belize": "BZD",
				"Benin": "XOF",
				"Bermuda": "BMD",
				"Bhutan": "BTN",
				"Bolivia": "BOB",
				"Bosnia and Herzegovina": "BAM",
				"Botswana": "BWP",
				"Bouvet Island": "NOK",
				"Brazil": "BRL",
				"British Indian Ocean Territory": "USD",
				"Brunei": "BND",
				"Bulgaria": "BGN",
				"Burkina Faso": "XOF",
				"Burundi": "BIF",
				"Cambodia": "KHR",
				"Cameroon": "XAF",
				"Canada": "CAD",
				"Cape Verde": "CVE",
				"Cayman Islands": "KYD",
				"Central African Republic": "XAF",
				"Chad": "XAF",
				"Chile": "CLP",
				"China": "CNY",
				"Christmas Island": "AUD",
				"Cocos (Keeling) Islands": "AUD",
				"Colombia": "COP",
				"Comoros": "KMF",
				"Congo": "XAF",
				"Cook Islands": "NZD",
				"Costa Rica": "CRC",
				"Croatia": "EUR",
				"Cuba": "CUP",
				"Cyprus": "EUR",
				"Czech Republic": "CZK",
				"Denmark": "DKK",
				"Djibouti": "DJF",
				"Dominica": "XCD",
				"Dominican Republic": "DOP",
				"East Timor": "USD",
				"Ecuador": "ECS",
				"Egypt": "EGP",
				"El Salvador": "SVC",
				"England": "GBP",
				"Equatorial Guinea": "XAF",
				"Eritrea": "ERN",
				"Estonia": "EUR",
				"Eswatini": "SZL",
				"Ethiopia": "ETB",
				"Falkland Islands": "FKP",
				"Faroe Islands": "DKK",
				"Fiji Islands": "FJD",
				"Finland": "EUR",
				"France": "EUR",
				"French Guiana": "EUR",
				"French Polynesia": "XPF",
				"French Southern territories": "EUR",
				"Gabon": "XAF",
				"Gambia": "GMD",
				"Georgia": "GEL",
				"Germany": "EUR",
				"Ghana": "GHS",
				"Gibraltar": "GIP",
				"Greece": "EUR",
				"Greenland": "DKK",
				"Grenada": "XCD",
				"Guadeloupe": "EUR",
				"Guam": "USD",
				"Guatemala": "QTQ",
				"Guinea": "GNF",
				"Guinea-Bissau": "CFA",
				"Guyana": "GYD",
				"Haiti": "HTG",
				"Heard Island and McDonald Islands": "AUD",
				"Holy See (Vatican City State)": "EUR",
				"Honduras": "HNL",
				"Hong Kong": "HKD",
				"Hungary": "HUF",
				"Iceland": "ISK",
				"India": "INR",
				"Indonesia": "IDR",
				"Iran": "IRR",
				"Iraq": "IQD",
				"Ireland": "EUR",
				"Israel": "ILS",
				"Italy": "EUR",
				"Ivory Coast": "XOF",
				"Jamaica": "JMD",
				"Japan": "JPY",
				"Jordan": "JOD",
				"Kazakhstan": "KZT",
				"Kenya": "KES",
				"Kiribati": "AUD",
				"Kuwait": "KWD",
				"Kyrgyzstan": "KGS",
				"Laos": "LAK",
				"Latvia": "EUR",
				"Lebanon": "LBP",
				"Lesotho": "LSL",
				"Liberia": "LRD",
				"Libya": "LYD",
				"Liechtenstein": "CHF",
				"Lithuania": "EUR",
				"Luxembourg": "EUR",
				"Macau": "MOP",
				"North Macedonia": "MKD",
				"Madagascar": "MGF",
				"Malawi": "MWK",
				"Malaysia": "MYR",
				"Maldives": "MVR",
				"Mali": "XOF",
				"Malta": "EUR",
				"Marshall Islands": "USD",
				"Martinique": "EUR",
				"Mauritania": "MRO",
				"Mauritius": "MUR",
				"Mayotte": "EUR",
				"Mexico": "MXN",
				"Micronesia Federated States of": "USD",
				"Moldova": "MDL",
				"Monaco": "EUR",
				"Mongolia": "MNT",
				"Montserrat": "XCD",
				"Morocco": "MAD",
				"Mozambique": "MZN",
				"Myanmar": "MMR",
				"Namibia": "NAD",
				"Nauru": "AUD",
				"Nepal": "NPR",
				"Netherlands": "EUR",
				"Netherlands Antilles": "ANG",
				"New Caledonia": "XPF",
				"New Zealand": "NZD",
				"Nicaragua": "NIO",
				"Niger": "XOF",
				"Nigeria": "NGN",
				"Niue": "NZD",
				"Norfolk Island": "AUD",
				"North Korea": "KPW",
				"Northern Ireland": "GBP",
				"Northern Mariana Islands": "USD",
				"Norway": "NOK",
				"Oman": "OMR",
				"Pakistan": "PKR",
				"Palau": "USD",
				"Palestine": null,
				"Panama": "PAB",
				"Papua New Guinea": "PGK",
				"Paraguay": "PYG",
				"Peru": "PEN",
				"Philippines": "PHP",
				"Pitcairn Islands": "NZD",
				"Poland": "PLN",
				"Portugal": "EUR",
				"Puerto Rico": "USD",
				"Qatar": "QAR",
				"Reunion": "EUR",
				"Romania": "RON",
				"Russia": "RUB",
				"Rwanda": "RWF",
				"Saint Helena": "SHP",
				"Saint Kitts and Nevis": "XCD",
				"Saint Lucia": "XCD",
				"Saint Pierre and Miquelon": "EUR",
				"Saint Vincent and the Grenadines": "XCD",
				"Samoa": "WST",
				"San Marino": "EUR",
				"Sao Tome and Principe": "STD",
				"Saudi Arabia": "SAR",
				"Scotland": "GBP",
				"Senegal": "XOF",
				"Serbia": "RSD",
				"Seychelles": "SCR",
				"Sierra Leone": "SLL",
				"Singapore": "SGD",
				"Slovakia": "EUR",
				"Slovenia": "EUR",
				"Solomon Islands": "SBD",
				"Somalia": "SOS",
				"South Africa": "ZAR",
				"South Georgia and the South Sandwich Islands": "GBP",
				"South Korea": "KRW",
				"South Sudan": "SSP",
				"Spain": "EUR",
				"Sri Lanka": "LKR",
				"Sudan": "SDG",
				"Suriname": "SRD",
				"Svalbard and Jan Mayen": "NOK",
				"Sweden": "SEK",
				"Switzerland": "CHF",
				"Syria": "SYP",
				"Tajikistan": "TJS",
				"Tanzania": "TZS",
				"Thailand": "THB",
				"The Democratic Republic of Congo": "CDF",
				"Togo": "XOF",
				"Tokelau": "NZD",
				"Tonga": "TOP",
				"Trinidad and Tobago": "TTD",
				"Tunisia": "TND",
				"Turkey": "TRY",
				"Turkmenistan": "TMT",
				"Turks and Caicos Islands": "USD",
				"Tuvalu": "AUD",
				"Uganda": "UGX",
				"Ukraine": "UAH",
				"United Arab Emirates": "AED",
				"United Kingdom": "GBP",
				"United States": "USD",
				"United States Minor Outlying Islands": "USD",
				"Uruguay": "UYU",
				"Uzbekistan": "UZS",
				"Vanuatu": "VUV",
				"Venezuela": "VEF",
				"Vietnam": "VND",
				"Virgin Islands British": "USD",
				"Virgin Islands U.S.": "USD",
				"Wales": "GBP",
				"Wallis and Futuna": "XPF",
				"Western Sahara": "MAD",
				"Yemen": "YER",
				"Zambia": "ZMW",
				"Zimbabwe": "ZWD"
			}

			return resolve({
				status: 200,
				data: obj[data]
			});

		} catch (error) {
			return reject(error);
		}
	})
}

module.exports.getSSNFormatNumber = (number) => {
	try {

		const numberStr = number.toString().padStart(9, '0');  
		const lastFourDigits = numberStr.slice(-4); 
		const maskedDigits = numberStr.slice(0, -4).replace(/\d/g, 'X');
	
		return `${maskedDigits.slice(0, 3)}-${maskedDigits.slice(3, 5)}-${lastFourDigits}`
	} catch (error) {
		throw error;
	}
};

module.exports.filterUsers = (data) => {

	//Declare the blank object
	let condition = { '$or': [] };

	if (data && data?.search) {

		//Remove space
		data.search = (data.search).replace(/[^a-zA-Z 0-9_@./&-]/g, '').trim();

		condition['$or'].push({
			userIdStr: {
				'$regex': data.search,
				'$options': 'i'
			},
		})

		condition['$or'].push({
			email: {
				'$regex': data.search,
				'$options': 'i'
			},
		})

		if (/^\d+$/.test(data.search)) {
			condition['$or'].push({
				phone: {
					'$regex': data.search,
					'$options': 'i'
				},
			})
		}

		//Split the string
		const splitSearch = ((data.search).replace(/[^a-zA-Z ]/g, '').trim()).split(" ");

		if (splitSearch.length > 1 && splitSearch[0] != '') {
			condition['$or'].push({
				$and: [
					{
						firstName: {
							'$regex': splitSearch[0],
							'$options': 'i'
						}
					}, {
						lastName: {
							'$regex': splitSearch[1],
							'$options': 'i'
						}
					}
				]
			})
		} else if (splitSearch[0] != '') {
			condition['$or'].push({
				firstName: {
					'$regex': splitSearch.join(' '),
					'$options': 'i'
				}
			}, {
				lastName: {
					'$regex': splitSearch.join(' '),
					'$options': 'i'
				}
			})
		}
	}

	if (!condition['$or'].length) {
		delete condition['$or']
	}

	//Resolve the process
	return condition;
};
		
