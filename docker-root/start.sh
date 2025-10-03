#!/bin/bash
# Custom entrypoint wrapper for Draw.io
# Patches the entrypoint script to fix bash syntax error

set -e

echo "🚀 NEXA Draw.io - Patching entrypoint script..."

# Fix the bash syntax error in the entrypoint script
# Line 175 has: [: KeystoreFile="/path": binary operator expected
# This is due to incorrect bash syntax in the conditional check
# We'll patch it by adding quotes properly

if [ -f /docker-entrypoint.sh ]; then
    # Create a patched version of the entrypoint
    sed 's/\[ KeystoreFile=/\[ "$KeystoreFile" = /g' /docker-entrypoint.sh > /docker-entrypoint-patched.sh || {
        echo "⚠️  Sed patch failed, trying alternative approach..."
        # Alternative: Just skip SSL setup entirely by setting a flag
        # that the script checks before generating certificates
        touch /usr/local/tomcat/.keystore
        chmod 644 /usr/local/tomcat/.keystore
    }
    
    chmod +x /docker-entrypoint-patched.sh 2>/dev/null || true
    
    # Try to run the patched version, fall back to original
    if [ -f /docker-entrypoint-patched.sh ] && [ -x /docker-entrypoint-patched.sh ]; then
        echo "✅ Running patched entrypoint..."
        exec /docker-entrypoint-patched.sh
    else
        echo "⚠️  Patch failed, running original (may have errors)..."
        exec /docker-entrypoint.sh
    fi
else
    echo "❌ Entrypoint script not found, starting Tomcat directly..."
    exec /usr/local/tomcat/bin/catalina.sh run
fi

