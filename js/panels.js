// Panels: the plot canvas, the snap grid (position/size + background image),
// panel drag/resize/duplicate mechanics, and the New Plot / New Text buttons.

const plotArea = document.getElementById('plot')
const spacer   = document.getElementById('spacer')

function updateSpacer() {
  let maxX = 0, maxY = 0
  for (const p of plotArea.querySelectorAll('.panel')) {
    maxX = Math.max(maxX, p.offsetLeft + p.offsetWidth  + MARGIN)
    maxY = Math.max(maxY, p.offsetTop  + p.offsetHeight + MARGIN)
  }
  spacer.style.left = maxX + 'px'
  spacer.style.top  = maxY + 'px'
}

// CELL == GAP so a cell and the gutter after it are the same width — every
// square of the background grid is the same size, and every multiple of
// CELL from MARGIN is a valid line, so position and size can both snap to
// the same single-unit grid (drag/resize moves exactly one square at a time).
const CELL   = 18    // grid unit — also the drag/resize snap increment
const GAP    = 18    // visual gap left between auto-packed panels
const MARGIN = 24

function snapPos(v)  { return MARGIN + Math.round((v - MARGIN) / CELL) * CELL }
function snapSize(v) { return Math.max(CELL, Math.round(v / CELL) * CELL) }
// Pixel size spanning `n` grid cells with gutters between them — a multiple
// of CELL, so it always lands exactly on a grid line like snapSize() does.
function cellsToPx(n) { return n * CELL + (n - 1) * GAP }

function setGhostColor(ghost, invalid) {
  ghost.style.background = invalid ? 'rgba(239,68,68,0.08)' : 'rgba(14,165,233,0.08)'
  ghost.style.borderColor = invalid ? 'rgba(239,68,68,0.4)' : 'rgba(14,165,233,0.4)'
}

// True if a w×h rectangle at (x,y) would overlap any existing panel.
// `exclude` skips a panel against its own siblings (for drag/resize checks);
// `gap` pads panels' bottom/right edges outward, so a free-position search
// lands with breathing room instead of edges touching.
function rectOverlapsPanels(x, y, w, h, { exclude = null, gap = 0 } = {}) {
  return [...plotArea.querySelectorAll('.panel')].some(p => {
    if (p === exclude) return false
    const right  = p.offsetLeft + p.offsetWidth  + gap
    const bottom = p.offsetTop  + p.offsetHeight + gap
    return x < right && x + w > p.offsetLeft && y < bottom && y + h > p.offsetTop
  })
}

function overlapsAny(panel, x, y, w, h) {
  return rectOverlapsPanels(x, y, w, h, { exclude: panel })
}

function findFreePosition(w, h) {
  const maxX = plotArea.offsetWidth - w - MARGIN

  for (let y = MARGIN; y < 4000; y += CELL) {
    for (let x = MARGIN; x <= maxX; x += CELL) {
      if (!rectOverlapsPanels(x, y, w, h, { gap: GAP })) return { x, y }
    }
  }
  return { x: MARGIN, y: MARGIN }
}

function spawnPanel(x, y, w, h) {
  const panel = document.createElement('div')
  panel.className = 'panel'
  panel.style.width  = w + 'px'
  panel.style.height = h + 'px'
  panel.style.left   = x + 'px'
  panel.style.top    = y + 'px'

  const header = document.createElement('div')
  header.className = 'panel-header'

  const editBtn = document.createElement('button')
  editBtn.className = 'edit-btn'
  editBtn.textContent = 'EDIT'
  editBtn.title = 'Edit plot'
  editBtn.addEventListener('mousedown', e => e.stopPropagation())
  editBtn.addEventListener('click', () => showSignalSelect(body, panel, panel._plotType))
  header.appendChild(editBtn)

  const deleteBtn = document.createElement('button')
  deleteBtn.className = 'delete-panel-btn'
  deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12"/><path d="M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"/></svg>'
  deleteBtn.title = 'Delete'
  deleteBtn.addEventListener('mousedown', e => e.stopPropagation())
  deleteBtn.addEventListener('click', () => { panel.remove(); updateSpacer() })
  header.appendChild(deleteBtn)

  const body = document.createElement('div')
  body.className = 'panel-body'

  panel.appendChild(header)
  panel.appendChild(body)
  plotArea.appendChild(panel)
  updateSpacer()

  panel._editBtn = editBtn

  wirePanelResize(panel)
  wirePanelDrag(panel, header)

  panel.addEventListener('mouseenter', () => { hoveredPanel = panel; panel.classList.add('hovered') })
  panel.addEventListener('mouseleave', () => { if (hoveredPanel === panel) hoveredPanel = null; panel.classList.remove('hovered') })

  return { panel, body }
}

