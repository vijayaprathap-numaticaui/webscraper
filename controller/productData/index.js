const { createResponse } = require("../../utils");
const { scanTableData } = require("../../service/dbservice");

const GetAllProductController = async (req, res) => {
  try {
    // Scan the WebScraperData table
    const products = await scanTableData("WebScraperData");

    // Return success response
    return res
      .status(200)
      .json(
        createResponse(200, "Products retrieved successfully", products)
      );
  } catch (error) {
    console.error("Error fetching products:", error);

    // Return error response
    return res
      .status(500)
      .json(
        createResponse(500, "Failed to fetch products", error.message)
      );
  }
};

module.exports = GetAllProductController;
