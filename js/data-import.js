// Data import: the dataset store, CSV parsing, scientific-format conversion
// (via Pyodide), and the sidebar file-list UI.

// Global dataset store: { filename: { headers, columns } }
const datasets = {}

// A column becomes a string/category column (kept as-is, e.g. for a bar
// chart's category axis) unless every one of its values parses as a number —
// same numeric-unless-proven-otherwise rule the Python converters below use
// for .mat/.xlsx, so a signal reads the same regardless of which importer
// produced it.
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  const headers = lines[0].split(',').map(h => h.trim())
  const raw = {}
  for (const h of headers) raw[h] = []
  for (const line of lines.slice(1)) {
    line.split(',').forEach((v, i) => raw[headers[i]].push(v.trim()))
  }
  const columns = {}
  for (const h of headers) {
    const values = raw[h]
    const isNumeric = values.every(v => v !== '' && Number.isFinite(Number(v)))
    columns[h] = isNumeric ? values.map(Number) : values
  }
  return { headers, columns }
}

// Scientific formats run through Pyodide (CPython-in-WASM) so the whole
// app stays serverless — no upload, no backend, just Python in the tab.
// Only 1D signals are imported (numeric or string); everything else
// (higher-dimensional arrays, mixed/unsupported types) is skipped and
// surfaced as a warning instead of failing the whole file. Nested data
// (MATLAB structs) becomes dotted names: field1.field2.signal.
const SCIENTIFIC_EXTENSIONS = ['mat', 'xlsx']

