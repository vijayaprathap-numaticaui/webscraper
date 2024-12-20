const { createResponse } = require("../../utils");
const { getWarehousesAndUrls } = require("../../service/dbservice");
const mainScript = require("./scripts/init.js");

const InitScraperScriptContoller = async (req, res, next) => {
  try {
    const { website_id } = req.body;
    // Validate request payload
    if (!website_id) {
      return res
        .status(400)
        .json(createResponse(400, "website_id is required"));
    }

    // Fetch the website data
    const websitesData = await getWarehousesAndUrls(website_id);
    console.log(websitesData, "websitesData");

    // Check if data exists
    if (!websitesData || websitesData.length === 0) {
      return res
        .status(404)
        .json(createResponse(404, "No data found for the given website_id"));
    }

    // Execute scripts for each website
    await Promise.all(websitesData.map((data) => mainScript(data)));

    return res
      .status(200)
      .json(createResponse(200, "Script executed successfully", websitesData));
  } catch (error) {
    next(error); // Forward to error handler middleware
  }
};

module.exports = InitScraperScriptContoller;
