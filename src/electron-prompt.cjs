// @ts-check
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron')

// Get prompt and title from command line args
const args = process.argv.slice(2)
const promptText = args[0] || 'Enter input:'
const titleText = args[1] || 'User Prompt'

/** @type {Electron.BrowserWindow | null} */
let mainWindow = null
let submitted = false

const MIN_HEIGHT = 200
const MAX_HEIGHT = 600

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
  const isDark = nativeTheme.shouldUseDarkColors
  const bgColor = isDark ? '#1e1e1e' : '#ffffff'
  const textColor = isDark ? '#fff' : '#000'
  const inputBg = isDark ? '#2d2d2d' : '#fff'
  const inputBorder = isDark ? '#444' : '#ccc'
  const labelColor = isDark ? '#ccc' : '#333'
  const cancelBg = isDark ? '#3c3c3c' : '#e0e0e0'
  const cancelHover = isDark ? '#4a4a4a' : '#d0d0d0'

  mainWindow = new BrowserWindow({
    width: 500,
    height: MIN_HEIGHT,
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
          margin-bottom: 12px;
          color: ${labelColor};
          flex-shrink: 0;
        }
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
      <div class="prompt-label">${escapeHtml(promptText)}</div>
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
        const LINE_HEIGHT = 21 // 14px font * 1.5 line-height
        const EXTRA_BUFFER = 28
        let lastWindowHeight = MIN_HEIGHT
        let lastVisualLines = 1
        
        function getVisualLineCount() {
          // Temporarily reset height to get true scrollHeight
          const currentHeight = input.style.height
          input.style.height = 'auto'
          const scrollHeight = input.scrollHeight
          input.style.height = currentHeight
          
          // Calculate visual lines based on content height and line height
          const padding = 20 // textarea padding (10px top + 10px bottom)
          const contentHeight = scrollHeight - padding
          return Math.max(1, Math.ceil(contentHeight / LINE_HEIGHT))
        }
        
        function autoGrow() {
          const visualLines = getVisualLineCount()
          
          // Only resize when visual line count changes
          if (visualLines === lastVisualLines) {
            return
          }
          lastVisualLines = visualLines
          
          // Reset to get accurate scrollHeight
          input.style.height = 'auto'
          const scrollHeight = input.scrollHeight
          const contentHeight = Math.max(60, scrollHeight)
          input.style.height = contentHeight + 'px'
          
          // Calculate window height
          const computedBodyStyle = getComputedStyle(document.body)
          const bodyPaddingTop = parseInt(computedBodyStyle.paddingTop) || 20
          const bodyPaddingBottom = parseInt(computedBodyStyle.paddingBottom) || 20
          const labelEl = document.querySelector('.prompt-label')
          const buttonsEl = document.querySelector('.buttons')
          const labelHeight = labelEl.offsetHeight + (parseInt(getComputedStyle(labelEl).marginBottom) || 12)
          const buttonsHeight = buttonsEl.offsetHeight + (parseInt(getComputedStyle(buttonsEl).marginTop) || 16)
          
          const totalHeight = bodyPaddingTop + labelHeight + contentHeight + buttonsHeight + bodyPaddingBottom + EXTRA_BUFFER
          const newWindowHeight = Math.min(Math.max(MIN_HEIGHT, totalHeight), MAX_HEIGHT)
          
          if (newWindowHeight !== lastWindowHeight) {
            lastWindowHeight = newWindowHeight
            ipcRenderer.send('resize', Math.round(newWindowHeight))
          }
          
          input.style.overflowY = newWindowHeight >= MAX_HEIGHT ? 'auto' : 'hidden'
        }
        
        input.addEventListener('input', autoGrow)
        
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
    const [width] = mainWindow.getSize()
    mainWindow.setSize(width, height)
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

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})
