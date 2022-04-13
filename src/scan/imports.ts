import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import ts, { FileReference } from 'typescript'
import { GraphOptions } from '..'
import { convertPath } from '../path'
import { PathObj } from './scan'
import { isDefined } from '../utils'

export const checkedFiles = new Set()
export const ignoredFiles = new Set<string>()

export type IFileCache = { [index: string]: PathObj[] }

export function getCachedImportsForFile(file: string, options: GraphOptions, cache: IFileCache) {
    if (!cache[file]) {
        cache[file] = getImportsForFile(file, options)
    }
    return cache[file]
}

function getImportsForFile(file: string, options: GraphOptions) {
    const fileInfo = ts.preProcessFile(readFileSync(file).toString())
    if (options.verbose)
        console.log('getImportsForFile ' + file + ': ' + fileInfo.importedFiles.map((el) => el.fileName).join(', '))
    return fileInfo.importedFiles
        .map((importedFile: FileReference) => importedFile.fileName)
        .filter((x: string) => x.startsWith('.')) // only relative paths allowed
        .map((fileName: string) => {
            return join(dirname(file), fileName)
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
