import { merge } from 'lodash'
import { TaskParams } from '@src/types'

/**
 * Configuration for a task of type ECS
 */
export const getEcsTaskStateConfig = (
  taskParams: TaskParams,
  rawConfig: Record<string, unknown>,
): Record<string, unknown> => {
  const environmentConfig = rawConfig.Environment || []
  const networkConfig = (rawConfig.Network as Record<string, unknown>) || {}
  delete rawConfig.Name
  delete rawConfig.Environment
  delete rawConfig.Network

  // Merge allows user customizing the task state configuration
  const config = merge(
    {
      Type: 'Task',
      Resource: 'arn:aws:states:::ecs:runTask.sync',
      Parameters: {
        Cluster: { Ref: 'ServerlessFlowEcsCluster' },
        TaskDefinition: { Ref: `${taskParams.taskName}TaskDefinition` },
        LaunchType: 'FARGATE',
        Overrides: {
          ContainerOverrides: [
            {
              Name: 'main',
              Environment: Object.entries(environmentConfig).map(
                ([key, value]) => {
                  const hasDynamicValue: boolean = value.includes('$.')
                  const envKey: string =
                    key.toUpperCase() + (hasDynamicValue ? '.$' : '')
                  return { Name: envKey, Value: value }
                },
              ),
            },
          ],
        },
        NetworkConfiguration: {
          AwsvpcConfiguration: {
            AssignPublicIp: networkConfig.PublicIp ? 'ENABLED' : 'DISABLED',
            Subnets: networkConfig.Subnets || [],
            SecurityGroups: networkConfig.SecurityGroups || [],
          },
        },
      },
    },
    rawConfig,
  )
  return config
}
