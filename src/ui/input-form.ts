/**
 * MCP Apps User Input Form
 * 
 * Uses the official App class from @modelcontextprotocol/ext-apps
 * to handle MCP Apps protocol communication:
 * 1. Receive tool input via ontoolinput
 * 2. Display an interactive form to the user
 * 3. Send user response via sendMessage (triggers follow-up turn)
 */

import { App } from '@modelcontextprotocol/ext-apps'

// DOM elements
const formContainer = document.getElementById('form-container')!
const titleEl = document.getElementById('title')!
const promptEl = document.getElementById('prompt')!
const optionsContainer = document.getElementById('options-container')!
const inputSection = document.getElementById('input-section')!
const textareaEl = document.getElementById('input') as HTMLTextAreaElement
const submitBtn = document.getElementById('submit-btn')!
const cancelBtn = document.getElementById('cancel-btn')!
const selectedDisplay = document.getElementById('selected-display')!
const debugLogEl = document.getElementById('debug-log')!

// Internal state
let submitted = false
let app: App | null = null

// Debug logging
function debug(message: string, type: 'info' | 'sent' | 'received' | 'error' = 'info') {
  const entry = document.createElement('div')
  entry.className = `debug-entry ${type}`
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`
  debugLogEl.appendChild(entry)
  debugLogEl.scrollTop = debugLogEl.scrollHeight
  console.log(`[MCP ${type}]`, message)
}

// Render the form with the provided arguments
function renderForm(prompt?: string, title?: string, options?: string[]) {
  // Show title if provided
  if (title) {
    titleEl.textContent = title
    titleEl.classList.remove('hidden')
  }

  // Show prompt
  promptEl.textContent = prompt || 'Please provide your input:'

  // Show options as buttons if provided
  if (options && Array.isArray(options) && options.length > 0) {
    optionsContainer.innerHTML = ''
    options.forEach(option => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'option-button'
      btn.textContent = option
      btn.addEventListener('click', () => handleOptionClick(option))
      optionsContainer.appendChild(btn)
    })
    optionsContainer.classList.remove('hidden')
  }

  // Focus the textarea
  textareaEl.focus()
}

// Show a status message
function showMessage(text: string) {
  selectedDisplay.textContent = text
  selectedDisplay.classList.remove('hidden')
  inputSection.classList.add('hidden')
  optionsContainer.classList.add('hidden')
  formContainer.classList.add('disabled')
}

// Handle clicking an option button
function handleOptionClick(option: string) {
  if (submitted) return
  submitResult(option, 'option')
}

// Handle form submission
function handleSubmit() {
  if (submitted) return
  const value = textareaEl.value.trim()
  if (!value) {
    textareaEl.focus()
    return
  }
  submitResult(value, 'submit')
}

// Handle cancellation
function handleCancel() {
  if (submitted) return
  submitResult(null, 'cancel')
}

// Submit the result back to the host
async function submitResult(value: string | null, action: 'option' | 'submit' | 'cancel') {
  submitted = true
  
  // Disable the form
  formContainer.classList.add('disabled')
  
  // Show what was selected/entered
  if (action === 'option') {
    selectedDisplay.textContent = `Selected: ${value}`
    selectedDisplay.classList.remove('hidden')
    inputSection.classList.add('hidden')
  } else if (action === 'cancel') {
    selectedDisplay.textContent = 'Cancelled'
    selectedDisplay.classList.remove('hidden')
    inputSection.classList.add('hidden')
  } else if (action === 'submit') {
    selectedDisplay.textContent = `Submitted: ${value}`
    selectedDisplay.classList.remove('hidden')
    inputSection.classList.add('hidden')
  }

  // Build the message to send
  const messageText = action === 'cancel' 
    ? '[User cancelled the input request]'
    : value!

  debug('Sending user response: ' + messageText.substring(0, 50))

  if (!app) {
    debug('No app connection available', 'error')
    return
  }

  try {
    // Use sendMessage to send user response - this triggers a follow-up turn
    await app.sendMessage({
      role: 'user',
      content: [{ type: 'text', text: messageText }]
    })
    debug('User message sent successfully')
  } catch (err) {
    debug('Failed to send message: ' + (err as Error).message, 'error')
    
    // Fallback: try updateModelContext
    try {
      await app.updateModelContext({
        content: [{ type: 'text', text: `User response: ${messageText}` }]
      })
      debug('Fallback: model context updated')
    } catch (err2) {
      debug('Fallback also failed: ' + (err2 as Error).message, 'error')
    }
  }
}

// Auto-resize textarea as user types
function autoResizeTextarea() {
  textareaEl.style.height = 'auto'
  textareaEl.style.height = Math.min(textareaEl.scrollHeight, 200) + 'px'
}

// Event listeners
submitBtn.addEventListener('click', handleSubmit)
cancelBtn.addEventListener('click', handleCancel)
textareaEl.addEventListener('input', autoResizeTextarea)
textareaEl.addEventListener('keydown', (e) => {
  // Submit on Ctrl/Cmd + Enter
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    handleSubmit()
  }
})

// Initialize MCP Apps connection
async function init() {
  debug('Initializing MCP Apps connection...')
  
  try {
    app = new App(
      { name: 'UserInputForm', version: '1.0.0' },
      {} // capabilities
    )

    // Handle tool input - this is where we receive the form arguments
    app.ontoolinput = (input) => {
      debug('Tool input received: ' + JSON.stringify(input.arguments || {}).substring(0, 80))
      const args = input.arguments as { prompt?: string; title?: string; options?: string[] } | undefined
      if (args) {
        renderForm(args.prompt, args.title, args.options)
      }
    }

    // Handle tool result - fallback for parsing structured content
    app.ontoolresult = (result) => {
      debug('Tool result received: ' + JSON.stringify(result).substring(0, 80))
      // Try to parse structured content for form data
      if (result.structuredContent) {
        const sc = result.structuredContent as { prompt?: string; title?: string; options?: string[] }
        if (sc.prompt) {
          renderForm(sc.prompt, sc.title, sc.options)
        }
      }
    }

    // Connect to the host
    await app.connect()
    debug('App connected and initialized, waiting for tool input...')
  } catch (err) {
    debug('Failed to connect App: ' + (err as Error).message, 'error')
    promptEl.textContent = 'Failed to connect to host. Please try again.'
  }
}

// Initialize on load
init()
