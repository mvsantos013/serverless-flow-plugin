// import * as yaml from 'js-yaml'
import * as utils from './utils'
import type Serverless from 'serverless'
import type Plugin from 'serverless/classes/Plugin'
import type { ServerlessFlowParams, TaskParams } from './types'
import { ServerlessFlowParamsSchema } from './schemas'
import templates from './templates'

/**
 * Wrapper contains main business logic for aggregating and generating resources.
 */
export class Wrapper {
  public readonly serverless: Serverless
  public readonly logger: Plugin.Logging
  public readonly serverlessFlowParams: ServerlessFlowParams

  constructor(serverless: Serverless, logger: Plugin.Logging) {
    this.serverless = serverless
    this.logger = logger

    this.serverlessFlowParams = ServerlessFlowParamsSchema.parse(
      serverless.service.custom?.serverlessFlowParams ?? {},
    )
    this.logger.log.debug(`Using the following Serverless Flow parameters:`)
    this.logger.log.debug(
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
    return templates.getBaseResources(resourcesPrefix, resourcesSuffix)
  }

  /**
   * Loads and combines all Step Functions in YAML format (*.sf.yml).
   *
   * @throws {Error} If there is an error accessing the directory, reading files, or parsing YAML.
   * @returns STL definitions for all Step Functions found.
   */
  public getStateMachinesDefinitions = async (): Promise<
    Record<string, unknown>
  > => {
    try {
      const dir = this.serverlessFlowParams.stateMachinesDirectory
      if (!utils.directoryExists(dir)) {
        this.logger.log.verbose(
          `No state machine was added because the directory ${dir} does not exist.`,
        )
        return {}
      }
      let stateMachines: Record<string, unknown> = {}
      for (const file of utils.getFiles(dir)) {
        if (!file.endsWith('.sf.yml')) continue
        const content: Record<string, unknown> =
          await this.serverless.yamlParser.parse(file)
        stateMachines = { ...stateMachines, ...content }
      }
      if (Object.keys(stateMachines).length === 0) {
        this.logger.log.verbose(
          `No state machine was added because the directory ${dir} does not contain any *.sf.yml file.`,
        )
        return {}
      }
      return stateMachines
    } catch (error) {
      throw new Error(`Error while including Step Functions: ${error}`)
    }
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
      const taskResources = templates.getTaskResources(
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
