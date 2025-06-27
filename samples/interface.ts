export interface SchemaError1 {
  schemaName: string
  /**
   * A detailed explanation of the encountered error
   * 
   * @summary The reason why the parsing failed.
   */
  reasons: Array<{
    name: string;
    description: string;
    /** Error CODE */
    code: number
  }>
  /** One can document methods too */
  superTest(): number
}

export type SchemaError2 = SchemaError1;