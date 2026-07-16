// Plot editor: the plot-type picker, the signal-picker modal, and the
// plot-editing form (showSignalSelect) — all driven generically by the
// registered PlotTypes so none of it special-cases a specific plot type —
// plus showChart, which renders the actual Plotly chart from the form's output.

// Panel content — new panels start on the type picker, not a specific type.
function initPanelBody(panel, body) {
  showPlotTypePicker(body, panel)
}

function showPlotTypePicker(body, panel) {
  if (panel._editBtn) panel._editBtn.style.display = 'none'
  body.innerHTML = ''

  if (allSignals().length === 0) {
    body.appendChild(makeNoDataMessage())
    return
  }

  const picker = document.createElement('div')
  picker.className = 'plot-type-picker'
  for (const t of PlotTypes.list()) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'plot-type-option'
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg><span>${t.label}</span>`
    btn.addEventListener('click', () => showSignalSelect(body, panel, t.key))
    picker.appendChild(btn)
  }
  body.appendChild(picker)
}

// Shown in place of the type picker / editing form whenever there's nothing
// to plot yet — used by both showPlotTypePicker and showSignalSelect.
function makeNoDataMessage() {
  const setup = document.createElement('div')
  setup.className = 'panel-setup'
  setup.innerHTML = '<p>No data loaded. Import a CSV first.</p>'
  return setup
}

const COLORS = ['#3b82f6','#ef4444','#22c55e','#f97316','#a855f7','#14b8a6','#ec4899','#eab308']

function makeField(labelText, el) {
  const wrap = document.createElement('div')
  wrap.className = 'form-field'
  const lbl = document.createElement('span')
  lbl.className = 'form-label'
  lbl.textContent = labelText
  wrap.appendChild(lbl)
  wrap.appendChild(el)
  return wrap
}

function makeLimitInput(value) {
  const input = document.createElement('input')
  input.className = 'form-input'
  input.type = 'number'
  input.placeholder = 'Auto'
  input.step = 'any'
  if (value !== undefined && value !== null) input.value = value
  return input
}

function makeRangeField(labelText, minInput, maxInput) {
  const wrap = document.createElement('div')
  wrap.className = 'form-field'
  const lbl = document.createElement('span')
  lbl.className = 'form-label'
  lbl.textContent = labelText
  const row = document.createElement('div')
  row.className = 'range-row'
  const sep = document.createElement('span')
  sep.className = 'range-row-sep'
  sep.textContent = '–'
  row.appendChild(minInput)
  row.appendChild(sep)
  row.appendChild(maxInput)
  wrap.appendChild(lbl)
  wrap.appendChild(row)
  return wrap
}

// Flags a range pair red when it's incomplete-but-malformed (e.g. a lone
// "-") or when min isn't actually less than max — empty fields stay valid
// since they just mean "auto". Errors are read back from the DOM at submit
// time (see showSignalSelect's Plot button) rather than tracked separately,
// so there's a single source of truth for "is anything currently invalid".
function wireRangeValidation(minInput, maxInput) {
  const validate = () => {
    const minStr = minInput.value.trim()
    const maxStr = maxInput.value.trim()
    const minVal = minStr === '' ? undefined : parseFloat(minStr)
    const maxVal = maxStr === '' ? undefined : parseFloat(maxStr)
    const minBad = minStr !== '' && !Number.isFinite(minVal)
    const maxBad = maxStr !== '' && !Number.isFinite(maxVal)
    const rangeBad = !minBad && !maxBad && minVal !== undefined && maxVal !== undefined && minVal >= maxVal
    minInput.classList.toggle('input-error', minBad || rangeBad)
    maxInput.classList.toggle('input-error', maxBad || rangeBad)
  }
  minInput.addEventListener('input', validate)
  maxInput.addEventListener('input', validate)
}

// Builds one Advanced-settings input from a plot type's `extraOptions` entry
// (see js/plot-types/line.js's interface contract, and histogram.js for an
// example) — a number field or a select, generically, so plot-editor.js
// never needs to know what "bin width" or "normalization" mean.
function makeExtraOptionInput(field, value) {
  if (field.type === 'select') {
    const select = document.createElement('select')
    select.className = 'form-select'
    for (const [v, label] of field.options) select.appendChild(new Option(label, v))
    select.value = value ?? field.default ?? field.options[0][0]
    return select
  }
  const input = document.createElement('input')
  input.className = 'form-input'
  input.type = 'number'
  input.step = 'any'
  input.placeholder = field.placeholder ?? ''
  if (value !== undefined && value !== null) input.value = value
  return input
}

function makePlaceholderOption(text) {
  const opt = new Option(text, '')
  opt.disabled = true
  opt.hidden = true
  return opt
}

function makeDataOption(name) {
  const opt = new Option(name, name)
  opt.style.color = 'var(--text)'
  return opt
}

// Native <select> boxes only reliably reflect a per-option color in the
// closed state in some browsers, so the select's own color is the source
// of truth for the placeholder look; individual options stay dark so the
// open dropdown list doesn't gray out entirely.
function updateSelectPlaceholderColor(select) {
  select.style.color = select.value ? 'var(--text)' : 'var(--text-faint)'
}

function openSignalModal(title, multi, currentSelection, onConfirm, fileFilter) {
  const signals = fileFilter ? allSignals().filter(s => s.file === fileFilter) : allSignals()
  if (!signals.length) return

  const selected = new Set(currentSelection)

  const overlay = document.createElement('div')
  overlay.className = 'signal-modal-overlay'

  const modal = document.createElement('div')
  modal.className = 'signal-modal'

  const header = document.createElement('div')
  header.className = 'signal-modal-header'
  const headerTitle = document.createElement('span')
  headerTitle.textContent = title
  const closeBtn = document.createElement('button')
  closeBtn.className = 'signal-modal-close'
  closeBtn.textContent = '✕'
  closeBtn.addEventListener('click', () => overlay.remove())
  header.appendChild(headerTitle)
  header.appendChild(closeBtn)

  const searchWrap = document.createElement('div')
  searchWrap.className = 'signal-modal-search'
  const searchInput = document.createElement('input')
  searchInput.placeholder = 'Search signals…'
  searchWrap.appendChild(searchInput)

  const listEl = document.createElement('div')
  listEl.className = 'signal-modal-list'

  const footer = document.createElement('div')
  footer.className = 'signal-modal-footer'
  const cancelBtn = document.createElement('button')
  cancelBtn.className = 'modal-cancel-btn'
  cancelBtn.textContent = 'Cancel'
  cancelBtn.addEventListener('click', () => overlay.remove())
  const confirmBtn = document.createElement('button')
  confirmBtn.className = 'modal-confirm-btn'
  confirmBtn.textContent = 'Confirm'
  confirmBtn.addEventListener('click', () => { onConfirm([...selected]); overlay.remove() })
  footer.appendChild(cancelBtn)
  footer.appendChild(confirmBtn)

  modal.appendChild(header)
  modal.appendChild(searchWrap)
  modal.appendChild(listEl)
  modal.appendChild(footer)
  overlay.appendChild(modal)

  const groups = {}
  for (const s of signals) {
    if (!groups[s.file]) groups[s.file] = []
    groups[s.file].push(s)
  }

  function renderList(q) {
    listEl.innerHTML = ''
    for (const [file, sigs] of Object.entries(groups)) {
      const filtered = q ? sigs.filter(s => s.col.toLowerCase().includes(q) || file.toLowerCase().includes(q)) : sigs
      if (!filtered.length) continue

      const groupLabel = document.createElement('div')
      groupLabel.className = 'signal-group-label'
      groupLabel.textContent = file
      listEl.appendChild(groupLabel)

      for (const s of filtered) {
        const key = `${s.file}::${s.col}`
        const item = document.createElement('div')
        item.className = 'signal-item' + (selected.has(key) ? ' selected' : '')

        const check = document.createElement('div')
        check.className = `signal-item-check ${multi ? 'multi' : 'single'}`

        const name = document.createElement('span')
        name.className = 'signal-item-name'
        name.textContent = s.col

        item.appendChild(check)
        item.appendChild(name)
        item.addEventListener('click', () => {
          if (multi) {
            if (selected.has(key)) { selected.delete(key); item.classList.remove('selected') }
            else { selected.add(key); item.classList.add('selected') }
          } else {
            selected.clear()
            selected.add(key)
            listEl.querySelectorAll('.signal-item').forEach(el => el.classList.remove('selected'))
            item.classList.add('selected')
          }
        })
        listEl.appendChild(item)
      }
    }
  }

  renderList('')
  searchInput.addEventListener('input', () => renderList(searchInput.value.toLowerCase().trim()))
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })

  document.body.appendChild(overlay)
  setTimeout(() => searchInput.focus(), 0)
}

function showSignalSelect(body, panel, type, carryTraces) {
  if (panel._editBtn) panel._editBtn.style.display = 'none'
  body.innerHTML = ''
  const cfg = panel._plotConfig
  const signals = allSignals()
  const typeDef = PlotTypes.get(type)
  const axes = typeDef.axes
  const firstAxis = axes[0]

  if (signals.length === 0) {
    body.appendChild(makeNoDataMessage())
    return
  }

  const form = document.createElement('div')
  form.className = 'panel-form'

  // Plot-type toggle — one button per registered type, so a new plot type
  // registered elsewhere shows up here automatically.
  const toggleWrap = document.createElement('div')
  toggleWrap.className = 'plot-type-toggle'
  for (const t of PlotTypes.list()) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'toggle-btn' + (t.key === type ? ' active' : '')
    btn.textContent = t.label
    btn.addEventListener('click', () => { if (t.key !== type) showSignalSelect(body, panel, t.key, traceData) })
    toggleWrap.appendChild(btn)
  }
  form.appendChild(toggleWrap)

  // Title
  const titleInput = document.createElement('input')
  titleInput.className = 'form-input'
  titleInput.placeholder = 'e.g. Speed over Time'
  titleInput.value = cfg?.opts?.title ?? ''
  form.appendChild(makeField('Title', titleInput))

  // One axis label input per axis this plot type declares
  const labelInputs = {}
  for (const axis of axes) {
    const input = document.createElement('input')
    input.className = 'form-input'
    input.placeholder = `${axis.toUpperCase()} axis label`
    input.value = cfg?.opts?.[`${axis}Label`] ?? ''
    labelInputs[axis] = input
    form.appendChild(makeField(`${axis.toUpperCase()} Label`, input))
  }


  const advanced = document.createElement('details')
  advanced.className = 'advanced-details'
  advanced.open = panel._advancedOpen ?? false
  advanced.addEventListener('toggle', () => { panel._advancedOpen = advanced.open })
  const advancedSummary = document.createElement('summary')
  advancedSummary.className = 'advanced-toggle'
  advancedSummary.textContent = 'Advanced settings'
  advanced.appendChild(advancedSummary)

  const advancedBody = document.createElement('div')
  advancedBody.className = 'advanced-body'

  let showGridInput
  if (typeDef.supportsGrid) {
    const gridRow = document.createElement('label')
    gridRow.className = 'setting-row'
    const gridLabelText = document.createElement('span')
    gridLabelText.textContent = 'Show grid'
    showGridInput = document.createElement('input')
    showGridInput.type = 'checkbox'
    showGridInput.className = 'switch'
    showGridInput.checked = cfg?.opts?.showGrid ?? true
    gridRow.appendChild(gridLabelText)
    gridRow.appendChild(showGridInput)
    advancedBody.appendChild(gridRow)
  }

  // Type-specific settings (e.g. histogram's bin width/normalization)
  const extraInputs = {}
  for (const field of typeDef.extraOptions ?? []) {
    const input = makeExtraOptionInput(field, cfg?.opts?.[field.key])
    extraInputs[field.key] = { field, input }
    advancedBody.appendChild(makeField(field.label, input))
  }

  // One min/max range field per axis
  const rangeInputs = {}
  for (const axis of axes) {
    const minInput = makeLimitInput(cfg?.opts?.[`${axis}Min`])
    const maxInput = makeLimitInput(cfg?.opts?.[`${axis}Max`])
    wireRangeValidation(minInput, maxInput)
    rangeInputs[axis] = { min: minInput, max: maxInput }
    advancedBody.appendChild(makeRangeField(`${axis.toUpperCase()} Range`, minInput, maxInput))
  }

  advanced.appendChild(advancedBody)
  form.appendChild(advanced)

  // Build initial trace data from existing config (with old-format migration)
  let traceData = []
  if (carryTraces) {
    traceData = carryTraces.map(t => ({ ...t }))
  } else if (cfg?.traces) {
    traceData = cfg.traces.map(t => ({ ...t }))
  } else if (cfg?.xFile) {
    traceData = (cfg.ySignals ?? []).map(([yFile, yCol], i) => ({
      xFile: cfg.xFile, xCol: cfg.xCol, yFile, yCol,
      color: COLORS[i % COLORS.length],
    }))
  }
  if (!traceData.length) {
    const base = { color: COLORS[0], dash: 'solid' }
    for (const axis of axes) { base[`${axis}File`] = ''; base[`${axis}Col`] = '' }
    traceData.push(base)
  }
  // Backfill any axis fields missing from carried-over/legacy trace rows —
  // e.g. switching 2D -> 3D adds a z axis that older rows don't have yet.
  for (const t of traceData) {
    for (const axis of axes) {
      if (t[`${axis}File`] === undefined) { t[`${axis}File`] = ''; t[`${axis}Col`] = '' }
    }
  }

  // Traces section header
  const sectionHeader = document.createElement('div')
  sectionHeader.className = 'trace-section-header'
  const sectionLabel = document.createElement('span')
  sectionLabel.className = 'form-label'
  sectionLabel.textContent = 'Traces'
  sectionHeader.appendChild(sectionLabel)
  form.appendChild(sectionHeader)

  // Column labels above trace rows — one per axis, plus the fixed Dataset column
  const colLabels = document.createElement('div')
  colLabels.className = 'trace-col-labels'
  const lDataset = document.createElement('span')
  lDataset.className = 'trace-col-label fixed'
  lDataset.textContent = 'Dataset'
  colLabels.appendChild(lDataset)
  for (const axis of axes) {
    const l = document.createElement('span')
    l.className = 'trace-col-label'
    l.textContent = `${axis.toUpperCase()} Signal`
    colLabels.appendChild(l)
  }
  // Empty spacers matching the color/style/remove columns so the flex
  // distribution (and thus alignment) exactly mirrors the trace rows below
  const spacerColor = document.createElement('span')
  spacerColor.className = 'trace-col-label spacer-color'
  colLabels.appendChild(spacerColor)
  if (typeDef.supportsDash) {
    const spacerStyle = document.createElement('span')
    spacerStyle.className = 'trace-col-label fixed'
    colLabels.appendChild(spacerStyle)
  }
  const spacerRemove = document.createElement('span')
  spacerRemove.className = 'trace-col-label spacer-remove'
  colLabels.appendChild(spacerRemove)
  form.appendChild(colLabels)

  const traceRows = document.createElement('div')
  traceRows.className = 'trace-rows'

  const DASH_STYLES = [
    ['solid', 'Line'],
    ['dash', 'Dashed'],
    ['dot', 'Dotted'],
    ['dashdot', 'Dash-Dot'],
    ['longdash', 'Long Dash'],
    ['longdashdot', 'Long Dash-Dot'],
  ]

  function makeTraceRow(td) {
    const row = document.createElement('div')
    row.className = 'trace-row'

    // Dataset select — scopes which file the first axis's signal is pulled from
    const datasetSelect = document.createElement('select')
    datasetSelect.className = 'form-select trace-dataset-select'
    const refreshDatasetOptions = () => {
      datasetSelect.innerHTML = ''
      datasetSelect.appendChild(makePlaceholderOption('Dataset…'))
      for (const name of Object.keys(datasets)) datasetSelect.appendChild(makeDataOption(name))
      datasetSelect.value = td[`${firstAxis}File`] && datasets[td[`${firstAxis}File`]] ? td[`${firstAxis}File`] : ''
      updateSelectPlaceholderColor(datasetSelect)
    }
    refreshDatasetOptions()

    // One signal picker per axis — all modal-based, all scoped to the chosen
    // dataset (the first axis's file, set via datasetSelect above).
    const pickers = {}
    const firstFileKey = `${firstAxis}File`
    function makeAxisPicker(axis) {
      const fileKey = `${axis}File`, colKey = `${axis}Col`
      let sel = td[fileKey] && td[colKey] ? [`${td[fileKey]}::${td[colKey]}`] : []
      const picker = document.createElement('div')
      picker.className = 'signal-picker'
      const label = axis.toUpperCase()
      const refresh = () => {
        picker.textContent = sel.length ? sel[0].split('::')[1] : `${label}…`
        picker.style.color = sel.length ? 'var(--text)' : 'var(--text-faint)'
      }
      refresh()
      picker.addEventListener('click', () => {
        if (!td[firstFileKey]) return
        openSignalModal(`Select ${label} Signal`, false, sel, chosen => {
          sel = chosen
          if (chosen.length) { const [f, c] = chosen[0].split('::'); td[fileKey] = f; td[colKey] = c }
          refresh()
        }, td[firstFileKey])
      })
      pickers[axis] = { refresh, clearSelection: () => { sel = []; refresh() } }
      return picker
    }
    const axisPickers = axes.map(axis => makeAxisPicker(axis))

    datasetSelect.addEventListener('change', () => {
      td[firstFileKey] = datasetSelect.value
      td[`${firstAxis}Col`] = ''
      pickers[firstAxis].clearSelection()
      // Every other axis is scoped to this same dataset, so a stale pick from
      // the previous dataset can't linger once the dataset changes.
      for (const axis of axes.slice(1)) {
        td[`${axis}File`] = ''
        td[`${axis}Col`] = ''
        pickers[axis].clearSelection()
      }
      updateSelectPlaceholderColor(datasetSelect)
    })

    // Color
    const colorInput = document.createElement('input')
    colorInput.type = 'color'
    colorInput.className = 'trace-color-input'
    colorInput.value = td.color ?? COLORS[0]
    colorInput.addEventListener('input',  () => { td.color = colorInput.value })
    colorInput.addEventListener('change', () => { td.color = colorInput.value })

    // Line style — only for plot types that actually draw a line (dash has
    // no meaning for e.g. a scatter's markers or a bar's fill).
    let styleSelect
    if (typeDef.supportsDash) {
      styleSelect = document.createElement('select')
      styleSelect.className = 'form-select trace-style-select'
      styleSelect.title = 'Line style'
      for (const [v, l] of DASH_STYLES) styleSelect.appendChild(new Option(l, v))
      styleSelect.value = td.dash ?? 'solid'
      styleSelect.addEventListener('change', () => { td.dash = styleSelect.value })
    }

    // Remove
    const removeBtn = document.createElement('button')
    removeBtn.className = 'trace-remove-btn'
    removeBtn.textContent = '✕'
    removeBtn.title = 'Remove trace'
    removeBtn.addEventListener('click', () => {
      const i = traceData.indexOf(td)
      if (i !== -1) traceData.splice(i, 1)
      row.remove()
    })

    row.appendChild(datasetSelect)
    for (const picker of axisPickers) row.appendChild(picker)
    row.appendChild(colorInput)
    if (styleSelect) row.appendChild(styleSelect)
    row.appendChild(removeBtn)
    return row
  }

  traceData.forEach(td => traceRows.appendChild(makeTraceRow(td)))
  form.appendChild(traceRows)

  // Add trace button
  const addBtn = document.createElement('button')
  addBtn.className = 'add-trace-btn'
  addBtn.textContent = '+ Add Trace'
  addBtn.addEventListener('click', () => {
    const last = traceData[traceData.length - 1]
    const newTd = { color: COLORS[traceData.length % COLORS.length], dash: 'solid' }
    // Only the first axis carries over from the previous trace (traces in one
    // panel are usually all from the same dataset) — every other axis starts blank.
    axes.forEach((axis, i) => {
      newTd[`${axis}File`] = i === 0 ? (last?.[`${axis}File`] ?? '') : ''
      newTd[`${axis}Col`]  = i === 0 ? (last?.[`${axis}Col`] ?? '')  : ''
    })
    traceData.push(newTd)
    traceRows.appendChild(makeTraceRow(newTd))
  })
  form.appendChild(addBtn)

  // Plot button
  const plotBtn = document.createElement('button')
  plotBtn.className = 'plot-btn'
  plotBtn.textContent = 'Plot'
  plotBtn.addEventListener('click', () => {
    if (form.querySelector('.input-error')) return
    const valid = traceData.filter(t => axes.every(axis => t[`${axis}File`] && t[`${axis}Col`]))
    if (!valid.length) return
    const parseLimit = input => {
      const v = parseFloat(input.value)
      return Number.isFinite(v) ? v : undefined
    }
    const opts = { title: titleInput.value }
    for (const axis of axes) {
      opts[`${axis}Label`] = labelInputs[axis].value
      opts[`${axis}Min`] = parseLimit(rangeInputs[axis].min)
      opts[`${axis}Max`] = parseLimit(rangeInputs[axis].max)
    }
    if (typeDef.supportsGrid) opts.showGrid = showGridInput.checked
    for (const { field, input } of Object.values(extraInputs)) {
      opts[field.key] = field.type === 'number' ? parseLimit(input) : input.value
    }
    panel._plotConfig = { type, traces: valid, opts }
    showChart(body, panel, type, valid, opts)
  })
  form.appendChild(plotBtn)
  body.appendChild(form)
}

function showChart(body, panel, type, traces, opts = {}) {
  panel._plotType = type
  if (panel._editBtn) panel._editBtn.style.display = 'block'
  body.innerHTML = ''
  const chartDiv = document.createElement('div')
  chartDiv.className = 'panel-chart'
  body.appendChild(chartDiv)

  const typeDef = PlotTypes.get(type)
  panel._chartDiv = chartDiv
  panel._plotTypeKey = type

  const plotTraces = traces.map(entry => typeDef.buildTrace(entry, getColumn, opts))
  const showGrid = typeDef.supportsGrid ? (opts.showGrid ?? true) : true
  const theme = plotlyThemeColors()
  const layout = typeDef.buildLayout({ opts, theme, showGrid, traceCount: traces.length })

  Plotly.newPlot(chartDiv, plotTraces, layout, { responsive: true })

  new ResizeObserver(() => Plotly.Plots.resize(chartDiv)).observe(body)
}
