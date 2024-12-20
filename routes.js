const express = require("express");
const ScheduleRoutes = require("./routes/schedule/ScheduleRoutes");
const ScraperRoutes = require("./routes/scraper/ScraperRoutes")
const ProductDataRoutes =  require("./routes/productData/ProductDataRoutes")
const router = express.Router();

// Auth Login
router.use("/schedule", ScheduleRoutes);

router.use("/scraper", ScraperRoutes);

router.use("/alldata", ProductDataRoutes);

module.exports = router;