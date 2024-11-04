const mongoose = require("mongoose");
const md5 = require("md5");
const humanize = require("string-humanize");
const Admin = require("../models/adminModel");
const Discipline = require("../models/disciplineModel");
const MailTemplate = require("../models/mailTemplates");
const moment = require("moment");
mongoose.set("strictQuery", true);

const connectDb = async () => {
  try {
    const { connection } = await mongoose.connect(
      process.env.CONNECTION_STRING,
      { usenewurlparser: true, useunifiedtopology: true }
    );
    console.log("Database connected: ", connection.host, connection.name);

    const [checkAdmin, checkdiscipline] = await Promise.all([
      Admin.countDocuments(),
      Discipline.countDocuments(),
    ]);

    if (!checkAdmin) {
      await Admin.create({
        firstName: humanize("freshart"),
        lastName: humanize("club"),
        email: "adminfreshart@gmail.com",
        password: md5("Admin@11"),
        access: "owner",
        roles: "superAdmin",
        phone: "+911111111111",
        dob: moment(new Date("01/01/1998")).format(
          "YYYY-MM-DD[T00:00:00.000Z]"
        ),
        adminId: 1,
      });
    }

    if (!checkdiscipline) {
      await Discipline.insertMany([
        {
          disciplineName: "Paintings",
          disciplineSpanishName: "Pintura",
        },
        {
          disciplineName: "Drawings",
          disciplineSpanishName: "Dibujo",
        },
        {
          disciplineName: "Photografy",
          disciplineSpanishName: "Fotografia",
        },
        {
          disciplineName: "Sculpture",
          disciplineSpanishName: "Escultura",
        },
      ]);
    }

    const template = await MailTemplate.countDocuments({});
    if (!template) {
      await MailTemplate.insertMany([
        {
          templateEvent: "become-an-artist",
          subject: "Become an artist",
          mailVariables: "%fullName% %email% %phone%",
          htmlBody: `<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8" /> <meta name="viewport" content="width=device-width, initial-scale=1.0" /> <title>Document</title> </head> <body> <h3>Become an artist Details: -</h3><table border="2px" width ="50%"><tr><th>FullName</th><td>Email</td><td>Phone</td></tr><tr><td>%fullName%</td><td>%email%</td><td>%phone%</td></tr></table></body></html>`,
          textBody:
            "Become an artist credentials are as: %fullName% %email% %phone%",
        },
      ]);
    }
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

module.exports = connectDb;
