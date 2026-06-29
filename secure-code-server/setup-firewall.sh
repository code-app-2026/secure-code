#!/bin/bash
# setup-firewall.sh
# Configures UFW to allow only SSH, HTTP, and HTTPS traffic.

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo)"
  exit 1
fi

echo "Setting up UFW Firewall..."

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (Port 22)
ufw allow 22/tcp

# Allow HTTP (Port 80) for Certbot / HTTP traffic
ufw allow 80/tcp

# Allow HTTPS (Port 443) for secure web traffic
ufw allow 443/tcp

# Enable the firewall (force yes to avoid prompt)
ufw --force enable

echo "UFW Firewall is configured and enabled."
ufw status verbose
