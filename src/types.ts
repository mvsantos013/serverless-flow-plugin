import type Serverless from 'serverless'

export enum TaskType {
  ECS = 'ECS',
  LAMBDA = 'LAMBDA',
}

// Add missing property to Serverless type
export type CustomServerless = Serverless & {
  configurationInput: CustomService
}

// Supporting serverless-step-functions plugin types
export type CustomService = Serverless['service'] & {
  stepFunctions?: { stateMachines?: Record<string, unknown> }
}

// Serverless Flow plugin custom parameters
export interface ServerlessFlowParams {
  resourcesPrefix: string
  resourcesSuffix: string
  stateMachinesDirectory: string
  tasksDirectory: string
}

// Parameters for a task
export interface TaskParams {
  taskName: string
  taskType: TaskType
  iamRolePolicyStatements: Record<string, unknown>[]
}

// Parameters for an ECS task
export interface EcsTaskParams extends TaskParams {
  cpu: number
  memory: number
  ephemeralStorage: number
  ecrRepositoryKeepMaxImages: number
}
