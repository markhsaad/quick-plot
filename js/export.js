// Export: the "Export panel borders" setting and the Export HTML button,
// which serializes the current panels into a standalone, self-contained page.

const exportBordersInput = document.getElementById('setting-export-borders')
exportBordersInput.checked = settings.exportBorders
exportBordersInput.addEventListener('change', () => {
  settings.exportBorders = exportBordersInput.checked
  localStorage.setItem('quick-plot-export-borders', settings.exportBorders ? '1' : '0')
})

document.getElementById('export-btn').addEventListener('click', () => {
  const panels = [...plotArea.querySelectorAll('.panel')]
  if (!panels.length) return

  let maxX = 0, maxY = 0
  for (const p of panels) {
    maxX = Math.max(maxX, p.offsetLeft + p.offsetWidth  + MARGIN)
    maxY = Math.max(maxY, p.offsetTop  + p.offsetHeight + MARGIN)
  }

  let panelHTML = ''
  let initScripts = ''
  const chartTheme = plotlyThemeColors()

  panels.forEach((panel, i) => {
    const cfg  = panel._plotConfig
    const tcfg = panel._textConfig
    const left = panel.offsetLeft, top = panel.offsetTop
    const width = panel.offsetWidth, height = panel.offsetHeight

    if (tcfg) {
      // Convert <font> presentational elements to <span style="..."> so
      // inline styles on children correctly override ancestor inherited styles
      const tmp = document.createElement('div')
      tmp.innerHTML = tcfg.html ?? ''
      for (const font of [...tmp.querySelectorAll('font')]) {
        const span = document.createElement('span')
        if (font.face)             span.style.fontFamily = font.face
        if (font.color)            span.style.color      = font.color
        if (font.style.fontSize)   span.style.fontSize   = font.style.fontSize
        while (font.firstChild) span.appendChild(font.firstChild)
        font.replaceWith(span)
      }
      const content = tmp.innerHTML

      const defaultStyle = [
        `font-family:${(tcfg.font ?? 'sans-serif').replace(/"/g, "'")}`,
        `font-size:${tcfg.size ?? 14}px`,
        `color:${tcfg.color ?? cssVar('--text')}`,
        'line-height:1.6',
      ].join(';')

      panelHTML += `
    <div class="panel" style="left:${left}px;top:${top}px;width:${width}px;height:${height}px">
      <div class="panel-body text-body" style="${defaultStyle};padding:10px 12px;overflow-y:auto;word-wrap:break-word;white-space:pre-wrap">${content}</div>
    </div>`
    } else {
      panelHTML += `
    <div class="panel" style="left:${left}px;top:${top}px;width:${width}px;height:${height}px">
      <div class="panel-body"><div id="c${i}" class="panel-chart"></div></div>
    </div>`

      if (cfg) {
        const exportTypeDef = PlotTypes.get(cfg.type)
        const exportTraces = (cfg.traces ?? []).map(entry => exportTypeDef.buildTrace(entry, getColumn, cfg.opts ?? {}))
        const exportShowGrid = exportTypeDef.supportsGrid ? (cfg.opts?.showGrid ?? true) : true
        const layout = exportTypeDef.buildLayout({
          opts: cfg.opts ?? {},
          theme: chartTheme,
          showGrid: exportShowGrid,
          traceCount: (cfg.traces ?? []).length,
        })
        initScripts += `\n  Plotly.newPlot('c${i}',${JSON.stringify(exportTraces)},${JSON.stringify(layout)},{responsive:true});`
      }
    }
  })

  const exportTitle = (sessionTitleInput.value.trim() || 'Quick Plot Export')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')

  // Read straight from the live stylesheet (see cssVar in theme.js) rather
  // than duplicating another light/dark hex table here — one source of truth.
  const bg = cssVar('--bg')
  const scrollbarThumb = cssVar('--border-strong')
  const scrollbarThumbHover = cssVar('--text-faint')

  const panelBorderCSS = settings.exportBorders
    ? `border: 1px solid ${cssVar('--border')}; box-shadow: ${cssVar('--shadow-sm')};`
    : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${exportTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Crimson+Text&family=DM+Mono&family=DM+Sans&family=EB+Garamond&family=Fira+Code&family=IBM+Plex+Mono&family=IBM+Plex+Sans&family=IBM+Plex+Serif&family=Inter&family=Josefin+Sans&family=Lato&family=Libre+Baskerville&family=Lora&family=Merriweather&family=Montserrat&family=Nunito&family=Open+Sans&family=Oswald&family=Playfair+Display&family=Poppins&family=PT+Mono&family=PT+Sans&family=PT+Serif&family=Raleway&family=Roboto&family=Roboto+Mono&family=Roboto+Slab&family=Rubik&family=Source+Code+Pro&family=Source+Sans+3&family=Space+Grotesk&family=Space+Mono&family=Ubuntu&family=Ubuntu+Mono&display=swap" rel="stylesheet">
  <script src="https://cdn.plot.ly/plotly-2.35.2.min.js" defer><\/script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    * { scrollbar-width: thin; scrollbar-color: ${scrollbarThumb} transparent; }
    *::-webkit-scrollbar { width: 10px; height: 10px; }
    *::-webkit-scrollbar-track { background: transparent; }
    *::-webkit-scrollbar-thumb { background-color: ${scrollbarThumb}; background-clip: padding-box; border: 2px solid transparent; border-radius: 999px; }
    *::-webkit-scrollbar-thumb:hover { background-color: ${scrollbarThumbHover}; }
    *::-webkit-scrollbar-corner { background: transparent; }
    html, body { background: ${bg}; min-height: 100%; }
    body { font-family: sans-serif; }
    #canvas { position: relative; width: ${maxX}px; height: ${maxY}px; }
    .panel { position: absolute; background: ${bg}; ${panelBorderCSS} border-radius: 10px; display: flex; flex-direction: column; }
    .panel-body { flex: 1; position: relative; }
    .panel-chart { position: absolute; inset: 0; }
    .text-body { padding: 10px 12px; overflow-y: auto; word-wrap: break-word; line-height: 1.6; }
  </style>
</head>
<body>
  <div id="canvas">${panelHTML}
  </div>
  <script>
    // Plotly loads with defer (so it doesn't block this page's first paint
    // either) — DOMContentLoaded only fires after deferred scripts run, so
    // Plotly is guaranteed defined here.
    document.addEventListener('DOMContentLoaded', () => {${initScripts}
    })
  <\/script>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${sessionFilename()}.html`
  a.click()
  URL.revokeObjectURL(a.href)
})