const PYTHON_SOURCE = `
import io, json
import numpy as np

def _try_numeric_1d(arr):
    arr = np.asarray(arr)
    if not np.issubdtype(arr.dtype, np.number):
        return None
    arr = np.squeeze(arr)
    if arr.ndim != 1:
        return None
    return arr.astype(float).tolist()

# Mirrors _try_numeric_1d for text data — a string/category column (e.g. a
# .mat char array or cell array of names) — kept as-is rather than requiring
# everything be numeric, so a bar chart can use it as a category axis.
def _try_string_1d(arr):
    try:
        arr = np.asarray(arr)
    except Exception:
        return None
    if arr.dtype.kind not in ('U', 'S', 'O'):
        return None
    arr = np.squeeze(arr)
    if arr.ndim != 1:
        return None
    try:
        return [x.decode() if isinstance(x, bytes) else str(x) for x in arr.tolist()]
    except Exception:
        return None

def _flatten_mat_value(name, val, columns, ignored):
    import scipy.io.matlab
    if isinstance(val, scipy.io.matlab.mat_struct):
        for field in val._fieldnames:
            _flatten_mat_value(f'{name}.{field}', getattr(val, field), columns, ignored)
        return
    if isinstance(val, np.ndarray) and val.dtype == object:
        flat = val.ravel()
        if flat.size <= 64:
            for i, item in enumerate(flat):
                _flatten_mat_value(f'{name}.{i}', item, columns, ignored)
        else:
            ignored.append(name)
        return
    arr = _try_numeric_1d(val)
    if arr is not None and len(arr) > 0:
        columns[name] = arr
        return
    sarr = _try_string_1d(val)
    if sarr is not None and len(sarr) > 0:
        columns[name] = sarr
        return
    ignored.append(name)

def _flatten_h5_value(name, obj, columns, ignored):
    import h5py
    if isinstance(obj, h5py.Group):
        for key in obj:
            if key.startswith('#'):
                continue
            _flatten_h5_value(f'{name}.{key}', obj[key], columns, ignored)
        return
    try:
        arr = _try_numeric_1d(obj[()])
    except Exception:
        arr = None
    if arr is not None and len(arr) > 0:
        columns[name] = arr
        return
    try:
        sarr = _try_string_1d(obj[()])
    except Exception:
        sarr = None
    if sarr is not None and len(sarr) > 0:
        columns[name] = sarr
        return
    ignored.append(name)

def convert_mat_v73(data_bytes):
    # MATLAB v7.3 .mat files are actually HDF5 under the hood, so they need
    # h5py rather than scipy.io.loadmat (see the NotImplementedError catch
    # in convert_mat below).
    import h5py
    columns, ignored = {}, []
    with h5py.File(io.BytesIO(data_bytes), 'r') as f:
        for key in f:
            if key.startswith('#'):
                continue
            _flatten_h5_value(key, f[key], columns, ignored)
    return columns, ignored

def convert_mat(data_bytes):
    import scipy.io
    try:
        mat = scipy.io.loadmat(io.BytesIO(data_bytes), struct_as_record=False, squeeze_me=True)
    except NotImplementedError:
        # scipy: "Please use HDF reader for matlab v7.3 files, e.g. h5py"
        return convert_mat_v73(data_bytes)
    columns, ignored = {}, []
    for key, val in mat.items():
        if key.startswith('__'):
            continue
        _flatten_mat_value(key, val, columns, ignored)
    return columns, ignored

def convert_xlsx(data_bytes):
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(data_bytes), read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    columns, ignored = {}, []
    if not rows:
        return columns, ignored
    headers = [str(h) if h is not None else f'col_{i}' for i, h in enumerate(rows[0])]
    for i, h in enumerate(headers):
        # A column becomes numeric if every non-empty cell is a number, string
        # if every non-empty cell is text — otherwise (mixed types) it's
        # skipped, same numeric-unless-proven-otherwise rule as parseCSV and
        # the .mat flattener above.
        numeric_vals, string_vals = [], []
        is_numeric, is_string = True, True
        for row in rows[1:]:
            v = row[i] if i < len(row) else None
            if v is None:
                continue
            if not isinstance(v, bool) and isinstance(v, (int, float)):
                numeric_vals.append(float(v))
                string_vals.append(str(v))
                is_string = False
            else:
                is_numeric = False
                string_vals.append(str(v))
        if is_numeric and numeric_vals:
            columns[h] = numeric_vals
        elif is_string and string_vals:
            columns[h] = string_vals
        else:
            ignored.append(h)
    return columns, ignored

def convert_file(filename, data_bytes):
    ext = filename.lower().rsplit('.', 1)[-1]
    if ext == 'mat':
        columns, ignored = convert_mat(data_bytes)
    elif ext == 'xlsx':
        columns, ignored = convert_xlsx(data_bytes)
    else:
        raise ValueError('Unsupported file type: .' + ext)
    return json.dumps({'columns': columns, 'ignored': ignored})
`

// Everything (numpy, scipy, h5py, openpyxl) loads once, up front, right when
// the page opens, so by the time the user actually imports a file conversion
// feels instant. That used to run on the main thread and visibly froze the
// whole page (hover, clicks) for the couple of seconds Pyodide's WASM
// instantiation takes — see js/pyodide-worker.js, which now does that same
// work in a Worker instead, off the main thread entirely. Workers aren't
// guaranteed to construct under file:// (Chrome in particular refuses it in
// some configurations), and this app is explicitly meant to run via file://
// with no server, so createMainThreadBackend() below is a transparent
// fallback for whenever the worker path isn't available.
function tryCreatePyodideWorker() {
  try {
    return new Worker('js/pyodide-worker.js')
  } catch (err) {
    console.warn('Pyodide worker unavailable (possibly file:// restrictions), falling back to main thread:', err)
    return null
  }
}

// Wraps the worker's postMessage/onmessage protocol in a request/response
// promise API, keyed by message id, so callers can just `await` it like any
// other async call.
function createWorkerBackend(worker) {
  let nextId = 0
  const pending = new Map()

  worker.onmessage = e => {
    const { id, ok, result, error } = e.data
    const p = pending.get(id)
    if (!p) return
    pending.delete(id)
    ok ? p.resolve(result) : p.reject(new Error(error))
  }

  function call(type, payload, transfer) {
    return new Promise((resolve, reject) => {
      const id = ++nextId
      pending.set(id, { resolve, reject })
      worker.postMessage({ id, type, payload }, transfer || [])
    })
  }

  return call('init', { pythonSource: PYTHON_SOURCE }).then(() => ({
    convert: (filename, bytes) => call('convert', { filename, bytes }, [bytes.buffer]),
  }))
}

