import * as tsdoc from "@microsoft/tsdoc"
import path from 'node:path'
import * as ts from 'typescript'

export interface FileDocumentation {
  examples?: Array<{ title?: string; code: string }>
  remarks?: string
  summary?: string
  description?: string
  signature: unknown
}

type FilePath = string
type FileExports = "all exports" | string[]

export async function parseDocumentation(
  filesToParse: Record<FilePath, FileExports>,
): Promise<Record<FilePath, FileDocumentation>> {
  const acc: Record<FilePath, FileDocumentation> = {}
  for (const filePath in filesToParse) {
    const relativePath = path.relative(process.cwd(), filePath)
    const exports = filesToParse[filePath]
    acc[relativePath] = await parseFileDocumentation(filePath, exports)
  }
  return acc;
}

function parseFileDocumentation(filePath: FilePath, exports: FileExports): Promise<FileDocumentation> {
  throw new Error("unimplemented", { cause: { tsdoc, ts } })
}
