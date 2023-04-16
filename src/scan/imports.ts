import { readFileSync } from 'fs'
import ts, { FileReference } from 'typescript'
import { GraphOptions } from '..'
import { convertPath } from '../path'
import { PathObj } from './scan'
import { isDefined } from '../utils'

export const checkedFiles = new Set()
export const ignoredFiles = new Set<string>()

export type IFileCache = { [index: string]: PathObj[] }

export function getCachedImportsForFile(
    file: string,
    options: GraphOptions,
    cache: IFileCache,
    tsOptions: ts.CompilerOptions
) {
    if (!cache[file]) {
        cache[file] = getImportsForFile(file, options, tsOptions)
    }
    return cache[file]
}

function getImportsForFile(file: string, options: GraphOptions, tsOptions: ts.CompilerOptions) {
    const fileInfo = ts.preProcessFile(readFileSync(file).toString())
    if (options.verbose)
        console.log('getImportsForFile ' + file + ': ' + fileInfo.importedFiles.map((el) => el.fileName).join(', '))
    return fileInfo.importedFiles
        .map((importedFile: FileReference) => {
            const resolvedFileName = ts.resolveModuleName(importedFile.fileName, file, tsOptions, ts.sys).resolvedModule
                ?.resolvedFileName
            if (!resolvedFileName?.includes('node_modules')) {
                return resolvedFileName
            }
            ignoredFiles.add(importedFile.fileName)
            return undefined
            // throw new Error(`Unresolved import ${fileName} in ${file}`);
        })
        .filter(isDefined)
        .map(convertPath)
}
