import { FileExports } from './parser.js'

export type GenerateOptions = {
  entryPoints: Record<string, FileExports>;
}
export type GenerateDocumentation<Output, CustomOptions = {}> = (options: GenerateOptions & CustomOptions) => Promise<Output>