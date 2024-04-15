import { EcsTaskParams } from '../types'
import { DEFAULT_ECS_TASK_PARAMS } from '../config'

export const getEcsTaskResources = (
  prefix: string,
  suffix: string,
  taskParams: EcsTaskParams,
): Record<string, unknown> => {
  const params = { ...DEFAULT_ECS_TASK_PARAMS, ...taskParams }
  const {
    taskName,
    iamRoleStatements,
    cpu,
    memory,
    ephemeralStorage,
    ecrRepositoryKeepMaxImages,
  } = params
  return {
    [`${taskName}TaskDefinition`]: {
      Type: 'AWS::ECS::TaskDefinition',
      Properties: {
        RequiresCompatibilities: ['FARGATE'],
        Family: `${prefix}${taskName}${suffix}`,
        Cpu: cpu,
        Memory: memory,
        EphemeralStorage: {
          SizeInGiB: ephemeralStorage,
        },
        NetworkMode: 'awsvpc',
        ExecutionRoleArn: {
          'Fn::GetAtt': [`${prefix}EcsExecutionRole`, 'Arn'],
        },
        TaskRoleArn: {
          'Fn::GetAtt': [`${taskName}TaskRole`, 'Arn'],
        },
        ContainerDefinitions: [
          {
            Name: 'main',
            Image: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': [
                      `${taskName}TaskEcrRepository`,
                      'RepositoryUri',
                    ],
                  },
                  ':latest',
                ],
              ],
            },
            Essential: true,
            LogConfiguration: {
              LogDriver: 'awslogs',
              Options: {
                'awslogs-create-group': true,
                'awslogs-region': '${self:provider.region}',
                'awslogs-group': `${prefix}${taskName}${suffix}`,
                'awslogs-stream-prefix': `${taskName}`,
              },
            },
            Environment: [
              {
                Name: 'STAGE',
                Value: '${self:provider.stage}',
              },
            ],
          },
        ],
      },
    },
    [`${taskName}TaskRole`]: {
      Type: 'AWS::IAM::Role',
      Properties: {
        RoleName: `${prefix}${taskName}TaskRole${suffix}`,
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: [
                  'cloudformation.amazonaws.com',
                  'ecs.amazonaws.com',
                  'ecs-tasks.amazonaws.com',
                ],
              },
              Action: ['sts:AssumeRole'],
            },
          ],
        },
        Policies: [
          {
            PolicyName: `${prefix}${taskName}TaskPolicy${suffix}`,
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: iamRoleStatements,
            },
          },
        ],
      },
    },
    [`${taskName}TaskEcrRepository`]: {
      Type: 'AWS::ECR::Repository',
      Properties: {
        RepositoryName: `${prefix}_${taskName}_${suffix}`.toLowerCase(),
        LifecyclePolicy: {
          LifecyclePolicyText: `'{"rules":[{"rulePriority":1,"description":"Keep only last ${ecrRepositoryKeepMaxImages} images","selection":{"tagStatus":"untagged","countType":"imageCountMoreThan","countNumber": ${ecrRepositoryKeepMaxImages}},"action":{"type":"expire"}}]}'`,
          RegistryId: '${aws:accountId}',
        },
        RepositoryPolicyText: {
          Version: '2008-10-17',
          Statement: [
            {
              Sid: 'AllowPushPull',
              Effect: 'Allow',
              Principal: {
                AWS: {
                  'Fn::GetAtt': [`${prefix}EcsExecutionRole`, 'Arn'],
                },
              },
              Action: [
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
                'ecr:BatchCheckLayerAvailability',
                'ecr:PutImage',
                'ecr:InitiateLayerUpload',
                'ecr:UploadLayerPart',
                'ecr:CompleteLayerUpload',
                'ecr:GetAuthorizationToken',
              ],
            },
          ],
        },
      },
    },
  }
}
