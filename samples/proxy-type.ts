/**
 * Doc it damn it !
 */
export type Proxy<T> = T extends "a" ? (T extends "a" ? A : B) : never

export interface A {
  /**
   * Important stuff to know about.
   */
  propOfA: number
}

export type B = {
  /**
   * B is the way to go
   */
  propOfB: string
  otherProp: number
}
