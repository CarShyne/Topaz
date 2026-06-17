import { useEffect, useRef } from 'react'
import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force'
import { select } from 'd3-selection'
import { zoom, zoomIdentity } from 'd3-zoom'
import { useVaultStore, buildGraphData } from '../stores/vaultStore'
import styles from './GraphView.module.css'

export function GraphView() {
  const svgRef = useRef<SVGSVGElement>(null)
  const entries = useVaultStore(s => s.entries)
  const noteContent = useVaultStore(s => s.noteContent)
  const openTab = useVaultStore(s => s.openTab)

  useEffect(() => {
    const loadAll = async () => {
      const notes: Record<string, string> = { ...noteContent }
      for (const e of entries.filter(e => !e.isDir)) {
        if (!notes[e.path]) {
          const c = await window.topaz.readNote(e.path)
          if (c) notes[e.path] = c
        }
      }
      renderGraph(notes)
    }
    loadAll()
  }, [entries, noteContent])

  function renderGraph(notes: Record<string, string>) {
    if (!svgRef.current) return
    const { nodes, links } = buildGraphData(notes)
    const width = svgRef.current.clientWidth || 800
    const height = svgRef.current.clientHeight || 600

    const svg = select(svgRef.current)
    svg.selectAll('*').remove()

    const g = svg.append('g')

    type SimNode = { id: string; label: string; x?: number; y?: number }
    type SimLink = { source: string | SimNode; target: string | SimNode }

    const simNodes: SimNode[] = nodes.map(n => ({ ...n, x: width / 2, y: height / 2 }))
    const simLinks: SimLink[] = links.map(l => ({ source: l.source, target: l.target }))

    const simulation = forceSimulation(simNodes)
      .force('link', forceLink(simLinks).id(d => (d as SimNode).id).distance(80))
      .force('charge', forceManyBody().strength(-200))
      .force('center', forceCenter(width / 2, height / 2))

    const link = g.append('g').selectAll('line').data(simLinks).join('line')
      .attr('stroke', '#5c1a24').attr('stroke-width', 1)

    const node = g.append('g').selectAll('circle').data(simNodes).join('circle')
      .attr('r', 6)
      .attr('fill', '#9b111e')
      .attr('stroke', '#e0115f')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('click', (_, d) => openTab(`${d.id}.md`, d.label))

    const label = g.append('g').selectAll('text').data(simNodes).join('text')
      .text(d => d.label)
      .attr('font-size', 10)
      .attr('fill', '#9a9a9a')
      .attr('text-anchor', 'middle')
      .attr('dy', 18)
      .style('pointer-events', 'none')

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SimNode).x ?? 0)
        .attr('y1', d => (d.source as SimNode).y ?? 0)
        .attr('x2', d => (d.target as SimNode).x ?? 0)
        .attr('y2', d => (d.target as SimNode).y ?? 0)
      node.attr('cx', d => d.x!).attr('cy', d => d.y!)
      label.attr('x', d => d.x!).attr('y', d => d.y!)
    })

    svg.call(zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 4]).on('zoom', e => {
      g.attr('transform', e.transform)
    }) as never)

    svg.call((sel) => zoom<SVGSVGElement, unknown>().transform(sel, zoomIdentity) as never)
  }

  return (
    <div className={styles.graph}>
      <svg ref={svgRef} className={styles.svg} />
    </div>
  )
}
