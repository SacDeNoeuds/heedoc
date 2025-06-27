import { describe, expect, it } from 'vitest'
import type { FileDocumentation } from './parser.js'
import { markdownReferenceRenderer } from './render-markdown-reference.js'

describe(markdownReferenceRenderer.name, () => {
  it('renders a fully documented variable', () => {
    const doc: FileDocumentation = {
      array: {
        description: 'An array of numbers',
        type: 'number[]',
        summary: 'It does not do much',
        remarks: 'Beware of the tiger\nIt can bring its lot of problems',
        examples: [
          { title: 'Hello World', code: '```ts\nconsole.log("Hello World")\n```' },
          { code: '```ts\nconsole.log("Oops!")\n```' }
        ],
      },
    } as const
    const md = markdownReferenceRenderer({ 'samples/demo.ts': doc })
    expect(md).toBe(`
# Reference

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
    `.trim())
  })
  
  it('chains and sorts alphabetically 2 exports', () => {
    const doc: FileDocumentation = {
      timeoutInMs: {
        description: 'Timeout for all XHR requests',
      },
      array: {
        description: 'An array of numbers',
      },
    } as const
    const md = markdownReferenceRenderer({ 'samples/demo.ts': doc })
    expect(md).toBe(`
# Reference

## \`array\`

An array of numbers

## \`timeoutInMs\`

Timeout for all XHR requests
    `.trim())
  })
})