# Serverless Flow Plugin

This is a ongoing/unfinished work of a plugin for [Serverless Framework](https://www.serverless.com/). It makes a lot easier to deploy the necessary infrastructure for executing serverless, scalable and cost-efficient batch workflows in AWS. It can be compared be compared somehow to [Airflow](https://airflow.apache.org/).

Batch workflows are commonly used for the execution of tasks or jobs in bulk, often involving large volumes of data, where these tasks are processed sequentially or in parallel without manual intervention. Unlike real-time processing, batch workflows typically run at scheduled intervals (e.g., nightly, hourly) or are triggered by specific events. They are particularly suited for tasks that can tolerate some delay in execution, such as data transformation, report generation, or batch data imports. It's possible to do this in AWS in many ways, for example, using services like Lambda Functions, EC2, ECS, EMR, Glue and so on. All this requires devops knowledge to deploy the required infrastructure resources. This plugins makes easier to create these resources. 

This plugin focus mainly in orchestrating batch jobs with AWS Step Functions, Lambda Functions and ECS Fargate tasks. Lambda tasks are suited for short-running and simple processings while ECS Fargate tasks are suited for more complex, long-running, CPU/Memory intensive workloads. Step Functions are state machines that are used for controlling the how the workflow will work.

With this plugin it's simple to create Lambda or ECS tasks by simply declaring a task.yml file in any subfolder. The plugin will look for it and create/deploy the necessary resources for it.

Creating a lambda task:
```yaml
taskName: MyShortTask   # Task name
taskType: LAMBDA        # Task type

functionDefinition: # Common Serverless Framework function definition
  handler: src/tasks/mytask/main.handler
  timeout: 60
```

Creating a ECS task:
```yaml
taskName: MyLongTask        # Task name
taskType: ECS               # Task type

cpu: 256                    # CPU to be used
memory: 512                 # Memory to be used
ephemeralStorage: 21        # Available disk space size in GB

permissions:                # Custom permissions for the task
  groupSet1:
    type: allow
    actions:
      - s3:ListObjectsV2
      - s3:PutObject
    resources:
      - *
```

The plugin will look for these task.yml files and create the necessary resources (Lambda functions, IAM roles, ECS Cluster, ECS task definitions, ECR repositories, ...)

These created tasks can be referenced by their name in a Step Function definition (*.sf.yml files in any subfolder):
```yaml
MyStepFunction:
  name: MyStepFunction
  definition:
    StartAt: FirstState
    States:
      FirstState: ServerlessFlow.Task(
        Name: MyShortTask
        Next: SecondState
      ) 
      SecondState: ServerlessFlow.Task(
        Name: MyLongTask
        Environment:
          STAGE: ${self:provider.stage}
          DYNAMIC_INPUT: $.parameterName
        Network:
          PublicIp: true # Set it to false If you have a proper configured network
          Subnets: [ ${param:ecsTaskSubnetId} ] # Your list of subnets
          SecurityGroups: [ ${param:ecsTaskSecurityGroup} ] # Your list of security groups
        End: true
      )
```


This is a very summarized overview of how the plugin works. It's written with Nodejs/Typescript and it shall be released at 2025.
