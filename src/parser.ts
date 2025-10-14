import {
  type ExportedDeclarations,
  JSDoc,
  JSDocableNode,
  Node,
  Project,
  PropertySignature,
  SyntaxKind,
  ts,
  Type,
  TypeAliasDeclaration,
  TypeNode,
} from "ts-morph"

type FileExportExample = {
  title?: string
  code: string
}

export interface ExportDocumentation {
  examples?: Array<FileExportExample>
  remarks?: string
  summary?: string
  description?: string
  type?: string
  category?: string
  properties?: Record<string, ExportDocumentation>
}
type ExportName = string
export type FileDocumentation = Map<ExportName, ExportDocumentation>

type FilePath = string

export type FileDocumentationConfig<RenamedExports extends string = string> = {
  readonly exports: FileExports
  readonly propertiesToOmit?: Set<string>
  readonly renames?: Record<RenamedExports, string>
  readonly mapExample?: Record<RenamedExports, DocumentationExampleMapper>
}

export type DocumentationExampleMapper = (
  example: FileExportExample,
  property: string | undefined,
) => FileExportExample | undefined

export type FileExports =
  | "all"
  | { readonly type: "omit" | "pick"; readonly names: readonly string[] }

export async function parseDocumentation(
  filesToParse: Record<FilePath, FileDocumentationConfig>,
): Promise<Map<FilePath, FileDocumentation>> {
  const acc = new Map<FilePath, FileDocumentation>()
  const project = new Project()

  for (const [relativePath, documentationConfig] of Object.entries(filesToParse)) {
    if (!documentationConfig) continue
    project.addSourceFilesAtPaths(relativePath)
    acc.set(
      relativePath,
      await parseFileDocumentation(project, relativePath, documentationConfig),
    )
  }
  return acc
}

async function parseFileDocumentation(
  project: Project,
  filePath: FilePath,
  fileDocumentationConfig: FileDocumentationConfig,
): Promise<FileDocumentation> {
  const sourceFile = project.getSourceFileOrThrow(filePath)
  const fileDocumentation: FileDocumentation = new Map()

  for (const [
    exportName,
    declarations,
  ] of sourceFile.getExportedDeclarations()) {
    if (!isExportToDocument(exportName, fileDocumentationConfig.exports))
      continue
    const fileExportDocumentation = parseDeclarationDocumentation(
      declarations[0]!,
    )
    fileDocumentation.set(exportName, fileExportDocumentation)
  }
  return fileDocumentation
}

function isExportToDocument(name: string, exportsToDocument: FileExports) {
  if (exportsToDocument === "all") return true
  return exportsToDocument.type === "omit"
    ? !exportsToDocument.names.includes(name)
    : exportsToDocument.names.includes(name)
}

function isJSDocableNode(node: Record<string, any>): node is JSDocableNode {
  return "getJsDocs" in node
}

function getJsDocsUntilParent(node: Node, maxAncestors: number): JSDoc[] {
  // NOTE: the type is incorrect but the function works fine. No need to dig further.
  let current: Node | undefined = node
  while (current && maxAncestors) {
    if (isJSDocableNode(current)) return current.getJsDocs() as JSDoc[]
    current = current.getParent()
    maxAncestors--
  }
  return []
}

function resolveConditionTypeNodes(
  typeNode: TypeNode,
  acc: TypeNode[] = [],
): TypeNode[] {
  const conditionalType = typeNode.asKind(SyntaxKind.ConditionalType)
  const conditionalTypes = conditionalType
    ? [conditionalType]
    : typeNode.getChildrenOfKind(SyntaxKind.ConditionalType)

  if (!conditionalTypes.length) {
    console.debug("non conditional-type", typeNode.getType().getText())
    return [...acc, typeNode]
  }

  return [
    ...acc,
    ...conditionalTypes.flatMap((conditionalType) => {
      const trueType = conditionalType.getTrueType()
      console.debug(
        "true type:",
        trueType.getType().getText(),
        trueType.getKindName(),
      )
      const falseType = conditionalType.getFalseType()
      console.debug(
        "false type:",
        falseType.getType().getText(),
        falseType.getKindName(),
      )
      return [
        ...resolveConditionTypeNodes(trueType),
        ...resolveConditionTypeNodes(falseType),
      ]
    }),
  ]
}

function getJsDocsOfChildren(
  node: ExportedDeclarations,
): Record<string, ExportDocumentation> | undefined {
  if (node instanceof TypeAliasDeclaration) {
    const allTypeNodes = resolveConditionTypeNodes(node.getTypeNodeOrThrow())
    // console.debug("so?", allTypeNodes.map((node) => node.getText()))
    return allTypeNodes.reduce(
      (acc, typeNode) => {
        return extractTypeJsDocs(typeNode.getType(), acc)
      },
      undefined as Record<string, ExportDocumentation> | undefined,
    )
  }
  return extractTypeJsDocs(node.getType())
}

function extractTypeJsDocs(
  type: Type,
  acc: Record<string, ExportDocumentation> | undefined = undefined,
): Record<string, ExportDocumentation> | undefined {
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

  for (const prop of type.getProperties()) {
    const declarations = prop.getDeclarations()
    const [decl] = declarations
    if (!decl) continue
    if (!(decl instanceof PropertySignature)) {
      const [jsDoc] = getJsDocsUntilParent(decl, 3)
      if (jsDoc)
        acc = {
          ...acc,
          [prop.getName()]: jsDocToFileExportDocumentation(jsDoc),
        }
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
        },
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
): ExportDocumentation {
  const [jsDoc] = getJsDocsUntilParent(declaration, 3)
  return {
    type: getDeclarationType(declaration),
    ...(jsDoc && jsDocToFileExportDocumentation(jsDoc)),
    properties: getJsDocsOfChildren(declaration),
  }
}

function jsDocToFileExportDocumentation(jsDoc: JSDoc): ExportDocumentation {
  const initialDoc: ExportDocumentation = {
    description: jsDoc?.getDescription().trim() || undefined,
  }
  return jsDoc.getTags().reduce((acc, tag): ExportDocumentation => {
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
