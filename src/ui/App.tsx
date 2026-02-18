/**
 * MCP Apps User Input Form - React Version
 * 
 * Uses the official React hooks from @modelcontextprotocol/ext-apps/react
 * to handle MCP Apps protocol communication.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useApp, useHostStyles } from '@modelcontextprotocol/ext-apps/react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// Configure marked to treat line breaks as <br> (like the electron version)
marked.use({ breaks: true })

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 20H21M3.00003 20H4.67457C5.16376 20 5.40835 20 5.63852 19.9447C5.84259 19.8957 6.03768 19.8149 6.21663 19.7053C6.41846 19.5816 6.59141 19.4086 6.93732 19.0627L19.5001 6.49998C20.3285 5.67156 20.3285 4.32841 19.5001 3.49998C18.6716 2.67156 17.3285 2.67156 16.5001 3.49998L3.93729 16.0627C3.59139 16.4086 3.41843 16.5816 3.29475 16.7834C3.18509 16.9624 3.10428 17.1574 3.05529 17.3615C3.00003 17.5917 3.00003 17.8363 3.00003 18.3255V20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

interface FormArgs {
  prompt?: string
  title?: string
  options?: string[]
  showAdditionalFreeInputButton?: boolean
  preExpandTextInputBox?: boolean
}

type SubmitAction = 'option' | 'submit' | 'cancel'

export default function App() {
  // MCP App connection
  const [requestId, setRequestId] = useState<string | null>(null)
  const [formArgs, setFormArgs] = useState<FormArgs>({})
  
  const { app, isConnected, error } = useApp({
    appInfo: { name: 'UserInputForm', version: '1.0.0' },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolinput = (input) => {
        console.log('[MCP] Tool input received:', input.arguments)
        const args = input.arguments as FormArgs | undefined
        if (args) {
          setFormArgs(args)
        }
      }
      
      app.ontoolresult = (result) => {
        console.log('[MCP] Tool result received:', result)
        if (result.structuredContent) {
          const sc = result.structuredContent as { 
            requestId?: string
            prompt?: string
            title?: string
            options?: string[]
            showAdditionalFreeInputButton?: boolean
            preExpandTextInputBox?: boolean
          }
          if (sc.requestId) {
            setRequestId(sc.requestId)
          }
          if (sc.prompt) {
            setFormArgs({
              prompt: sc.prompt,
              title: sc.title,
              options: sc.options,
              showAdditionalFreeInputButton: sc.showAdditionalFreeInputButton,
              preExpandTextInputBox: sc.preExpandTextInputBox,
            })
          }
        }
      }
    },
  })
  
  // Apply host styles (with guard for undefined hostContext)
  const hostContext = useMemo(() => app?.getHostContext() || {}, [app])
  useHostStyles(app, hostContext)
  
  // Form state
  const [submitted, setSubmitted] = useState(false)
  // Only open input section by default if preExpandTextInputBox is true or no options
  const [inputSectionOpen, setInputSectionOpen] = useState(() => {
    // Evaluate initial state based on formArgs (which may be empty at first)
    if (formArgs.preExpandTextInputBox) return true;
    if (formArgs.options && Array.isArray(formArgs.options) && formArgs.options.length > 0) return false;
    return true;
  });
  const [textValue, setTextValue] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  // Tracks how the input section was opened: option name (via that option's edit pen) or 'other' (via the Other button)
  const [inputSource, setInputSource] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // LocalStorage key prefix for persisting completed state
  const STORAGE_KEY_PREFIX = 'mcp-user-input-completed-'
  
  // Restore completed state from localStorage when requestId is set
  useEffect(() => {
    if (!requestId) return
    
    try {
      const storedData = localStorage.getItem(`${STORAGE_KEY_PREFIX}${requestId}`)
      if (storedData) {
        const parsed = JSON.parse(storedData) as {
          submitted: boolean
          statusMessage: string | null
          selectedOption: string | null
        }
        if (parsed.submitted) {
          setSubmitted(true)
          setStatusMessage(parsed.statusMessage)
          setSelectedOption(parsed.selectedOption)
          setInputSectionOpen(false)
        }
      }
    } catch (err) {
      console.warn('[MCP] Failed to restore state from localStorage:', err)
    }
  }, [requestId])
  
  const { prompt, title, options, showAdditionalFreeInputButton, preExpandTextInputBox } = formArgs
  
  // Filter out options that match "something else" pattern (we add our own)
  const filteredOptions = useMemo(() => {
    if (!options || !Array.isArray(options)) return undefined
    const filtered = options.filter(opt => !/^something else[.]*$/i.test(opt))
    return filtered.length > 0 ? filtered : undefined
  }, [options])
  
  const hasOptions = filteredOptions && filteredOptions.length > 0
  
  // Parse prompt as markdown and sanitize to prevent XSS
  const promptHtmlSafe = useMemo(() => {
    let text = prompt || 'Please provide your input:'
    // Unescape newlines that may have been double-escaped in JSON
    text = text.replace(/\\n/g, '\n')
    const rawHtml = marked.parse(text) as string
    return DOMPurify.sanitize(rawHtml)
  }, [prompt])
  
  // Derive whether the submitted state included additional text (for highlight logic)
  const submittedWithText = submitted && statusMessage !== null && statusMessage.includes('with text:')
  
  // Determine if we should use list layout
  const useListLayout = hasOptions && (() => {
    const allLabels = [...filteredOptions!, 'Something else...']
    const maxLen = Math.max(...allLabels.map(l => l.length))
    const totalChars = allLabels.reduce((sum, l) => sum + l.length, 0)
    return maxLen > 25 || allLabels.length > 4 || totalChars > 50
  })()
  
  // Detect if options start with numbers or letters (e.g. "1.", "a)", "A.")
  const useLeftAlign = useListLayout && hasOptions && filteredOptions!.every(
    opt => /^[\da-zA-Z][.):\-]/.test(opt)
  )
  
  // Initialize input section state based on preExpandTextInputBox or hasOptions
  useEffect(() => {
    // Only open input section if preExpandTextInputBox is true or there are no options
    if (preExpandTextInputBox || !hasOptions) {
      setInputSectionOpen(true)
      setInputSource('other')
    } else {
      setInputSectionOpen(false)
    }
  }, [preExpandTextInputBox, hasOptions])
  
  // Focus textarea when input section opens
  useEffect(() => {
    if (inputSectionOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [inputSectionOpen])
  
  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextValue(e.target.value)
    const textarea = e.target
    textarea.style.height = '32px'
    textarea.style.overflow = 'hidden'
    const scrollHeight = textarea.scrollHeight
    if (scrollHeight > 32) {
      textarea.style.height = Math.min(scrollHeight, 200) + 'px'
    }
    if (scrollHeight > 200) {
      textarea.style.overflow = 'auto'
    }
  }
  
  // Submit result to MCP server
  const submitResult = useCallback(async (
    value: string | null,
    action: SubmitAction,
    freeText?: string
  ) => {
    if (submitted || !app || !requestId) return
    
    setSubmitted(true)
    
    // Build response
    let responseText: string | undefined
    let newStatusMessage: string | null = null
    let newSelectedOption: string | null = null
    
    if (action === 'cancel') {
      responseText = undefined
      newStatusMessage = 'Cancelled'
    } else if (action === 'option' && freeText) {
      responseText = `${value}\n\nAdditional text: ${freeText}`
      newStatusMessage = `Selected: ${value} (with text: ${freeText})`
      newSelectedOption = value
    } else if (action === 'option') {
      responseText = value!
      newStatusMessage = `Selected: ${value}`
      newSelectedOption = value
    } else {
      responseText = value!
      newStatusMessage = `Submitted: ${value}`
    }
    
    setStatusMessage(newStatusMessage)
    setSelectedOption(newSelectedOption)
    
    // Persist completed state to localStorage
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${requestId}`, JSON.stringify({
        submitted: true,
        statusMessage: newStatusMessage,
        selectedOption: newSelectedOption,
      }))
    } catch (err) {
      console.warn('[MCP] Failed to persist state to localStorage:', err)
    }
    
    try {
      await app.callServerTool({
        name: '__internal__submit_inline_response',
        arguments: {
          requestId,
          response: responseText,
          cancelled: action === 'cancel',
        },
      })
      console.log('[MCP] Response stored successfully')
    } catch (err) {
      console.error('[MCP] Failed to store response:', err)
    }
  }, [submitted, app, requestId])
  
  // Handle option click
  const handleOptionClick = (option: string) => {
    const freeText = inputSectionOpen ? textValue.trim() : undefined
    setInputSectionOpen(false)
    setInputSource(null)
    submitResult(option, 'option', freeText || undefined)
  }
  
  // Handle submit
  const handleSubmit = () => {
    const value = textValue.trim()
    if (!value) {
      textareaRef.current?.focus()
      return
    }
    // If text box was opened from an option's edit pen, submit as that option + text
    if (inputSource && inputSource !== 'other') {
      const option = inputSource
      setInputSectionOpen(false)
      setInputSource(null)
      submitResult(option, 'option', value)
    } else {
      setInputSectionOpen(false)
      setInputSource(null)
      submitResult(value, 'submit', undefined)
    }
  }
  
  // Handle cancel
  const handleCancel = () => {
    setInputSectionOpen(false)
    setInputSource(null)
    submitResult(null, 'cancel', undefined)
  }
  
  // Handle keyboard in textarea
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: allow new line (default behavior)
        return
      } else {
        // Enter: submit
        e.preventDefault()
        handleSubmit()
      }
    }
  }
  
  // Toggle input section (from edit pen on a specific option)
  const toggleInputFromEdit = (option: string) => {
    if (inputSectionOpen && inputSource === option) {
      setInputSectionOpen(false)
      setInputSource(null)
    } else {
      setInputSectionOpen(true)
      setInputSource(option)
    }
  }

  // Toggle input section (from the Other button)
  const toggleInputFromOther = () => {
    if (inputSectionOpen && inputSource === 'other') {
      setInputSectionOpen(false)
      setInputSource(null)
    } else {
      setInputSectionOpen(true)
      setInputSource('other')
    }
  }
  
  // Loading state
  if (error) {
    return <div className="form-container">Error: {error.message}</div>
  }
  
  if (!isConnected) {
    return (
      <div className="form-container">
        <p className="prompt">Loading...</p>
      </div>
    )
  }
  
  return (
    <div className={`form-container ${submitted ? 'disabled' : ''}`}>
      {title && <h2 className="title">{title}</h2>}
      <div className="prompt" dangerouslySetInnerHTML={{ __html: promptHtmlSafe }} />
      
      {/* Options */}
      {(hasOptions || !submitted) && (
        <div className={`options-container ${useListLayout ? 'layout-list' : ''} ${useLeftAlign ? 'left-align' : ''}`}>
          {hasOptions && filteredOptions!.map((option) => (
            <div key={option} className="split-button">
              <button
                type="button"
                className={`split-main option-button ${selectedOption === option && !submittedWithText ? 'active' : ''} ${(inputSource === option && inputSectionOpen) || (selectedOption === option && submittedWithText) ? 'semi-active' : ''}`}
                onClick={() => handleOptionClick(option)}
                disabled={submitted}
              >
                {option}
              </button>
              <button
                type="button"
                className={`split-edit option-button ${(inputSource === option && inputSectionOpen) || (selectedOption === option && submittedWithText) ? 'active' : ''} ${selectedOption === option && !submittedWithText ? 'semi-active' : ''}`}
                onClick={() => toggleInputFromEdit(option)}
                disabled={submitted}
                aria-label={`Add text to ${option}`}
              >
                <EditIcon />
              </button>
            </div>
          ))}
          
          {hasOptions && (showAdditionalFreeInputButton !== false || preExpandTextInputBox) && (
            <button
              type="button"
              className={`option-button something-else-btn ${(inputSectionOpen && inputSource === 'other') || (submitted && !selectedOption && statusMessage && statusMessage !== 'Cancelled') ? 'active' : ''}`}
              onClick={toggleInputFromOther}
              disabled={submitted}
              aria-label="Something else"
            >
              {useListLayout && <>Something else...&nbsp;</>}{!useListLayout && <>Other...&nbsp;</>}<EditIcon />
            </button>
          )}
          
          {/* Spacer */}
          <div className="cancel-spacer" />
          
          {/* Cancel in options (hidden when input section open or submitted) */}
          {!inputSectionOpen && !submitted && (
            <button
              type="button"
              className="option-button cancel-btn"
              onClick={handleCancel}
            >
              Cancel
            </button>
          )}
        </div>
      )}
      
      {/* Input section */}
      {inputSectionOpen && !submitted && (
        <div className="input-section">
          <div className="textarea-container">
            <textarea
              ref={textareaRef}
              value={textValue}
              onChange={handleTextareaChange}
              onKeyDown={handleTextareaKeyDown}
              placeholder={inputSource && inputSource !== 'other' ? 'Add additional details...' : 'Type your response...'}
              aria-label="Your response"
              rows={1}
            />
          </div>
          
          <div className="button-container">
            <button
              type="button"
              className="option-button cancel-btn"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
            >
              Submit
            </button>
          </div>
        </div>
      )}
      
      {/* Status message */}
      {statusMessage && (
        <div className="selected-option">{statusMessage}</div>
      )}
    </div>
  )
}
