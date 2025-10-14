import path from 'node:path'
import { parseDocumentation } from './parser.js'

const filePath = path.resolve(process.cwd(), "./samples/barrel.ts")

parseDocumentation({ [filePath]: { exports: "all" } }).then(
  (result) => console.dir(result, { depth: null }), console.error)