// Snaps the panel to the grid as the user resizes it (native CSS `resize`),
// showing a ghost outline at the snapped size and reverting on release if it
// would overlap another panel.
function wirePanelResize(panel) {
  const resizeGhost = document.createElement('div')
  resizeGhost.className = 'panel-ghost'
  let resizing = false
  let mouseDown = false
  let origW, origH
  let resizeBlocker = null

  panel.addEventListener('mousedown', () => mouseDown = true)

  new ResizeObserver(() => {
    if (!mouseDown) return
    if (!resizing) {
      resizing = true
      origW = panel.offsetWidth
      origH = panel.offsetHeight
      resizeGhost.style.left = panel.style.left
      resizeGhost.style.top  = panel.style.top
      plotArea.appendChild(resizeGhost)
      // Same trick as panel dragging: block mousemove from reaching a
      // Plotly gl3d canvas underneath so resizing over it can't be read
      // as an orbit-rotate gesture.
      resizeBlocker = document.createElement('div')
      resizeBlocker.className = 'drag-blocker'
      resizeBlocker.style.cursor = 'nwse-resize'
      document.body.appendChild(resizeBlocker)
    }
    const w = snapSize(panel.offsetWidth)
    const h = snapSize(panel.offsetHeight)
    resizeGhost.style.width  = w + 'px'
    resizeGhost.style.height = h + 'px'
    setGhostColor(resizeGhost, overlapsAny(panel, panel.offsetLeft, panel.offsetTop, w, h))
  }).observe(panel)

  document.addEventListener('mouseup', () => {
    mouseDown = false
    if (!resizing) return
    const w = parseInt(resizeGhost.style.width)
    const h = parseInt(resizeGhost.style.height)
    if (!overlapsAny(panel, panel.offsetLeft, panel.offsetTop, w, h)) {
      panel.style.width  = w + 'px'
      panel.style.height = h + 'px'
    } else {
      panel.style.width  = origW + 'px'
      panel.style.height = origH + 'px'
    }
    resizeGhost.remove()
    resizeBlocker.remove()
    resizeBlocker = null
    resizing = false
    updateSpacer()
  })
}

