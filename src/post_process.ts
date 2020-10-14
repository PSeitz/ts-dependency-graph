import { DependencyOptions } from "."
import { Graph, INode } from "./graph"

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
        const removeNodes = new Set<INode>()
        for (const node of g.nodes) {
            let toBeRemoved = true

            g.walk(g.start_node!, (edge, path) => {
                //check path connects both
                if(path.length >= (options.max_depth || 1000)){
                    return false;
                }

                const connectsToTarget = path.some(
                    (edge) => edge.node2.path.includes(path_to)
                )
                const connectsToNode = path.some(
                    (edge) => edge.node2 == node
                )
                if (connectsToTarget && connectsToNode) {
                    toBeRemoved = false
                }
                return true;
            })

            if (toBeRemoved) removeNodes.add(node)
        }
        g.nodes = g.nodes.filter((node) => !removeNodes.has(node))
        g.edges = g.edges.filter((e) => !removeNodes.has(e.node2))
        g.edges = g.edges.filter((e) => !removeNodes.has(e.node1))
    }
}
