import fs from "node:fs/promises"
import path from "node:path"
import {
  parseDocumentation,
  type FileDocumentation,
  type FileExportDocumentation,
} from "./parser.js"
import type { RenderDocumentation, RenderDocumentationOptions } from "./render-documentation.js"

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
export type RenderMarkdownReference = RenderDocumentation<RenderMarkdownReferenceOptions>

export const renderMarkdownReference: RenderMarkdownReference = async ({
  entryPoints,
  output,
  mainHeading = '',
  startHeadingLevel = 2,
  propertiesToOmit = new Set(),
}) => {
  const report = await parseDocumentation(entryPoints)
  const markdown = markdownReferenceRenderer(report, { propertiesToOmit, mainHeading, startHeadingLevel })
  const outFile = path.resolve(process.cwd(), output)
  await fs.writeFile(outFile, markdown, "utf-8")
}

type Options = Required<RenderMarkdownReferenceOptions & Pick<RenderDocumentationOptions, 'propertiesToOmit'>>

export function markdownReferenceRenderer(
  report: Record<string, FileDocumentation>,
  options: Options,
): string {
  const body = Object.values(report)
    .flatMap((fileExports) => {
      return Object.entries(fileExports)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([exportName, doc]) => {
          return renderExport(exportName, doc, options)
        })
    })
    .join("\n\n")
    .trim()
  if (!body)
    throw new Error(
      "No reference to generate, please check that your code has JSDoc",
    )
  const markdown = [
    options.mainHeading && `# ${options.mainHeading}`,
    body,
  ].filter(Boolean).join('\n\n')
  return markdown
}

function renderExport(
  exportName: string,
  doc: FileExportDocumentation,
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
  const propertiesContent = Object.entries(doc?.properties ?? {}).flatMap(
    ([propName, doc]) => {
      if (options.propertiesToOmit.has(propName)) return []
      const nestedExportName = `${exportName}.${propName}`
      return [renderExport(nestedExportName, doc, options, level + 1)]
    },
  )
  const headingLevel = level - 1 + options.startHeadingLevel;
  const heading = `${"#".repeat(headingLevel)} \`${exportName}\``
  return [heading, ...content, ...propertiesContent].join("\n\n").trim()
}