async function createMainThreadBackend() {
  const pyodide = await loadPyodide()
  await pyodide.loadPackage(['numpy', 'scipy', 'h5py', 'micropip'])
  const micropip = pyodide.pyimport('micropip')
  await micropip.install(['openpyxl'])
  pyodide.runPython(PYTHON_SOURCE)
  return {
    async convert(filename, bytes) {
      pyodide.globals.set('_qp_bytes', bytes)
      pyodide.globals.set('_qp_filename', filename)
      const resultJson = await pyodide.runPythonAsync('convert_file(_qp_filename, bytes(_qp_bytes))')
      return JSON.parse(resultJson)
    },
  }
}

let backendPromise = null
function getBackend() {
  if (!backendPromise) {
    backendPromise = (async () => {
      const worker = tryCreatePyodideWorker()
      if (worker) {
        try {
          return await createWorkerBackend(worker)
        } catch (err) {
          console.warn('Pyodide worker failed to initialize, falling back to main thread:', err)
        }
      }
      return createMainThreadBackend()
    })()
  }
  return backendPromise
}

// Kick off in the background on page load — no user action required.
getBackend().catch(err => console.warn('Pyodide failed to preload:', err))

async function convertScientificFile(file) {
  const backend = await getBackend()
  const bytes = new Uint8Array(await file.arrayBuffer())
  const result = await backend.convert(file.name, bytes)
  return { headers: Object.keys(result.columns), columns: result.columns, ignored: result.ignored }
}

function allSignals() {
  const signals = []
  for (const [file, data] of Object.entries(datasets)) {
    for (const h of data.headers) signals.push({ label: `${file} › ${h}`, file, col: h })
  }
  return signals
}

function getColumn(file, col) {
  return datasets[file]?.columns[col] ?? []
}

const importBtn       = document.getElementById('import-btn')
const fileInput       = document.getElementById('file-input')
const fileList        = document.getElementById('file-list')

const loadedFiles = new Set()

function openDataViewer(name) {
  const data = datasets[name]
  if (!data) return

  const overlay = document.createElement('div')
  overlay.className = 'signal-modal-overlay'

  const modal = document.createElement('div')
  modal.className = 'data-modal'

  const header = document.createElement('div')
  header.className = 'signal-modal-header'
  const title = document.createElement('span')
  title.textContent = name
  const closeBtn = document.createElement('button')
  closeBtn.className = 'signal-modal-close'
  closeBtn.textContent = '✕'
  closeBtn.addEventListener('click', () => overlay.remove())
  header.appendChild(title)
  header.appendChild(closeBtn)

  const searchWrap = document.createElement('div')
  searchWrap.className = 'signal-modal-search'
  const searchInput = document.createElement('input')
  searchInput.placeholder = 'Search signals…'
  searchInput.autocomplete = 'off'
  searchWrap.appendChild(searchInput)

  const wrap = document.createElement('div')
  wrap.className = 'data-table-wrap'

  const rowCount = data.columns[data.headers[0]].length
  const limit = Math.min(rowCount, 500)

  function renderTable(q) {
    const vis = q ? data.headers.filter(h => h.toLowerCase().includes(q)) : data.headers
    wrap.innerHTML = ''

    if (!vis.length) {
      const empty = document.createElement('div')
      empty.className = 'data-table-empty'
      empty.textContent = 'No matching signals'
      wrap.appendChild(empty)
      return
    }

    const table = document.createElement('table')
    table.className = 'data-table'

    const thead = document.createElement('thead')
    const headerRow = document.createElement('tr')
    for (const h of vis) {
      const th = document.createElement('th')
      th.textContent = h
      headerRow.appendChild(th)
    }
    thead.appendChild(headerRow)

    const tbody = document.createElement('tbody')
    for (let i = 0; i < limit; i++) {
      const tr = document.createElement('tr')
      for (const h of vis) {
        const td = document.createElement('td')
        td.textContent = data.columns[h][i]
        tr.appendChild(td)
      }
      tbody.appendChild(tr)
    }

    if (rowCount > limit) {
      const tr = document.createElement('tr')
      const td = document.createElement('td')
      td.colSpan = vis.length
      td.className = 'data-table-note'
      td.textContent = `Showing first ${limit} of ${rowCount} rows`
      tr.appendChild(td)
      tbody.appendChild(tr)
    }

    table.appendChild(thead)
    table.appendChild(tbody)
    wrap.appendChild(table)
  }

  renderTable('')
  searchInput.addEventListener('input', () => renderTable(searchInput.value.toLowerCase().trim()))

  modal.appendChild(header)
  modal.appendChild(searchWrap)
  modal.appendChild(wrap)
  overlay.appendChild(modal)
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })
  document.body.appendChild(overlay)
  setTimeout(() => searchInput.focus(), 0)
}

