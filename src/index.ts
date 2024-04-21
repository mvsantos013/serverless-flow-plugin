import type Serverless from 'serverless'
import type Plugin from 'serverless/classes/Plugin'
import type { CustomService, CustomServerless } from './types'
import { Wrapper } from './wrapper'
import { deployImages } from './commands/deployImages'
import ServerlessStepFunctions from 'serverless-step-functions'

/**
 * ServerlessFlow plugin for the Serverless Framework.
 *
 * This plugin enhances the capabilities of the Serverless Framework by providing seamless
 * integration with AWS Step Functions. It's built on top of serverless-step-functions plugin.
 * It empowers developers to define and deploy Step Functions workflows alongside their serverless
 * resources (Lambda functions, ECS tasks), streamlining serverless application orchestration.
 */
class ServerlessFlowPlugin extends ServerlessStepFunctions {
  public readonly serverless: CustomServerless
  public readonly options: Serverless.Options
  public readonly logger: Plugin.Logging
  private createdResources: Record<string, unknown> = {}
  private createdStateMachines: Record<string, unknown> = {}

  /**
   * Constructor for the ServerlessFlowPlugin class.
   * @param serverless A reference to the Serverless application instance.
   * @param options The user-provided options for the plugin.
   * @param logger A logger object for logging messages.
   */
  constructor(
    serverless: CustomServerless,
    options: Serverless.Options,
    logger: Plugin.Logging,
  ) {
    super(serverless, options, logger)
    this.serverless = serverless
    this.options = options
    this.logger = logger

    // Define the commands that the plugin supports
    this.commands = {
      ...this.commands,
      'deploy-images': {
        usage: 'Upload docker images of ECS tasks to ECR.',
        lifecycleEvents: ['push'],
        options: {
          stage: {
            usage: 'Stage of the service.',
            required: true,
            shortcut: 's',
          },
          region: {
            usage: 'AWS region of the service.',
            required: true,
            shortcut: 'r',
          },
          profile: {
            usage: 'AWS profile.',
            required: false,
          },
        },
      },
    }

    // Add hook for the initialize lifecycle event
    this.hooks = {
      ...this.hooks,
      'after:package:compileEvents': this.addResourcesDefinitions.bind(this),
      'after:deploy:finalize': this.displayCreatedResources.bind(this),
      'deploy-images:push': this.deployImages.bind(this),
    }
  }

  /**
   * Core logic for creating resources in the Serverless application.
   * It adds some base resources and creates additional resources as needed.
   * The additional resources that will be added depends on the *.sf.yml and task.yml
   * files created by the developer.
   */
  private async addResourcesDefinitions(): Promise<void> {
    const service: CustomService = this.serverless.service
    const wrapper: Wrapper = new Wrapper(this.serverless, this.logger)

    if (service.provider.name !== 'aws') {
      this.logger.log.warning(
        'ServerlessFlow plugin only supports AWS provider. Skipping resource creation.',
      )
      return
    }

    // Get shared resources and add them to the service
    const baseResources = wrapper.getBaseResources()
    if (service.resources === undefined) service.resources = {}
    if (service.resources.Resources === undefined)
      service.resources.Resources = {}
    service.resources.Resources = {
      ...service.resources.Resources,
      ...baseResources,
    }

    const stateMachines: Record<string, unknown> =
      service.stepFunctions?.stateMachines ?? {}

    // Get all resources for tasks that were defined in task.yml files
    const tasksResources = await wrapper.getTasksResources()
    service.resources.Resources = {
      ...service.resources.Resources,
      ...tasksResources,
    }

    this.createdResources = { ...baseResources, ...tasksResources }
    this.createdStateMachines = stateMachines
  }

  /**
   * Display the resources that were created by ServerlessFlow Plugin.
   */
  private displayCreatedResources(): void {
    this.logger.log.info(
      '\nThe following AWS resources were created by ServerlessFlow plugin:',
    )
    if (Object.keys(this.createdStateMachines).length > 0) {
      this.logger.log.info('Step Functions:')
      this.logger.log.info(
        ` - ${Object.keys(this.createdStateMachines).join('\n - ')}\n`,
      )
    }

    if (Object.keys(this.createdResources).length > 0) {
      this.logger.log.info('Cloudformation Resources:') // list of resources names
      this.logger.log.info(
        ` - ${Object.keys(this.createdResources).join('\n - ')}\n`,
      )
    }
  }

  /**
   * Deploy docker images of ECS tasks to ECR.
   */
  private deployImages(): void {
    deployImages(this.serverless, this.options)
  }
}

export = ServerlessFlowPlugin
