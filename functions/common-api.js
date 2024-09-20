
const Art = require("../models/artModel");
const User = require('../models/userModel')
const Artist = require('../models/artistModel')
const { v4: uuidv4 } = require("uuid");
const { codeRem, getLength } = require('./common')
const { sendMail } = require('../functions/mailer')
const md5 = require("md5");
const { createCustomer } = require('../functions/payment')

module.exports.isEnableOrDisableArt = (id, data, users) => {
    return new Promise(async function (resolve, reject) {
        try {
            let condition = {
                isEnable: data
            }

            if (users.roles === 'superAdmin') {
                condition['updatedBy'] = users.userId
            }

            Art.updateOne({ _id: id, isDeleted: false }, { $set: condition }).then();

            // Resolve the process
            return resolve({
                status: 200,
                message: JSON.parse(data) === true ? 'Art enabled succcessfully' : 'Art disabled succcessfully'
            });

        } catch (error) {
            // Reject the process
            return reject(error);
        };
    });
};

module.exports.forgotPasswordforArtistorUser = (email, otp) => {
    return new Promise(async function (resolve, reject) {
        try {

            const userData = await User.countDocuments({
                email: { $eq: email },
                isDeleted: false,
                status: "active",
            });

            if (userData) {
                User.updateOne({ email: { $eq: email } }, { $set: { OTP: otp } }).then();
            } else {
                const artistData = await Artist.countDocuments({
                    email: { $eq: email },
                    isDeleted: false,
                    status: "active",
                });

                if (!artistData) {
                    return resolve({
                        status: 400,
                        message: 'Email not found'
                    })
                }

                Artist.updateOne({ email: { $eq: email } }, { $set: { OTP: otp } }).then();
            }

            const mailVariable = {
                '%otp%': otp
            }

            sendMail('otp-verify', mailVariable, email);

            return resolve({
                type: 'success',
                status: 201,
                email: email,
                message: "Reset password OTP sent successfully"
            })

        } catch (error) {
            // Reject the process
            return reject(error);
        };
    });
};

module.exports.forgotPasswordVerifyOTP = (email, otp) => {
    return new Promise(async function (resolve, reject) {
        try {
            const token = uuidv4();
            const userData = await User.findOne({
                email: email,
                isDeleted: false,
                status: "active",
            }).lean();

            if (userData) {
                if (userData?.OTP != otp) {
                    return resolve({ type: 'error', status: 400, message: "Invalid OTP" })
                }
                User.updateOne({ email: email, isDeleted: false, status: "active" }, { $unset: { OTP: "" }, $set: { token: token } }).then()
            } else {
                const artistData = await Artist.findOne({ email: email, isDeleted: false, status: "active" }).lean();
                if (!artistData) {
                    return resolve({
                        type: 'error',
                        status: 400,
                        message: 'Data not found'
                    })
                }

                if (artistData?.OTP != otp) {
                    return resolve({ type: 'error', status: 400, message: "Invalid OTP" })
                }
                Artist.updateOne({ email: email }, { $unset: { OTP: "" }, $set: { token: token } }).then();
            }

            return resolve({
                type: 'success',
                status: 201,
                token,
                message: "Reset password OTP sent successfully"
            })

        } catch (error) {
            // Reject the process
            return reject(error);
        };
    });
};

module.exports.resetPasswordforArtistorUser = (token, password) => {
    return new Promise(async function (resolve, reject) {
        try {

            const userData = await User.findOne({
                token: token,
                isDeleted: false,
                status: "active",
            }).lean();

            if (password.newPassword != password.confirmPassword) {
                return resolve({
                    type: 'error',
                    status: 400,
                    message: 'The new password and confirm password entries must match. Please ensure they are identical.'
                })
            }

            if (userData) {
                User.updateOne({ token: token, isDeleted: false, status: "active" }, { $unset: { token: "" }, $set: { password: md5(password.newPassword), tokens: [] } }).then();
            } else {
                const artistData = await Artist.findOne({
                    token: token,
                    isDeleted: false,
                    status: "active",
                }).lean();

                if (!artistData) {
                    return resolve({
                        type: 'error',
                        status: 400,
                        message: 'Data not found'
                    });
                }

                Artist.updateOne({ token: token }, { $unset: { token: "" }, $set: { password: md5(password.newPassword), tokens: [] } }).then();
            }
            return resolve({
                type: 'success',
                status: 201,
                message: 'Your password has been reset successfully'
            });
        } catch (error) {
            // Reject the process
            return reject(error);
        };
    });
};

module.exports.commericalUsersFunc = (commArray, users) => {
    return new Promise(async function (resolve, reject) {
        try {

            const userIdData = (await User.find({}, { userId: 1 }).sort({ _id: -1 }))[0];
            let userId = userIdData.userId

            for (let data of commArray) {
                let email = data.email.toLowerCase().trim()
                const mailVariable = {
                    "%fullName%": `${data.firstName} ${data.lastName}`,
                    "%email%": email,
                    "%password%": data.password
                };

                sendMail("commerical-users", mailVariable, email);
                data['email'] = email
                data['phone'] = `+${data.phone.replace(/[- )(]/g, "").trim()}`
                data['password'] = md5(data.password)

                let dataObj = {
                    customerId: await createCustomer({ name: `${data.firstName} ${data.lastName}`, email: email }),
                    phone1: await codeRem(data.phone),
                    dob: users.dob,
                    status: 'active',
                    isVerified: true,
                    isCompletedForm: true,
                    address: users.address,
                    ownedBy: users.id,
                    userId: userId += 1
                }

                let length = await getLength(dataObj?.userId);
                dataObj["userIdStr"] = `BID${("00" + dataObj?.userId).slice(-length)}`;

                let commercialObj = Object.assign(data, dataObj)
                await User.create(commercialObj)
            }

            return resolve({
                type: 'success',
                status: 201,
                message: `Users credentials have been sent to the respective users email.`
            })

        } catch (error) {
            return reject(error);
        }
    })
}

