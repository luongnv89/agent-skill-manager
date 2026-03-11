#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# agent-skill-manager Installer
# The universal skill manager for AI coding agents.
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/luongnv89/agent-skill-manager/main/install.sh | bash
#   wget -qO- https://raw.githubusercontent.com/luongnv89/agent-skill-manager/main/install.sh | bash
# ============================================================================

TOOL_NAME="agent-skill-manager"
REPO_OWNER="luongnv89"
REPO_NAME="agent-skill-manager"
BUN_MIN_VERSION="1.0.0"

# --- Color Output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { printf "${BLUE}[INFO]${NC}  %s\n" "$*"; }
ok()    { printf "${GREEN}[ OK ]${NC}  %s\n" "$*"; }
warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; }
err()   { printf "${RED}[ERR ]${NC}  %s\n" "$*" >&2; }
die()   { err "$@"; exit 1; }

# --- OS / Arch Detection ---
detect_os() {
    local os
    os="$(uname -s | tr '[:upper:]' '[:lower:]')"
    case "$os" in
        linux*)  echo "linux" ;;
        darwin*) echo "macos" ;;
        mingw*|msys*|cygwin*) echo "windows" ;;
        *)       die "Unsupported operating system: $os" ;;
    esac
}

detect_arch() {
    local arch
    arch="$(uname -m)"
    case "$arch" in
        x86_64|amd64)  echo "x86_64" ;;
        aarch64|arm64) echo "arm64" ;;
        armv7l)        echo "armv7" ;;
        *)             die "Unsupported architecture: $arch" ;;
    esac
}

# --- Version Comparison ---
# Returns 0 if $1 >= $2 (semver)
version_gte() {
    local IFS=.
    local i ver1=($1) ver2=($2)
    for ((i=0; i<${#ver2[@]}; i++)); do
        local v1="${ver1[i]:-0}"
        local v2="${ver2[i]:-0}"
        if ((v1 > v2)); then return 0; fi
        if ((v1 < v2)); then return 1; fi
    done
    return 0
}

# --- Bun Detection & Installation ---
check_bun() {
    if command -v bun &>/dev/null; then
        local bun_version
        bun_version="$(bun --version 2>/dev/null || echo "0.0.0")"
        if version_gte "$bun_version" "$BUN_MIN_VERSION"; then
            ok "Bun $bun_version found (>= $BUN_MIN_VERSION required)"
            return 0
        else
            warn "Bun $bun_version found but >= $BUN_MIN_VERSION is required"
            return 1
        fi
    else
        return 1
    fi
}

install_bun() {
    info "Installing Bun..."
    if command -v curl &>/dev/null; then
        curl -fsSL https://bun.sh/install | bash
    elif command -v wget &>/dev/null; then
        wget -qO- https://bun.sh/install | bash
    else
        die "Neither curl nor wget found. Please install one of them first."
    fi

    # Source bun into current shell
    local bun_install="${BUN_INSTALL:-$HOME/.bun}"
    if [ -f "$bun_install/bin/bun" ]; then
        export BUN_INSTALL="$bun_install"
        export PATH="$bun_install/bin:$PATH"
    fi

    if ! command -v bun &>/dev/null; then
        die "Bun installation completed but 'bun' is not in PATH. Please restart your shell and re-run this script."
    fi

    ok "Bun $(bun --version) installed"
}

# --- Install agent-skill-manager ---
install_asm() {
    info "Installing $TOOL_NAME globally via Bun..."
    bun install -g "$TOOL_NAME"
    ok "$TOOL_NAME installed globally"
}

# --- Verification ---
verify_installation() {
    info "Verifying installation..."

    # Check main command
    if command -v agent-skill-manager &>/dev/null; then
        ok "agent-skill-manager is available"
    else
        warn "'agent-skill-manager' not found in PATH"
        warn "You may need to restart your shell or add Bun's global bin to your PATH:"
        warn "  export PATH=\"\$HOME/.bun/bin:\$PATH\""
        return 1
    fi

    # Check shorthand alias
    if command -v asm &>/dev/null; then
        ok "asm (shorthand) is available"
    fi

    return 0
}

# --- Entry Point ---
main() {
    echo ""
    info "============================================"
    info " $TOOL_NAME Installer"
    info "============================================"
    echo ""

    local os arch
    os="$(detect_os)"
    arch="$(detect_arch)"
    info "OS: $os | Arch: $arch"
    echo ""

    # Step 1: Ensure Bun is installed
    if ! check_bun; then
        install_bun
    fi
    echo ""

    # Step 2: Install agent-skill-manager
    install_asm
    echo ""

    # Step 3: Verify
    if verify_installation; then
        echo ""
        info "============================================"
        ok "Installation complete!"
        info "============================================"
        echo ""
        info "Get started:"
        info "  agent-skill-manager    # Launch interactive TUI"
        info "  asm                    # Shorthand alias"
        info "  asm --help             # Show help"
        echo ""
    else
        echo ""
        warn "Installation finished but verification had warnings."
        warn "Try restarting your terminal, then run: agent-skill-manager"
        echo ""
    fi
}

main "$@"
