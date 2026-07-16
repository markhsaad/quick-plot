// 3D line plot type. See js/plot-types/line.js for the interface contract.
PlotTypes.register({
  key: 'line3d',
  label: '3D Line',
  icon: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 3v18M4 7.5l8 4.5 8-4.5"/>',
  axes: ['x', 'y', 'z'],
  supportsGrid: false,
  supportsDash: true,

  buildTrace(entry, getColumn) {
    const { xFile, xCol, yFile, yCol, zFile, zCol, color, dash } = entry
    return {
      x: getColumn(xFile, xCol),
      y: getColumn(yFile, yCol),
      z: getColumn(zFile, zCol),
      name: yCol,
      mode: 'lines',
      type: 'scatter3d',
      line: { color, dash: dash || 'solid' },
    }
  },

  buildLayout({ opts, theme, traceCount }) {
    return {
      title: opts.title ? { text: opts.title, font: { size: 13 } } : undefined,
      scene: {
        xaxis: { title: opts.xLabel || undefined, gridcolor: theme.grid, linecolor: theme.line, zerolinecolor: theme.line, color: theme.text, range: axisRange(opts.xMin, opts.xMax) },
        yaxis: { title: opts.yLabel || undefined, gridcolor: theme.grid, linecolor: theme.line, zerolinecolor: theme.line, color: theme.text, range: axisRange(opts.yMin, opts.yMax) },
        zaxis: { title: opts.zLabel || undefined, gridcolor: theme.grid, linecolor: theme.line, zerolinecolor: theme.line, color: theme.text, range: axisRange(opts.zMin, opts.zMax) },
        bgcolor: theme.paper,
      },
      margin: { t: opts.title ? 36 : 10, r: 10, b: 10, l: 10 },
      paper_bgcolor: theme.paper,
      font: { size: 11, color: theme.text },
      modebar: { bgcolor: theme.paper, color: theme.line, activecolor: theme.text },
      hovermode: 'closest',
      hoverlabel: { bgcolor: theme.paper, bordercolor: theme.line, font: { color: theme.text } },
      showlegend: traceCount > 1,
    }
  },

  themeRelayoutKeys(theme) {
    return {
      'scene.bgcolor': theme.paper,
      'scene.xaxis.gridcolor': theme.grid, 'scene.xaxis.linecolor': theme.line, 'scene.xaxis.zerolinecolor': theme.line, 'scene.xaxis.color': theme.text,
      'scene.yaxis.gridcolor': theme.grid, 'scene.yaxis.linecolor': theme.line, 'scene.yaxis.zerolinecolor': theme.line, 'scene.yaxis.color': theme.text,
      'scene.zaxis.gridcolor': theme.grid, 'scene.zaxis.linecolor': theme.line, 'scene.zaxis.zerolinecolor': theme.line, 'scene.zaxis.color': theme.text,
    }
  },
})
