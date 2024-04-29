import { merge } from 'lodash'
import { TaskParams } from '@src/types'

/**
 * Configuration for a task of type ECS
 */
export const getLambdaTaskStateConfig = (
  taskParams: TaskParams,
  rawConfig: Record<string, unknown>,
): Record<string, unknown> => {
  delete rawConfig.Name
  // Merge allows user customizing the task state configuration
  const config = merge(
    {
      Type: 'Task',
      Resource: {
        'Fn::GetAtt': [`${taskParams.taskName}LambdaFunction`, 'Arn'],
      },
    },
    rawConfig,
  )
  return config
}
