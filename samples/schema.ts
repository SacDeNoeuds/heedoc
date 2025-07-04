interface Failure<E> {
  _tag: "Failure"
  error: E
}
interface Success<V> {
  _tag: "Success"
  value: V
}
type Result<Err, Value> = Failure<Err> | Success<Value>

/**
 * Helps creating success {@link Result}
 * @see {@link Result}
 */
const success = <T>(value: T): Success<T> => ({ _tag: "Success", value })

/**
 * @summary generates an error
 */
const failure = <E>(error: E): Failure<E> => ({ _tag: "Failure", error })


interface SchemaError {
  schemaName: string
  reason: string
}

interface Schema<T> {
  name: string
  parse: (input: unknown) => Result<SchemaError, T>
}

/**
 * A simple schema for strings.
 * @example
 * ```ts
 * import { string, success } from './schema'
 *
 * assert.equal(string.parse('hello'), success('hello'))
 * ```
 * @example Failure
 * ```ts
 * import { string, success } from './schema'
 *
 * assert.deepEqual(
 *   string.parse(42),
 *   failure({ schemaName: "string", reason: "not a string" }),
 * )
 * ```
 */
export const string: Schema<string> = {
  name: "string",
  parse: (input) => {
    return typeof input === "string"
      ? success(input)
      : failure({ schemaName: "string", reason: "not a string" })
  },
}

export { failure, success, type Schema, type SchemaError }

