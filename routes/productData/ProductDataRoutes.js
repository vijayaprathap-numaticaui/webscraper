const express = require("express");

const router = express.Router();
const GetAllProductController = require('../../controller/productData')

router.get("/", GetAllProductController); 


module.exports = router;