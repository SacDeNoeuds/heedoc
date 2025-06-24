#!/usr/bin/env node
import { cac } from "cac"
import { readFileSync } from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { GenerateOptions } from '../generate-documentation.js'
import { generateReferenceMarkdown } from "../generate-reference-markdown.js"

const currentFilePath = fileURLToPath(import.meta.url)
const packageJsonPath = path.resolve(
  path.dirname(currentFilePath),
  "../../package.json",
)
const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"))

const cli = cac("gen-reference-md")

cli
  .version(pkg.version)
  .command(
    '[output file]',
    "Generate markdown reference from JSDoc",
  )
  .usage("./reference.md --entry src/main.js,src/other.js")
  .option(
    "--entry [name]",
    "Comma-separated list of entry points to generate references for",
    // @ts-ignore cac is badly typed, `type` does accept `String`
    { type: String },
  )
  .option("--pick-exports [ext]", "The export names to keep", {
    // @ts-ignore cac is badly typed, `type` does accept `String`
    type: String,
    default: "",
  })
  .option("--omit-exports [ext]", "The export names to omit", {
    // @ts-ignore cac is badly typed, `type` does accept `String`
    type: String,
    default: "",
  })
  .option("--watch", "Enable watch mode", {
    // @ts-ignore cac is badly typed, `type` does accept `Boolean`
    type: Boolean,
    default: false,
  })
  .action(async (output, options) => {
    console.dir(options)
    const entryPointsFromOptions: string[] =
      options.entry?.split(",").filter(Boolean) ?? []
    const { pickExports, omitExports, watch } = options
    if (!entryPointsFromOptions || entryPointsFromOptions.length === 0) {
      cli.outputHelp()
      console.info("\n")
      console.error(
        "Error: Missing required root directories, see usage upper\n",
      )
      process.exit(1)
    } else if (!output) {
      console.error("Error: missing an output")
      cli.outputHelp()
    }
    console.debug(`Generating the reference file ${output}`)
    // `pickExports` can be empty string
    const exportsToPick: string[] = pickExports ? pickExports.split(',').filter(Boolean) : undefined
    
    const entryPoints: GenerateOptions['entryPoints'] = Object.assign(
      {},
      ...entryPointsFromOptions.map((entryPoint) => ({
        [entryPoint]: exportsToPick ?? ("all exports" as const),
      })),
    )
    try {
      const markdown = await generateReferenceMarkdown({
        entryPoints,
        // @ts-expect-error it will be supported soon.
        watch,
        omitExports,
        // entryPoints: Object.assign(
        //   {},
        //   ...entryPoints.map((entryPoint) => ({
        //     [entryPoint]: {
        //       exportsToPick: pickExports,
        //       exportsToOmit: omitExports,
        //     },
        //   })),
        // ),
        // watch,
      })
      console.log(markdown)
    } catch (error) {
      console.error(error)
    }
  })

cli.help()
cli.parse(process.argv)
