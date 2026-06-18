import { create } from 'zustand'
import { isCapacitor } from '../lib/device'
import { newId } from '../lib/id'

export interface GemEntry {
  path: string
  name: string
  isDir: boolean
}

export interface Tab {
  id: string
  path: string
  title: string
  view: 'note' | 'graph'
}

export type LeftPanel = 'files' | 'search' | 'bookmarks'
export type RightPanel = 'backlinks' | 'outline' | 'tags'
export type EditorMode = 'source' | 'preview' | 'split'

interface GemState {
  gemPath: string | null
  gemName: string
  entries: GemEntry[]
  tabs: Tab[]
  activeTabId: string | null
  leftPanel: LeftPanel
  rightPanel: RightPanel
  rightSidebarOpen: boolean
  leftSidebarOpen: boolean
  editorMode: EditorMode
  noteContent: Record<string, string>
  searchQuery: string
  commandPaletteOpen: boolean
  quickSwitcherOpen: boolean
  settingsOpen: boolean
  createNoteOpen: boolean
  createFolderOpen: boolean
  renameTarget: { path: string; isDir: boolean } | null
  explorerMenu: { x: number; y: number; path: string; isDir: boolean; label: string } | null
  selectedFolder: string | null
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error'
  syncError: string | null
  authToken: string | null
  userEmail: string | null
  syncServer: string
  editorStats: { words: number; chars: number } | null

  setGem: (path: string, name: string, entries: GemEntry[]) => void
  setEntries: (entries: GemEntry[]) => void
  openTab: (path: string, title?: string, view?: Tab['view']) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  setLeftPanel: (panel: LeftPanel) => void
  setRightPanel: (panel: RightPanel) => void
  toggleRightSidebar: () => void
  toggleLeftSidebar: () => void
  setEditorMode: (mode: EditorMode) => void
  setNoteContent: (path: string, content: string) => void
  setSearchQuery: (q: string) => void
  setCommandPaletteOpen: (open: boolean) => void
  setQuickSwitcherOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setCreateNoteOpen: (open: boolean) => void
  setCreateFolderOpen: (open: boolean) => void
  setRenameTarget: (target: { path: string; isDir: boolean } | null) => void
  setExplorerMenu: (menu: GemState['explorerMenu']) => void
  setSelectedFolder: (folder: string | null) => void
  removePathsFromState: (paths: string[]) => void
  remapPathsInState: (map: (path: string) => string | null) => void
  setSyncStatus: (s: GemState['syncStatus']) => void
  setSyncError: (msg: string | null) => void
  setAuth: (token: string | null, email: string | null) => void
  setSyncServer: (url: string) => void
  setEditorStats: (words: number, chars: number) => void
}

