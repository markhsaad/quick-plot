// Feedback: the "Send feedback" modal. Nothing is submitted from here
// directly — this app is serverless with no backend, so there's nowhere to
// send it to. Instead it builds a prefilled mailto: link and hands off to
// the user's own mail client.

const FEEDBACK_EMAIL = 'markhsaad98@gmail.com'

function openFeedbackModal() {
  const overlay = document.createElement('div')
  overlay.className = 'signal-modal-overlay'

  const modal = document.createElement('div')
  modal.className = 'signal-modal feedback-modal'

  const header = document.createElement('div')
  header.className = 'signal-modal-header'
  const headerTitle = document.createElement('span')
  headerTitle.textContent = 'Send feedback'
  const closeBtn = document.createElement('button')
  closeBtn.className = 'signal-modal-close'
  closeBtn.textContent = '✕'
  closeBtn.addEventListener('click', () => overlay.remove())
  header.append(headerTitle, closeBtn)

  const body = document.createElement('div')
  body.className = 'feedback-body'

  const titleInput = document.createElement('input')
  titleInput.className = 'form-input'
  titleInput.placeholder = 'Short summary'
  titleInput.maxLength = 200

  const descInput = document.createElement('textarea')
  descInput.className = 'form-input feedback-textarea'
  descInput.placeholder = 'Bugs, feature ideas, anything else — let me know what happened or what you\'d like to see.'

  body.append(titleInput, descInput)

  const footer = document.createElement('div')
  footer.className = 'signal-modal-footer'
  const cancelBtn = document.createElement('button')
  cancelBtn.className = 'modal-cancel-btn'
  cancelBtn.textContent = 'Cancel'
  cancelBtn.addEventListener('click', () => overlay.remove())
  const submitBtn = document.createElement('button')
  submitBtn.className = 'modal-confirm-btn'
  submitBtn.textContent = 'Send email'
  submitBtn.addEventListener('click', () => {
    const title = titleInput.value.trim()
    if (!title) { titleInput.classList.add('input-error'); titleInput.focus(); return }
    // Built by hand rather than URLSearchParams: mailto: (RFC 6068) expects
    // %20 for spaces, not the '+' that URLSearchParams' query-string encoding
    // would produce — some mail clients render that '+' literally.
    const subjectEnc = encodeURIComponent('[Quick Plot] ' + title)
    const bodyEnc = encodeURIComponent(descInput.value.trim())
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subjectEnc}&body=${bodyEnc}`
    overlay.remove()
  })
  footer.append(cancelBtn, submitBtn)
  titleInput.addEventListener('input', () => titleInput.classList.remove('input-error'))

  modal.append(header, body, footer)
  overlay.appendChild(modal)
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })
  document.body.appendChild(overlay)
  setTimeout(() => titleInput.focus(), 0)
}

document.getElementById('feedback-btn').addEventListener('click', openFeedbackModal)
