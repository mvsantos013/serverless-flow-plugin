import { z } from 'zod'
import { TaskType } from './types'

export const ServerlessFlowParamsSchema = z.object({
  resourcesPrefix: z.string().optional().default('ServerlessFlow'),
  resourcesSuffix: z.string().optional().default(''),
  stateMachinesDirectory: z.string().optional().default('./src/stepFunctions'),
  tasksDirectory: z.string().optional().default('./src/tasks'),
})

export const EcsTaskParamsSchema = z.object({
  taskName: z.string(),
  taskType: z.union([z.literal(TaskType.ECS), z.literal(TaskType.LAMBDA)]),
  iamRolePolicyStatements: z.array(z.object({})).optional().default([]),
  cpu: z.number().int(),
  memory: z.number().int(),
  ephemeralStorage: z.number().optional().default(21),
  ecrRepositoryKeepMaxImages: z.number().optional().default(3),
})
