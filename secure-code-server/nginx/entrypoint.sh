#!/bin/sh

# Ensure SSL directory exists
mkdir -p /etc/nginx/ssl

# Check if SSL certificates exist, if not generate self-signed
if [ ! -f /etc/nginx/ssl/cert.pem ] || [ ! -f /etc/nginx/ssl/key.pem ]; then
    echo "SSL certificates not found. Generating self-signed certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/OU=IT/CN=localhost"
    echo "Self-signed certificates generated successfully."
else
    echo "SSL certificates already exist."
fi

# Start Nginx
exec nginx -g "daemon off;"
