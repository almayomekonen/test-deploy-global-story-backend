const express = require("express");
const { getMapData } = require("../controllers/auth");

const router = express.Router();

router.get("/map-data", getMapData);

module.exports = router;
