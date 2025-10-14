import fs from "node:fs/promises"
import path from "node:path"
import {
  groupDocumentationByExportName,
  type DocumentationByExportName,
} from "./group-by-export-name.js"
import { parseDocumentation, type ExportDocumentation } from "./parser.js"
import { prettify } from "./prettify.js"
import type { RenderDocumentation } from "./render-documentation.js"

export type RenderMarkdownReferenceOptions = {
  // /**
  //  * When a JSDoc includes a `{@\link otherStuff}`, this function lets you define how to resolve the link path to `otherStuff`
  //  * @example
  //  * ```ts
  //  * generateReferenceMarkdown({
  //  *  // …
  //  *  resolveLinkPath: (referenceName) => {
  //  *    switch (referenceName) {
  //  *      case 'Result':
  //  *       return '/reference#Result'
  //  *     case 'ComplexStuff':
  //  *       return '/advanced-usage#ComplexStuff'
  //  *      default:
  //  *        return undefined // unknown reference name
  //  *    }
  //  *  }
  //  * })
  //  * ```
  //  */
  // resolveLinkPath?: (referencedName: string) => string | undefined
  mainHeading?: string
  /**
   * @default {2}
   */
  startHeadingLevel?: number
}
export type RenderMarkdownReference =
  RenderDocumentation<RenderMarkdownReferenceOptions>

export const renderMarkdownReference: RenderMarkdownReference = async ({
  entryPoints,
  output,
  mainHeading = "",
  startHeadingLevel = 2,
}) => {
  entryPoints = Object.fromEntries(
    Object.entries(entryPoints).map(([filePath, config]) => {
      const relativePath = path.relative(process.cwd(), filePath)
      return [relativePath, config]
    }),
  )

  const documentationByExportNameByFilePath =
    await parseDocumentation(entryPoints)
  const documentationByExportName = groupDocumentationByExportName(
    documentationByExportNameByFilePath,
    entryPoints,
  )
  const markdown = markdownReferenceRenderer(documentationByExportName, {
    mainHeading,
    startHeadingLevel,
  })
  const outFile = path.resolve(process.cwd(), output)
  await fs.writeFile(outFile, await prettify(markdown), "utf-8")
}

type Options = Required<RenderMarkdownReferenceOptions>

export function markdownReferenceRenderer(
  documentationByExportName: DocumentationByExportName,
  options: Options,
): string {
  const body = [...documentationByExportName.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([exportName, documentation]) => {
      return renderExport(exportName, documentation, options)
    })
    .join("\n\n")
    .trim()
  if (!body)
    throw new Error(
      "No reference to generate, please check that your code has JSDoc",
    )
  const markdown = [options.mainHeading && `# ${options.mainHeading}`, body]
    .filter(Boolean)
    .join("\n\n")
  return markdown
}

function renderExport(
  exportName: string,
  doc: ExportDocumentation,
  options: Options,
  level = 1,
): string {
  if (level > 3) return ""
  const content = [
    doc.description,
    doc.summary,
    doc.remarks && `> [!NOTE]\n> ${doc.remarks}`,
    // doc.type && ('```ts\n' + doc.type + '\n```'),
    ...(doc.examples ?? []).map(({ title, code }) => {
      return [title && `**${title}**`, code].join("\n")
    }),
  ].filter(Boolean)

  if (!content.length) return ""
  const propertiesContent = Object.entries(doc?.properties ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([propName, doc]) => {
      const nestedExportName = `${exportName}.${propName}`
      return renderExport(nestedExportName, doc, options, level + 1)
    })
  const headingLevel = level - 1 + options.startHeadingLevel
  const heading = `${"#".repeat(headingLevel)} \`${exportName}\``
  return [heading, ...content, ...propertiesContent].join("\n\n").trim()
}
