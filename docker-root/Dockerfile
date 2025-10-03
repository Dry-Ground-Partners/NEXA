# Draw.io Docker Service for NEXA
# Deploy this as a separate Render Web Service
# 
# Using alternative Draw.io image to avoid jgraph/drawio entrypoint bug
# This image is maintained and doesn't have the SSL keystore bash error

FROM tomcat:9-jre11

# Install Draw.io webapp
ADD https://github.com/jgraph/drawio/releases/download/v24.7.17/draw.war /usr/local/tomcat/webapps/ROOT.war

# Expose HTTP port only (Render provides HTTPS)
EXPOSE 8080

# Health check to ensure Tomcat and Draw.io are responding
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=60s \
  CMD curl -f http://localhost:8080/ || exit 1

# Start Tomcat
CMD ["catalina.sh", "run"]

