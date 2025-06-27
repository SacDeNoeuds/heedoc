import path from "node:path"
import { type ExportedDeclarations, JSDoc, Project, ts } from "ts-morph"

export interface FileExportDocumentation {
  examples?: Array<{ title?: string; code: string }>
  remarks?: string
  summary?: string
  description?: string
  type?: string
  category?: string
}
type ExportName = string
export type FileDocumentation = Record<ExportName, FileExportDocumentation>

type FilePath = string
export type FileExports = "all exports" | { type: 'omit' | 'pick', exports: string[] }

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
    if (!isExportToDocument(name, exports)) continue;
    fileDoc[name] = parseDeclarationDocumentation(declarations[0]!)
  }
  return fileDoc
}
function isExportToDocument(name: string, exportsToDoc: FileExports) {
  if (exportsToDoc === 'all exports') return true;
  return exportsToDoc.type === 'omit'
    ? !exportsToDoc.exports.includes(name)
    : exportsToDoc.exports.includes(name);
}

function getJsDocsUntilParent(node: ExportedDeclarations, maxAncestors: number): JSDoc[] {
  // NOTE: the type is incorrect but the function works fine. No need to dig further.
  let current: ExportedDeclarations | undefined = node;
  while (current && maxAncestors) {
    if ('getJsDocs' in current) return current.getJsDocs();
    current = current.getParent() as any
    maxAncestors--
  }
  return []
}

function getDeclarationType(declaration: ExportedDeclarations) {
  const typeAsText = declaration.getType().getText(declaration, ts.TypeFormatFlags.NoTruncation)
  return typeAsText.startsWith('typeof ') ? undefined : typeAsText
}

function parseDeclarationDocumentation(declaration: ExportedDeclarations): FileExportDocumentation {
  const [jsDoc] = getJsDocsUntilParent(declaration, 3)
  const acc: FileExportDocumentation = {
    description: jsDoc?.getDescription().trim() || undefined,
    type: getDeclarationType(declaration),
  }
  if (!jsDoc) return acc;
  jsDoc.getTags().forEach((tag) => {
    switch (tag.getTagName()) {
      case 'example':
        const text = tag.getCommentText()!.trim()
        acc.examples ||= [];
        return acc.examples?.push({
          title: text.slice(0, text.indexOf('```')).trim() || undefined,
          code: text.slice(text.indexOf('```')),
        })
      case 'remarks':
        return acc.remarks = tag.getCommentText()?.trim()
      case 'summary':
        return acc.summary = tag.getCommentText()?.trim()
      case 'category':
        return acc.category = tag.getCommentText()?.trim()
    }
  });
  return acc
}
