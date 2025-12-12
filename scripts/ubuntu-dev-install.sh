#!/usr/bin/env bash
set -euo pipefail

# Dev install helper for Debian/Ubuntu systems
# - Installs docker, docker-compose and docker.io via apt
# - Enables and starts the docker service
# - Must be run as root

if [ "$EUID" -ne 0 ]; then
  echo "This script must be run as root. Try: sudo $0 $*"
  exit 1
fi

echo "This script is intended for Debian/Ubuntu systems."

echo "Updating apt repositories..."
apt-get update -y

PKGS=(docker docker-compose docker.io)

echo "Installing packages: ${PKGS[*]}"
apt-get install -y "${PKGS[@]}"

echo "Enabling and starting docker service..."
systemctl enable docker
systemctl start docker

echo "Docker installation complete."
echo "You may need to add your user to the 'docker' group to run docker without sudo:"
echo "  sudo usermod -aG docker <your-username>"

echo "If you installed docker-compose and want to check versions:"
echo "  docker --version"
echo "  docker-compose --version"

exit 0
