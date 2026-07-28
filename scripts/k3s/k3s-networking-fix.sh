#!/usr/bin/env bash
# Fix K3s pod-to-pod networking on Fedora
# Adds iptables rules to allow traffic on CNI bridge and flannel interfaces
# Run with sudo

set -euo pipefail

log_info()  { echo -e "\033[0;32m[INFO]\033[0m $*"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $*"; }

# 0. Unload br_netfilter which can silently consume bridged IP packets
#     (Fedora 44+ kernel bug causing pod-to-pod traffic to disappear)
if lsmod | grep -q "^br_netfilter"; then
    log_info "Unloading br_netfilter (known to break pod-to-pod bridging)..."
    modprobe -r br_netfilter 2>/dev/null && log_info "✓ br_netfilter unloaded" || log_error "Failed to unload br_netfilter"
    # Blacklist to prevent re-load on reboot
    if [ ! -f /etc/modprobe.d/br_netfilter-blacklist.conf ]; then
        echo "blacklist br_netfilter" > /etc/modprobe.d/br_netfilter-blacklist.conf
        log_info "✓ br_netfilter blacklisted permanently"
    fi
fi

# 1. Ensure bridge-nf-call-iptables is enabled (needed for kube-proxy ClusterIP)
BRIDGE_NF=$(cat /proc/sys/net/bridge/bridge-nf-call-iptables 2>/dev/null || echo "0")
if [ "$BRIDGE_NF" != "1" ]; then
    log_info "Setting bridge-nf-call-iptables=1..."
    sysctl -w net.bridge.bridge-nf-call-iptables=1
    # Make permanent
    if [ -f /etc/sysctl.d/99-k3s.conf ]; then
        sed -i 's/net.bridge.bridge-nf-call-iptables=0/net.bridge.bridge-nf-call-iptables=1/' /etc/sysctl.d/99-k3s.conf
    else
        echo 'net.bridge.bridge-nf-call-iptables=1' > /etc/sysctl.d/99-k3s.conf
    fi
fi
log_info "✓ bridge-nf-call-iptables = $(cat /proc/sys/net/bridge/bridge-nf-call-iptables)"

# 2. Add iptables rules for cni0 and flannel.1
RULES_ADDED=0

if ! iptables -C FORWARD -i cni0 -j ACCEPT 2>/dev/null; then
    iptables -I FORWARD -i cni0 -j ACCEPT
    RULES_ADDED=1
fi
if ! iptables -C FORWARD -o cni0 -j ACCEPT 2>/dev/null; then
    iptables -I FORWARD -o cni0 -j ACCEPT
    RULES_ADDED=1
fi
if ! iptables -C FORWARD -i flannel.1 -j ACCEPT 2>/dev/null; then
    iptables -I FORWARD -i flannel.1 -j ACCEPT
    RULES_ADDED=1
fi
if ! iptables -C FORWARD -o flannel.1 -j ACCEPT 2>/dev/null; then
    iptables -I FORWARD -o flannel.1 -j ACCEPT
    RULES_ADDED=1
fi

if [ "$RULES_ADDED" -eq 1 ]; then
    log_info "✓ iptables FORWARD rules added for cni0 and flannel.1"
else
    log_info "✓ iptables FORWARD rules already present"
fi

# Show the top of FORWARD chain
iptables -L FORWARD -v -n 2>&1 | head -8

log_info "Networking fix complete. Pod-to-pod communication should work now."
