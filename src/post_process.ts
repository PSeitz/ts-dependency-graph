import { DependencyOptions } from '.'
import { getRandomColor, Graph, IEdge, INode } from './graph'

function calculate_hotspots(g: Graph, num_hotspots: number) {
    let nodes = g.nodes
    for (const node of nodes) {
        let in_len = g.get_incoming_edges_for_node(node).length
        let out_len = g.get_outgoing_edges_for_node(node).length
        node.hotspot = in_len * out_len * out_len
    }
    let sortedbyhotspot = nodes.sort((a, b) => (b.hotspot || 0) - (a.hotspot || 0))
    for (let index = 0; index < num_hotspots; index++) {
        sortedbyhotspot[index].hotspot_pos = index + 1
    }
}

export function post_process_graph(options: DependencyOptions, g: Graph) {
    if (options.hotspots) {
        calculate_hotspots(g, Math.min(5, g.nodes.length / 2))
    }

    // filtering all nodes which are not on the edge between start and show path to
    if (options.show_path_to) {
        const path_to = options.show_path_to
        const keepNodes = new Set<INode>()
        for (const node of g.nodes) {
            if(node.path.includes(path_to)){
                node.color = "red";
            }
        }

        let allPaths: IEdge[][] = []

        g.walk(g.start_node!, (edge, path) => {
            //check path connects both
            if (path.length === 0) {
                return true
            }
            if (path.length >= (options.max_depth || 1000)) {
                return false
            }

            const connectsToTarget = path.some((edge) => edge.node2.path.includes(path_to))
            if (connectsToTarget) {
                allPaths.push(path.slice(0))
            }
            return true
        })

        let shortestPathLen = allPaths.reduce((len, el1) => Math.min(el1.length, len), 10000)
        // let shortestPath = allPaths.find((el) => shortestPathLen == el.length)!
        let shortestPaths = allPaths.filter((el) => shortestPathLen == el.length)!

        let nodes = new Set()
        let edges = new Set()
        console.log(shortestPaths)
        for (const path of shortestPaths) {
            const randomPathColor = getRandomColor()
            for (const edge of path) {
                edge.color = randomPathColor;
                nodes.add(edge.node1)
                nodes.add(edge.node2)
                edges.add(edge)
            }
        }
        // g.nodes = g.nodes.filter(node => keepNodes.has(node))
        // console.log("MIAU")
        // console.log(JSON.stringify(allPaths))
        // console.log(shortestPath)
        g.nodes = g.nodes.filter((node) => nodes.has(node))
        g.edges = g.edges.filter((e) => edges.has(e))
        // g.edges = g.edges.filter(e => keepNodes.has(e.node2))
    }
}
