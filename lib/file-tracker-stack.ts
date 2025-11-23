import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

export class FileTrackerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for Glue script
    const glueScriptBucket = new s3.Bucket(this, 'GlueScriptBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Upload glue-assets directory to S3 bucket during deployment
    new s3deploy.BucketDeployment(this, 'GlueScriptDeployment', {
      sources: [s3deploy.Source.asset('./src/glue-assets')],
      destinationBucket: glueScriptBucket,
      destinationKeyPrefix: '', // root of bucket
    });

    // IAM Role for Glue Job
    const glueRole = new iam.Role(this, 'GlueJobRole', {
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
      ],
    });
    glueScriptBucket.grantReadWrite(glueRole);

    // IAM Role for hi-lambda
    const hiLambdaRole = new iam.Role(this, 'HiLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // IAM Role for SFN invoker Lambda
    const sfnInvokerLambdaRole = new iam.Role(this, 'SFNInvokerLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSStepFunctionsFullAccess'),
      ],
    });

    // Lambda function: hi-lambda
    const hiLambda = new lambda.Function(this, 'HiLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('src/hi-lambda'),
      role: hiLambdaRole,
    });

    // Lambda function: SFN invoker
    const sfnInvokerLambda = new lambda.Function(this, 'SFNInvokerLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('src/sfn-invoker-lambda'),
      environment: {
        STATE_MACHINE_ARN: 'TO_BE_REPLACED', // Will be replaced after StateMachine creation
      },
      role: sfnInvokerLambdaRole,
    });

    // Glue job script location in S3
    const glueScriptS3Location = `s3://${glueScriptBucket.bucketName}/glue-script.py`;

    // Glue job (role must be created and referenced correctly)
    const glueJob = new glue.CfnJob(this, 'GlueJob', {
      name: 'DemoGlueJob',
      role: glueRole.roleArn,
      command: {
        name: 'glueetl',
        scriptLocation: glueScriptS3Location,
      },
      defaultArguments: {
        '--extra-py-files': '',
      },
      glueVersion: '3.0',
      numberOfWorkers: 2,
      workerType: 'Standard',
    });

    // Step Function: Glue job, then Choice, then hi-lambda or finish
    const glueTask = new tasks.GlueStartJobRun(this, 'GlueTask', {
      glueJobName: glueJob.name!,
      arguments: sfn.TaskInput.fromObject({
        '--extra-py-files': '',
        '--n': sfn.JsonPath.stringAt('$.n')
      }),
      integrationPattern: sfn.IntegrationPattern.RUN_JOB,
    });

    const lambdaTask = new tasks.LambdaInvoke(this, 'HiLambdaTask', {
      lambdaFunction: hiLambda,
      outputPath: '$.Payload',
    });

    // Choice: If Glue output meets condition, run hi-lambda, else finish
    const choice = new sfn.Choice(this, 'GlueResultChoice')
      .when(sfn.Condition.booleanEquals('$.glueResult.triggerLambda', true), lambdaTask)
      .otherwise(new sfn.Pass(this, 'Finish'));

    const definition = glueTask.next(choice);

    const stateMachine = new sfn.StateMachine(this, 'FileTrackerStateMachine', {
      definition,
      timeout: cdk.Duration.minutes(10),
    });

    // Grant SFN invoker Lambda permission to start the State Machine
    stateMachine.grantStartExecution(sfnInvokerLambda);
    sfnInvokerLambda.addEnvironment('STATE_MACHINE_ARN', stateMachine.stateMachineArn);

    // Grant Glue job access to the S3 bucket
    glueScriptBucket.grantReadWrite(new iam.ServicePrincipal('glue.amazonaws.com'));

  }
}
