const { createResponse } = require("../../utils");
const configureAWS = require("../../config/awsConfig");

const AWS = configureAWS();
const eventBridge = new AWS.EventBridge();

const CreateScheduleController = async (req, res) => {
  const { website_id, schedule } = req.body;

  try {
    // Validate the schedule (basic validation for cron or rate expressions)
    if (!/^rate\(.+\)$|^cron\(.+\)$/.test(schedule)) {
      return res
        .status(400)
        .json(
          createResponse(400, "Invalid schedule format. Use 'rate' or 'cron'.")
        );
    }

    // Define EventBridge rule parameters
    const ruleParams = {
      Name: `Rule-${website_id}`, // Unique name for each website_id
      ScheduleExpression: schedule,
      State: "ENABLED",
      EventBusName: "default", // Use the default EventBridge bus
    };

    // Create or update the rule
    const ruleResponse = await eventBridge.putRule(ruleParams).promise();
    console.log("Rule created or updated successfully:", ruleResponse);

    // Respond with success
    return res
      .status(200)
      .json(
        createResponse(
          200,
          "EventBridge rule created or updated successfully",
          ruleResponse
        )
      );
  } catch (error) {
    console.error("Failed to create EventBridge rule:", error);

    // Respond with error
    return res
      .status(500)
      .json(
        createResponse(
          500,
          "Failed to create EventBridge rule",
          error.message
        )
      );
  }
};

module.exports = CreateScheduleController;
