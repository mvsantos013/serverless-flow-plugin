import { z } from 'zod'
import { TaskType } from './types'

const alphaNumeric = (value: string): boolean => {
  const regex = /^[a-zA-Z0-9]+$/
  return regex.test(value)
}

export const ServerlessFlowParamsSchema = z.object({
  resourcesPrefix: z
    .string()
    .max(17)
    .optional()
    .default('ServerlessFlow')
    .refine(alphaNumeric, {
      message:
        'Resources prefix must only contain alphanumeric characters (a-z, A-Z, 0-9)',
    }),
  resourcesSuffix: z.string().optional().default(''),
  stateMachinesDirectory: z.string().optional().default('./src/stepFunctions'),
  tasksDirectory: z.string().optional().default('./src/tasks'),
})

export const EcsTaskParamsSchema = z.object({
  taskName: z.string().min(1).max(32).refine(alphaNumeric, {
    message:
      'Task name must only contain alphanumeric characters (a-z, A-Z, 0-9)',
  }),
  taskType: z.union([z.literal(TaskType.ECS), z.literal(TaskType.LAMBDA)]),
  iamRolePolicyStatements: z.array(z.object({})).optional().default([]),
  cpu: z.number().int(),
  memory: z.number().int(),
  ephemeralStorage: z.number().optional().default(21),
  ecrRepositoryKeepMaxImages: z.number().optional().default(3),
})

export const DeployImagesCommandParams = z.object({
  stage: z.string(),
  region: z.string(),
  profile: z.string().optional().default(''),
})
