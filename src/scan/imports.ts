import { readFileSync, existsSync } from 'fs'
import path, { join, dirname } from 'path'
import ts, { FileReference, MapLike } from 'typescript'
import { GraphOptions } from '..'
import { convertPath } from '../path'
import { PathMapping, PathObj } from './scan'
import { isDefined } from '../utils'

export const checkedFiles = new Set()
export const ignoredFiles = new Set<string>()

export type IFileCache = { [index: string]: PathObj[] }

export function getCachedImportsForFile(
    file: string,
    options: GraphOptions,
    cache: IFileCache,
    path_mapping: PathMapping
) {
    if (!cache[file]) {
        cache[file] = getImportsForFile(file, options, path_mapping)
    }
    return cache[file]
}

export interface Pattern {
    prefix: string
    suffix: string
}
export function startsWith(str: string, prefix: string): boolean {
    return str.lastIndexOf(prefix, 0) === 0
}
export function endsWith(str: string, suffix: string): boolean {
    const expectedPos = str.length - suffix.length
    return expectedPos >= 0 && str.indexOf(suffix, expectedPos) === expectedPos
}

function isPatternMatch({ prefix, suffix }: Pattern, candidate: string) {
    return (
        candidate.length >= prefix.length + suffix.length &&
        startsWith(candidate, prefix) &&
        endsWith(candidate, suffix)
    )
}

export function tryParsePattern(pattern: string): string | Pattern | undefined {
    const indexOfStar = pattern.indexOf('*')
    if (indexOfStar === -1) {
        return pattern
    }
    return pattern.indexOf('*', indexOfStar + 1) !== -1
        ? undefined
        : {
              prefix: pattern.substr(0, indexOfStar),
              suffix: pattern.substr(indexOfStar + 1),
          }
}
export interface IMapping {
    from: string | Pattern
    to: string
}
export function tryParsePatterns(paths: MapLike<string[]>): IMapping[] {
    let paths_parsed: IMapping[] = []
    for (const from in paths) {
        const element = paths[from]
        let from_pattern = tryParsePattern(from)
        if (!from_pattern) continue
        for (const to of element) {
            paths_parsed.push({ from: from_pattern, to: to })
        }
    }
    return paths_parsed
}

/**
 * Given that candidate matches pattern, returns the text matching the '*'.
 * E.g.: matchedText(tryParsePattern("foo*baz"), "foobarbaz") === "bar"
 */
export function matchedText(pattern: Pattern, candidate: string): string {
    return candidate.substring(pattern.prefix.length, candidate.length - pattern.suffix.length)
}

function applyPathMapping(fileName: string, path_mapping: PathMapping) {
    if (path_mapping.paths && path_mapping.relBaseUrl) {
        let mappings = tryParsePatterns(path_mapping.paths)

        let paths_to_check = []
        for (const mapping of mappings) {
            if (typeof mapping.from === 'string') {
                if (typeof mapping.to !== 'string') {
                    throw "type mapping from contains pattern, but to doesn't. how to handle this?"
                }
                paths_to_check.push(join(path_mapping.relBaseUrl, mapping.to))
            } else if (isPatternMatch(mapping.from, fileName)) {
                let matchedStar = matchedText(mapping.from, fileName)
                const path = mapping.to.replace('*', matchedStar)
                let endPath = join(path_mapping.relBaseUrl, path)
                paths_to_check.push('./' + endPath)
            }
        }
        return paths_to_check
    } else {
        return [fileName]
    }
}

function getImportsForFile(file: string, options: GraphOptions, path_mapping: PathMapping) {
    const fileInfo = ts.preProcessFile(readFileSync(file).toString())
    if (options.verbose)
        console.log('getImportsForFile ' + file + ': ' + fileInfo.importedFiles.map((el) => el.fileName).join(', '))
    return fileInfo.importedFiles
        .map((importedFile: FileReference) => importedFile.fileName)
        .flatMap((fileName: string) => {
            // flat map is not ideal here, because we could hit multiple valid imports, and not the first aka best one
            return applyPathMapping(fileName, path_mapping)
        })
        .filter((x: string) => x.startsWith('.')) // only relative paths allowed
        .flatMap((fileName: string) => {
            return [fileName, join(dirname(file), fileName)]
        })
        .map((fileName: string) => {
            if (existsSync(`${fileName}.ts`)) {
                return `${fileName}.ts`
            }
            if (existsSync(`${fileName}.tsx`)) {
                return `${fileName}.tsx`
            }
            const yo = join(fileName, 'index.ts').normalize()
            if (existsSync(yo)) {
                return yo
            }
            const tsx_subfolder = join(fileName, 'index.tsx').normalize()
            if (existsSync(tsx_subfolder)) {
                return tsx_subfolder
            }
            if (fileName.endsWith('.js')) {
                const tsFromJs = fileName.replace(/[.]js$/, '.ts')
                if (existsSync(tsFromJs)) {
                    return tsFromJs
                }
            }
            ignoredFiles.add(fileName)
            return undefined
            // throw new Error(`Unresolved import ${fileName} in ${file}`);
        })
        .filter(isDefined)
        .map(convertPath)
}
