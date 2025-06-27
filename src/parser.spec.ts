import path from "node:path"
import { describe, expect, it } from "vitest"
import { parseDocumentation } from "./parser.js"

const barrelFilePath = path.resolve(process.cwd(), "./samples/barrel.ts")
const sourceFilePath = path.resolve(process.cwd(), "./samples/schema.ts")
const interfaceFilePath = path.resolve(process.cwd(), "./samples/interface.ts")
const fnFilePath = path.resolve(process.cwd(), "./samples/fn.ts")
const proxyTypeFilePath = path.resolve(process.cwd(), "./samples/proxy-type.ts")

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
const wrapCodeInTicks = (code: string) => "```ts" + "\n" + code + "\n" + "```"

describe(parseDocumentation.name, () => {
  const expectedSuccessData = {
    description: "Helps creating success {@link Result}",
    type: expect.anything(),
  } as const
  const expectedFailureData = {
    summary: "generates an error",
    type: expect.anything(),
  } as const
  const expectedStringData = {
    description: "A simple schema for strings.",
    type: expect.any(String),
    examples: [
      { code: wrapCodeInTicks(stringSuccessExample) },
      { title: "Failure", code: wrapCodeInTicks(stringFailureExample) },
    ],
  } as const

  it("parses all the exports of the source file", async () => {
    const result = await parseDocumentation({ [sourceFilePath]: "all exports" })
    expect(result).toEqual({
      "samples/schema.ts": {
        Schema: { type: expect.any(String) },
        SchemaError: { type: expect.any(String) },
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
    const result = await parseDocumentation({
      [sourceFilePath]: { type: "pick", exports: ["string"] },
    })
    expect(result).toEqual({
      "samples/schema.ts": {
        string: expectedStringData,
      },
    })
  })

  it("parses only the `string` picked export documentation of a barrel file", async () => {
    const result = await parseDocumentation({
      [barrelFilePath]: { type: "pick", exports: ["string"] },
    })
    expect(result).toEqual({
      "samples/barrel.ts": { string: expectedStringData },
    })
  })

  it("parses only the `string` by omitting all others export documentation of a barrel file", async () => {
    const result = await parseDocumentation({
      [barrelFilePath]: { type: "omit", exports: ["success", "failure"] },
    })
    expect(result).toEqual({
      "samples/barrel.ts": { string: expectedStringData },
    })
  })

  it.each([
    ["an interface", "SchemaError1"],
    ["a type", "SchemaError1"],
  ])("parses properties of %s", async (_, exportName) => {
    const result = await parseDocumentation({
      [interfaceFilePath]: { type: "pick", exports: [exportName] },
    })
    expect(result).toEqual({
      "samples/interface.ts": {
        [exportName]: {
          type: exportName,
          properties: {
            reasons: {
              description: "A detailed explanation of the encountered error",
              summary: "The reason why the parsing failed.",
              properties: {
                code: {
                  description: "Error CODE",
                },
              },
            },
            superTest: {
              description: "One can document methods too",
            },
          },
        },
      },
    })
  })

  it("parses a function with an assigned property", async () => {
    const result = await parseDocumentation({
      [fnFilePath]: "all exports",
    })
    expect(result).toEqual({
      "samples/fn.ts": {
        myFn: {
          properties: {
            maxLength: {
              description: "Some doc on the test.maxLength",
            },
          },
        },
      },
    })
  })

  it("parses a proxy type with nested conditions", async () => {
    const result = await parseDocumentation({
      [proxyTypeFilePath]: { type: "pick", exports: ["Proxy"] },
    })
    console.dir(result, { depth: null })
    expect(result).toEqual({
      "samples/proxy-type.ts": {
        Proxy: {
          type: "Proxy<T>",
          description: "Doc it damn it !",
          properties: {
            propOfA: {
              description: "Important stuff to know about.",
            },
            propOfB: {
              description: "B is the way to go",
            },
          },
        },
      },
    })
  })
})
