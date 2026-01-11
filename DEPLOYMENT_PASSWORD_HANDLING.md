# Deployment - Password Handling Fixed

## Issue Fixed ✅

**Problem**: Sudo password with special characters (`!`, `#`) was not being passed correctly

**Previous approach**: `echo 'PASSWORD' | sudo -S ...` — failed with password prompt

**New approach**: Password passed securely via stdin to remote server where it's piped to `sudo -S`

---

## How to Run Deployment

### With Special Characters in Password

**IMPORTANT: Quote the password with single quotes to prevent shell interpretation**

```bash
bash scripts/deployment/deploy-to-server.sh \
  --server 95.111.254.120 \
  --port 4444 \
  --username containeruser \
  --domain shopping-now.net \
  --registry-token REDACTED_GITHUB_TOKEN \
  --db-password COMPUTER \
  --sudo-password 'u2A#yw92VIwca!!!' \
  --email jonasroth@mailbase.info
```

**Key points**:
- Sudo password MUST be in single quotes: `'u2A#yw92VIwca!!!'`
- This prevents the shell from interpreting `!`, `#`, etc.
- Password is securely passed via SSH stdin
- No more interactive password prompts

### Test with Dry-Run First

```bash
bash scripts/deployment/deploy-to-server.sh \
  --server 95.111.254.120 \
  --port 4444 \
  --username containeruser \
  --domain shopping-now.net \
  --registry-token REDACTED_GITHUB_TOKEN \
  --db-password COMPUTER \
  --sudo-password 'u2A#yw92VIwca!!!' \
  --email jonasroth@mailbase.info \
  --dry-run
```

---

## How Password is Passed

**Local script**:
```bash
printf '%s\n' "$SUDO_PASSWORD" > /tmp/sudopass
chmod 600 /tmp/sudopass
```

**SSH command**:
```bash
ssh ... < /tmp/sudopass "cat > /tmp/.sudo_pwd && chmod 600 /tmp/.sudo_pwd && cat /tmp/.sudo_pwd | sudo -S bash -c 'commands'; rm -f /tmp/.sudo_pwd"
```

**Result**: Password is piped to sudo -S securely, no interactive prompts

---

## Sudo Commands Now Use

All sudo commands use the `-S` flag with stdin:
```bash
cat /tmp/.sudo_pwd | sudo -S apt-get update
cat /tmp/.sudo_pwd | sudo -S mkdir -p /opt/erp-system
```

Password is fed directly to stdin, no shell variable expansion issues.

---

## Ready to Deploy! 🚀

```bash
bash scripts/deployment/deploy-to-server.sh \
  --server 95.111.254.120 \
  --port 4444 \
  --username containeruser \
  --domain shopping-now.net \
  --registry-token REDACTED_GITHUB_TOKEN \
  --db-password COMPUTER \
  --sudo-password 'u2A#yw92VIwca!!!' \
  --email jonasroth@mailbase.info
```

**Remember**: Single quotes around password `'u2A#yw92VIwca!!!'`

