const express = require("express");
const router = express.Router();
const BecomeArtist = require("../models/becomeArtistModel");
const { login, becomeArtist } = require("../controller/artistController");

router.post("/login", login);

router.post("/become-artist", becomeArtist);

module.exports = router;
