/**
 * MCP Apps User Input Form - React Version
 * 
 * Uses the official React hooks from @modelcontextprotocol/ext-apps/react
 * to handle MCP Apps protocol communication.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useApp, useHostStyles } from '@modelcontextprotocol/ext-apps/react'
import { marked } from 'marked'

// Configure marked to treat line breaks as <br> (like the electron version)
marked.use({ breaks: true })

interface FormArgs {
  prompt?: string
  title?: string
  options?: string[]
  showInput?: boolean
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
            showInput?: boolean
          }
          if (sc.requestId) {
            setRequestId(sc.requestId)
          }
          if (sc.prompt) {
            setFormArgs({
              prompt: sc.prompt,
              title: sc.title,
              options: sc.options,
              showInput: sc.showInput,
            })
          }
        }
      }
    },
  })
  
  // Apply host styles
  useHostStyles(app, app?.getHostContext())
  
  // Form state
  const [submitted, setSubmitted] = useState(false)
  const [inputSectionOpen, setInputSectionOpen] = useState(false)
  const [textValue, setTextValue] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const { prompt, title, options, showInput } = formArgs
  
  // Filter out options that match "something else" pattern (we add our own)
  const filteredOptions = useMemo(() => {
    if (!options || !Array.isArray(options)) return undefined
    const filtered = options.filter(opt => !/^something else[.]*$/i.test(opt))
    return filtered.length > 0 ? filtered : undefined
  }, [options])
  
  const hasOptions = filteredOptions && filteredOptions.length > 0
  
  // Parse prompt as markdown
  const promptHtml = useMemo(() => {
    let text = prompt || 'Please provide your input:'
    // Unescape newlines that may have been double-escaped in JSON
    text = text.replace(/\\n/g, '\n')
    return marked.parse(text) as string
  }, [prompt])
  
  // Determine if we should use list layout
  const useListLayout = hasOptions && (() => {
    const allLabels = [...filteredOptions!, 'Something else...']
    const maxLen = Math.max(...allLabels.map(l => l.length))
    const totalChars = allLabels.reduce((sum, l) => sum + l.length, 0)
    return maxLen > 25 || allLabels.length > 4 || totalChars > 50
  })()
  
  // Initialize input section state based on showInput or hasOptions
  useEffect(() => {
    if (showInput || !hasOptions) {
      setInputSectionOpen(true)
    }
  }, [showInput, hasOptions])
  
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
    if (action === 'cancel') {
      responseText = undefined
      setStatusMessage('Cancelled')
    } else if (action === 'option' && freeText) {
      responseText = `${value}\n\nAdditional text: ${freeText}`
      setStatusMessage(`Selected: ${value} (with text: ${freeText})`)
      setSelectedOption(value)
    } else if (action === 'option') {
      responseText = value!
      setStatusMessage(`Selected: ${value}`)
      setSelectedOption(value)
    } else {
      responseText = value!
      setStatusMessage(`Submitted: ${value}`)
    }
    
    try {
      await app.callServerTool({
        name: '_apps_store_response',
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
    // Close input section if no free text (so "Something else..." deselects)
    if (!freeText) {
      setInputSectionOpen(false)
    }
    submitResult(option, 'option', freeText || undefined)
  }
  
  // Handle submit
  const handleSubmit = () => {
    const value = textValue.trim()
    if (!value) {
      textareaRef.current?.focus()
      return
    }
    submitResult(value, 'submit', undefined)
  }
  
  // Handle cancel
  const handleCancel = () => {
    setInputSectionOpen(false)
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
  
  // Toggle input section
  const toggleInputSection = () => {
    setInputSectionOpen(!inputSectionOpen)
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
      <div className="prompt" dangerouslySetInnerHTML={{ __html: promptHtml }} />
      
      {/* Options */}
      {(hasOptions || !submitted) && (
        <div className={`options-container ${useListLayout ? 'layout-list' : ''}`}>
          {hasOptions && filteredOptions!.map((option) => (
            <button
              key={option}
              type="button"
              className={`option-button ${selectedOption === option ? 'active' : ''}`}
              onClick={() => handleOptionClick(option)}
              disabled={submitted}
            >
              {option}
            </button>
          ))}
          
          {hasOptions && (
            <button
              type="button"
              className={`option-button ${inputSectionOpen ? 'active' : ''}`}
              onClick={toggleInputSection}
              disabled={submitted}
            >
              Something else...
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
              placeholder="Type your response..."
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
