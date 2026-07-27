#!/bin/bash
# Bundles semble binary into the VSIX package for offline/air-gapped use
# Usage: ./scripts/bundle-semble.sh <version>
#
# Downloads semble binary for the current platform and places it in
# src/services/code-index/semble/bin/ so it can be included in the VSIX.
#
# Once bundled, the semble-downloader will detect the pre-placed binary
# and skip the download step entirely.
#
# Prerequisites:
#   - curl, tar (or unzip on Windows via Git Bash/WSL)
#   - sha256sum (Linux) or shasum (macOS)
#
# Example:
#   ./scripts/bundle-semble.sh v0.5.2

set -euo pipefail

if [ $# -lt 1 ]; then
	echo "Usage: $0 <version>"
	echo "Example: $0 v0.5.2"
	exit 1
fi

VERSION="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BIN_DIR="$PROJECT_DIR/src/services/code-index/semble/bin"

# Detect platform
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$OS" in
	linux)   PLATFORM="linux" ;;
	darwin)  PLATFORM="macos" ;;
	mingw*|msys*|cygwin*) PLATFORM="windows" ;;
	*)       echo "Unsupported OS: $OS"; exit 1 ;;
esac

case "$ARCH" in
	x86_64|amd64)  ARCH_SUFFIX="x64" ;;
	aarch64|arm64) ARCH_SUFFIX="arm64" ;;
	*)             echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

# Map to archive name
if [ "$PLATFORM" = "windows" ]; then
	ARCHIVE="semble-${PLATFORM}-${ARCH_SUFFIX}-fast.zip"
	BINARY="semble.exe"
else
	ARCHIVE="semble-${PLATFORM}-${ARCH_SUFFIX}-fast.tar.gz"
	BINARY="semble"
fi

RELEASE_URL="https://github.com/Audare-est-Facere/sembleexec/releases/download/${VERSION}/${ARCHIVE}"

echo "=== Bundling semble ${VERSION} for ${PLATFORM}-${ARCH_SUFFIX} ==="
echo "Source: ${RELEASE_URL}"
echo "Target: ${BIN_DIR}/${BINARY}"

# Create bin directory
mkdir -p "$BIN_DIR"

# Download archive
TMP_DIR=$(mktemp -d)
trap 'rm -rf "${TMP_DIR}"' EXIT

echo "Downloading ${ARCHIVE}..."
curl -fsSL -o "${TMP_DIR}/${ARCHIVE}" "${RELEASE_URL}"

# Verify checksum if available
CHECKSUMS_URL="https://github.com/Audare-est-Facere/sembleexec/releases/download/${VERSION}/checksums-sha256.txt"
CHECKSUMS_FILE="${TMP_DIR}/checksums-sha256.txt"
if curl -fsSL -o "${CHECKSUMS_FILE}" "${CHECKSUMS_URL}" 2>/dev/null; then
	EXPECTED_HASH=$(grep "${ARCHIVE}" "${CHECKSUMS_FILE}" | awk '{print $1}')
	if [ -n "${EXPECTED_HASH}" ]; then
		if command -v sha256sum &>/dev/null; then
			ACTUAL_HASH=$(sha256sum "${TMP_DIR}/${ARCHIVE}" | awk '{print $1}')
		elif command -v shasum &>/dev/null; then
			ACTUAL_HASH=$(shasum -a 256 "${TMP_DIR}/${ARCHIVE}" | awk '{print $1}')
		else
			echo "Warning: no sha256sum/shasum found, skipping verification"
			ACTUAL_HASH=""
		fi
		if [ -n "${ACTUAL_HASH}" ] && [ "${ACTUAL_HASH}" != "${EXPECTED_HASH}" ]; then
			echo "ERROR: Checksum mismatch!"
			echo "  Expected: ${EXPECTED_HASH}"
			echo "  Actual:   ${ACTUAL_HASH}"
			exit 1
		fi
		echo "Checksum verified: ${EXPECTED_HASH:0:12}..."
	fi
else
	echo "Warning: Could not download checksums manifest, skipping verification"
fi

# Extract binary
echo "Extracting..."
if [[ "$ARCHIVE" == *.tar.gz ]]; then
	tar -xzf "${TMP_DIR}/${ARCHIVE}" -C "${TMP_DIR}"
elif [[ "$ARCHIVE" == *.zip ]]; then
	unzip -o "${TMP_DIR}/${ARCHIVE}" -d "${TMP_DIR}"
fi

# Find and place the binary
if [ -f "${TMP_DIR}/${BINARY}" ]; then
	cp "${TMP_DIR}/${BINARY}" "${BIN_DIR}/${BINARY}"
elif [ -d "${TMP_DIR}/semble" ]; then
	# Fast-start archives are one-dir builds
	cp "${TMP_DIR}/semble/${BINARY}" "${BIN_DIR}/${BINARY}" 2>/dev/null || \
	cp "${TMP_DIR}/semble/semble" "${BIN_DIR}/${BINARY}" 2>/dev/null || {
		echo "ERROR: Binary not found in extracted archive"
		exit 1
	}
else
	echo "ERROR: Binary not found in extracted archive"
	exit 1
fi

chmod +x "${BIN_DIR}/${BINARY}"

echo ""
echo "=== Successfully bundled semble ${VERSION} ==="
echo "Binary: ${BIN_DIR}/${BINARY}"
echo ""
echo "The binary will be included in the next VSIX package build."
echo "To build the VSIX with bundled binary: pnpm vsix"
