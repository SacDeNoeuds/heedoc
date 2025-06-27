import * as path from 'node:path'
import * as prettier from "prettier"

export async function prettify(
  code: string
): Promise<string> {
  const prettierConfig = await resolvePrettierConfig();
  const formatted = await prettier.format(code, prettierConfig);
  return formatted;
}

async function resolvePrettierConfig(): Promise<prettier.Options> {
  // NOTE: I am using readme instead of just `process.cwd()` because
  // `prettier.resolveConfig` inspects the directory of a file, not the directory directly.
  const pathOfReadme = path.resolve(process.cwd(), 'README.md')
  const maybeConfig = await prettier.resolveConfig(pathOfReadme);

  return (
    maybeConfig ?? {
      semi: false,
      singleQuote: true,
    }
  );
}
