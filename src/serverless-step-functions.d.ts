declare module 'serverless-step-functions' {
  export default class ServerlessStepFunctions implements Plugin {
    public readonly serverless: Serverless
    public readonly options: Serverless.Options
    public readonly logger: Plugin.Logging
    public commands: Plugin.Commands
    public hooks: Plugin.Hooks

    constructor(
      serverless: Serverless,
      options: Serverless.Options,
      logger: Plugin.Logging,
    )
  }
}
