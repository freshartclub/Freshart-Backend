const express = require("express");
const {
  listDiscipline,
  listArtworkStyle,
  listTheme,
  listTechnic,
  listMediaSupport,
  deleteStyle,
  deleteDiscipline,
  deleteTechnic,
  deleteTheme,
  deleteMedia,
  getGeneralKBList,
  getFAQGeneralList,
} = require("../controller/generalController");
const {
  addDiscipline,
  getDisciplineById,
  addStyles,
  getStyleById,
  addTechnic,
  getTechnicById,
  addMediaSupport,
  getMediaById,
  addTheme,
  getThemeById,
} = require("../controller/adminController");
const validateAdminToken = require("../middleware/adminValidateToken");

const router = express.Router();

router.post("/add-discipline", validateAdminToken, addDiscipline);

router.get("/get-discipline/:id", validateAdminToken, getDisciplineById);

router.post("/add-style", validateAdminToken, addStyles);

router.get("/get-style/:id", validateAdminToken, getStyleById);

router.post("/add-technic", validateAdminToken, addTechnic);

router.get("/get-technic/:id", validateAdminToken, getTechnicById);

router.post("/add-media", validateAdminToken, addMediaSupport);

router.get("/get-media/:id", validateAdminToken, getMediaById);

router.post("/add-theme", validateAdminToken, addTheme);

router.get("/get-theme/:id", validateAdminToken, getThemeById);

router.get("/list-discipline", listDiscipline);

router.get("/list-style", listArtworkStyle);

router.get("/list-theme", listTheme);

router.get("/list-technic", listTechnic);

router.get("/list-media", listMediaSupport);

router.patch("/delete-style/:id", validateAdminToken, deleteStyle);

router.patch("/delete-discipline/:id", validateAdminToken, deleteDiscipline);

router.patch("/delete-technic/:id", validateAdminToken, deleteTechnic);

router.patch("/delete-theme/:id", validateAdminToken, deleteTheme);

router.patch("/delete-media/:id", validateAdminToken, deleteMedia);

router.get("/get-general-kb-list", getGeneralKBList);

router.get("/get-general-faq-list", getFAQGeneralList);

module.exports = router;
