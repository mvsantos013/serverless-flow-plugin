import type Serverless from 'serverless'
import type { ServerlessFlowParams, CustomService, TaskParams } from '../types'
import { TaskType } from '../types'
import {
  ServerlessFlowParamsSchema,
  DeployImagesCommandParams,
} from '../schemas'
import templates from '../templates'
import * as utils from '../utils'

export const deployImages = async function (
  serverless: Serverless,
  options: Serverless.Options,
): Promise<void> {
  try {
    await utils.executeBashCommand('aws --version')
  } catch (error) {
    console.log(
      'AWS CLI is not installed. Please install it before running this command.',
    )
    return
  }

  try {
    await utils.executeBashCommand('docker --version')
  } catch (error) {
    console.log(
      'Docker is not installed. Please install it before running this command.',
    )
    return
  }

  const service: CustomService = serverless.service
  const { stage, region, profile } = DeployImagesCommandParams.parse(options)
  const profileOpt = profile ? `--profile ${profile}` : ''
  const serverlessFlowParams: ServerlessFlowParams =
    ServerlessFlowParamsSchema.parse(service.custom?.serverlessFlowParams ?? {})
  if (!serverlessFlowParams.resourcesSuffix)
    serverlessFlowParams.resourcesSuffix = `-${service.provider.stage}`

  // Check if tasks directory exists
  const dir = serverlessFlowParams.tasksDirectory
  if (!utils.directoryExists(dir)) {
    console.log(`No tasks available. The directory ${dir} does not exist.`)
    return
  }

  for (const file of utils.getFiles(serverlessFlowParams.tasksDirectory)) {
    if (!file.endsWith('/task.yml')) continue
    const taskParams: TaskParams = await serverless.yamlParser.parse(file)
    if (taskParams.taskType !== TaskType.ECS) continue
    const taskDirectory = file.replace('/task.yml', '')

    // Check if Dockerfile exists
    if (!utils.fileExists(`${taskDirectory}/Dockerfile`)) {
      console.log(
        `No Dockerfile found for task ${taskParams.taskName}. Skipping task.`,
      )
      continue
    }

    const taskResources: Record<string, unknown> = templates.getTaskResources(
      stage,
      serverlessFlowParams.resourcesPrefix,
      serverlessFlowParams.resourcesSuffix,
      taskParams,
    )

    console.log(`Building docker image for task ${taskParams.taskName}...`)

    const ecrRepositoryResource = taskResources[
      `${taskParams.taskName}TaskEcrRepository`
    ] as Record<string, Record<string, string>>
    const ecrRepositoryName: string =
      ecrRepositoryResource.Properties.RepositoryName

    const accountId = await utils.executeBashCommand(
      `aws sts get-caller-identity --query "Account" --output text ${profileOpt}`,
    )
    const repositoryUri = `${accountId}.dkr.ecr.${region}.amazonaws.com/${ecrRepositoryName}`

    await utils.executeBashCommand(
      `aws ecr get-login-password --region ${region} ${profileOpt} | docker login --username AWS --password-stdin ${repositoryUri}`,
    )
    try {
      await utils.executeBashCommand(`docker build -t ${repositoryUri} .`, {
        cwd: taskDirectory,
      })
    } catch (error) {
      console.log(
        `Error building docker image for task ${taskParams.taskName}.`,
      )
      // console.log(error)
      continue
    }
    console.log(`Pushing image to ${repositoryUri}.`)
    await utils.executeBashCommand(`docker push ${repositoryUri}`)
    console.log(
      `Docker image for task ${taskParams.taskName} deployed successfully.`,
    )
  }
}
