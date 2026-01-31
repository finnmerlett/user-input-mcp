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
const inputCancelBtn = document.getElementById('input-cancel-btn')!  // Cancel button in input section
const selectedDisplay = document.getElementById('selected-display')!
const debugLogEl = document.getElementById('debug-log')!

// Internal state
let submitted = false
let app: App | null = null
let currentRequestId: string | null = null
let inputSectionOpen = false
let otherBtnRef: HTMLButtonElement | null = null
let optionsCancelBtnRef: HTMLButtonElement | null = null  // Reference to cancel button in options

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
function renderForm(prompt?: string, title?: string, options?: string[], showInput?: boolean) {
  // Show title if provided
  if (title) {
    titleEl.textContent = title
    titleEl.classList.remove('hidden')
  }

  // Show prompt
  promptEl.textContent = prompt || 'Please provide your input:'

  const hasOptions = options && Array.isArray(options) && options.length > 0

  // Clear and set up options container
  optionsContainer.innerHTML = ''
  optionsContainer.classList.remove('layout-list', 'layout-row')
  
  // Determine layout: default row, but use list if:
  // - Any button > 25 chars
  // - > 4 choice buttons (not counting cancel)
  // - Total chars > 50
  let useListLayout = false
  if (hasOptions) {
    const allLabels = [...options!, 'Something else...']
    const totalButtons = allLabels.length  // Don't count cancel
    const maxLen = Math.max(...allLabels.map(l => l.length))
    const totalChars = allLabels.reduce((sum, l) => sum + l.length, 0)
    
    if (maxLen > 25 || totalButtons > 4 || totalChars > 40) {
      useListLayout = true
    }
  }

  // Show options as buttons if provided
  if (hasOptions) {
    options!.forEach(option => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'option-button'
      btn.textContent = option
      btn.addEventListener('click', () => handleOptionClick(option, btn))
      optionsContainer.appendChild(btn)
    })
    
    // Add "Something else..." button that toggles the free text input
    const otherBtn = document.createElement('button')
    otherBtn.type = 'button'
    otherBtn.className = 'option-button'
    otherBtn.textContent = 'Something else...'
    otherBtn.addEventListener('click', () => {
      if (inputSectionOpen) {
        // Close the input section
        inputSection.classList.add('hidden')
        otherBtn.classList.remove('active')
        inputSectionOpen = false
        // Show cancel in options, hide in input section
        if (optionsCancelBtnRef) optionsCancelBtnRef.classList.remove('hidden')
        inputCancelBtn.classList.add('hidden')
      } else {
        // Open the input section
        inputSection.classList.remove('hidden')
        otherBtn.classList.add('active')
        inputSectionOpen = true
        // Hide cancel in options, show in input section
        if (optionsCancelBtnRef) optionsCancelBtnRef.classList.add('hidden')
        inputCancelBtn.classList.remove('hidden')
        textareaEl.focus()
      }
    })
    otherBtnRef = otherBtn
    optionsContainer.appendChild(otherBtn)
    
    // Add spacer to push cancel to the end
    const spacer = document.createElement('div')
    spacer.className = 'cancel-spacer'
    optionsContainer.appendChild(spacer)
    
    // Add cancel button at the end
    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'option-button cancel-btn'
    cancelBtn.textContent = 'Cancel'
    cancelBtn.addEventListener('click', handleCancel)
    optionsContainer.appendChild(cancelBtn)
    optionsCancelBtnRef = cancelBtn
    
    optionsContainer.classList.remove('hidden')
    
    // Apply layout
    if (useListLayout) {
      optionsContainer.classList.add('layout-list')
    }
  } else {
    // No options - add just cancel button
    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'option-button cancel-btn'
    cancelBtn.textContent = 'Cancel'
    cancelBtn.addEventListener('click', handleCancel)
    optionsContainer.appendChild(cancelBtn)
    optionsCancelBtnRef = cancelBtn
    optionsContainer.classList.remove('hidden')
  }

  // Show input section based on showInput parameter
  // If showInput is true OR if there are no options, show the input
  if (showInput || !hasOptions) {
    inputSection.classList.remove('hidden')
    inputSectionOpen = true
    if (otherBtnRef) {
      otherBtnRef.classList.add('active')
    }
    // Hide cancel in options, show in input section
    if (optionsCancelBtnRef) optionsCancelBtnRef.classList.add('hidden')
    inputCancelBtn.classList.remove('hidden')
    textareaEl.focus()
  }
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
function handleOptionClick(option: string, btn: HTMLButtonElement) {
  if (submitted) return
  // Highlight the selected button
  btn.classList.add('active')
  // Include any free text along with the option (only if input section is open)
  const freeText = inputSectionOpen ? textareaEl.value.trim() : undefined
  submitResult(option, 'option', freeText || undefined)
}

