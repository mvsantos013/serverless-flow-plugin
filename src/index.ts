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
  private wrapper: Wrapper | any = {}
  private service: CustomService | any = {}
  private createdResources: Record<string, unknown> = {}
  private createdStateMachines: Record<string, unknown> = {}
  private createdLambdas: Record<string, unknown> = {}

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
      'before:package:initialize': this.initialize.bind(this),
      'after:package:compileEvents': this.addResourcesDefinitions.bind(this),
      'after:deploy:finalize': this.displayCreatedResources.bind(this),
      'deploy-images:push': this.deployImages.bind(this),
    }
  }

  /**
   * Initialize the ServerlessFlow plugin.
   */
  private async initialize(): Promise<void> {
    this.service = this.serverless.service
    if (this.service.provider.name !== 'aws') {
      this.logger.log.error(
        'ServerlessFlow plugin only supports AWS provider. Please remove the plugin and try again.',
      )
      process.exit()
    }

    // Make sure some properties are defined
    if (!this.service.resources) this.service.resources = {}
    if (!this.service.resources.Resources) this.service.resources.Resources = {}
    if (!this.service.functions) this.service.functions = {}

    this.wrapper = new Wrapper(this.serverless, this.logger)
  }

  /**
   * Adds some base resources and creates additional resources as needed.
   * The additional resources that will be added depends on the *.sf.yml and task.yml
   * files created by the developer.
   */
  private async addResourcesDefinitions(): Promise<void> {
    // Get shared resources and add them to the service
    const baseResources = this.wrapper.getBaseResources()

    // Get all resources for tasks that were defined in task.yml files
    const tasksResources = await this.wrapper.getTasksResources()

    // Add resources
    this.service.resources.Resources = {
      ...this.service.resources.Resources,
      ...baseResources,
      ...tasksResources,
    }

    this.createdResources = { ...baseResources, ...tasksResources }
    this.createdStateMachines = this.service.stepFunctions?.stateMachines ?? {}
  }

  /**
   * Add Lambda functions definitions to the service. It will only add the functions
   * that were defined in the task.yml files.
   */
  private async addFunctionsDefinitions(): Promise<void> {
    // Get all lambda funtions definitions that were defined in task.yml files
    const functions = await this.wrapper.getTasksLambdaFunctionDefinitions()

    // Add functions
    this.service.functions = {
      ...this.service.functions,
      ...functions,
    }

    this.createdLambdas = functions
  }

  /**
   * Display the resources that were created by ServerlessFlow Plugin.
   */
  private displayCreatedResources(): void {
    this.logger.log.info(
      '\nThe following AWS resources were created by ServerlessFlow plugin:',
    )

    const listResources = (
      resourcesNames: string,
      resources: Record<string, unknown>,
    ) => {
      if (Object.keys(resources).length > 0) {
        this.logger.log.info(`${resourcesNames}:`)
        this.logger.log.info(` - ${Object.keys(resources).join('\n - ')}\n`)
      }
    }
    listResources('Step Functions', this.createdStateMachines)
    listResources('Lambda Functions', this.createdLambdas)
    listResources('Cloudformation Resources', this.createdResources)
  }

  /**
   * Deploy docker images of ECS tasks to ECR.
   */
  private deployImages(): void {
    deployImages(this.serverless, this.options)
  }
}

export = ServerlessFlowPlugin
