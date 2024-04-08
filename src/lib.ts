import { relative } from 'path'
import { argv } from 'process'
import { GraphOptions } from '.'
import { Graph } from './graph'
import { post_process_graph } from './post_process'
import { start_scan } from './scan/scan'
import { get_filters } from './scan/scan_filter'

export function get_dot(g: Graph, options: GraphOptions) {
    return g.to_dot(relative(options.base_path || '', options.start), options.graph_folder)
}

export function get_mermaid(g: Graph, options: GraphOptions) {
    return g.to_mermaid(relative(options.base_path || '', options.start), options.graph_folder)
}

export function get_graph(options: GraphOptions) {
    const g = new Graph(!!options.color_edges)
    const g_folders = new Graph(!!options.color_edges)
    let filters = get_filters(options)
    start_scan(options, filters, g, g_folders)
    const relevant_graph = options.aggregate_by_folder ? g_folders : g
    post_process_graph(options, relevant_graph)

    return relevant_graph
}
