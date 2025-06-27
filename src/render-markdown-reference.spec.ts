import { describe, expect, it } from "vitest"
import type { FileDocumentation } from "./parser.js"
import type { RenderDocumentationOptions } from "./render-documentation.js"
import {
  markdownReferenceRenderer,
  type RenderMarkdownReferenceOptions,
} from "./render-markdown-reference.js"

describe(markdownReferenceRenderer.name, () => {
  const render = (
    doc: FileDocumentation,
    options?: RenderMarkdownReferenceOptions &
      Pick<RenderDocumentationOptions, "propertiesToOmit">,
  ) => {
    return markdownReferenceRenderer(
      { "samples/demo.ts": doc },
      {
        mainHeading: "Reference",
        propertiesToOmit: new Set(),
        startHeadingLevel: 2,
        ...options,
      },
    )
  }

  it("renders a fully documented variable", () => {
    const doc: FileDocumentation = {
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
    const doc: FileDocumentation = {
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
    const doc: FileDocumentation = {
      fetchLove: {
        properties: { timeout: { description: "Hello" } },
      },
    }
    expect(() => render(doc)).toThrow(
      "No reference to generate, please check that your code has JSDoc",
    )
  })

  it("does not render omitted properties", () => {
    const doc: FileDocumentation = {
      fetchLove: {
        description: "toto",
        properties: { timeout: { description: "Hello" } },
      },
    }
    const propertiesToOmit = new Set(["timeout"])
    expect(render(doc, { propertiesToOmit })).toBe(
      `# Reference

## \`fetchLove\`

toto
      `.trim(),
    )
  })

  it("renders properties when the export itself is documented", () => {
    const doc: FileDocumentation = {
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
    const doc: FileDocumentation = {
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
