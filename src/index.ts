import type Serverless from 'serverless'
import type Plugin from 'serverless/classes/Plugin'

class ServerlessFlowPlugin implements Plugin {
  public readonly serverless: Serverless
  public readonly options: Serverless.Options

  constructor(serverless: Serverless, options: Serverless.Options) {
    this.serverless = serverless
    this.options = options
  }

  public commands: Plugin.Commands = {
    welcome: {
      usage: 'Helps you start your first Serverless plugin',
      lifecycleEvents: ['hello', 'world'],
      options: {
        message: {
          usage:
            'Specify the message you want to deploy ' +
            '(e.g. "--message \'My Message\'" or "-m \'My Message\'")',
          required: true,
          shortcut: 'm',
        },
      },
    },
  }

  public hooks: Plugin.Hooks = {
    'before:welcome:hello': this.beforeWelcome.bind(this),
    'welcome:hello': this.welcomeUser.bind(this),
    'welcome:world': this.displayHelloMessage.bind(this),
    'after:welcome:world': this.afterHelloWorld.bind(this),
  }

  beforeWelcome(): void {
    this.serverless.cli.log('Hello from Serverless!')
  }

  welcomeUser(): void {
    this.serverless.cli.log('Your message:')
  }

  displayHelloMessage(): void {
    this.serverless.cli.log(`${this.options.message}`)
  }

  afterHelloWorld(): void {
    this.serverless.cli.log('Please come again!')
  }
}

export = ServerlessFlowPlugin
