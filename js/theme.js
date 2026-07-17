// Theme: the global settings object, dark-mode Plotly color palette, axis
// range helper, and the dark-mode toggle's UI wiring.

const settings = {
  showGrid: localStorage.getItem('quick-plot-show-grid') !== '0',
  exportBorders: localStorage.getItem('quick-plot-export-borders') !== '0',
  darkMode: localStorage.getItem('quick-plot-dark-mode') === '1',
}
document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light')

// Reads a CSS custom property's live computed value (from :root / :root[data-
// theme="dark"] in styles.css) — the single source of truth for theme colors
// outside of Plotly. Used wherever a color needs to end up as a plain string
// (a generated <input type=color> value, or text inside export.js's
// standalone HTML) instead of a `var(--x)` reference the browser resolves live.
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function plotlyThemeColors() {
  return settings.darkMode
    ? { paper: '#101012', text: '#f4f4f5', grid: '#333338', line: '#48484f' }
    : { paper: '#ffffff', text: '#18181b', grid: '#ececed', line: '#d4d4d8' }
}

// Only a fully-specified, valid [min, max] turns into an explicit Plotly
// range — anything partial or malformed falls back to autorange.
function axisRange(min, max) {
  return (min !== undefined && max !== undefined && min < max) ? [min, max] : undefined
}

function applyThemeToCharts() {
  const theme = plotlyThemeColors()
  document.querySelectorAll('.panel').forEach(panel => {
    if (!panel._chartDiv || !panel._plotTypeKey) return
    const typeDef = PlotTypes.get(panel._plotTypeKey)
    const update = {
      paper_bgcolor: theme.paper,
      'font.color': theme.text,
      'modebar.bgcolor': theme.paper,
      'modebar.color': theme.line,
      'modebar.activecolor': theme.text,
      'hoverlabel.bgcolor': theme.paper,
      'hoverlabel.bordercolor': theme.line,
      'hoverlabel.font.color': theme.text,
      ...typeDef.themeRelayoutKeys(theme),
    }
    Plotly.relayout(panel._chartDiv, update)
  })
}

const darkModeInput = document.getElementById('setting-dark-mode')
darkModeInput.checked = settings.darkMode
darkModeInput.addEventListener('change', () => {
  settings.darkMode = darkModeInput.checked
  localStorage.setItem('quick-plot-dark-mode', settings.darkMode ? '1' : '0')
  document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light')
  applyGridVisibility()
  applyThemeToCharts()
})
