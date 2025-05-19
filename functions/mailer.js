const nodemailer = require("nodemailer");
const MailTemplate = require("../models/mailTemplates");
const { getToken } = require("./getAccessToken");

module.exports.sendMail = (templateName, mailVariable, email, fromEmail = "hello@freshartclub.com") => {
  return new Promise(async function (resolve, reject) {
    try {
      const template = await MailTemplate.findOne({
        templateEvent: templateName,
        isDeleted: false,
        active: true,
      }).lean(true);

      if (!template) return reject(new Error("Mail template not found"));

      let subject = template?.subject;
      let html = template?.htmlBody;
      let text = template?.textBody;

      const accessToken = await getToken();

      const transporter = nodemailer.createTransport({
        host: "smtp.office365.com",
        port: 587,
        secure: false,
        auth: {
          type: "OAuth2",
          user: process.env.MAIL_USER,
          accessToken: accessToken,
          clientId: process.env.MAIL_CLIENT_ID,
          clientSecret: process.env.MAIL_CLIENT_SECRET,
        },
        tls: {
          ciphers: "TLSv1.2",
          rejectUnauthorized: false,
        },
      });

      for (let key in mailVariable) {
        subject = subject.replaceAll(key, mailVariable[key]);
        html = html.replaceAll(key, mailVariable[key]);
        text = text.replaceAll(key, mailVariable[key]);
      }

      const options = {
        from: `FreshArt Club <${fromEmail}>`,
        to: email,
        subject: subject,
        text: text,
        html: html,
      };

      transporter.sendMail(options, function (error, info) {
        if (error) {
          return reject(error);
        }

        return resolve({
          type: "success",
          message: "Mail successfully sent",
        });
      });
    } catch (error) {
      return reject(error);
    }
  });
};
