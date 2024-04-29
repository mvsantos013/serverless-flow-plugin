import { getBaseResources } from './baseResources'
import { getEcsTaskResources } from './ecsTaskResources'
import { getLambdaTaskResources } from './lambdaTaskResources'
import { getEcsTaskStateConfig } from './ecsTaskStateConfig'
import { getLambdaTaskStateConfig } from './lambdaTaskStateConfig'
import { EcsTaskParams, LambdaTaskParams, TaskParams, TaskType } from '../types'
import { EcsTaskParamsSchema, LambdaTaskParamsSchema } from '../schemas'

const getTaskResources = (
  stage: string,
  prefix: string,
  suffix: string,
  taskParams: TaskParams,
): Record<string, unknown> => {
  taskParams.taskType = taskParams.taskType.toUpperCase() as TaskType
  switch (taskParams.taskType) {
    case TaskType.ECS:
      const ecsTaskParams: EcsTaskParams = EcsTaskParamsSchema.parse(taskParams)
      return getEcsTaskResources(stage, prefix, suffix, ecsTaskParams)
    case TaskType.LAMBDA:
      const lambdaTaskParams: LambdaTaskParams = taskParams as LambdaTaskParams
      if (!lambdaTaskParams.functionDefinition)
        throw new Error('Function definition is required for Lambda tasks')
      if (!lambdaTaskParams.functionDefinition.events)
        lambdaTaskParams.functionDefinition.events = []
      const params = LambdaTaskParamsSchema.parse(lambdaTaskParams)
      return getLambdaTaskResources(stage, prefix, suffix, params)
    default:
      throw new Error(
        `Task type not supported: ${
          taskParams.taskType
        }. Supported types: ${Object.values(TaskType)}`,
      )
  }
}

const getTaskStateConfig = (
  taskParams: TaskParams,
  rawConfig: Record<string, unknown>,
): Record<string, unknown> => {
  taskParams.taskType = taskParams.taskType.toUpperCase() as TaskType
  switch (taskParams.taskType) {
    case TaskType.ECS:
      return getEcsTaskStateConfig(taskParams, rawConfig)
    case TaskType.LAMBDA:
      const lambdaTaskParams: LambdaTaskParams = taskParams as LambdaTaskParams
      if (!lambdaTaskParams.functionDefinition)
        throw new Error('Function definition is required for Lambda tasks')
      if (!lambdaTaskParams.functionDefinition.events)
        lambdaTaskParams.functionDefinition.events = []
      const params = LambdaTaskParamsSchema.parse(lambdaTaskParams)
      return getLambdaTaskStateConfig(params, rawConfig)
    default:
      throw new Error(
        `Task type not supported: ${
          taskParams.taskType
        }. Supported types: ${Object.values(TaskType)}`,
      )
  }
}

export default {
  getBaseResources,
  getTaskResources,
  getTaskStateConfig,
}
