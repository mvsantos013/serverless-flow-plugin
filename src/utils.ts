import path from 'path'
import { readdirSync, statSync } from 'fs'
import { exec } from 'child_process'
import * as z from 'zod'
import { load as loadYaml } from 'js-yaml'
import templates from './templates'
import { TaskParams } from './types'

/**
 * @param dir Path to the directory to check for existence.
 * @returns True if the directory exists, false otherwise.
 */
export const directoryExists = (dir: string): boolean => {
  try {
    return statSync(dir).isDirectory()
  } catch (error) {
    return false
  }
}

/**
 * @param file Path to the file to check for existence.
 * @returns True if the file exists, false otherwise.
 */
export const fileExists = (file: string): boolean => {
  try {
    return statSync(file).isFile()
  } catch (error) {
    return false
  }
}

/**
 * Recursively retrieves all filenames within a directory and its subdirectories.
 *
 * @param dir The absolute or relative path to the directory to scan.
 * @returns An array of absolute file paths within the specified directory and its subdirectories.
 * @throws {Error} If there is an error accessing the directory or its contents.
 */
export const getFiles = (dir: string): string[] => {
  const results: string[] = [] // Array to store file paths
  try {
    const list = readdirSync(dir)
    list.forEach((file) => {
      const filePath: string = path.join(dir, file)
      const isDirectory: boolean = statSync(filePath).isDirectory()
      if (isDirectory) {
        results.push(...getFiles(filePath)) // Recursively call for subdirectories
      } else {
        results.push(filePath)
      }
    })
  } catch (error) {
    throw new Error(`Error accessing directory: ${dir}. Error: ${error}`) // Handle errors
  }
  return results
}

/**
 * Executes a shell command and returns the output.
 *
 * @param command The shell command to execute.
 * @param opt Options to pass to the `exec` function.
 * @returns A promise that resolves with the output of the shell command.
 */
export const executeBashCommand = async (
  command: string,
  opt: Record<string, unknown> = {},
): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, opt, (error: Error | null, stdout: string | Buffer) => {
      if (error) {
        reject(error)
        return
      }
      resolve(stdout.toString().trim())
    })
  })
}

/**
 * Retrieves the default values from a Zod schema.
 * @param schema The Zod schema to extract default values from.
 * @returns An object with the default values for the schema.
 */
export const getDefaultsFromSchema = <Schema extends z.AnyZodObject>(
  schema: Schema,
): Record<string, unknown> => {
  return Object.fromEntries(
    Object.entries(schema.shape).map(([key, value]) => {
      if (value instanceof z.ZodDefault) return [key, value._def.defaultValue()]
      return [key, undefined]
    }),
  )
}

/**
 * This is used for parsing custom utility functions in yaml files. It works
 * similar to Step Functions intrinsic functions. Currently, the only supported
 * function is `ServerlessFlow.Task()`. It abstracts away the definition and referencing
 * of resources.
 */
export class UtilityFunctionsParser {
  private text: string
  private readonly rawText: string
  private readonly tasks: Record<string, TaskParams> = {}
  private readonly functions: Array<{
    regex: RegExp
    handler: (r: RegExp) => void
  }> = [
    {
      regex: /ServerlessFlow\.Task\(([^)]+)\)/g,
      handler: this.handleTaskFunction.bind(this),
    },
  ]

  constructor(text: string, tasks: Record<string, TaskParams> = {}) {
    this.rawText = text
    // escape serverless parameters
    const escapedText = text.replace(/\$\{(.+?)\}|"\$\{(.+?)\}"/g, (match) => {
      if (!match.startsWith('"')) return `"${match}"`
      return match
    })
    this.text = escapedText
    this.tasks = tasks
  }

  /**
   * Parses all `Serverless.Task()` functions in the text.
   *
   */
  private handleTaskFunction(regex: RegExp): void {
    let matches: RegExpExecArray | null
    while ((matches = regex.exec(this.text)) !== null) {
      const [matchedText, matchContent] = matches
      const rawConfig = loadYaml(matchContent) as Record<string, unknown>
      const taskName: string = rawConfig.Name as string
      if (!taskName)
        throw new Error(
          'Property `Name` is required in ServerlessFlow.Task function.',
        )
      if (!this.tasks[taskName]) {
        throw new Error(
          `Task state with name '${taskName}' was not declared in any task.yml`,
        )
      }
      const taskStateConfig = templates.getTaskStateConfig(
        this.tasks[taskName],
        rawConfig,
      )
      this.text = this.text.replace(
        matchedText,
        JSON.stringify(taskStateConfig),
      )
      regex.lastIndex = 0
    }
  }

  /**
   * Parses the text and replaces custom utility functions with their respective values.
   * @returns The parsed text.
   */
  public parse(): string {
    for (const { regex, handler } of this.functions) handler(regex)
    return this.text
  }

  /**
   * Get original text
   */
  public getRawText(): string {
    return this.rawText
  }

  /**
   * Retrieves the parsed text as object.
   * @returns The parsed text.
   */
  public getContent(): Record<string, unknown> {
    return loadYaml(this.text) as Record<string, unknown>
  }
}