// Drags the panel by its header, snapping to the grid, auto-scrolling the
// canvas when the cursor nears an edge, and reverting on drop if the new
// position would overlap another panel.
function wirePanelDrag(panel, header) {
  header.addEventListener('mousedown', e => {
    const startX = e.clientX + plotArea.scrollLeft - panel.offsetLeft
    const startY = e.clientY + plotArea.scrollTop  - panel.offsetTop

    const dragGhost = document.createElement('div')
    dragGhost.className = 'panel-ghost'
    dragGhost.style.width  = panel.offsetWidth  + 'px'
    dragGhost.style.height = panel.offsetHeight + 'px'
    dragGhost.style.left   = panel.style.left
    dragGhost.style.top    = panel.style.top
    plotArea.appendChild(dragGhost)

    // Sits above every panel (including 3D chart canvases) so mousemove
    // during the drag can't reach a Plotly gl3d canvas and get read as an
    // orbit-rotate gesture — Plotly rotates on any mousemove with the
    // button held, regardless of where the drag actually started.
    const blocker = document.createElement('div')
    blocker.className = 'drag-blocker'
    document.body.appendChild(blocker)

    let mouseX = e.clientX, mouseY = e.clientY

    const ZONE = 60, MAX_SPEED = 16
    const scrollTimer = setInterval(() => {
      const r = plotArea.getBoundingClientRect()
      const dx = mouseX > r.right  - ZONE ? Math.ceil((mouseX - (r.right  - ZONE)) / ZONE * MAX_SPEED)
               : mouseX < r.left   + ZONE ? Math.ceil((mouseX - (r.left   + ZONE)) / ZONE * MAX_SPEED) : 0
      const dy = mouseY > r.bottom - ZONE ? Math.ceil((mouseY - (r.bottom - ZONE)) / ZONE * MAX_SPEED)
               : mouseY < r.top    + ZONE ? Math.ceil((mouseY - (r.top    + ZONE)) / ZONE * MAX_SPEED) : 0
      if (dx || dy) {
        plotArea.scrollLeft += dx
        plotArea.scrollTop  += dy
        const x = Math.max(MARGIN, snapPos(mouseX + plotArea.scrollLeft - startX))
        const y = Math.max(MARGIN, snapPos(mouseY + plotArea.scrollTop  - startY))
        dragGhost.style.left = x + 'px'
        dragGhost.style.top  = y + 'px'
        updateSpacer()
      }
    }, 16)

    function onMove(e) {
      mouseX = e.clientX
      mouseY = e.clientY
      const x = Math.max(MARGIN, snapPos(e.clientX + plotArea.scrollLeft - startX))
      const y = Math.max(MARGIN, snapPos(e.clientY + plotArea.scrollTop  - startY))
      dragGhost.style.left = x + 'px'
      dragGhost.style.top  = y + 'px'
      setGhostColor(dragGhost, overlapsAny(panel, x, y, panel.offsetWidth, panel.offsetHeight))
    }
    function onUp() {
      clearInterval(scrollTimer)
      const x = parseInt(dragGhost.style.left)
      const y = parseInt(dragGhost.style.top)
      if (!overlapsAny(panel, x, y, panel.offsetWidth, panel.offsetHeight)) {
        panel.style.left = x + 'px'
        panel.style.top  = y + 'px'
      }
      dragGhost.remove()
      blocker.remove()
      updateSpacer()
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  })
}

let hoveredPanel = null

function findPositionNextTo(src, w, h) {
  const isFree = (x, y) => x >= MARGIN && y >= MARGIN && !rectOverlapsPanels(x, y, w, h, { gap: GAP })

  // Try positions to the right of src at the same y, then sweep downward
  const startX = snapPos(src.offsetLeft + src.offsetWidth + GAP)
  const startY = snapPos(src.offsetTop)
  for (let row = 0; row < 60; row++) {
    const y = startY + row * CELL
    const xBegin = row === 0 ? startX : MARGIN
    for (let x = xBegin; x < xBegin + 8000; x += CELL) {
      if (isFree(x, y)) return { x, y }
    }
  }
  return findFreePosition(w, h)
}

document.addEventListener('keydown', e => {
  if (e.key === 'd' && (e.ctrlKey || e.metaKey) && hoveredPanel) {
    e.preventDefault()
    const src = hoveredPanel
    const { x, y } = findPositionNextTo(src, src.offsetWidth, src.offsetHeight)
    const { panel, body } = spawnPanel(x, y, src.offsetWidth, src.offsetHeight)
    if (src._plotConfig) {
      const cfg = src._plotConfig
      panel._plotConfig = { ...cfg, traces: cfg.traces.map(t => ({ ...t })), opts: { ...cfg.opts } }
      showChart(body, panel, cfg.type, cfg.traces, cfg.opts)
    } else if (src._textConfig) {
      // Read live innerHTML directly to capture any unsaved formatting
      const liveDiv = src.querySelector('.text-panel-area')
      const latestHtml = liveDiv ? liveDiv.innerHTML : (src._textConfig.html ?? '')
      initTextBody(panel, body, { ...src._textConfig, html: latestHtml })
    } else {
      initPanelBody(panel, body)
    }
  }
})

const newPanelBtn = document.getElementById('new-panel-btn')
newPanelBtn.addEventListener('click', () => {
  const panelW = cellsToPx(20)
  const panelH = cellsToPx(14)
  const { x, y } = findFreePosition(panelW, panelH)
  const { panel, body } = spawnPanel(x, y, panelW, panelH)
  initPanelBody(panel, body)
})

document.getElementById('new-text-btn').addEventListener('click', () => {
  const panelW = cellsToPx(12)
  const panelH = cellsToPx(9)
  const { x, y } = findFreePosition(panelW, panelH)
  const { panel, body } = spawnPanel(x, y, panelW, panelH)
  initTextBody(panel, body)
})

// Position and size both snap to multiples of CELL from MARGIN (see
// snapPos/snapSize/cellsToPx above), so a single repeating line every
// CELL px hits every panel edge — and drag/resize moves exactly one square.
function buildGridImage() {
  const line = settings.darkMode ? 'rgba(244,244,245,0.08)' : 'rgba(24,24,27,0.07)'
  return `linear-gradient(to right, ${line} 1px, transparent 1px),` +
         `linear-gradient(to bottom, ${line} 1px, transparent 1px)`
}

const gridSettingInput = document.getElementById('setting-grid')
plotArea.style.backgroundSize = `${CELL}px ${CELL}px`
plotArea.style.backgroundPosition = `${MARGIN}px ${MARGIN}px`
plotArea.style.backgroundAttachment = 'local'

function applyGridVisibility() {
  plotArea.style.backgroundImage = settings.showGrid ? buildGridImage() : 'none'
}
gridSettingInput.checked = settings.showGrid
applyGridVisibility()
gridSettingInput.addEventListener('change', () => {
  settings.showGrid = gridSettingInput.checked
  applyGridVisibility()
})
