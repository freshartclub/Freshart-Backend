const express = require("express");
const path = require("path");
const connectDb = require("./config/dbConnection");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv").config();
const fs = require("fs");

connectDb();
const app = express();
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

const session = require("express-session");
const port = process.env.PORT || 4000;

app.use(
  session({
    resave: false,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);

const dir = [
  "./logs",
  "./public/uploads/users",
  "./public/uploads/artist",
  "./public/uploads/art",
  "./public/uploads/documents",
  "./public/uploads/videos",
];

for (let data of dir) {
  if (!fs.existsSync(data)) {
    fs.mkdirSync(data, { recursive: true });
  }
}

// const limiter = rateLimit({
// 	windowMs: 15 * 60 * 1000,
// 	max: 10000,
// 	message: "Too many request from this IP",
// });

// app.use(limiter);
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
const directory = path.join(__dirname, "public");
app.use(express.static(directory));

app.use("/health", (req, res) => res.send(`Welcome to the server`));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/artist", require("./routes/artistRoutes"));
app.use("/api/general", require("./routes/generalRoutes"));
app.use("/api/picklist", require("./routes/picklistRoutes"));
app.use("/api/order", require("./routes/orderRoutes"));
app.use("/api/email", require("./routes/emailTypeRoutes"));
app.use("/api/circle", require("./routes/circleRoutes"));

require("./functions/cornJob");

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
