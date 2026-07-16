// Text panel: the rich-text editor panel (toolbar + contentEditable area).

const FONT_GROUPS = [
  ['Sans-serif', [
    ['Inter',             'Inter, sans-serif'],
    ['System UI',         'system-ui, sans-serif'],
    ['DM Sans',           '"DM Sans", sans-serif'],
    ['IBM Plex Sans',     '"IBM Plex Sans", sans-serif'],
    ['Space Grotesk',     '"Space Grotesk", sans-serif'],
    ['Roboto',            'Roboto, sans-serif'],
    ['Open Sans',         '"Open Sans", sans-serif'],
    ['Lato',              'Lato, sans-serif'],
    ['Montserrat',        'Montserrat, sans-serif'],
    ['Poppins',           'Poppins, sans-serif'],
    ['Nunito',            'Nunito, sans-serif'],
    ['Raleway',           'Raleway, sans-serif'],
    ['PT Sans',           '"PT Sans", sans-serif'],
    ['Ubuntu',            'Ubuntu, sans-serif'],
    ['Source Sans 3',     '"Source Sans 3", sans-serif'],
    ['Rubik',             'Rubik, sans-serif'],
    ['Josefin Sans',      '"Josefin Sans", sans-serif'],
    ['Oswald',            'Oswald, sans-serif'],
    ['Arial',             'Arial, sans-serif'],
    ['Arial Black',       '"Arial Black", sans-serif'],
    ['Calibri',           'Calibri, sans-serif'],
    ['Century Gothic',    '"Century Gothic", sans-serif'],
    ['Gill Sans',         '"Gill Sans", sans-serif'],
    ['Segoe UI',          '"Segoe UI", sans-serif'],
    ['Tahoma',            'Tahoma, sans-serif'],
    ['Trebuchet MS',      '"Trebuchet MS", sans-serif'],
    ['Verdana',           'Verdana, sans-serif'],
    ['Helvetica',         'Helvetica, sans-serif'],
    ['Impact',            'Impact, sans-serif'],
  ]],
  ['Serif', [
    ['Playfair Display',  '"Playfair Display", serif'],
    ['Merriweather',      'Merriweather, serif'],
    ['Lora',              'Lora, serif'],
    ['EB Garamond',       '"EB Garamond", serif'],
    ['Crimson Text',      '"Crimson Text", serif'],
    ['Libre Baskerville', '"Libre Baskerville", serif'],
    ['PT Serif',          '"PT Serif", serif'],
    ['Roboto Slab',       '"Roboto Slab", serif'],
    ['IBM Plex Serif',    '"IBM Plex Serif", serif'],
    ['Georgia',           'Georgia, serif'],
    ['Times New Roman',   '"Times New Roman", serif'],
    ['Palatino',          'Palatino, serif'],
    ['Book Antiqua',      '"Book Antiqua", serif'],
    ['Cambria',           'Cambria, serif'],
    ['Constantia',        'Constantia, serif'],
    ['Garamond',          'Garamond, serif'],
  ]],
  ['Monospace', [
    ['Fira Code',         '"Fira Code", monospace'],
    ['Source Code Pro',   '"Source Code Pro", monospace'],
    ['Roboto Mono',       '"Roboto Mono", monospace'],
    ['IBM Plex Mono',     '"IBM Plex Mono", monospace'],
    ['DM Mono',           '"DM Mono", monospace'],
    ['Space Mono',        '"Space Mono", monospace'],
    ['PT Mono',           '"PT Mono", monospace'],
    ['Ubuntu Mono',       '"Ubuntu Mono", monospace'],
    ['Courier New',       '"Courier New", monospace'],
    ['Consolas',          'Consolas, monospace'],
    ['Menlo',             'Menlo, monospace'],
    ['Monaco',            'Monaco, monospace'],
    ['Lucida Console',    '"Lucida Console", monospace'],
  ]],
  ['Display', [
    ['Comic Sans MS',     '"Comic Sans MS", cursive'],
    ['Papyrus',           'Papyrus, cursive'],
    ['Copperplate',       'Copperplate, fantasy'],
  ]],
]