function addFileEntry(name) {
  loadedFiles.add(name)
  const entry = document.createElement('div')
  entry.className = 'file-entry'
  const span = document.createElement('span')
  span.className = 'file-name'
  span.textContent = name
  span.title = 'View data'
  span.addEventListener('click', () => openDataViewer(name))
  const status = document.createElement('span')
  status.className = 'file-status-icon'
  status.style.display = 'none'
  const del = document.createElement('button')
  del.className = 'delete-btn'
  del.textContent = '🗑'
  del.title = 'Delete'
  del.addEventListener('click', () => {
    loadedFiles.delete(name)
    delete datasets[name]
    entry.remove()
  })
  entry.appendChild(span)
  entry.appendChild(status)
  entry.appendChild(del)
  fileList.appendChild(entry)
  return entry
}

const FILE_STATUS_ICONS = {
  loading: { symbol: '⟳', className: 'file-status-icon spin', defaultTitle: 'Converting with Python (first import also loads the runtime — may take a while)…' },
  warning: { symbol: '⚠', className: 'file-status-icon warn', defaultTitle: '' },
  error:   { symbol: '⚠', className: 'file-status-icon error', defaultTitle: '' },
}

// state: 'loading' | 'warning' | 'error' | null (clears the icon)
function setFileEntryStatus(entry, state, detail) {
  const status = entry.querySelector('.file-status-icon')
  entry.classList.toggle('loading', state === 'loading')
  const icon = FILE_STATUS_ICONS[state]
  if (!icon) { status.style.display = 'none'; return }
  status.textContent = icon.symbol
  status.className = icon.className
  status.title = detail || icon.defaultTitle
  status.style.display = ''
}

importBtn.addEventListener('click', () => fileInput.click())

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0]
  fileInput.value = ''
  if (!file || loadedFiles.has(file.name)) return

  const ext = file.name.toLowerCase().split('.').pop()

  if (ext === 'csv') {
    file.text().then(text => { datasets[file.name] = parseCSV(text) })
    addFileEntry(file.name)
    return
  }

  if (!SCIENTIFIC_EXTENSIONS.includes(ext)) return

  const entry = addFileEntry(file.name)
  setFileEntryStatus(entry, 'loading')
  convertScientificFile(file).then(({ headers, columns, ignored }) => {
    if (!headers.length) {
      setFileEntryStatus(entry, 'error', 'No usable 1D numeric signals found in this file')
      loadedFiles.delete(file.name)
      return
    }
    datasets[file.name] = { headers, columns }
    if (ignored.length) {
      setFileEntryStatus(entry, 'warning', `Ignored ${ignored.length} signal(s) — not 1D numeric: ${ignored.join(', ')}`)
    } else {
      setFileEntryStatus(entry, null)
    }
  }).catch(err => {
    setFileEntryStatus(entry, 'error', String(err))
    loadedFiles.delete(file.name)
  })
})
