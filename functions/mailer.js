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

      // Prepare the options
      const options = {
        from: "frac.test.2024@gmail.com", // sender address
        to: email, // list of receivers
        subject: subject, // Subject line
        text: text, // plain text body
        html: html, // html body
      };

      // Send mail to the particular receiver
      transporter.sendMail(options, function (error) {
        // Error while sending the mail
        if (error) {
          // Resolve the process
          return reject(error);
        }

        // Resolve the process
        return resolve({
          type: "success",
          message: "Mail successfully sent",
        });
      });
    } catch (error) {
      // Reject the process
      return reject(error);
    }
  });
};
