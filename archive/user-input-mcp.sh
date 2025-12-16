#!/bin/bash

# Barebones MCP server for user input using macOS native dialogs
# Uses AppleScript for native UI - no external dependencies

# Read JSON-RPC messages from stdin
while IFS= read -r line; do
  # Skip empty lines
  [[ -z "$line" ]] && continue
  
  # Parse the JSON message
  method=$(echo "$line" | grep -o '"method":"[^"]*"' | cut -d'"' -f4)
  id=$(echo "$line" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
  
  # Use default ID if extraction fails
  [[ -z "$id" ]] && id=1
  
  case "$method" in
    initialize)
      # Send initialization response on single line
      printf '{"jsonrpc":"2.0","id":%s,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"user-input-mcp","version":"1.0.0"}}}\n' "$id"
      ;;
      
    tools/list)
      # List available tools on single line
      printf '{"jsonrpc":"2.0","id":%s,"result":{"tools":[{"name":"user_prompt","description":"Request input from the user via native macOS dialog","inputSchema":{"type":"object","properties":{"prompt":{"type":"string","description":"The prompt to display"},"title":{"type":"string","description":"Dialog title (optional)"}},"required":["prompt"]}}]}}\n' "$id"
      ;;
      
    tools/call)
      # Extract prompt and title from the request
      prompt=$(echo "$line" | grep -o '"prompt":"[^"]*"' | sed 's/"prompt":"//;s/"$//')
      title=$(echo "$line" | grep -o '"title":"[^"]*"' | sed 's/"title":"//;s/"$//')
      
  # Use default title if not provided
  [[ -z "$title" ]] && title="User Input"
  # Prepare an 8-line linefeed block for a taller multiline default answer
  LF8=$'\n\n\n\n\n\n\n\n'
      
      # Retry logic to handle macOS dialog flakiness
      max_attempts=3
      attempt=0
      success=false
      
      while [[ $attempt -lt $max_attempts ]]; do
        # Show native macOS dialog with multiline support using linefeed trick
        # Use multiple linefeeds as the default answer to make the box taller
        user_input=$(osascript 2>&1 <<APPLESCRIPT
tell application "System Events"
  activate
  set dialogResult to display dialog "$prompt" default answer (linefeed & linefeed & linefeed & linefeed & linefeed & linefeed & linefeed & linefeed) with title "$title" buttons {"OK"} default button "OK" giving up after 1200
  return text returned of dialogResult
end tell
APPLESCRIPT
)
        
        if [[ $? -eq 0 ]] && [[ -n "$user_input" || "$user_input" == "" ]]; then
          success=true
          # Remove the leading 8 linefeeds (they're part of the default answer)
          user_input="${user_input#$LF8}"
          break
        fi
        
        attempt=$((attempt + 1))
        [[ $attempt -lt $max_attempts ]] && sleep 1
      done
      
      if [[ "$success" == "true" ]]; then
        # Success - escape the input for JSON using proper escaping
        # This ensures newlines become literal \n in the JSON string
        escaped_input=$(printf '%s' "$user_input" | python3 -c 'import sys, json; print(json.dumps(sys.stdin.read())[1:-1])')
        # Print entire JSON response on a single line
        printf '{"jsonrpc":"2.0","id":%s,"result":{"content":[{"type":"text","text":"%s"}]}}\n' "$id" "$escaped_input"
      else
        # Error or user cancelled after retries
        printf '{"jsonrpc":"2.0","id":%s,"error":{"code":-32603,"message":"Dialog failed to appear after %s attempts. This can happen due to macOS focus/permission issues."}}\n' "$id" "$max_attempts"
      fi
      ;;
      
    *)
      # Unknown method
      printf '{"jsonrpc":"2.0","id":%s,"error":{"code":-32601,"message":"Method not found"}}\n' "$id"
      ;;
  esac
done
