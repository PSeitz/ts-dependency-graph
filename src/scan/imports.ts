import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import ts, { FileReference } from 'typescript'
import { DependencyOptions } from '..'
import { convertPath } from '../path'
import { PathObj } from './scan'
import { isDefined } from '../utils'

export const checkedFiles = new Set()
export const ignoredFiles = new Set<string>()

const cache: { [index: string]: PathObj[] } = {}
export function getCachedImportsForFile(file: string, options: DependencyOptions) {
    if (!cache[file]) {
        cache[file] = getImportsForFile(file, options)
    }
    return cache[file]
}

function getImportsForFile(file: string, options: DependencyOptions) {
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
            if (existsSync(`${fileName}.js`)) {
                return `${fileName}.js`
            }
            if (existsSync(`${fileName}.d.ts`)) {
                return `${fileName}.d.ts`
            }
            const yo = join(fileName, 'index.ts').normalize()
            if (existsSync(yo)) {
                return yo
            }
            ignoredFiles.add(fileName)
            return undefined
            // throw new Error(`Unresolved import ${fileName} in ${file}`);
        })
        .filter(isDefined)
        .map(convertPath)
}
