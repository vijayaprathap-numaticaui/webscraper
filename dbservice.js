const configureAWS = require("../config/awsConfig");
const { randomUUID } = require("crypto");
const AWS = configureAWS();

const dynamoDB = new AWS.DynamoDB.DocumentClient();

const scanTableData = async (tableName) => {
  const params = {
    TableName: tableName, // Replace with your table name
  };

  try {
    const result = await dynamoDB.scan(params).promise();
    console.log("Table Data:", result.Items);
    return result.Items; // Contains all the records in the table
  } catch (error) {
    console.error("Error scanning DynamoDB table:", error);
    throw error;
  }
};

const getWarehousesAndUrls = async (website_id) => {
  try {
    const test = await scanTableData("WebsiteUrl");
    const warehousesParams = {
      TableName: "Warehouses",
      IndexName: "website_id-index",
      KeyConditionExpression: "website_id = :website_id",
      ExpressionAttributeValues: {
        ":website_id": website_id,
      },
    };

    const warehouseResults = await dynamoDB.query(warehousesParams).promise();
    const warehouseIds = warehouseResults.Items.map(
      (item) => item.warehouse_id
    );

    if (warehouseIds.length === 0) {
      throw {
        statusCode: 404,
        message: "No warehouses found for this website_id",
        details: { website_id },
      };
    }

    // Step 2: Query the Website URLs Table for URL details
    const results = [];

    for (const warehouse_id of warehouseIds) {
      const params = {
        TableName: "WebsiteUrl", // Main table name
        IndexName: "website_id-warehouse_id-index", // Replace with your GSI name
        KeyConditionExpression:
          "website_id = :website_id AND warehouse_id = :warehouse_id",
        ExpressionAttributeValues: {
          ":website_id": website_id,
          ":warehouse_id": warehouse_id,
        },
      };

      const queryResult = await dynamoDB.query(params).promise();
      results.push(...queryResult.Items);
    }
    // Combine the results
    return results.map((item) => ({
      url_id: item.usr_id,
      url: item.url,
      warehouse_id: item.warehouse_id,
    }));
  } catch (error) {
    console.error("Error querying DynamoDB:", error);
    throw {
      statusCode: 500,
      message: "Failed to fetch data from DynamoDB",
      details: error.message,
    };
  }
};

const addJob = async (jobId, urlId, additionalData = {}) => {
  const params = {
    TableName: "ScrapeJob",
    Item: {
      job_id: jobId,
      url_id: urlId,
      log_notes: {
        initial: "Attempting to run crawlbase-api.js...",
        timestamp: new Date().toISOString(),
      },
      ...additionalData,
    },
  };

  try {
    await dynamoDB.put(params).promise();
    console.log("Job added successfully:", params.Item);
    return { success: true, item: params.Item };
  } catch (error) {
    console.error("Error adding job to DynamoDB:", error);
    return { success: false, error };
  }
};

const addActivity = async (jobId, additionalData = {}) => {
  const monitorId = randomUUID();
  const params = {
    TableName: "Activity",
    Item: {
      monitor_id: monitorId,
      job_id: jobId,
      log_notes: {
        initial: "Attempting to run crawlbase-api.js...",
        timestamp: new Date().toISOString(),
      },
      ...additionalData,
    },
  };

  try {
    await dynamoDB.put(params).promise();
    console.log("Activity added successfully:", params.Item);
    return { success: true, item: params.Item };
  } catch (error) {
    console.error("Error adding activity to DynamoDB:", error);
    return { success: false, error };
  }
};

const addAlert = async (jobId, alertMessage) => {
  const alertId = randomUUID();
  const params = {
    TableName: "Alerts",
    Item: {
      alert_id: alertId,
      job_id: jobId,
      alert_message: alertMessage ,
      timestamp: new Date().toISOString(),
      ...additionalData,
    },
  };

  try {
    await dynamoDB.put(params).promise();
    console.log("Alert added successfully:", params.Item);
    return { success: true, item: params.Item };
  } catch (error) {
    console.error("Error adding alert to DynamoDB:", error);
    return { success: false, error };
  }
};

const updateJob = async (jobId, urlId, newLogData) => {
  const params = {
    TableName: "ScrapeJob",
    Key: {
      job_id: jobId,
      url_id: urlId,
    },
    UpdateExpression:
      "set #log_notes = list_append(if_not_exists(#log_notes, :empty_list), :newLogData), #status = :status, #end_time = :end_time",
    ExpressionAttributeNames: {
      "#log_notes": "log_notes",
      "#status": "status",
      "#end_time": "end_time",
    },
    ExpressionAttributeValues: {
      ":newLogData": [newLogData],
      ":status": "completed",
      ":end_time": new Date().toISOString(),
      ":empty_list": [],
    },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    await dynamoDB.update(params).promise();
    console.log("Job updated successfully:", jobId);
  } catch (error) {
    console.error("Error updating job:", error);
  }
};

const updateAlert = async (jobId, alertId, newLogData) => {
  const params = {
    TableName: "Alerts",
    Key: {
      alert_id: alertId,
      job_id: jobId,
    },
    UpdateExpression:
      "set #alert_message = list_append(if_not_exists(#alert_message, :empty_list), :newLogData), #end_time = :end_time",
    ExpressionAttributeNames: {
      "#alert_message": "alert_message",
      "#end_time": "end_time",
    },
    ExpressionAttributeValues: {
      ":newLogData": [newLogData],
      ":end_time": new Date().toISOString(),
      ":empty_list": [],
    },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    await dynamoDB.update(params).promise();
    console.log("Alert updated successfully:", jobId);
  } catch (error) {
    console.error("Error updating job:", error);
  }
};

const uploadOutputData = async (allProducts) => {
  const tableName = "WebScraperData";
  const params = {
    TableName: tableName,
    Item: {
      scraper_id: "batch-" + new Date().getTime(),
      timestamp: new Date().toISOString(),
      products: JSON.stringify(allProducts),
    },
  };

  try {
    const data = await dynamoDB.put(params).promise();
    console.log(`Inserted batch of ${allProducts.length} products.`);
  } catch (error) {
    console.error(`Error inserting batch: ${error}`);
  }
};

const deleteAllItems = async (tableName) => {
  try {
    console.log(`Scanning and deleting all items from table: ${tableName}`);

    // Scan the table to get all items
    let scanParams = {
      TableName: tableName,
    };

    let items;
    do {
      items = await dynamoDB.scan(scanParams).promise();
      const deleteRequests = items.Items.map((item) => ({
        DeleteRequest: {
          Key: {
            PrimaryKey: item.scraper_id, // Replace with your table's primary key
          },
        },
      }));

      if (deleteRequests.length > 0) {
        // Batch write to delete items (DynamoDB supports 25 items per batch)
        const deleteParams = {
          RequestItems: {
            [tableName]: deleteRequests,
          },
        };
        await dynamoDB.batchWrite(deleteParams).promise();
        console.log(`Deleted ${deleteRequests.length} items.`);
      }

      // Set the ExclusiveStartKey for the next scan, if necessary
      scanParams.ExclusiveStartKey = items.LastEvaluatedKey;
    } while (typeof items.LastEvaluatedKey !== "undefined");

    console.log("All items deleted successfully.");
  } catch (error) {
    console.error("Error deleting items:", error);
    throw error;
  }
};

module.exports = {
  scanTableData,
  getWarehousesAndUrls,
  addJob,
  updateJob,
  addAlert,
  updateAlert,
  uploadOutputData,
};
