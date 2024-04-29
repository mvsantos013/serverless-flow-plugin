import { LambdaTaskParams } from '../types'

/**
 * Cloudformation resources for a task of type ECS
 */
export const getLambdaTaskResources = (
  stage: string,
  prefix: string,
  suffix: string,
  taskParams: LambdaTaskParams,
): Record<string, unknown> => {
  const { taskName, functionDefinition, iamRolePolicyStatements } = taskParams
  if (!functionDefinition.role) functionDefinition.role = `${taskName}TaskRole`
  const policyStatements = [
    {
      Effect: 'Allow',
      Action: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:TagResource',
      ],
      Resource: {
        'Fn::Join': [
          '',
          [
            'arn:aws:logs:',
            { Ref: 'AWS::Region' },
            ':',
            { Ref: 'AWS::AccountId' },
            ':log-group:/aws/lambda/*:*:*',
          ],
        ],
      },
    },
    ...iamRolePolicyStatements,
  ]
  return {
    [`${taskName}FunctionDefinition`]: functionDefinition,
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
                Service: ['lambda.amazonaws.com'],
              },
              Action: ['sts:AssumeRole'],
            },
          ],
        },
        Policies:
          policyStatements.length > 0
            ? [
                {
                  PolicyName: `${prefix}${taskName}TaskPolicy${suffix}`,
                  PolicyDocument: {
                    Version: '2012-10-17',
                    Statement: policyStatements,
                  },
                },
              ]
            : [],
      },
    },
  }
}
