#!/bin/bash

# Fix all error.message patterns in TypeScript files
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  -e 's/error\.message || /error instanceof Error ? error.message : /g' \
  -e 's/error\.message}/error instanceof Error ? error.message : "Unknown error"}/g' \
  -e 's/{ error: error\.message/{ error: error instanceof Error ? error.message : "Unknown error"/g' \
  -e 's/, error\.message/, error instanceof Error ? error.message : "Unknown error"/g' \
  {} +

echo "✅ Fixed error handling patterns"

