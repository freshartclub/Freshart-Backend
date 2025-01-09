const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");
const MailTemplate = require("../models/mailTemplates");

module.exports.sendMail = (
  templateName,
  mailVariable,
  email,
  fromEmail = "hello@freshartclub.com"
) => {
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

      const transporter = nodemailer.createTransport(
        smtpTransport({
          host: "smtp.office365.com",
          port: 587,
          secure: false,
          auth: {
            user: "frac-service@freshartclub.com",
            pass: "FRAC.2025!",
          },
          tls: {
            ciphers: "SSLv3",
          },
        })
      );

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

      transporter.sendMail(options, function (error) {
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