// Handle form submission
function handleSubmit() {
  if (submitted) return
  const value = textareaEl.value.trim()
  if (!value) {
    textareaEl.focus()
    return
  }
  submitResult(value, 'submit', undefined)
}

// Handle cancellation
function handleCancel() {
  if (submitted) return
  submitResult(null, 'cancel', undefined)
}

// Submit the result back to the host
async function submitResult(value: string | null, action: 'option' | 'submit' | 'cancel', freeText?: string) {
  submitted = true
  
  // Disable the form
  formContainer.classList.add('disabled')
  
  // Show what was selected/entered
  if (action === 'option') {
    const displayText = freeText 
      ? `Selected: ${value} (with text: ${freeText})`
      : `Selected: ${value}`
    selectedDisplay.textContent = displayText
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

  // Build the response - include both option and freeText if available
  let responseText: string | undefined
  if (action === 'cancel') {
    responseText = undefined
  } else if (action === 'option' && freeText) {
    responseText = `${value}\n\nAdditional text: ${freeText}`
  } else {
    responseText = value!
  }
  const cancelled = action === 'cancel'

  debug(`Storing response (requestId: ${currentRequestId}, cancelled: ${cancelled})`)

  if (!app) {
    debug('No app connection available', 'error')
    return
  }

  if (!currentRequestId) {
    debug('No requestId available - cannot store response', 'error')
    return
  }

  try {
    // Call the _apps_store_response tool to store the response
    // The agent will retrieve this via await_apps_response
    const result = await app.callServerTool({
      name: '_apps_store_response',
      arguments: {
        requestId: currentRequestId,
        response: responseText,
        cancelled: cancelled,
      },
    })
    debug('Response stored successfully: ' + JSON.stringify(result).substring(0, 100))
  } catch (err) {
    debug('Failed to store response: ' + (err as Error).message, 'error')
  }
}

// Auto-resize textarea as user types
function autoResizeTextarea() {
  // Reset to single line to get accurate scrollHeight
  textareaEl.style.height = '32px'
  textareaEl.style.overflow = 'hidden'
  
  const scrollHeight = textareaEl.scrollHeight
  if (scrollHeight > 32) {
    textareaEl.style.height = Math.min(scrollHeight, 200) + 'px'
  }
  if (scrollHeight > 200) {
    textareaEl.style.overflow = 'auto'
  }
}

// Event listeners
submitBtn.addEventListener('click', handleSubmit)
inputCancelBtn.addEventListener('click', handleCancel)
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
      const args = input.arguments as { prompt?: string; title?: string; options?: string[]; showInput?: boolean } | undefined
      if (args) {
        renderForm(args.prompt, args.title, args.options, args.showInput)
      }
    }

    // Handle tool result - this is where we get the requestId from structuredContent
    app.ontoolresult = (result) => {
      debug('Tool result received: ' + JSON.stringify(result).substring(0, 120))
      // Extract requestId and form data from structured content
      if (result.structuredContent) {
        const sc = result.structuredContent as { 
          requestId?: string
          prompt?: string
          title?: string
          options?: string[]
          showInput?: boolean
        }
        if (sc.requestId) {
          currentRequestId = sc.requestId
          debug('Got requestId: ' + currentRequestId)
        }
        if (sc.prompt) {
          renderForm(sc.prompt, sc.title, sc.options, sc.showInput)
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
