// In mapRoutes.js
const express = require("express");
const { getMapData } = require("../controllers/map");

const router = express.Router();

router.get("/map-data", getMapData);

module.exports = router;
