import { parseDocumentation } from './parser.js'
import { RenderDocumentation } from './render-documentation.js'

type Markdown = string
export type RenderMarkdownReference = RenderDocumentation<Markdown, {
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
  resolveLinkPath?: (referencedName: string) => string | undefined;
}>

export const renderMarkdownReference: RenderMarkdownReference = async ({ entryPoints }) => {
  const report = await parseDocumentation(entryPoints)
  const body = Object.values(report).flatMap((fileExports) => {
    return Object.entries(fileExports).sort(([a], [b]) => a.localeCompare(b)).map(([exportName, doc]) => {
      return [
        `## ${exportName}`,
        doc.description,
        doc.summary,
        doc.remarks && `> [!NOTE]\n> ${doc.remarks}`,
        // doc.type && ('```ts\n' + doc.type + '\n```'),
        ...(doc.examples ?? []).map(({ title, code }) => {
          return [title && `**${title}**`, code].join('\n')
        })
      ].filter(Boolean).join('\n\n')
    })
  }).join('\n\n')
  return `# Reference\n\n${body}`
}