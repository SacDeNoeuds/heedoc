import path from "node:path"
import {
  type ExportedDeclarations,
  JSDoc,
  JSDocableNode,
  Node,
  Project,
  PropertySignature,
  ts,
  Type
} from "ts-morph"

export interface FileExportDocumentation {
  examples?: Array<{ title?: string; code: string }>
  remarks?: string
  summary?: string
  description?: string
  type?: string
  category?: string
  properties?: Record<string, FileExportDocumentation>
}
type ExportName = string
export type FileDocumentation = Record<ExportName, FileExportDocumentation>

type FilePath = string
export type FileExports =
  | "all exports"
  | { type: "omit" | "pick"; exports: string[] }

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
    if (!isExportToDocument(name, exports)) continue
    fileDoc[name] = parseDeclarationDocumentation(declarations[0]!)
  }
  return fileDoc
}
function isExportToDocument(name: string, exportsToDoc: FileExports) {
  if (exportsToDoc === "all exports") return true
  return exportsToDoc.type === "omit"
    ? !exportsToDoc.exports.includes(name)
    : exportsToDoc.exports.includes(name)
}

function isJSDocableNode(node: Record<string, any>): node is JSDocableNode {
  return 'getJsDocs' in node;
}

function getJsDocsUntilParent(
  node: Node,
  maxAncestors: number,
): JSDoc[] {
  // NOTE: the type is incorrect but the function works fine. No need to dig further.
  let current: Node | undefined = node
  while (current && maxAncestors) {
    if (isJSDocableNode(current)) return current.getJsDocs() as JSDoc[]
    current = current.getParent()
    maxAncestors--
  }
  return []
}

function getJsDocsOfChildren(
  node: ExportedDeclarations,
): Record<string, FileExportDocumentation> | undefined {
  return extractTypeJsDocs(node.getType())
}

function extractTypeJsDocs(
  type: Type,
  acc: Record<string, FileExportDocumentation> | undefined = undefined,
): Record<string, FileExportDocumentation> | undefined {
  if (type.isArray()) {
    const elementType = type.getArrayElementTypeOrThrow()
    return extractTypeJsDocs(elementType, acc)
  }
  const symbol = type.getSymbol()
  const symbolName = symbol?.getName()
  if (symbolName === "Set") {
    const typeOfElement = type.getTypeArguments()[0]
    return typeOfElement ? extractTypeJsDocs(typeOfElement, acc) : acc
  } else if (symbolName === "Map") {
    const typeOfValue = type.getTypeArguments()[1]
    return typeOfValue ? extractTypeJsDocs(typeOfValue, acc) : acc
  }

  // Handle object types (excluding functions, etc.)
  if (!type.isObject())
    return undefined

  for (const prop of type.getProperties()) {
    const declarations = prop.getDeclarations()
    const [decl] = declarations
    if (!decl) continue
    if (!(decl instanceof PropertySignature)) {
      const [jsDoc] = getJsDocsUntilParent(decl, 3)
      if (jsDoc) acc = { ...acc, [prop.getName()]: jsDocToFileExportDocumentation(jsDoc) }
      continue
    }
    const propSignature = decl
    // Recursively handle nested structures
    const [jsDoc] = propSignature.getJsDocs()
    const propDocumentation = jsDoc && jsDocToFileExportDocumentation(jsDoc)
    const properties = extractTypeJsDocs(propSignature.getType())
    if (propDocumentation || properties) {
      acc = {
        ...acc,
        [prop.getName()]: {
          ...(jsDoc && jsDocToFileExportDocumentation(jsDoc)),
          properties: extractTypeJsDocs(propSignature.getType()),
        }
      }
    }
  }
  return acc
}

function getDeclarationType(declaration: ExportedDeclarations) {
  const typeAsText = declaration
    .getType()
    .getText(declaration, ts.TypeFormatFlags.NoTruncation)
  return typeAsText.startsWith("typeof ") ? undefined : typeAsText
}

function parseDeclarationDocumentation(
  declaration: ExportedDeclarations,
): FileExportDocumentation {
  const [jsDoc] = getJsDocsUntilParent(declaration, 3)
  return {
    type: getDeclarationType(declaration),
    ...(jsDoc && jsDocToFileExportDocumentation(jsDoc)),
    properties: getJsDocsOfChildren(declaration),
  }
}

function jsDocToFileExportDocumentation(jsDoc: JSDoc): FileExportDocumentation {
  const initialDoc: FileExportDocumentation = {
    description: jsDoc?.getDescription().trim() || undefined,
  }
  return jsDoc.getTags().reduce((acc, tag): FileExportDocumentation => {
    switch (tag.getTagName()) {
      case "example": {
        const text = tag.getCommentText()!.trim()
        const title = text.slice(0, text.indexOf("```")).trim() || undefined
        const code = text.slice(text.indexOf("```"))
        return {
          ...acc,
          examples: [...(acc.examples ?? []), { title, code }],
        }
      }
      case "remarks":
        return { ...acc, remarks: tag.getCommentText()?.trim() }
      case "summary":
        return { ...acc, summary: tag.getCommentText()?.trim() }
      case "category":
        return { ...acc, category: tag.getCommentText()?.trim() }
      default:
        return acc
    }
  }, initialDoc)
}