function initTextBody(panel, body, cfg = {}) {
  if (panel._editBtn) panel._editBtn.style.display = 'none'
  panel._panelType = 'text'
  body.innerHTML = ''
  body.style.display = 'flex'
  body.style.flexDirection = 'column'

  const config = {
    html:  cfg.html ?? (cfg.text ? cfg.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>') : ''),
    font:  cfg.font  ?? 'Inter, sans-serif',
    size:  cfg.size  ?? 14,
    color: cfg.color ?? cssVar('--text'),
  }

  const save = () => { panel._textConfig = { ...config, html: contentDiv.innerHTML } }

  // Save/restore selection across toolbar focus loss
  let savedRange = null
  const saveSelection = () => {
    const sel = window.getSelection()
    if (sel.rangeCount > 0 && contentDiv.contains(sel.anchorNode))
      savedRange = sel.getRangeAt(0).cloneRange()
  }
  const restoreFocus = () => {
    contentDiv.focus()
    if (savedRange) {
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(savedRange)
    }
  }

  const toolbar = document.createElement('div')
  toolbar.className = 'text-toolbar'
  toolbar.addEventListener('mousedown', e => { e.stopPropagation(); saveSelection() })

  const fontSel = document.createElement('select')
  fontSel.className = 'text-tool-select'
  FONT_GROUPS.forEach(([groupLabel, fonts]) => {
    const grp = document.createElement('optgroup')
    grp.label = groupLabel
    fonts.forEach(([l, v]) => grp.appendChild(new Option(l, v)))
    fontSel.appendChild(grp)
  })
  fontSel.value = config.font

  const sizeInput = document.createElement('input')
  sizeInput.type = 'number'
  sizeInput.className = 'text-tool-size'
  sizeInput.value = config.size
  sizeInput.min = 8
  sizeInput.max = 96

  const sep1 = document.createElement('div')
  sep1.className = 'text-tool-sep'

  const boldBtn = document.createElement('button')
  boldBtn.className = 'text-tool-btn'
  boldBtn.textContent = 'B'
  boldBtn.style.fontWeight = 'bold'
  boldBtn.addEventListener('mousedown', e => { e.preventDefault(); saveSelection() })

  const italicBtn = document.createElement('button')
  italicBtn.className = 'text-tool-btn'
  italicBtn.textContent = 'I'
  italicBtn.style.fontStyle = 'italic'
  italicBtn.addEventListener('mousedown', e => { e.preventDefault(); saveSelection() })

  const sep2 = document.createElement('div')
  sep2.className = 'text-tool-sep'

  const colorInput = document.createElement('input')
  colorInput.type = 'color'
  colorInput.className = 'text-tool-color'
  colorInput.value = config.color
  colorInput.title = 'Text color'

  toolbar.append(fontSel, sizeInput, sep1, boldBtn, italicBtn, sep2, colorInput)

  const contentDiv = document.createElement('div')
  contentDiv.className = 'text-panel-area'
  contentDiv.contentEditable = 'true'
  contentDiv.dataset.placeholder = 'Type here…'
  contentDiv.innerHTML = config.html
  contentDiv.style.fontFamily = config.font
  contentDiv.style.fontSize   = config.size + 'px'
  contentDiv.style.color      = config.color

  const syncToolbarState = () => {
    boldBtn.classList.toggle('active',   document.queryCommandState('bold'))
    italicBtn.classList.toggle('active', document.queryCommandState('italic'))

    const sel = window.getSelection()
    if (!sel.rangeCount || !contentDiv.contains(sel.anchorNode)) return
    let node = sel.anchorNode
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
    if (!node || !contentDiv.contains(node)) node = contentDiv

    const style = getComputedStyle(node)

    const primaryFamily = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '')
    const fontOption = [...fontSel.options].find(o =>
      o.value.split(',')[0].trim().replace(/['"]/g, '') === primaryFamily
    )
    if (fontOption) fontSel.value = fontOption.value

    const px = Math.round(parseFloat(style.fontSize))
    if (px) sizeInput.value = px

    const rgb = style.color.match(/\d+/g)
    if (rgb) {
      colorInput.value = '#' + rgb.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('')
    }
  }

  fontSel.addEventListener('change', () => {
    restoreFocus()
    const name = fontSel.value.split(',')[0].trim().replace(/['"]/g, '')
    document.execCommand('fontName', false, name)
    save()
  })

  sizeInput.addEventListener('change', () => {
    restoreFocus()
    const size = +sizeInput.value || 14
    document.execCommand('fontSize', false, '7')
    contentDiv.querySelectorAll('font[size="7"]').forEach(el => {
      el.removeAttribute('size')
      el.style.fontSize = size + 'px'
    })
    save()
  })

  boldBtn.addEventListener('click', () => {
    restoreFocus()
    document.execCommand('bold')
    syncToolbarState()
    save()
  })

  italicBtn.addEventListener('click', () => {
    restoreFocus()
    document.execCommand('italic')
    syncToolbarState()
    save()
  })

  const removeFakeSel = () => {
    for (const el of [...contentDiv.querySelectorAll('.fake-sel')]) {
      const parent = el.parentNode
      while (el.firstChild) parent.insertBefore(el.firstChild, el)
      el.remove()
    }
  }

  const applyFakeSel = () => {
    if (!savedRange || savedRange.collapsed) return
    const span = document.createElement('span')
    span.className = 'fake-sel'
    try { savedRange.surroundContents(span) } catch (e) { /* partial element selection — skip */ }
  }

  colorInput.addEventListener('focus', applyFakeSel)

  colorInput.addEventListener('input', () => {
    removeFakeSel()
    restoreFocus()
    document.execCommand('foreColor', false, colorInput.value)
    // Re-capture the just-recolored selection and re-wrap it so the highlight
    // keeps showing while the picker stays open (dragging the native color
    // picker repeatedly fires 'input', and without this the real selection
    // renders in its unfocused/gray style once focus is back on the picker).
    const sel = window.getSelection()
    if (sel.rangeCount > 0 && contentDiv.contains(sel.anchorNode) && !sel.getRangeAt(0).collapsed) {
      savedRange = sel.getRangeAt(0).cloneRange()
      applyFakeSel()
    }
    save()
  })

  // 'blur' alone is unreliable here since restoreFocus() above keeps stealing
  // DOM focus back to contentDiv on every drag tick, which confuses some
  // browsers' blur bookkeeping for the color popup. 'change' fires once,
  // reliably, whenever the native picker actually closes.
  colorInput.addEventListener('blur', removeFakeSel)
  colorInput.addEventListener('change', removeFakeSel)

  contentDiv.addEventListener('keyup',   syncToolbarState)
  contentDiv.addEventListener('mouseup', syncToolbarState)
  contentDiv.addEventListener('input',   () => {
    // Deleting all text drops the formatted spans, so the browser falls back
    // to the div's original base style. Reapply the toolbar's last-seen
    // format (from the just-deleted text) as the new base so typing
    // continues in that format instead of resetting to the panel default.
    if (!contentDiv.textContent && !contentDiv.querySelector('img')) {
      config.font  = fontSel.value
      config.size  = +sizeInput.value || config.size
      config.color = colorInput.value
      contentDiv.style.fontFamily = config.font
      contentDiv.style.fontSize   = config.size + 'px'
      contentDiv.style.color      = config.color
    }
    save()
  })

  body.appendChild(toolbar)
  body.appendChild(contentDiv)
  save()
}
