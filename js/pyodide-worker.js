// Runs Pyodide entirely off the main thread. WASM instantiation and the
// Python interpreter/package bootstrap are synchronous CPU work wherever
// they run — on the main thread that means the whole page (hover, clicks,
// everything) freezes for as long as it takes. Doing it here instead means
// the freeze happens in this worker's own thread, invisible to the page.
//
// Message protocol (see createWorkerBackend in data-import.js):
//   in:  { id, type: 'init', payload: { pythonSource } }
//        { id, type: 'convert', payload: { filename, bytes } }
//   out: { id, ok: true, result } | { id, ok: false, error }
importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js')

let pyodideReadyPromise = null

async function initPyodide(pythonSource) {
  const pyodide = await loadPyodide()
  await pyodide.loadPackage(['numpy', 'scipy', 'h5py', 'micropip'])
  const micropip = pyodide.pyimport('micropip')
  await micropip.install(['openpyxl'])
  pyodide.runPython(pythonSource)
  return pyodide
}

async function convert(pyodide, filename, bytes) {
  pyodide.globals.set('_qp_bytes', bytes)
  pyodide.globals.set('_qp_filename', filename)
  const resultJson = await pyodide.runPythonAsync('convert_file(_qp_filename, bytes(_qp_bytes))')
  return JSON.parse(resultJson)
}

self.onmessage = async (e) => {
  const { id, type, payload } = e.data
  try {
    if (type === 'init') {
      pyodideReadyPromise = pyodideReadyPromise || initPyodide(payload.pythonSource)
      await pyodideReadyPromise
      self.postMessage({ id, ok: true })
    } else if (type === 'convert') {
      const pyodide = await pyodideReadyPromise
      const result = await convert(pyodide, payload.filename, payload.bytes)
      self.postMessage({ id, ok: true, result })
    }
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err) })
  }
}
