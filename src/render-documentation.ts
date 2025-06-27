import type { FileExports } from './parser.js'

export type RenderDocumentationOptions = {
  entryPoints: Record<string, FileExports>;
  propertiesToOmit?: Set<string>
  output: string
}
export type RenderDocumentation<CustomOptions = {}> = (options: RenderDocumentationOptions & CustomOptions) => Promise<void>