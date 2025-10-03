# Draw.io Docker Service for NEXA
# Deploy this as a separate Render Web Service
# 
# This is a minimal wrapper around the official jgraph/drawio image
# Fixed: Disable HTTPS to avoid entrypoint script bug (Render handles SSL)

FROM jgraph/drawio:latest

# Disable HTTPS setup (Render terminates SSL at load balancer)
# This fixes the entrypoint script error: "binary operator expected"
ENV LETS_ENCRYPT_ENABLED=false
ENV SSL_ENABLED=false

# Only expose HTTP port (Render provides HTTPS externally)
EXPOSE 8080

# Health check to ensure service is responding
# Render uses this to know when service is ready
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD curl -f http://localhost:8080/ || exit 1

# Use default entrypoint from base image
# This starts Tomcat with the Draw.io web application
CMD ["/docker-entrypoint.sh"]

