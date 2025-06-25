import { FileExports } from './parser.js'

export type TSDocumentItOptions = {
  entryPoints: Record<string, FileExports>;
}
export type RenderDocumentation<Output, CustomOptions = {}> = (options: TSDocumentItOptions & CustomOptions) => Promise<Output>