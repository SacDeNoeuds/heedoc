import path from "node:path"
import { describe, expect, it } from "vitest"
import { parseDocumentation } from "./main.js"

const filePath = path.resolve(process.cwd(), "./sample/schema.ts")

const stringSuccessExample = `
import { string, success } from './schema'

assert.equal(string.parse('hello'), success('hello'))
`.trim()
const stringFailureExample = `
import { string, success } from './schema'

assert.deepEqual(
  string.parse(42),
  failure({ schemaName: "string", reason: "not a string" }),
)
`.trim()

describe(parseDocumentation.name, () => {
  it("parses all the exports", async () => {
    const result = await parseDocumentation({
      [filePath]: "all exports",
    })
    expect(result).toEqual({
      "sample/schema.ts": {
        success: {
          signature: expect.anything(),
        },
        failure: {
          signature: expect.anything(),
        },
        string: {
          examples: [
            { code: stringSuccessExample },
            { title: 'Failure', code: stringFailureExample },
          ]
        }
      },
    })
  })
  it('parses only the `string` export documentation', () => {
    const result = parseDocumentation({ [filePath]: ['string'] })
    expect(result).toEqual({
      "sample/schema.ts": {
        string: {
          examples: [
            { code: stringSuccessExample },
            { title: 'Failure', code: stringFailureExample }
          ],
        },
      },
    })
  })
})
