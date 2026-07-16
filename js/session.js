// Sessions: saving/loading the whole workspace (datasets + panels) as JSON.

const sessionInput    = document.getElementById('session-input')
const sessionTitleInput = document.getElementById('session-title')

function sessionFilename() {
  const name = sessionTitleInput.value.trim().replace(/[\\/:*?"<>|]+/g, '-')
  return name || 'quick-plot'
}

document.getElementById('save-session-btn').addEventListener('click', () => {
  const panels = [...plotArea.querySelectorAll('.panel')]
  const session = {
    version: 1,
    title: sessionTitleInput.value,
    datasets,
    panels: panels.map(p => ({
      left: p.offsetLeft, top: p.offsetTop,
      width: p.offsetWidth, height: p.offsetHeight,
      plotConfig: p._plotConfig ?? null,
      textConfig: p._textConfig ?? null,
    })),
  }
  const blob = new Blob([JSON.stringify(session)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${sessionFilename()}.json`
  a.click()
  URL.revokeObjectURL(a.href)
})

document.getElementById('load-session-btn').addEventListener('click', () => sessionInput.click())

sessionInput.addEventListener('change', () => {
  const file = sessionInput.files[0]
  if (!file) return
  file.text().then(text => {
    const session = JSON.parse(text)

    // Clear current state
    for (const p of [...plotArea.querySelectorAll('.panel')]) p.remove()
    for (const k of Object.keys(datasets)) delete datasets[k]
    loadedFiles.clear()
    fileList.innerHTML = ''
    sessionTitleInput.value = session.title ?? ''
    updateSpacer()

    // Restore datasets
    for (const [name, data] of Object.entries(session.datasets)) {
      datasets[name] = data
      addFileEntry(name)
    }

    // Restore panels
    for (const pd of session.panels) {
      const { panel, body } = spawnPanel(pd.left, pd.top, pd.width, pd.height)
      if (pd.plotConfig) {
        const cfg = pd.plotConfig
        // migrate old format
        if (!cfg.traces && cfg.xFile) {
          cfg.traces = (cfg.ySignals ?? []).map(([yFile, yCol], i) => ({
            xFile: cfg.xFile, xCol: cfg.xCol, yFile, yCol,
            color: COLORS[i % COLORS.length],
          }))
        }
        panel._plotConfig = cfg
        showChart(body, panel, cfg.type, cfg.traces, cfg.opts)
      } else if (pd.textConfig) {
        initTextBody(panel, body, pd.textConfig)
      } else {
        initPanelBody(panel, body)
      }
    }

    updateSpacer()
  })
  sessionInput.value = ''
})
