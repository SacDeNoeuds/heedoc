import { curateFileExportDocumentation } from "./curate-documentation.js"
import type {
  ExportDocumentation,
  FileDocumentation,
  FileDocumentationConfig,
} from "./parser.js"

type FilePath = string
type ExportName = string
export type DocumentationByExportName = Map<ExportName, ExportDocumentation>

export function groupDocumentationByExportName(
  documentationByFilePath: Map<FilePath, FileDocumentation>,
  entryPoints: Record<string, FileDocumentationConfig>,
): DocumentationByExportName {
  const acc: DocumentationByExportName = new Map()
  documentationByFilePath.forEach((documentationByExportName, filePath) => {
    const config = entryPoints[filePath]!
    documentationByExportName.forEach((documentation, fileExportName) => {
      const exportName = config.renames?.[fileExportName] ?? fileExportName
      const curated = curateFileExportDocumentation({
        exportName,
        config,
        documentation,
      })

      const currentDocumentation = acc.get(exportName)
      const merged = currentDocumentation
        ? mergeDocumentations(currentDocumentation, curated)
        : curated
      acc.set(exportName, merged)
    })
  })
  return acc
}

function mergeDocumentations(
  currentDocumentation: ExportDocumentation,
  documentation: ExportDocumentation,
): ExportDocumentation {
  const after = {
    category: currentDocumentation.category ?? documentation.category,
    description: joinTexts(
      currentDocumentation.description,
      documentation.description,
    ),
    properties: {
      ...currentDocumentation.properties,
      ...documentation.properties,
    },
    examples:
      !currentDocumentation.examples && !documentation.examples
        ? undefined
        : [
            ...(currentDocumentation.examples ?? []),
            ...(documentation.examples ?? []),
          ],
    remarks: joinTexts(currentDocumentation.remarks, documentation.remarks),
    summary: joinTexts(currentDocumentation.summary, documentation.summary),
    type: currentDocumentation.type ?? documentation.type,
  }
  return after
}

function joinTexts(a: string | undefined, b: string | undefined) {
  return [a, b].filter(Boolean).join("\n\n") || undefined
}
