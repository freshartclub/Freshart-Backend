const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");
const MailTemplate = require("../models/mailTemplates");

module.exports.sendMail = (templateName, mailVariable, email) => {
  return new Promise(async function (resolve, reject) {
    try {
      const template = await MailTemplate.findOne({
        templateEvent: templateName,
        isDeleted: false,
        active: true,
      }).lean(true);
      let subject = template?.subject;
      let html = template?.htmlBody;
      let text = template?.textBody;

      // When mail template found
      const transporter = nodemailer.createTransport(
        smtpTransport({
          pool: true,
          host: "smtp.gmail.com",
          port: 465,
          auth: {
            user: "frac.test.2024@gmail.com",
            pass: "wemu tngp albp ljxt",
          },
          secure: true,
          // tls: {
          //   rejectUnauthorized: false,
          // },
        })
      );

      for (let key in mailVariable) {
        subject = subject.replaceAll(key, mailVariable[key]);
        html = html.replaceAll(key, mailVariable[key]);
        text = text.replaceAll(key, mailVariable[key]);
      }

      const options = {
        from: "frac.test.2024@gmail.com",
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
