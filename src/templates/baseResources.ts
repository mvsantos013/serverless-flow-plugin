export const getBaseResources = (
  prefix: string,
  suffix: string,
): Record<string, unknown> => {
  return {
    ServerlessFlowEcsCluster: {
      Type: 'AWS::ECS::Cluster',
      Properties: {
        ClusterName: `${prefix}EcsCluster${suffix}`,
      },
    },
    ServerlessFlowEcsExecutionRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        RoleName: `${prefix}EcsExecutionRole${suffix}`,
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: ['ecs-tasks.amazonaws.com'],
              },
              Action: ['sts:AssumeRole'],
            },
          ],
        },
        ManagedPolicyArns: [
          'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
        ],
        Policies: [
          {
            PolicyName: 'inline',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Sid: 'AllowLogManagement',
                  Effect: 'Allow',
                  Action: [
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream',
                    'logs:PutLogEvents',
                  ],
                  Resource: [
                    {
                      'Fn::Join': [
                        ':',
                        [
                          'arn:aws:logs',
                          {
                            Ref: 'AWS::Region',
                          },
                          {
                            Ref: 'AWS::AccountId',
                          },
                          'log-group',
                          `${prefix}*`,
                        ],
                      ],
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
    ServerlessFlowStateMachineRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        RoleName: `${prefix}StateMachineRole${suffix}`,
        Path: '/',
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: [
                  'states.amazonaws.com',
                  'events.amazonaws.com',
                  'lambda.amazonaws.com',
                ],
              },
              Action: ['sts:AssumeRole'],
            },
          ],
        },
        Policies: [
          {
            PolicyName: `${prefix}StateMachinePolicy${suffix}`,
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: [
                    'sts:AssumeRole',
                    'lambda:InvokeFunction',
                    'ecs:RunTask',
                  ],
                  Resource: ['*'],
                },
                {
                  Effect: 'Allow',
                  Action: ['iam:PassRole'],
                  Resource: [
                    {
                      'Fn::GetAtt': ['ServerlessFlowEcsExecutionRole', 'Arn'],
                    },
                    'arn:aws:iam::${aws:accountId}:role/' + prefix + '*',
                  ],
                },
              ],
            },
          },
        ],
      },
    },
  }
}
