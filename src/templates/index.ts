import { getBaseResources } from './baseResources'
import { getEcsTaskResources } from './ecsTaskResources'
import { EcsTaskParams, TaskParams, TaskType } from '../types'
import { EcsTaskParamsSchema } from '../schemas'

const getTaskResources = (
  stage: string,
  prefix: string,
  suffix: string,
  taskParams: TaskParams,
): Record<string, unknown> => {
  taskParams.taskType = taskParams.taskType.toUpperCase() as TaskType
  switch (taskParams.taskType) {
    case TaskType.ECS:
      const params: EcsTaskParams = EcsTaskParamsSchema.parse(taskParams)
      return getEcsTaskResources(stage, prefix, suffix, params)
    default:
      return {}
  }
}

export default {
  getBaseResources,
  getTaskResources,
}
