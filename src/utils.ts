import path from 'path'
import { readdirSync, statSync } from 'fs'
import { exec } from 'child_process'

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
