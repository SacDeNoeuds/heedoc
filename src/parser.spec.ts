import path from "node:path"
import { describe, expect, it } from "vitest"
import { parseDocumentation } from "./parser.js"

const barrelFilePath = path.resolve(process.cwd(), "./samples/barrel.ts")
const sourceFilePath = path.resolve(process.cwd(), "./samples/schema.ts")

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
const wrapInTicks = (code: string) => "```ts" + "\n" + code + "\n" + "```"

describe(parseDocumentation.name, () => {
  const expectedSuccessData = {
    description: "Helps creating success {@link Result}",
    signature: expect.anything(),
  } as const
  const expectedFailureData = {
    summary: "generates an error",
    signature: expect.anything(),
  } as const
  const expectedStringData = {
    description: "A simple schema for strings.",
    signature: expect.any(String),
    examples: [
      { code: wrapInTicks(stringSuccessExample) },
      { title: "Failure", code: wrapInTicks(stringFailureExample) },
    ],
  } as const

  it("parses all the exports of the source file", async () => {
    const result = await parseDocumentation({ [sourceFilePath]: "all exports" })
    expect(result).toEqual({
      "samples/schema.ts": {
        Schema: { signature: expect.any(String) },
        SchemaError: { signature: expect.any(String) },
        success: expectedSuccessData,
        failure: expectedFailureData,
        string: expectedStringData,
      },
    })
  })

  it("parses all the exports of the barrel file", async () => {
    const result = await parseDocumentation({ [barrelFilePath]: "all exports" })
    expect(result).toEqual({
      "samples/barrel.ts": {
        success: expectedSuccessData,
        failure: expectedFailureData,
        string: expectedStringData,
      },
    })
  })

  it("parses only the `string` export documentation of the source file", async () => {
    const result = await parseDocumentation({ [sourceFilePath]: ["string"] })
    expect(result).toEqual({
      "samples/schema.ts": {
        string: expectedStringData,
      },
    })
  })

  it('parses only the `string` export documentation of a barrel file', async () => {
    const result = await parseDocumentation({ [barrelFilePath]: ["string"] })
    expect(result).toEqual({
      "samples/barrel.ts": { string: expectedStringData },
    })
  })
})
