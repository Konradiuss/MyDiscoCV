export type AssetResolver = (file: string) => string

function stemOf(file: string) {
  const dot = file.lastIndexOf('.')

  return dot <= 0 ? file : file.slice(0, dot)
}

export function createAssetResolver(
  urlsByPath: Record<string, string>,
  folder = 'the assets folder',
): AssetResolver {
  const urlsByFile = new Map<string, string>()
  const filesByStem = new Map<string, string[]>()

  Object.entries(urlsByPath).forEach(([path, url]) => {
    const file = path.slice(path.lastIndexOf('/') + 1)
    urlsByFile.set(file, url)
    filesByStem.set(stemOf(file), [...(filesByStem.get(stemOf(file)) ?? []), file])
  })

  return (file) => {
    const exact = urlsByFile.get(file)
    if (exact) return exact

    const sameStem = filesByStem.get(stemOf(file)) ?? []
    if (sameStem.length === 1) return urlsByFile.get(sameStem[0]!)!
    if (sameStem.length > 1) {
      throw new Error(
        `"${file}" matches more than one file in ${folder}: ${[...sameStem].sort().join(', ')}. ` +
          `Name the one you want, extension included, or remove the others.`,
      )
    }

    const available = [...urlsByFile.keys()].sort().join(', ')
    throw new Error(
      `File "${file}" is not in ${folder}. ` +
        `Available: ${available.length > 0 ? available : '(the folder is empty)'}`,
    )
  }
}
