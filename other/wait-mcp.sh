#!/bin/bash

# Wait MCP Server - allows waiting/sleeping for a specified duration
# Uses line-delimited JSON for MCP protocol

while IFS= read -r request; do
  # Parse the request
  method=$(echo "$request" | grep -o '"method":"[^"]*"' | cut -d'"' -f4)
  id=$(echo "$request" | grep -o '"id":[0-9]*' | cut -d':' -f2)
  
  # Skip notifications (no id field, no response needed)
  if [[ "$method" == notifications/* && -z "$id" ]]; then
    continue
  fi
  
  case "$method" in
    "initialize")
      echo '{"jsonrpc":"2.0","id":'"$id"',"result":{"protocolVersion":"2024-11-05","serverInfo":{"name":"wait-mcp","version":"1.0.0"},"capabilities":{"tools":{}}}}'
      ;;
      
    "tools/list")
      echo '{"jsonrpc":"2.0","id":'"$id"',"result":{"tools":[{"name":"wait","description":"Wait for a specified number of seconds before continuing","inputSchema":{"type":"object","properties":{"seconds":{"type":"number","description":"Number of seconds to wait"}},"required":["seconds"]}}]}}'
      ;;
      
    "tools/call")
      # Extract tool name and seconds parameter
      tool_name=$(echo "$request" | grep -o '"name":"[^"]*"' | tail -1 | cut -d'"' -f4)
      seconds=$(echo "$request" | grep -o '"seconds":[0-9.]*' | cut -d':' -f2)
      
      if [[ "$tool_name" == "wait" && -n "$seconds" ]]; then
        sleep "$seconds"
        echo '{"jsonrpc":"2.0","id":'"$id"',"result":{"content":[{"type":"text","text":"Waited for '"$seconds"' seconds"}]}}'
      else
        echo '{"jsonrpc":"2.0","id":'"$id"',"error":{"code":-32601,"message":"Unknown tool or missing parameters"}}'
      fi
      ;;
      
    *)
      if [[ -n "$id" ]]; then
        echo '{"jsonrpc":"2.0","id":'"$id"',"error":{"code":-32601,"message":"Method not found: '"$method"'"}}'
      fi
      ;;
  esac
done
