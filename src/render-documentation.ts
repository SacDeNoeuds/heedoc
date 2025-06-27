import type { FileExports } from './parser.js'

export type RenderDocumentationOptions = {
  entryPoints: Record<string, FileExports>;
  output: string
}
export type RenderDocumentation<CustomOptions = {}> = (options: RenderDocumentationOptions & CustomOptions) => Promise<void>