const { SFNClient, StartExecutionCommand } = require("@aws-sdk/client-sfn");

const client = new SFNClient();

exports.handler = async (event) => {
    try {
        const input = JSON.stringify({ n: event.n });

        const command = new StartExecutionCommand({
            stateMachineArn: process.env.STATE_MACHINE_ARN,
            input,
        });

        const response = await client.send(command);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "State Machine Started",
                executionArn: response.executionArn
            }),
        };

    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        };
    }
};
