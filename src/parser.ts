import path from "node:path"
import { ExportedDeclarations, JSDoc, Project } from "ts-morph"

export interface FileExportDocumentation {
  examples?: Array<{ title?: string; code: string }>
  remarks?: string
  summary?: string
  description?: string
  signature?: string
  category?: string
}
type ExportName = string
export type FileDocumentation = Record<ExportName, FileExportDocumentation>

type FilePath = string
type FileExports = "all exports" | string[]

export async function parseDocumentation(
  filesToParse: Record<FilePath, FileExports>,
): Promise<Record<FilePath, FileDocumentation>> {
  const acc: Record<FilePath, FileDocumentation> = {}
  const project = new Project()
  for (const filePath in filesToParse) {
    const relativePath = path.relative(process.cwd(), filePath)
    const exports = filesToParse[filePath]!
    project.addSourceFilesAtPaths(filePath)
    acc[relativePath] = await parseFileDocumentation(project, filePath, exports)
  }
  return acc
}

async function parseFileDocumentation(
  project: Project,
  filePath: FilePath,
  exports: FileExports,
): Promise<FileDocumentation> {
  const sourceFile = project.getSourceFileOrThrow(filePath)
  const fileDoc: FileDocumentation = {}
  for (const [name, declarations] of sourceFile.getExportedDeclarations()) {
    if (exports !== 'all exports' && !exports.includes(name)) continue;
    fileDoc[name] = parseDeclarationDocumentation(declarations[0]!)
  }
  return fileDoc
}

function getJsDocsUntilParent(node: ExportedDeclarations, maxAncestors: number): JSDoc[] {
  let current: ExportedDeclarations | undefined = node;
  while (current && maxAncestors) {
    if ('getJsDocs' in current) return current.getJsDocs();
    current = current.getParent() as any
    maxAncestors--
  }
  return []
}
function parseDeclarationDocumentation(declaration: ExportedDeclarations): FileExportDocumentation {
  // ClassDeclaration | InterfaceDeclaration | EnumDeclaration | FunctionDeclaration | VariableDeclaration | TypeAliasDeclaration | Expression | SourceFile
  const [jsDoc] = getJsDocsUntilParent(declaration, 3)
  const acc: FileExportDocumentation = {
    description: jsDoc?.getDescription().trim() || undefined,
    signature: declaration.getType().getText(),
  }
  if (!jsDoc) return acc;
  jsDoc.getTags().forEach((tag) => {
    console.debug('tag name', tag.getTagName())
    switch (tag.getTagName()) {
      case 'example':
        const text = tag.getCommentText()!.trim()
        acc.examples ||= [];
        acc.examples?.push({
          title: text.slice(0, text.indexOf('```')).trim() || undefined,
          code: text.slice(text.indexOf('```')),
        })
        break;
      case 'remarks':
        acc.remarks = tag.getCommentText()?.trim()
        break;
      case 'summary':
        acc.summary = tag.getCommentText()?.trim()
        break;
      case 'category':
        acc.category = tag.getCommentText()?.trim()
        break;
    }
    return acc;
  });
  return acc
}
