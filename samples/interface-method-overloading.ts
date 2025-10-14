export interface Typed {
  /**
   * Hi !
   * @category Reference
   * @example
   * ```ts
   * Hello without name
   * ```
   */
  object<T>(
    schemas: Record<string, unknown>,
  ): T
  /**
   * @category Reference
   * @example
   * ```ts
   * Hello with name
   * ```
   */
  object<T>(
    name: string,
    schemas: Record<string, unknown>,
  ): T
}