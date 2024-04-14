import type Serverless from 'serverless'

// Supporting serverless-step-functions plugin types
export type CustomService = Serverless['service'] & {
  stepFunctions?: { stateMachines?: Record<string, unknown> }
}

// Serverless Flow plugin custom parameters
export type ServerlessFlowParams = {
  resourcesPrefix?: string
  resourcesSuffix?: string
  stateMachinesDirectory?: string
  tasksDirectory?: string
}
