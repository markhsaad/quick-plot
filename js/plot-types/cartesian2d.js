// Shared layout/theme building blocks for plot types whose chart is a plain
// xaxis/yaxis pair on one paper/plot background — line, scatter, bar,
// histogram, and any future type shaped like them. 3D types (with a `scene`
// instead) don't use this. Not a PlotTypes.register() itself — each 2D type
// still registers its own def and just delegates buildLayout/themeRelayoutKeys
// here, passing in only what's genuinely different about it (buildTrace, and
// optionally `extra` layout keys like `barmode`).
const Cartesian2D = {
  buildLayout({ opts, theme, showGrid, traceCount, yAxis = true, extra = {} }) {
    const axisTheme = { gridcolor: theme.grid, linecolor: theme.line, zerolinecolor: theme.line, showgrid: showGrid }
    return {
      title: opts.title ? { text: opts.title, font: { size: 13 } } : undefined,
      xaxis: { title: opts.xLabel || undefined, range: axisRange(opts.xMin, opts.xMax), ...axisTheme },
      yaxis: yAxis
        ? { title: opts.yLabel || undefined, range: axisRange(opts.yMin, opts.yMax), ...axisTheme }
        : { ...axisTheme },
      margin: { t: opts.title ? 36 : 10, r: 10, b: 40, l: 50 },
      paper_bgcolor: theme.paper,
      plot_bgcolor: theme.paper,
      font: { size: 11, color: theme.text },
      modebar: { bgcolor: theme.paper, color: theme.line, activecolor: theme.text },
      hovermode: 'closest',
      hoverlabel: { bgcolor: theme.paper, bordercolor: theme.line, font: { color: theme.text } },
      showlegend: traceCount > 1,
      ...extra,
    }
  },

  themeRelayoutKeys(theme) {
    return {
      plot_bgcolor: theme.paper,
      'xaxis.gridcolor': theme.grid, 'xaxis.linecolor': theme.line, 'xaxis.zerolinecolor': theme.line,
      'yaxis.gridcolor': theme.grid, 'yaxis.linecolor': theme.line, 'yaxis.zerolinecolor': theme.line,
    }
  },
}
