const express = require("express");

const router = express.Router();
const InitScraperScriptContoller = require('../../controller/scraper')

router.post("/", InitScraperScriptContoller); 


module.exports = router;