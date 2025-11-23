import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';

export class FileTrackerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda function: hi-lambda
    const hiLambda = new lambda.Function(this, 'HiLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`exports.handler = async () => { return 'hi'; };`),
    });

    // Glue job script (inline for demo)
    const glueScript = 'if True:\n  print("Triggering Lambda")';
    const glueJob = new glue.CfnJob(this, 'GlueJob', {
      name: 'DemoGlueJob',
      role: 'arn:aws:iam::123456789012:role/service-role/AWSGlueServiceRole', // Replace with your Glue role ARN
      command: {
        name: 'glueetl',
        scriptLocation: 's3://your-bucket/glue-script.py', // Replace with your script location
      },
      defaultArguments: {
        '--extra-py-files': '',
      },
      glueVersion: '3.0',
      numberOfWorkers: 2,
      workerType: 'Standard',
    });

    // Step Function: Glue job, then Lambda if condition met
    const glueTask = new tasks.GlueStartJobRun(this, 'GlueTask', {
      glueJobName: glueJob.name!,
      arguments: sfn.TaskInput.fromObject({}),
      integrationPattern: sfn.IntegrationPattern.RUN_JOB,
    });

    const lambdaTask = new tasks.LambdaInvoke(this, 'HiLambdaTask', {
      lambdaFunction: hiLambda,
      outputPath: '$.Payload',
    });

    // Condition: For demo, always true
    const condition = sfn.Condition.booleanEquals('$.triggerLambda', true);
    const choice = new sfn.Choice(this, 'GlueResultChoice')
      .when(condition, lambdaTask)
      .otherwise(new sfn.Pass(this, 'NoLambda'));

    const definition = glueTask.next(choice);

    const stateMachine = new sfn.StateMachine(this, 'FileTrackerStateMachine', {
      definition,
      timeout: cdk.Duration.minutes(10),
    });
  }
}
