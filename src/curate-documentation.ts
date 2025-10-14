import type { ExportDocumentation, FileDocumentationConfig } from "./parser.js"

export function curateFileExportDocumentation(params: {
  exportName: string
  config: FileDocumentationConfig
  documentation: ExportDocumentation
  propertyName?: string
}): ExportDocumentation {
  const { config, documentation, exportName, propertyName } = params
  const propertyEntries =
    documentation.properties &&
    Object.entries(documentation.properties)
      .filter(([propertyName]) => {
        return !config.propertiesToOmit?.has(propertyName)
      })
      .map(([propertyName, documentation]) => {
        return [
          propertyName,
          curateFileExportDocumentation({ config, exportName, documentation, propertyName }),
        ]
      })
  return {
    ...documentation,
    examples: documentation.examples?.flatMap((example) => {
      const mapper = config.mapExample?.[exportName]
      if (!mapper) return [example]
      const mappedExample = mapper(example, propertyName)
      return mappedExample ? [mappedExample] : []
    }),
    properties: propertyEntries && Object.fromEntries(propertyEntries),
  }
}
