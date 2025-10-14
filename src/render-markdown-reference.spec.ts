import { describe, expect, it } from "vitest"
import type { ExportDocumentation } from "./parser.js"
import {
  markdownReferenceRenderer,
  type RenderMarkdownReferenceOptions,
} from "./render-markdown-reference.js"

describe(markdownReferenceRenderer.name, () => {
  type ExportDocumentationByExportName = Record<string, ExportDocumentation>
  const render = (
    documentationByExportName: ExportDocumentationByExportName,
    options?: RenderMarkdownReferenceOptions,
  ) => {
    return markdownReferenceRenderer(
      new Map(Object.entries(documentationByExportName)),
      {
        mainHeading: "Reference",
        startHeadingLevel: 2,
        ...options,
      },
    )
  }

  it("renders a fully documented variable", () => {
    const doc: ExportDocumentationByExportName = {
      array: {
        description: "An array of numbers",
        type: "number[]",
        summary: "It does not do much",
        remarks: "Beware of the tiger\nIt can bring its lot of problems",
        examples: [
          {
            title: "Hello World",
            code: '```ts\nconsole.log("Hello World")\n```',
          },
          { code: '```ts\nconsole.log("Oops!")\n```' },
        ],
      },
    } as const
    expect(render(doc)).toBe(
      `# Reference

## \`array\`

An array of numbers

It does not do much

> [!NOTE]
> Beware of the tiger
It can bring its lot of problems

**Hello World**
\`\`\`ts
console.log("Hello World")
\`\`\`


\`\`\`ts
console.log("Oops!")
\`\`\`
    `.trim(),
    )
  })

  it("chains and sorts alphabetically 2 exports", () => {
    const doc: ExportDocumentationByExportName = {
      timeoutInMs: {
        description: "Timeout for all XHR requests",
      },
      array: {
        description: "An array of numbers",
      },
    } as const
    expect(render(doc)).toBe(
      `# Reference

## \`array\`

An array of numbers

## \`timeoutInMs\`

Timeout for all XHR requests
    `.trim(),
    )
  })

  it("does not render properties when the export itself is not documented", () => {
    const doc: ExportDocumentationByExportName = {
      fetchLove: {
        properties: { timeout: { description: "Hello" } },
      },
    }
    expect(() => render(doc)).toThrow(
      "No reference to generate, please check that your code has JSDoc",
    )
  })

  it("renders properties when the export itself is documented", () => {
    const doc: ExportDocumentationByExportName = {
      fetchLove: {
        description: "Does what it does",
        properties: {
          timeout: {
            description: "Time after which we stop searching for love",
          },
        },
      },
    }
    expect(render(doc)).toBe(
      `# Reference

## \`fetchLove\`

Does what it does

### \`fetchLove.timeout\`

Time after which we stop searching for love
      `.trim(),
    )
  })

  it('renders a doc starting at level 1', () => {
    const doc: ExportDocumentationByExportName = {
      fetchLove: {
        description: "Does what it does",
        properties: {
          timeout: {
            description: "Time after which we stop searching for love",
          },
        },
      },
    }
    expect(render(doc, { mainHeading: undefined, startHeadingLevel: 1 })).toBe(
      `# \`fetchLove\`

Does what it does

## \`fetchLove.timeout\`

Time after which we stop searching for love
      `.trim()
    )
  })
})
