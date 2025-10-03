# Draw.io Docker Service for NEXA
# Deploy this as a separate Render Web Service
# 
# This is a minimal wrapper around the official jgraph/drawio image
# No custom code needed - just deploy and it works!

FROM jgraph/drawio:latest

# Expose HTTP and HTTPS ports
# Render will automatically detect port 8080
EXPOSE 8080 8443

# Health check to ensure service is responding
# Render uses this to know when service is ready
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD curl -f http://localhost:8080/ || exit 1

# Use default entrypoint from base image
# This starts Tomcat with the Draw.io web application
CMD ["/docker-entrypoint.sh"]

