# Setting Up Sudo for Automated Deployment

The deployment script requires passwordless sudo (NOPASSWD) to be configured on the remote server. This is necessary because sudo in non-interactive SSH sessions (without TTY) cannot accept password input through stdin.

## Quick Setup

SSH into your server as the deployment user (`containeruser` in this example) and run:

```bash
# Option 1: Using visudo (recommended - validates syntax)
sudo visudo -f /etc/sudoers.d/erp-deployment
```

Then add the following line:

```bash
containeruser ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose, /bin/mkdir, /bin/chown, /bin/chmod, /usr/bin/certbot, /usr/bin/apt-get, /usr/sbin/ufw, /usr/sbin/iptables, /usr/bin/systemctl, /bin/bash
```

Or use this one-liner:

```bash
# Option 2: One-liner (use with caution)
echo 'containeruser ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose, /bin/mkdir, /bin/chown, /bin/chmod, /usr/bin/certbot, /usr/bin/apt-get, /usr/sbin/ufw, /usr/sbin/iptables, /usr/bin/systemctl, /bin/bash' | sudo tee /etc/sudoers.d/erp-deployment

# Set correct permissions
sudo chmod 0440 /etc/sudoers.d/erp-deployment
```

## Verification

Verify the setup works:

```bash
sudo -n whoami  # Should print "root" without prompting for password
```

## Why This Is Needed

The deployment script uses SSH to execute commands on the remote server. However:

1. **SSH non-interactive mode** does not allocate a pseudo-terminal (TTY) by default
2. **Sudo security setting** requires a TTY to read passwords interactively
3. **Stdin piping through SSH** cannot pass passwords to sudo -S in this scenario

Therefore, passwordless sudo (NOPASSWD) is the only reliable way to automate deployment over SSH.

## Security Implications

- The configured commands are limited to specific Docker, system, and SSL management operations
- The user (`containeruser`) can only run these commands without a password
- Consider adding IP restrictions for additional security if deploying from a fixed location

## Alternative: Restrict to Specific Commands

If you want to be more restrictive, limit to specific commands:

```bash
containeruser ALL=(ALL) NOPASSWD: /usr/bin/docker compose, /usr/bin/certbot, /bin/mkdir, /bin/chown
```

Just ensure all commands used by the deployment script are included.

## If You Can't Use Passwordless Sudo

If passwordless sudo is not acceptable in your environment:

1. Deploy manually using the docker-compose files
2. SSH into the server and run commands interactively
3. Use a different deployment method (e.g., Ansible, Terraform)
4. Contact the development team for alternative deployment strategies
