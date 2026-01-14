// @ts-check
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron')

// Get prompt and title from command line args
const args = process.argv.slice(2)
const promptText = args[0] || 'Enter input:'
const titleText = args[1] || 'User Input'

/** @type {any} */
let marked

/** @type {Electron.BrowserWindow | null} */
let mainWindow = null
let submitted = false

const MIN_HEIGHT = 200
let MAX_HEIGHT = 600
let MAX_MESSAGE_HEIGHT = 300
let MAX_INPUT_HEIGHT = 150

/**
 * Escape HTML special characters
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function createWindow() {
  const { screen } = require('electron')
  const primaryDisplay = screen.getPrimaryDisplay()
  const { height: screenHeight, width: screenWidth, x: screenX, y: screenY } = primaryDisplay.workArea
  
  const width = 500
  const height = MIN_HEIGHT
  const x = screenX + Math.floor((screenWidth - width) / 2)
  const y = screenY + Math.floor((screenHeight - height) / 2.5)

  const isDark = nativeTheme.shouldUseDarkColors
  const bgColor = isDark ? '#1e1e1e' : '#ffffff'
  const textColor = isDark ? '#fff' : '#000'
  const inputBg = isDark ? '#2d2d2d' : '#fff'
  const inputBorder = isDark ? '#444' : '#ccc'
  const labelColor = isDark ? '#ccc' : '#333'
  const cancelBg = isDark ? '#3c3c3c' : '#e0e0e0'
  const cancelHover = isDark ? '#4a4a4a' : '#d0d0d0'
  const linkColor = isDark ? '#6ebbfd' : '#0066cc'
  const codeBg = isDark ? '#3e3e3e' : '#f0f0f0'

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    minHeight: MIN_HEIGHT,
    maxHeight: MAX_HEIGHT,
    resizable: true,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    frame: true,
    backgroundColor: bgColor,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  mainWindow.setMenuBarVisibility(false)

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(titleText)}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          height: 100%;
          overflow: hidden;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
          background: ${bgColor};
          color: ${textColor};
          display: flex;
          flex-direction: column;
        }
        .prompt-label {
          font-size: 14px;
          margin-bottom: 20px;
          color: ${labelColor};
          flex-shrink: 0;
          line-height: 1.5;
        }
        .prompt-label a { color: ${linkColor}; }
        .prompt-label ul, .prompt-label ol { margin-left: 20px; margin-bottom: 8px; }
        .prompt-label p { margin-bottom: 8px; }
        .prompt-label p:last-child { margin-bottom: 0; }
        .prompt-label code {
          background: ${codeBg};
          padding: 2px 4px;
          border-radius: 3px;
          font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
          font-size: 90%;
        }
        .prompt-label pre {
            background: ${codeBg};
            padding: 8px;
            border-radius: 4px;
            overflow-x: auto;
            margin-bottom: 8px;
        }
        .prompt-label pre code {
            background: none;
            padding: 0;
        }
        .prompt-label table { border-collapse: collapse; margin-bottom: 8px; width: 100%; }
        .prompt-label th, .prompt-label td { border: 1px solid ${inputBorder}; padding: 6px 8px; text-align: left; }
        .prompt-label th { background: ${isDark ? '#333' : '#f5f5f5'}; }
        .prompt-label hr { border: none; border-top: 1px solid ${inputBorder}; margin: 16px 0; }
        .input-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 60px;
        }
        textarea {
          width: 100%;
          flex: 1;
          min-height: 60px;
          padding: 10px 12px;
          font-size: 14px;
          font-family: inherit;
          border: 1px solid ${inputBorder};
          border-radius: 4px;
          background: ${inputBg};
          color: ${textColor};
          outline: none;
          resize: none;
          line-height: 1.5;
          overflow-y: hidden;
        }
        textarea:focus {
          border-color: #007acc;
        }
        textarea::placeholder {
          color: #666;
        }
        .buttons {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 16px;
          flex-shrink: 0;
        }
        button {
          padding: 8px 20px;
          font-size: 13px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .cancel {
          background: ${cancelBg};
          color: ${textColor};
        }
        .cancel:hover {
          background: ${cancelHover};
        }
        .submit {
          background: #007acc;
          color: #fff;
        }
        .submit:hover {
          background: #0098ff;
        }
      </style>
    </head>
    <body>
      <div class="prompt-label">${marked.parse(promptText)}</div>
      <div class="input-container">
        <textarea id="input" autofocus placeholder="Type your response..."></textarea>
      </div>
      <div class="buttons">
        <button class="cancel" onclick="cancel()">Cancel</button>
        <button class="submit" onclick="submit()">Submit</button>
      </div>
      <script>
        const { ipcRenderer } = require('electron')
        const input = document.getElementById('input')
        const MIN_HEIGHT = ${MIN_HEIGHT}
        const MAX_HEIGHT = ${MAX_HEIGHT}
        const MAX_MESSAGE_HEIGHT = ${MAX_MESSAGE_HEIGHT}
        const MAX_INPUT_HEIGHT = ${MAX_INPUT_HEIGHT}
        const LINE_HEIGHT = 21 // 14px font * 1.5 line-height
        const EXTRA_BUFFER = 28
        let lastWindowHeight = MIN_HEIGHT
        function autoGrow() {
          const labelEl = document.querySelector('.prompt-label')
          const inputContainer = document.querySelector('.input-container')
          
          // Capture scroll position
          const labelScrollTop = labelEl.scrollTop

          // 1. Reset to measure natural heights
          input.style.height = 'auto'
          input.style.overflowY = 'hidden' 
          labelEl.style.height = 'auto'
          labelEl.style.overflowY = 'hidden'
          
          const naturalInputHeight = Math.max(60, input.scrollHeight)
          const naturalLabelHeight = labelEl.scrollHeight
          
          // 2. Apply caps
          const finalLabelHeight = Math.min(naturalLabelHeight, MAX_MESSAGE_HEIGHT)
          const finalInputHeight = Math.min(naturalInputHeight, MAX_INPUT_HEIGHT)
          
          // 3. Apply styles
          labelEl.style.height = finalLabelHeight + 'px'
          labelEl.style.overflowY = naturalLabelHeight > MAX_MESSAGE_HEIGHT ? 'auto' : 'hidden'
          
          // Restore scroll position
          if (labelEl.style.overflowY === 'auto') {
            labelEl.scrollTop = labelScrollTop
          }

          input.style.height = finalInputHeight + 'px'
          input.style.overflowY = naturalInputHeight > MAX_INPUT_HEIGHT ? 'auto' : 'hidden'
          
          // 4. Calculate total window height
          const computedBodyStyle = getComputedStyle(document.body)
          const bodyPadding = (parseInt(computedBodyStyle.paddingTop) || 20) + (parseInt(computedBodyStyle.paddingBottom) || 20)
          const buttonsEl = document.querySelector('.buttons')
          const buttonsHeight = buttonsEl.offsetHeight + (parseInt(getComputedStyle(buttonsEl).marginTop) || 16)
          const labelMargin = parseInt(getComputedStyle(labelEl).marginBottom) || 20
          
          const chromeHeight = bodyPadding + buttonsHeight + labelMargin + EXTRA_BUFFER
          const totalHeight = finalLabelHeight + finalInputHeight + chromeHeight
          
          const newWindowHeight = Math.min(Math.max(MIN_HEIGHT, totalHeight), MAX_HEIGHT)

          // 5. Resize window if needed
          if (newWindowHeight !== lastWindowHeight) {
            lastWindowHeight = newWindowHeight
            ipcRenderer.send('resize', Math.round(newWindowHeight))
          }
        }
        
        input.addEventListener('input', () => {
          autoGrow()
          // If at max height, ensure we scroll to bottom to show padding
          if (input.scrollHeight > input.clientHeight) {
             input.scrollTop = input.scrollHeight
          }
        })
        
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
          if (e.key === 'Escape') cancel()
        })
        
        function submit() {
          const value = input.value.trim()
          if (value) {
            ipcRenderer.send('submit', value)
          }
        }
        
        function cancel() {
          ipcRenderer.send('cancel')
        }
        
        input.focus()
        setTimeout(autoGrow, 100)
      </script>
    </body>
    </html>
  `

  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

  mainWindow.on('closed', () => {
    mainWindow = null
    if (!submitted) {
      process.stdout.write('[CANCELLED]')
      app.quit()
    }
  })
}

ipcMain.on('resize', (_event, height) => {
  if (mainWindow) {
    const { screen } = require('electron')
    const primaryDisplay = screen.getPrimaryDisplay()
    const { height: screenHeight, y: screenY } = primaryDisplay.workArea
    
    const bounds = mainWindow.getBounds()
    const newY = screenY + Math.floor((screenHeight - height) / 2.5)
    
    mainWindow.setBounds({ ...bounds, y: newY, height })
  }
})

ipcMain.on('submit', (_event, value) => {
  submitted = true
  process.stdout.write(value)
  app.quit()
})

ipcMain.on('cancel', () => {
  submitted = true
  process.stdout.write('[CANCELLED]')
  app.quit()
})

app.whenReady().then(async () => {
  const { screen } = require('electron')
  const primaryDisplay = screen.getPrimaryDisplay()
  const workAreaHeight = primaryDisplay.workAreaSize.height
  MAX_HEIGHT = Math.floor(workAreaHeight * 0.9) // Overall max safety
  MAX_MESSAGE_HEIGHT = Math.floor(workAreaHeight * 0.5)
  MAX_INPUT_HEIGHT = Math.floor(workAreaHeight * 0.25)

  const mod = await import('marked')
  marked = mod.marked
  marked.use({ breaks: true })
  createWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})
