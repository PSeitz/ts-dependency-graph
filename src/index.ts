#!/usr/bin/env node
import { Graph, INode } from './graph'
import * as yargs from 'yargs'
import { ignoredFiles } from './scan/imports'
import { ScanFilter, get_filters, negation } from './scan/scan_filter'
import { get_graph, get_dot, get_mermaid } from './lib'

const argv = yargs
    .options({
        // target: { type: 'string', describe: "the target file, to see which dependencies are depending on the file. This is an inverse of start. choose either" },
        mermaid: {
            type: 'boolean',
            default: false,
            describe: 'use mermaid markdown as output.',
        },
        color_edges: {
            type: 'boolean',
            default: true,
            describe: 'use a random color to color the edges, group by node.',
        },
        start: {
            type: 'string',
            describe:
                'the starting file, for the analysis. can also be a folder or a glob for multiple starting files.',
        },
        graph_folder: {
            type: 'boolean',
            default: false,
            describe: 'groups files in their folder in the graph',
            alias: 'graphfolders',
        },
        aggregate_by_folder: {
            type: 'boolean',
            default: false,
            describe: 'create graph on folder level',
            alias: 'agg',
        },
        max_depth: { type: 'number', default: 1000 },
        filter: {
            type: 'array',
            describe: `removes files containing the provided strings. Can be negated with - in front, to remove files not containing the filter. e.g. '${negation}module1' - everything not containing module1.ts will be filtered. `,
            default: [] as string[],
        },
        filter_edges: {
            type: 'array',
            describe: `Experimental. removes edges containing the provided strings, the format is start_file=>target_file. The edges containing start_file AND target_file are removed. Start and target can be negated with '${negation}' in front . (Currently) This is not just a postprocess on the graph. The edges won't be followed. Note: put in quotes.`,
            default: [] as string[],
        },
        verbose: { type: 'boolean', default: false, describe: 'prints information about ignored files', alias: 'v' },
        verbose_filter: {
            type: 'boolean',
            default: false,
            describe: 'prints information about filtered files and edges',
        },
        hotspots: {
            type: 'boolean',
            default: false,
            describe: 'identify hotspots, by analyzing number of incoming and outgoing edges',
            alias: 'h',
        },
        base_path: { type: 'string', default: process.cwd(), describe: 'calculates path relatives to the base path' },
        show_path_to: {
            type: 'string',
            describe: 'will display the shortest paths between start and show_path_to',
        },
    })
    .demandOption(['start'], 'Please provide start argument to work with this tool').argv

export type GraphOptions = Partial<typeof argv> & Pick<typeof argv, 'start' | 'graph_folder'>

function print_debug(g: Graph) {
    if (argv.verbose) {
        console.log('Ignored Files: ' + ignoredFiles.size)
        console.log([...ignoredFiles].join(', '))
    }
}

let g = get_graph(argv)
print_debug(g)
if(argv.mermaid){
    const mermaid = get_mermaid(g, argv)
    console.log(mermaid)
}else{
    const dot = get_dot(g, argv)
    console.log(dot)
}

