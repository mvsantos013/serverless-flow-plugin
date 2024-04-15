import { ServerlessFlowParams, TaskParams, EcsTaskParams } from './types'

export const DEFAULT_SERVERLESS_FLOW_PARAMS: ServerlessFlowParams = {
  resourcesPrefix: 'ServerlessFlow',
  resourcesSuffix: '-${self:provider.stage}',
  stateMachinesDirectory: './src/stepFunctions',
  tasksDirectory: './src/tasks',
}

export const DEFAULT_TASK_PARAMS: TaskParams = {
  taskName: '',
  iamRoleStatements: [],
}

export const DEFAULT_ECS_TASK_PARAMS: EcsTaskParams = {
  ...DEFAULT_TASK_PARAMS,
  cpu: 256,
  memory: 512,
  ephemeralStorage: 20,
  ecrRepositoryKeepMaxImages: 3,
}
