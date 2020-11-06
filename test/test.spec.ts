import { Graph } from '../src/graph'
import type { DependencyOptions } from '../src'
import { get_dot, get_graph } from '../src/lib'
describe('graph', function () {

    // TODO ADD CIRCULAR DEPENDENCY TEST

    it('show_path_to', async function () {
        const options: DependencyOptions = {
            start: 'test_project/start.ts',
            base_path: '',
            show_path_to: 'test_project/leafs/leaf.ts',
        }
        const g = get_graph(options)
        let dot = get_dot(g, options)

        expect(dot).not.toContain('midleaf') // won't contain, since it takes only the shortest path
        expect(dot).toContain('leaf')
    })
    it('base_path', async function () {
        const options: DependencyOptions = {
            start: 'test_project/start.ts',
            base_path: 'test_project',
        }
        let dot = get_dot(get_graph(options), options)
        expect(dot).not.toContain('test_project')
    })
    it('aggregate_by_folder', async function () {
        const options: DependencyOptions = {
            start: 'test_project/start.ts',
            aggregate_by_folder: true,
        }
        const g = get_graph(options)
        let dot = get_dot(g, options)

        expect(dot).toContain('"test_project" -> "test_project/leafs"')
    })
    it('max_depth', async function () {
        const options1: DependencyOptions = {
            start: 'test_project/start.ts',
            base_path: 'test_project',
            max_depth: 1,
        }
        const options2: DependencyOptions = {
            start: 'test_project/start.ts',
            base_path: 'test_project',
            max_depth: 2,
        }
        let dot_depth_1 = get_dot(get_graph(options1), options1)
        let dot_depth_2 = get_dot(get_graph(options2), options2)

        expect(dot_depth_1).not.toContain('"mid.ts" -> "leafs/leaf.ts"')
        expect(dot_depth_2).toContain('"mid.ts" -> "leafs/leaf.ts"')
    })
    it('filter_edge verbose', async function () {
        const options1: DependencyOptions = {
            start: 'test_project/start.ts',
            filter_edges: ['mid=>leaf'],
            verbose_filter: true,
            verbose: true
        }
        let dot_depth_1 = get_dot(get_graph(options1), options1)

        expect(dot_depth_1).not.toContain('"test_project/mid.ts" -> "test_project/leafs/leaf.ts"')
    })
    it('hotspots, color edges', async function () {
        const options: DependencyOptions = {
            start: 'test_project/start.ts',
            color_edges: true,
            hotspots: true,
        }
        let dot = get_dot(get_graph(options), options)
        expect(dot).toContain('color')
    })
    it('start at folder level should contain all files', async function () {
        const options: DependencyOptions = {
            start: 'test_project',
        }
        let dot = get_dot(get_graph(options), options)
        
        expect(dot).toContain('leaf.ts')
        expect(dot).toContain('start.ts')
        expect(dot).toContain('secondmidleaf.ts')
        expect(dot).toContain('mid.ts')
    })
    it('start at folder level with glob, should contain all files', async function () {
        const options: DependencyOptions = {
            start: 'test_project/**/*.ts',
        }
        let dot = get_dot(get_graph(options), options)
        
        expect(dot).toContain('leaf.ts')
        expect(dot).toContain('start.ts')
        expect(dot).toContain('secondmidleaf.ts')
        expect(dot).toContain('mid.ts')
    })
    it('start at folder level with glob, should have as start_files', async function () {
        const options: DependencyOptions = {
            start: 'test_project/*.ts',
        }
        let graph = get_graph(options);
        
        expect([...graph.start_nodes]).toHaveLength(2) // glob should get mid and start as start_nodes
        expect([...graph.start_nodes].map(el => el.path)).toContain("test_project/start.ts")
        expect([...graph.start_nodes].map(el => el.path)).toContain("test_project/mid.ts")
    })
    it('scan directory, filter should cover start nodes', async function () {
        const options: DependencyOptions = {
            start: 'test_project', // will start scanning at all files in the folder | start.s and mid.ts
            filter: ["start"]
        }
        let dot = get_dot(get_graph(options), options)
        
        expect(dot).toContain('leaf.ts')
        expect(dot).not.toContain('start.ts')
        expect(dot).not.toContain('secondmidleaf.ts') // is only reachable via start.ts
        expect(dot).toContain('mid.ts')
    })

})
