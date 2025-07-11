#!/bin/sh

# Azure App Service startup script for containerized React app
# This script ensures proper startup in Azure App Service environment

echo "Starting DOOH React Frontend..."

# Ensure nginx user owns required directories
chown -R nginx:nginx /var/cache/nginx
chown -R nginx:nginx /var/log/nginx
chown -R nginx:nginx /var/run

# Start nginx in foreground
exec nginx -g "daemon off;"
