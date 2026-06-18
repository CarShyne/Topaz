import { useCallback, useEffect, useRef, useState } from 'react'
import { forceSimulation, forceLink, forceManyBody, forceCenter, type Simulation } from 'd3-force'
import { select, type Selection } from 'd3-selection'
import { zoom, zoomIdentity } from 'd3-zoom'
import { useGemStore, buildFolderGraphData, type FolderGraphNode } from '../stores/gemStore'
import topazIcon from '../assets/graph-topaz.png'
import diamondIcon from '../assets/graph-diamond.png'
import styles from './GraphView.module.css'

const FOLDER_SIZE = 28
const FILE_SIZE = 20

type SimNode = FolderGraphNode & { x?: number; y?: number; fx?: number | null; fy?: number | null }
type SimLink = { source: string | SimNode; target: string | SimNode; kind: 'contains' | 'wiki' }

export function GraphView() {
  const svgRef = useRef<SVGSVGElement>(null)
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null)
  const nodesRef = useRef<SimNode[]>([])
  const nodeSelRef = useRef<Selection<SVGGElement, SimNode, SVGGElement, unknown> | null>(null)
  const linkSelRef = useRef<Selection<SVGLineElement, SimLink, SVGGElement, unknown> | null>(null)
  const expandedRef = useRef<Set<string>>(new Set())
  const entries = useGemStore(s => s.entries)
  const gemName = useGemStore(s => s.gemName)
  const noteContent = useGemStore(s => s.noteContent)
  const openTab = useGemStore(s => s.openTab)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set())

  expandedRef.current = expandedFolders

  const nodeOpacity = useCallback((n: SimNode) => {
    if (n.kind === 'folder') return 1
    if (!n.parentFolder) return 1
    return expandedRef.current.has(n.parentFolder) ? 1 : 0
  }, [])

  const applyExpansion = useCallback((nodes: SimNode[]) => {
    for (const n of nodes) {
      if (n.kind !== 'file' || !n.parentFolder) continue
      const parent = nodes.find(p => p.id === n.parentFolder)
      const expanded = expandedRef.current.has(n.parentFolder)
      if (!expanded && parent) {
        n.fx = parent.x ?? n.x
        n.fy = parent.y ?? n.y
        n.x = parent.x ?? n.x
        n.y = parent.y ?? n.y
      } else if (expanded) {
        if (n.fx != null && parent) {
          n.x = parent.x ?? n.x
          n.y = parent.y ?? n.y
        }
        n.fx = null
        n.fy = null
      }
    }
  }, [])

  const refreshExpansionVisuals = useCallback(() => {
    applyExpansion(nodesRef.current)
    nodeSelRef.current?.style('opacity', d => nodeOpacity(d))
    linkSelRef.current?.attr('stroke-opacity', d => {
      if (d.kind === 'wiki') return 0.45
      const target = d.target as SimNode
      return target.parentFolder && !expandedRef.current.has(target.parentFolder) ? 0 : 0.7
    })
    simRef.current?.alpha(0.55).restart()
  }, [applyExpansion, nodeOpacity])

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      expandedRef.current = next
      refreshExpansionVisuals()
      return next
    })
  }, [refreshExpansionVisuals])

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
    return () => {
      simRef.current?.stop()
      simRef.current = null
      nodeSelRef.current = null
      linkSelRef.current = null
    }
  }, [entries, noteContent, gemName])

  function renderGraph(notes: Record<string, string>) {
    if (!svgRef.current) return
    const { nodes, links } = buildFolderGraphData(entries, notes, gemName || 'Gem')
    const width = svgRef.current.clientWidth || 800
    const height = svgRef.current.clientHeight || 600

    const svg = select(svgRef.current)
    svg.selectAll('*').remove()

    const g = svg.append('g')

    const simNodes: SimNode[] = nodes.map(n => ({ ...n, x: width / 2, y: height / 2 }))
    const simLinks: SimLink[] = links.map(l => ({ ...l }))
    nodesRef.current = simNodes
    applyExpansion(simNodes)

    const simulation = forceSimulation(simNodes)
      .force('link', forceLink(simLinks)
        .id(d => (d as SimNode).id)
        .distance(l => ((l as SimLink).kind === 'contains' ? 72 : 48))
        .strength(l => ((l as SimLink).kind === 'contains' ? 0.85 : 0.35)))
      .force('charge', forceManyBody().strength(n => ((n as SimNode).kind === 'folder' ? -320 : -120)))
      .force('center', forceCenter(width / 2, height / 2))

    simRef.current = simulation

    const link = g.append('g').attr('class', styles.links).selectAll('line').data(simLinks).join('line')
      .attr('stroke', d => (d.kind === 'wiki' ? '#3d1520' : '#5c1a24'))
      .attr('stroke-width', d => (d.kind === 'wiki' ? 0.75 : 1.25))
      .attr('stroke-dasharray', d => (d.kind === 'wiki' ? '3 4' : null))
      .attr('stroke-opacity', d => {
        if (d.kind === 'wiki') return 0.45
        const target = typeof d.target === 'string'
          ? simNodes.find(n => n.id === d.target)
          : d.target as SimNode
        return target?.parentFolder && !expandedRef.current.has(target.parentFolder) ? 0 : 0.7
      })

    linkSelRef.current = link

    const node = g.append('g').attr('class', styles.nodes).selectAll<SVGGElement, SimNode>('g').data(simNodes).join('g')
      .attr('class', d => d.kind === 'folder' ? styles.folderNode : styles.fileNode)
      .style('cursor', 'pointer')
      .style('opacity', d => nodeOpacity(d))
      .on('click', (event, d) => {
        event.stopPropagation()
        if (d.kind === 'folder') toggleFolder(d.id)
        else openTab(`${d.id}.md`, d.label)
      })

    nodeSelRef.current = node

    node.append('image')
      .attr('href', d => (d.kind === 'folder' ? topazIcon : diamondIcon))
      .attr('width', d => (d.kind === 'folder' ? FOLDER_SIZE : FILE_SIZE))
      .attr('height', d => (d.kind === 'folder' ? FOLDER_SIZE : FILE_SIZE))
      .attr('x', d => (d.kind === 'folder' ? -FOLDER_SIZE / 2 : -FILE_SIZE / 2))
      .attr('y', d => (d.kind === 'folder' ? -FOLDER_SIZE / 2 : -FILE_SIZE / 2))

    node.append('text')
      .text(d => d.label)
      .attr('font-size', d => (d.kind === 'folder' ? 11 : 10))
      .attr('fill', d => (d.kind === 'folder' ? '#e8a0b4' : '#9a9a9a'))
      .attr('text-anchor', 'middle')
      .attr('dy', d => (d.kind === 'folder' ? FOLDER_SIZE / 2 + 12 : FILE_SIZE / 2 + 11))
      .style('pointer-events', 'none')

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SimNode).x ?? 0)
        .attr('y1', d => (d.source as SimNode).y ?? 0)
        .attr('x2', d => (d.target as SimNode).x ?? 0)
        .attr('y2', d => (d.target as SimNode).y ?? 0)
        .attr('stroke-opacity', d => {
          if (d.kind === 'wiki') return 0.45
          const target = d.target as SimNode
          return target.parentFolder && !expandedRef.current.has(target.parentFolder) ? 0 : 0.7
        })

      node
        .attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
        .style('opacity', d => nodeOpacity(d))
    })

    simulation.alpha(0.9).restart()

    svg.call(zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 4]).on('zoom', e => {
      g.attr('transform', e.transform)
    }) as never)

    svg.call((sel) => zoom<SVGSVGElement, unknown>().transform(sel, zoomIdentity) as never)
  }

  return (
    <div className={styles.graph}>
      <p className={styles.hint}>Click a Topaz folder to reveal its diamonds</p>
      <svg ref={svgRef} className={styles.svg} />
    </div>
  )
}
