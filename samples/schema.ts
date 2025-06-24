interface Failure<E> {
  _tag: "Failure"
  error: E
}
interface Success<V> {
  _tag: "Success"
  value: V
}

export const success = <T>(value: T): Success<T> => ({ _tag: "Success", value })
export const failure = <E>(error: E): Failure<E> => ({ _tag: "Failure", error })

type Result<Err, Value> = Failure<Err> | Success<Value>

interface SchemaError {
  schemaName: string
  reason: string
}

export interface Schema<T> {
  name: string
  parse: (input: unknown) => Result<SchemaError, T>
}

/**
 * A simple schema for strings.
 * @example success
 * ```ts
 * import { string, success } from './schema'
 *
 * assert.equal(string.parse('hello'), success('hello'))
 * ```
 * @example failure
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
