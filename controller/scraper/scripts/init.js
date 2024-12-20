const { exec } = require("child_process");
const winston = require("winston");
const { addJob, updateJob,addAlert } = require("../../../service/dbservice");
const { randomUUID } = require("crypto");
const path = require("path");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "app.log" }),
    new winston.transports.Console(),
  ],
});

const runScript = (scriptName, data) => {
  return new Promise((resolve, reject) => {
    const command = `node ${scriptName} '${JSON.stringify(data)}'`; // Pass data as a JSON string
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing ${scriptName}:`, stderr);
        reject(new Error(`Failed to execute ${scriptName}: ${stderr}`));
        return;
      }
      console.log(`Output from ${scriptName}:`, stdout);
      resolve(stdout);
    });
  });
};

const mainScript = async (websitesData) => {
  try {
    const urlData = websitesData || {};
    const { url_id } = urlData;
    logger.info("Attempting to run crawlbase-api.js...");
    const jobId = randomUUID();
    const additionalData = {
      status: "active",
      start_time: new Date(),
      end_time: null, // Leave end_time empty for now
      log_notes: {
        initial: "Attempting to run crawlbase-api.js...",
        timestamp: new Date().toISOString(),
      },
    };

    // Await job creation
    await addJob(jobId, url_id, additionalData);
    const filePath = path.resolve(__dirname, "crawlbase-api.js");

    await runScript(filePath, urlData);
    const updatedLogData = {
      action: "crawlbase-api.js executed",
      timestamp: new Date().toISOString(),
      status: "completed",
    };

    await updateJob(jobId, url_id, updatedLogData);
    logger.info("crawlbase-api.js executed successfully.");
  } catch (error) {
    logger.error(
      "Failed to execute crawlbase-api.js. Falling back to main.js..."
    );
    addAlert(jobId,'Failed to execute crawlbase-api.js. Falling back to main.js...')
    try {
      await runScript("main.js", urlData);
      logger.info("main.js executed successfully.");
    } catch (mainError) {
      logger.error("Failed to execute main.js:", mainError.message);
        addAlert(jobId,'Failed to execute the scripts')
      throw {
        statusCode: 500,
        message: "Failed to execute the scripts",
        details: mainError.message,
      };
    }
  }
};

module.exports = mainScript;
