const express = require("express");

const router = express.Router();
const CreateScheduleContoller = require('../../controller/schedule')

router.post("/", CreateScheduleContoller); 


module.exports = router;