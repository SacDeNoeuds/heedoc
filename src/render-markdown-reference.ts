import fs from "node:fs/promises"
import path from "node:path"
import {
  parseDocumentation,
  type FileDocumentation,
  type FileExportDocumentation,
} from "./parser.js"
import type { RenderDocumentation } from "./render-documentation.js"

export type RenderMarkdownReference = RenderDocumentation<{
  /**
   * When a JSDoc includes a `{@\link otherStuff}`, this function lets you define how to resolve the link path to `otherStuff`
   * @example
   * ```ts
   * generateReferenceMarkdown({
   *  // …
   *  resolveLinkPath: (referenceName) => {
   *    switch (referenceName) {
   *      case 'Result':
   *       return '/reference#Result'
   *     case 'ComplexStuff':
   *       return '/advanced-usage#ComplexStuff'
   *      default:
   *        return undefined // unknown reference name
   *    }
   *  }
   * })
   * ```
   */
  resolveLinkPath?: (referencedName: string) => string | undefined
}>

export const renderMarkdownReference: RenderMarkdownReference = async ({
  entryPoints,
  propertiesToOmit = new Set(),
  output,
}) => {
  const report = await parseDocumentation(entryPoints)
  const markdown = markdownReferenceRenderer(report, propertiesToOmit)
  const outFile = path.resolve(process.cwd(), output)
  await fs.writeFile(outFile, markdown, "utf-8")
}

export function markdownReferenceRenderer(
  report: Record<string, FileDocumentation>,
  propertiesToOmit = new Set<string>(),
): string {
  const body = Object.values(report)
    .flatMap((fileExports) => {
      return Object.entries(fileExports)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([exportName, doc]) => {
          return renderExport(exportName, propertiesToOmit, doc)
        })
    })
    .join("\n\n")
    .trim()
  if (!body)
    throw new Error(
      "No reference to generate, please check that your code has JSDoc",
    )
  const markdown = `# Reference\n\n${body}`
  return markdown
}

function renderExport(
  exportName: string,
  propertiesToOmit: Set<string>,
  doc: FileExportDocumentation,
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
  const propertiesContent = Object.entries(doc?.properties ?? {}).flatMap(
    ([propName, doc]) => {
      if (propertiesToOmit.has(propName)) return []
      const nestedExportName = `${exportName}.${propName}`
      return [renderExport(nestedExportName, propertiesToOmit, doc, level + 1)]
    },
  )
  const heading = `##${"#".repeat(level - 1)} \`${exportName}\``
  return [heading, ...content, ...propertiesContent].join("\n\n").trim()
}
