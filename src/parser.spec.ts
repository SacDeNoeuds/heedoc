import path from "node:path"
import { describe, expect, it } from "vitest"
import { parseDocumentation } from "./parser.js"

const barrelFilePath = path.relative(process.cwd(), "./samples/barrel.ts")
const sourceFilePath = path.relative(process.cwd(), "./samples/schema.ts")
const interfaceFilePath = path.relative(process.cwd(), "./samples/interface.ts")
const fnFilePath = path.relative(process.cwd(), "./samples/fn.ts")
const proxyTypeFilePath = path.relative(process.cwd(), "./samples/proxy-type.ts")

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
    const result = await parseDocumentation({
      [sourceFilePath]: {
        exports: "all",
      },
    })
    expect(MapToRecord(result)).toEqual({
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
    const result = await parseDocumentation({
      [barrelFilePath]: { exports: "all" },
    })
    expect(MapToRecord(result)).toEqual({
      "samples/barrel.ts": {
        success: expectedSuccessData,
        failure: expectedFailureData,
        string: expectedStringData,
      }
    })
  })

  it("parses only the `string` export documentation of the source file", async () => {
    const result = await parseDocumentation({
      [sourceFilePath]: {
        exports: { type: "pick", names: ["string"] },
      },
    })
    expect(MapToRecord(result)).toEqual({
      "samples/schema.ts": {
        string: expectedStringData,
      },
    })
  })

  it("parses only the `string` picked export documentation of a barrel file", async () => {
    const result = await parseDocumentation({
      [barrelFilePath]: {
        exports: { type: "pick", names: ["string"] },
      },
    })
    expect(MapToRecord(result)).toEqual({
      "samples/barrel.ts": { string: expectedStringData },
    })
  })

  it("parses only the `string` by omitting all others export documentation of a barrel file", async () => {
    const result = await parseDocumentation({
      [barrelFilePath]: {
        exports: { type: "omit", names: ["success", "failure"] },
      },
    })
    expect(MapToRecord(result)).toEqual({
      "samples/barrel.ts": { string: expectedStringData },
    })
  })

  it.each([
    ["an interface", "SchemaError1"],
    ["a type", "SchemaError1"],
  ])("parses properties of %s", async (_, exportName) => {
    const result = await parseDocumentation({
      [interfaceFilePath]: {
        exports: { type: "pick", names: [exportName] },
      },
    })
    expect(MapToRecord(result)).toEqual({
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
      [fnFilePath]: { exports: "all" },
    })
    expect(MapToRecord(result)).toEqual({
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
      [proxyTypeFilePath]: {
        exports: { type: "pick", names: ["Proxy"] },
      },
    })
    expect(MapToRecord(result)).toEqual({
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

function MapToRecord(filesDocumentation: Awaited<ReturnType<typeof parseDocumentation>>) {
  const acc = {} as any
  filesDocumentation.forEach((fileDocumentation, filePath) => {
    acc[filePath] = {}
    fileDocumentation.forEach((fileExportDocumentation, exportName) => {
      acc[filePath][exportName] = fileExportDocumentation
    })
  })
  return acc
}
