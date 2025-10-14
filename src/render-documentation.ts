import type { FileDocumentationConfig } from './parser.js'

export type RenderDocumentationOptions<RenamedExports extends string = string> = {
  readonly entryPoints: Record<string, FileDocumentationConfig<RenamedExports>>;
  readonly output: string
}
export type RenderDocumentation<CustomOptions = {}> = (options: RenderDocumentationOptions & CustomOptions) => Promise<void>