export const useGemStore = create<GemState>((set, get) => ({
  gemPath: null,
  gemName: '',
  entries: [],
  tabs: [],
  activeTabId: null,
  leftPanel: 'files',
  rightPanel: 'backlinks',
  rightSidebarOpen: false,
  leftSidebarOpen: false,
  editorMode: 'source',
  noteContent: {},
  searchQuery: '',
  commandPaletteOpen: false,
  quickSwitcherOpen: false,
  settingsOpen: false,
  createNoteOpen: false,
  createFolderOpen: false,
  renameTarget: null,
  explorerMenu: null,
  selectedFolder: null,
  syncStatus: 'idle',
  syncError: null,
  authToken: null,
  userEmail: null,
  syncServer: 'http://127.0.0.1:3921',
  editorStats: null,

  setGem: (path, name, entries) => set({
    gemPath: path,
    gemName: name,
    entries,
    tabs: [],
    activeTabId: null,
    noteContent: {},
    leftPanel: 'files',
    leftSidebarOpen: false,
  }),
  setEntries: (entries) => set({ entries }),

  openTab: (path, title, view = 'note') => {
    const { tabs } = get()
    const existing = tabs.find(t => t.path === path && t.view === view)
    const collapseFiles = isCapacitor && view === 'note'
    const sidebarPatch = collapseFiles ? { leftSidebarOpen: false } : {}

    if (existing) {
      set({ activeTabId: existing.id, ...sidebarPatch })
      return
    }
    const id = newId()
    const tab: Tab = { id, path, title: title ?? path.replace(/\.md$/, '').split('/').pop() ?? path, view }
    set({ tabs: [...tabs, tab], activeTabId: id, ...sidebarPatch })
    if (view === 'note') {
      window.topaz.readNote(path).then(content => {
        if (content !== null) {
          set(s => ({ noteContent: { ...s.noteContent, [path]: content } }))
        }
      })
    }
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get()
    const next = tabs.filter(t => t.id !== id)
    let nextActive = activeTabId
    if (activeTabId === id) {
      const idx = tabs.findIndex(t => t.id === id)
      nextActive = next[Math.min(idx, next.length - 1)]?.id ?? null
    }
    set({ tabs: next, activeTabId: nextActive })
  },

  setActiveTab: (id) => set({ activeTabId: id }),
  setLeftPanel: (panel) => set({ leftPanel: panel, leftSidebarOpen: true }),
  setRightPanel: (panel) => set({ rightPanel: panel, rightSidebarOpen: true }),
  toggleRightSidebar: () => set(s => ({ rightSidebarOpen: !s.rightSidebarOpen })),
  toggleLeftSidebar: () => set(s => ({ leftSidebarOpen: !s.leftSidebarOpen })),
  setEditorMode: (mode) => set({ editorMode: mode }),
  setNoteContent: (path, content) => set(s => ({ noteContent: { ...s.noteContent, [path]: content } })),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setQuickSwitcherOpen: (open) => set({ quickSwitcherOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setCreateNoteOpen: (open) => set({ createNoteOpen: open }),
  setCreateFolderOpen: (open) => set({ createFolderOpen: open }),
  setRenameTarget: (renameTarget) => set({ renameTarget }),
  setExplorerMenu: (explorerMenu) => set({ explorerMenu }),
  setSelectedFolder: (selectedFolder) => set({ selectedFolder }),

  removePathsFromState: (paths) => set(s => {
    const remove = new Set(paths)
    const tabs = s.tabs.filter(t => !remove.has(t.path))
    const activeTabId = tabs.find(t => t.id === s.activeTabId) ? s.activeTabId : (tabs[tabs.length - 1]?.id ?? null)
    const noteContent = { ...s.noteContent }
    for (const p of paths) delete noteContent[p]
    const selectedFolder = s.selectedFolder && remove.has(s.selectedFolder) ? null : s.selectedFolder
    return { tabs, activeTabId, noteContent, selectedFolder }
  }),

  remapPathsInState: (map) => set(s => {
    const tabs = s.tabs.flatMap(t => {
      const next = map(t.path)
      if (!next) return []
      return [{ ...t, path: next, title: next.replace(/\.md$/, '').split('/').pop() ?? next }]
    })
    const noteContent: Record<string, string> = {}
    for (const [path, content] of Object.entries(s.noteContent)) {
      const next = map(path)
      if (next) noteContent[next] = content
    }
    let selectedFolder = s.selectedFolder
    if (selectedFolder) {
      selectedFolder = map(selectedFolder) ?? null
    }
    const activeTabId = tabs.find(t => t.id === s.activeTabId)?.id ?? tabs[tabs.length - 1]?.id ?? null
    return { tabs, noteContent, selectedFolder, activeTabId }
  }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setSyncError: (syncError) => set({ syncError }),
  setAuth: (authToken, userEmail) => set({ authToken, userEmail }),
  setSyncServer: (syncServer) => set({ syncServer }),
  setEditorStats: (words, chars) => set({ editorStats: { words, chars } }),
}))

export function extractWikiLinks(content: string): string[] {
  const links: string[] = []
  const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) links.push(m[1].trim())
  return links
}

export function extractTags(content: string): string[] {
  const tags = new Set<string>()
  const re = /(?:^|\s)#([a-zA-Z0-9_/-]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) tags.add(m[1])
  return [...tags]
}

export function extractHeadings(content: string): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = []
  for (const line of content.split('\n')) {
    const m = line.match(/^(#{1,6})\s+(.+)/)
    if (m) headings.push({ level: m[1].length, text: m[2] })
  }
  return headings
}

export function getBacklinks(notes: Record<string, string>, target: string): { path: string; context: string }[] {
  const targetBase = target.replace(/\.md$/, '')
  const results: { path: string; context: string }[] = []
  for (const [path, content] of Object.entries(notes)) {
    if (path === target) continue
    const links = extractWikiLinks(content)
    if (links.some(l => l === targetBase || l === target)) {
      const line = content.split('\n').find(l => l.includes(`[[${targetBase}]]`) || l.includes(`[[${target}]]`)) ?? ''
      results.push({ path, context: line.trim() })
    }
  }
  return results
}

export function getOutgoingLinks(content: string): string[] {
  return extractWikiLinks(content)
}

export function buildGraphData(notes: Record<string, string>) {
  const nodes: { id: string; label: string }[] = []
  const links: { source: string; target: string }[] = []
  const nodeSet = new Set<string>()

  for (const path of Object.keys(notes)) {
    const id = path.replace(/\.md$/, '')
    if (!nodeSet.has(id)) { nodeSet.add(id); nodes.push({ id, label: id.split('/').pop() ?? id }) }
  }

  for (const [path, content] of Object.entries(notes)) {
    const source = path.replace(/\.md$/, '')
    for (const link of extractWikiLinks(content)) {
      if (!nodeSet.has(link)) { nodeSet.add(link); nodes.push({ id: link, label: link.split('/').pop() ?? link }) }
      links.push({ source, target: link })
    }
  }
  return { nodes, links }
}

export type GraphNodeKind = 'folder' | 'file'

export interface FolderGraphNode {
  id: string
  label: string
  kind: GraphNodeKind
  parentFolder?: string
}

export interface FolderGraphLink {
  source: string
  target: string
  kind: 'contains' | 'wiki'
}

/** Folder tree for graph view — Topaz folders, diamond notes branching off. */
export function buildFolderGraphData(
  entries: GemEntry[],
  notes: Record<string, string>,
  rootLabel: string
): { nodes: FolderGraphNode[]; links: FolderGraphLink[] } {
  const nodes: FolderGraphNode[] = []
  const links: FolderGraphLink[] = []
  const nodeIds = new Set<string>()
  const folderIds = new Set<string>()

  const ensureFolder = (folderPath: string) => {
    const id = `folder:${folderPath}`
    if (folderIds.has(id)) return id
    folderIds.add(id)
    const label = folderPath ? (folderPath.split('/').pop() ?? folderPath) : rootLabel
    nodes.push({ id, label, kind: 'folder' })
    nodeIds.add(id)
    return id
  }

  ensureFolder('')

  for (const e of entries.filter(e => e.isDir)) {
    ensureFolder(e.path)
  }

  const addFile = (filePath: string) => {
    if (!filePath.endsWith('.md')) return
    const id = filePath.replace(/\.md$/, '')
    if (nodeIds.has(id)) return
    const parts = filePath.split('/')
    const fileName = (parts.pop() ?? id).replace(/\.md$/, '')
    const folderPath = parts.join('/')
    const parentId = ensureFolder(folderPath)
    nodes.push({ id, label: fileName, kind: 'file', parentFolder: parentId })
    nodeIds.add(id)
    links.push({ source: parentId, target: id, kind: 'contains' })
  }

  for (const e of entries.filter(e => !e.isDir)) addFile(e.path)
  for (const path of Object.keys(notes)) addFile(path)

  for (const [path, content] of Object.entries(notes)) {
    const source = path.replace(/\.md$/, '')
    if (!nodeIds.has(source)) continue
    for (const link of extractWikiLinks(content)) {
      if (!nodeIds.has(link)) {
        const parts = link.split('/')
        const fileName = parts.pop() ?? link
        const folderPath = parts.join('/')
        const parentId = ensureFolder(folderPath)
        nodes.push({ id: link, label: fileName, kind: 'file', parentFolder: parentId })
        nodeIds.add(link)
        links.push({ source: parentId, target: link, kind: 'contains' })
      }
      if (source !== link) {
        links.push({ source, target: link, kind: 'wiki' })
      }
    }
  }

  return { nodes, links }
}
