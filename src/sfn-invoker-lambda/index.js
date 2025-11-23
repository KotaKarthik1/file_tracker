const AWS = require('aws-sdk');
const sfn = new AWS.StepFunctions();
exports.handler = async (event) => {
  const params = {
    stateMachineArn: process.env.STATE_MACHINE_ARN,
    input: JSON.stringify(event)
  };
  await sfn.startExecution(params).promise();
  return { status: 'Started SFN' };
};
