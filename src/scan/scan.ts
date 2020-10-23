import { readFileSync, existsSync, lstatSync } from 'fs'
import { join, dirname, relative } from 'path'
import { DependencyOptions } from '..'
import glob from 'glob'
import { promisify } from 'util'
import { ScanFilters, isFilteredByCond } from './scan_filter'
import { Graph } from '../graph'
import { checkedFiles, getCachedImportsForFile } from './imports'
import { convertPath, toPosixPath } from '../path'

const globProm = promisify(glob)

export type PathObj = ReturnType<typeof convertPath>

export async function start_scan(options: DependencyOptions, filters: ScanFilters, g: Graph, g_folders: Graph) {
    if (lstatSync(options.start).isDirectory()) {
        if (options.show_path_to) {
            throw new Error('start_file needs to be a file, when used with show_path_to')
        }
        let files = await getSrcFiles(options.start)
        for (const file of files) {
            checkFile(convertPath(file), options, filters, g, g_folders, 0)
        }
    } else {
        checkFile(convertPath(options.start), options, filters, g, g_folders, 0)
    }
    // post_process_graph()
    // print_result(start_file)
}

function checkFile(
    fileName: PathObj,
    options: DependencyOptions,
    filters: ScanFilters,
    g: Graph,
    g_folders: Graph,
    level: number
) {
    const imports = getCachedImportsForFile(fileName.orig_path, options)
    let info = getInfo(fileName.orig_path)
    const nextLevel: PathObj[] = []
    imports.forEach((importFile) => {
        for (const filter of filters.node_filters) {
            if (isFilteredByCond(filter, importFile.normalized_path, options)) return
        }
        for (const filter of filters.edge_filters) {
            if (
                isFilteredByCond(filter.from, fileName.normalized_path, options) &&
                isFilteredByCond(filter.to, importFile.normalized_path, options)
            ) {
                if (options.verbose_filter)
                    console.log(
                        `[Filters]: Filtering edge: ${fileName.normalized_path} ${isFilteredByCond(
                            filter.from,
                            fileName.normalized_path,
                            options
                        )} -> ${importFile.normalized_path} ${isFilteredByCond(
                            filter.to,
                            importFile.normalized_path,
                            options
                        )} `
                    )
                return
            } else {
                if (options.verbose_filter)
                    console.log(
                        `[Filters]: Keeping edge: ${fileName.normalized_path} ${isFilteredByCond(
                            filter.from,
                            fileName.normalized_path,
                            options
                        )} -> ${importFile.normalized_path} ${isFilteredByCond(
                            filter.to,
                            importFile.normalized_path,
                            options
                        )} `
                    )
            }
        }

        let importFileInfo = getInfo(importFile.orig_path)
        if (!checkedFiles.has(importFile)) {
            checkedFiles.add(importFile)
            nextLevel.push(importFile)
        }
        let edge = g.add_edge({
            node1: { path: relative(options.base_path, fileName.normalized_path), layer: info.layer },
            node2: { path: relative(options.base_path, importFile.normalized_path), layer: importFileInfo.layer },
        })
        if (level === 0) {
            g.start_node = edge.node1
        }
        let folder1 = dirname(relative(options.base_path, fileName.orig_path))
        let folder2 = dirname(relative(options.base_path, importFile.orig_path))

        if (folder1 !== folder2) {
            g_folders.add_edge({
                node1: { path: toPosixPath(folder1), layer: info.layer },
                node2: { path: toPosixPath(folder2), layer: importFileInfo.layer },
            })
        }
    })

    if (level + 1 === options.max_depth) {
        if (options.verbose) {
            console.log('Reached max_depth of ' + options.max_depth + ' at ' + fileName)
        }
        return
    }
    for (const file of nextLevel) {
        checkFile(file, options, filters, g, g_folders, level + 1)
    }
}

function getInfo(fileName: string): { layer: number; area: string } {
    const getPath = () => join(parent_dir, 'info.json')

    let parent_dir = dirname(fileName)
    let i = 0
    while (!existsSync(getPath())) {
        parent_dir = join(parent_dir, '../')
        i++
        if (i === 10) {
            break
        }
    }

    if (existsSync(getPath())) {
        const file = readFileSync(getPath(), 'utf8')
        return JSON.parse(file)
    }

    return { layer: 1000, area: 'universe' }
}

export async function getSrcFiles(srcRoot: string) {
    const files = await globProm(`${srcRoot}/**/*.ts`)
    return files.filter((file) => !file.endsWith('.d.ts'))
}
