import type { GraphOptions } from '../src'
import { get_dot, get_mermaid, get_graph } from '../src/lib'
import process from 'process'

describe('graph', function () {
    // TODO ADD CIRCULAR DEPENDENCY TEST
    const spy = jest.spyOn(process, 'cwd')
    spy.mockReturnValue('test_project')

    it('show_path_to', async function () {
        const options: GraphOptions = {
            start: 'test_project/start.ts',
            base_path: '',
            show_path_to: 'test_project/leafs/leaf.ts',
            graph_folder: false,
        }
        const g = get_graph(options)
        let mermaid = get_mermaid(g, options)

        expect(mermaid).not.toContain('midleaf') // won't contain, since it takes only the shortest path
        expect(mermaid).toContain('leaf')
    })
    it('base_path', async function () {
        const options: GraphOptions = {
            start: 'test_project/start.ts',
            base_path: 'test_project',
            graph_folder: false,
        }
        let mermaid = get_mermaid(get_graph(options), options)
        expect(mermaid).not.toContain('test_project')
    })
    it('aggregate_by_folder', async function () {
        const options: GraphOptions = {
            start: 'test_project/start.ts',
            aggregate_by_folder: true,
            graph_folder: false,
        }
        const g = get_graph(options)
        let mermaid = get_mermaid(g, options)

        expect(mermaid).toContain('test_project --> test_project/leafs')
    })
    it('max_depth', async function () {
        const options1: GraphOptions = {
            start: 'test_project/start.ts',
            base_path: 'test_project',
            max_depth: 1,
            graph_folder: false,
        }
        const options2: GraphOptions = {
            start: 'test_project/start.ts',
            base_path: 'test_project',
            max_depth: 2,
            graph_folder: false,
        }
        let mermaid_depth_1 = get_mermaid(get_graph(options1), options1)
        let mermaid_depth_2 = get_mermaid(get_graph(options2), options2)

        expect(mermaid_depth_1).not.toContain('mid --> leaf')
        expect(mermaid_depth_2).toContain('mid --> leaf')
    })
    it('filter_edge verbose', async function () {
        const options1: GraphOptions = {
            start: 'test_project/start.ts',
            filter_edges: ['mid=>leaf'],
            verbose_filter: true,
            verbose: true,
            graph_folder: false,
        }
        let mermaid_depth_1 = get_mermaid(get_graph(options1), options1)

        expect(mermaid_depth_1).not.toContain('"test_project/mid.ts" -> "test_project/leafs/leaf.ts"')
    })
    it('start at folder level should contain all files', async function () {
        const options: GraphOptions = {
            start: 'test_project',
            graph_folder: false,
        }
        let mermaid = get_mermaid(get_graph(options), options)

        expect(mermaid).toContain('leaf.ts')
        expect(mermaid).toContain('start.ts')
        expect(mermaid).toContain('secondmidleaf.ts')
        expect(mermaid).toContain('mid.ts')
    })
    it('start at folder level with glob, should contain all files', async function () {
        const options: GraphOptions = {
            start: 'test_project/**/*.ts',
            graph_folder: false,
        }
        let mermaid = get_mermaid(get_graph(options), options)

        expect(mermaid).toContain('leaf.ts')
        expect(mermaid).toContain('start.ts')
        expect(mermaid).toContain('secondmidleaf.ts')
        expect(mermaid).toContain('mid.ts')
    })
    it('start at folder level with glob, should have start_files', async function () {
        const options: GraphOptions = {
            start: 'test_project/*.ts',
            graph_folder: false,
        }
        let graph = get_graph(options)

        // glob should get mid, start and importasjs  as start_nodes
        expect([...graph.start_nodes]).toHaveLength(3)
        expect([...graph.start_nodes].map((el) => el.path)).toContain('test_project/start.ts')
        expect([...graph.start_nodes].map((el) => el.path)).toContain('test_project/mid.ts')
        expect([...graph.start_nodes].map((el) => el.path)).toContain('test_project/importasjs.ts')
    })
    it('scan directory, filter should cover start nodes', async function () {
        const options: GraphOptions = {
            start: 'test_project', // will start scanning at all files in the folder | start.s and mid.ts
            filter: ['start'],
            graph_folder: false,
        }
        let mermaid = get_mermaid(get_graph(options), options)

        expect(mermaid).toContain('leaf.ts')
        expect(mermaid).not.toContain('start.ts')
        expect(mermaid).not.toContain('secondmidleaf.ts') // is only reachable via start.ts
        expect(mermaid).toContain('mid.ts')
    })
    it('should import .js as .ts', async function () {
        const options: GraphOptions = {
            start: 'test_project/importasjs.ts',
            graph_folder: false,
        }
        let mermaid = get_mermaid(get_graph(options), options)

        expect(mermaid).toContain('leaf.ts')
    })

    it('should put sub_cluster with folder name with graph_folder option', async function () {
        const options: GraphOptions = {
            start: 'test_project',
            graph_folder: true,
        }
        let mermaid = get_mermaid(get_graph(options), options)

        // each folder own cluster
        expect(mermaid).toContain('subgraph cluster_1')
        expect(mermaid).toContain('subgraph cluster_2')
        // folder names
        expect(mermaid).toContain('test_project')
        expect(mermaid).toContain('leafs')
    })

    it('should handle compilerOptions paths', async function () {
        const options: GraphOptions = {
            start: 'test_project/src/App.tsx',
            graph_folder: false,
        }
        const graph = get_graph(options)

        expect(graph).toEqual({
            edges: [
                {
                    node1: { path: 'test_project/src/App.tsx', layer: 1000 },
                    node2: { path: 'test_project/src/components/Button.tsx', layer: 1000 },
                },
                {
                    node1: { path: 'test_project/src/App.tsx', layer: 1000 },
                    node2: { path: 'test_project/src/components/Input.tsx', layer: 1000 },
                },
                {
                    node1: { path: 'test_project/src/components/Input.tsx', layer: 1000 },
                    node2: { path: 'test_project/src/helpers/index.ts', layer: 1000 },
                },
                {
                    node1: { path: 'test_project/src/helpers/index.ts', layer: 1000 },
                    node2: { path: 'test_project/src/helpers/helper.ts', layer: 1000 },
                },
            ],
            nodes: [
                { path: 'test_project/src/App.tsx', layer: 1000 },
                { path: 'test_project/src/components/Button.tsx', layer: 1000 },
                { path: 'test_project/src/components/Input.tsx', layer: 1000 },
                { path: 'test_project/src/helpers/index.ts', layer: 1000 },
                { path: 'test_project/src/helpers/helper.ts', layer: 1000 },
            ],
            start_nodes: new Set().add({ layer: 1000, path: 'test_project/src/App.tsx' }),
            color_edges: false,
        })
    })
})
