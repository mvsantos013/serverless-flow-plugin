import * as utils from './utils'
import type Serverless from 'serverless'
import type Plugin from 'serverless/classes/Plugin'
import type { ServerlessFlowParams, TaskParams } from './types'
import { ServerlessFlowParamsSchema } from './schemas'
import templates from './templates'
import { readFileSync } from 'fs'
import { load as loadYaml } from 'js-yaml'

/**
 * Wrapper contains main business logic for aggregating and generating resources.
 */
export class Wrapper {
  public readonly serverless: Serverless
  public readonly logger: Plugin.Logging
  public readonly serverlessFlowParams: ServerlessFlowParams
  public readonly stage: string

  constructor(serverless: Serverless, logger: Plugin.Logging) {
    this.serverless = serverless
    this.logger = logger
    this.stage = serverless.service.provider.stage

    this.serverlessFlowParams = ServerlessFlowParamsSchema.parse(
      serverless.service.custom?.serverlessFlowParams ?? {},
    )
    if (!this.serverlessFlowParams.resourcesSuffix)
      this.serverlessFlowParams.resourcesSuffix = `-${this.stage}`
    this.logger.log.verbose(`Using the following ServerlessFlow parameters:`)
    this.logger.log.verbose(
      Object.entries(this.serverlessFlowParams)
        .map(([key, value]) => ` - ${key}: ${value}`)
        .join('\n') + '\n',
    )
  }

  /**
   * Gets the basic resources to be created: ECS Cluster and IAM roles.
   *
   * @returns Cloudformation definitions of resources
   */
  public getBaseResources = (): Record<string, unknown> => {
    const { resourcesPrefix, resourcesSuffix } = this.serverlessFlowParams
    return templates.getBaseResources(
      this.stage,
      resourcesPrefix,
      resourcesSuffix,
    )
  }

  /**
   * Get resources for tasks defined in task.yml files.
   * Resources for each task are:
   *  - ECS Task: ECS Task Definition, IAM role and ECR Repository.
   *  - Lambda Task: Lambda function and IAM role.
   *
   * @returns Cloudformation definitions of resources.
   */
  public getTasksResources = async (): Promise<Record<string, unknown>> => {
    const dir = this.serverlessFlowParams.tasksDirectory
    if (!utils.directoryExists(dir)) {
      this.logger.log.verbose(
        `No task was added because the directory ${dir} does not exist.`,
      )
      return {}
    }

    let resources: Record<string, unknown> = {}
    for (const file of utils.getFiles(
      this.serverlessFlowParams.tasksDirectory,
    )) {
      if (!file.endsWith('task.yml')) continue
      const params: TaskParams = await this.serverless.yamlParser.parse(file)
      const { resourcesPrefix, resourcesSuffix } = this.serverlessFlowParams
      const taskResources: Record<string, unknown> = templates.getTaskResources(
        this.stage,
        resourcesPrefix,
        resourcesSuffix,
        params,
      )
      resources = { ...resources, ...taskResources }
    }

    if (Object.keys(resources).length === 0) {
      this.logger.log.verbose(
        `No task was added because the directory ${dir} does not contain any task.yml file.`,
      )
      return {}
    }

    return resources
  }
}

/**
 * Utility function to be called in serverless.yml
 * It loads and combines all Step Functions in YAML format (*.sf.yml files).
 */
export const includeStepFunctions = async ({
  options,
  resolveVariable,
}: {
  options: Record<string, unknown>
  resolveVariable: (variableString: string) => string
}): Promise<Record<string, unknown>> => {
  options
  const defaults: Record<string, unknown> = utils.getDefaultsFromSchema(
    ServerlessFlowParamsSchema,
  )
  let stateMachinesDirectory = ''
  try {
    stateMachinesDirectory = await resolveVariable(
      'self:custom.serverlessFlowParams.stateMachinesDirectory',
    )
  } catch {
    stateMachinesDirectory = defaults.stateMachinesDirectory as string
  }
  let tasksDirectory = ''
  try {
    tasksDirectory = await resolveVariable(
      'self:custom.serverlessFlowParams.tasksDirectory',
    )
  } catch {
    tasksDirectory = defaults.tasksDirectory as string
  }
  const tasks: Record<string, TaskParams> = {}
  for (const file of utils.getFiles(tasksDirectory)) {
    if (!file.endsWith('task.yml')) continue
    const rawContent: string = readFileSync(file, 'utf8')
    const taskParams: TaskParams = loadYaml(rawContent) as TaskParams
    tasks[taskParams.taskName] = taskParams
  }

  if (!utils.directoryExists(stateMachinesDirectory)) return {}
  let stateMachines: Record<string, unknown> = {}
  for (const file of utils.getFiles(stateMachinesDirectory)) {
    if (!file.endsWith('.sf.yml')) continue
    const rawContent: string = readFileSync(file, 'utf8')
    const parser: utils.UtilityFunctionsParser =
      new utils.UtilityFunctionsParser(rawContent, tasks)
    parser.parse()
    const stateMachine: Record<string, unknown> = parser.getContent()
    stateMachines = { ...stateMachines, ...stateMachine }
  }
  console.log(1111, JSON.stringify(stateMachines))
  return stateMachines
}
