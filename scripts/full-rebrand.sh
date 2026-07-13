#!/bin/bash
# Full rebrand: zoo-code -> roo-plus
# Run from repo root: bash scripts/full-rebrand.sh

set -e

echo "=== Full Rebrand: zoo-code → roo-plus ==="
echo ""

# ==========================================
# Phase 1: src/package.json (VS Code identifiers)
# ==========================================
echo "[Phase 1] Updating src/package.json identifiers..."

cd src

# View container IDs: zoo-code-xxx -> roo-plus-xxx
sed -i 's/"zoo-code-/"roo-plus-/g' package.json

# Command IDs, menu IDs, submenu IDs: zoo-code.xxx -> roo-plus.xxx
sed -i 's/"zoo-code\./"roo-plus\./g' package.json

# Configuration property keys: zoo-code.xxx -> roo-plus.xxx
sed -i 's/"zoo-code\./"roo-plus\./g' package.json

# Keywords - add roo-plus
sed -i 's/"zoocode"/"zoocode",\n\t\t"roo-plus",\n\t\t"rooplus"/' package.json

cd ..

echo "  ✅ Done"
echo ""

# ==========================================
# Phase 2: .ts files - bulk replacements
# ==========================================
echo "[Phase 2] Updating TypeScript files..."

# Replace command references: zoo-code.xxx -> roo-plus.xxx
# These are VS Code command strings
find src -name "*.ts" -exec sed -i 's/"zoo-code\./\"roo-plus\./g' {} +
find src -name "*.ts" -exec sed -i "s/'zoo-code\./'roo-plus\./g" {} +

# Replace zoo-code/ in User-Agent template literals
find src -name "*.ts" -exec sed -i 's#zoo-code/#roo-plus/#g' {} +

# Replace ZooCode/ in User-Agent (e.g., ZooCode/3.68.0 -> RooPlus/3.68.0)
find src -name "*.ts" -exec sed -i 's/ZooCode\//RooPlus\//g' {} +

# Replace "Zoo Code" brand string -> "Roo+"
find src -name "*.ts" -exec sed -i 's/"Zoo Code"/"Roo+"/g' {} +
find src -name "*.ts" -exec sed -i "s/'Zoo Code'/'Roo+'/g" {} +

# Replace Zoo-Code in output channel names etc
find src -name "*.ts" -exec sed -i 's/Zoo-Code/Roo-Plus/g' {} +

# Replace Zoo Code (non-quoted) in comments and strings
# Be careful with this one - only replace in display contexts
find src -name "*.ts" -exec sed -i 's/Zoo Code support/Roo+ support/gI' {} +
find src -name "*.ts" -exec sed -i 's/Zoo Code Support/Roo+ Support/g' {} +

# Replace GitHub URL references
find src -name "*.ts" -exec sed -i 's|https://github.com/Zoo-Code-Org/Zoo-Code|https://github.com/xavier-arosemena/roo-plus|g' {} +

echo "  ✅ Done"
echo ""

# ==========================================
# Phase 3: Auth service rename
# ==========================================
echo "[Phase 3] Renaming auth service and storage keys..."

# Rename Zoo Code auth service file references in imports
find src -name "*.ts" -exec sed -i 's|services/zoo-code-auth|services/roo-plus-auth|g' {} +

# Rename zoo-code session token keys
find src -name "*.ts" -exec sed -i 's/zoo-code-session-token/roo-plus-session-token/g' {} +
find src -name "*.ts" -exec sed -i 's/zoo-code-user-name/roo-plus-user-name/g' {} +
find src -name "*.ts" -exec sed -i 's/zoo-code-user-email/roo-plus-user-email/g' {} +
find src -name "*.ts" -exec sed -i 's/zoo-code-user-image/roo-plus-user-image/g' {} +

echo "  ✅ Done"
echo ""

# ==========================================
# Phase 4: Storage paths
# ==========================================
echo "[Phase 4] Updating storage paths..."

# Extension storage path: ZooCodeOrganization.zoo-code -> xavier-arosemena.roo-plus
find src -name "*.ts" -exec sed -i 's/ZooCodeOrganization\.zoo-code/xavier-arosemena\.roo-plus/g' {} +
find src -name "*.ts" -exec sed -i 's/zoocodeorganization\.zoo-code/xavier-arosemena\.roo-plus/g' {} +

echo "  ✅ Done"
echo ""

echo "=== Rebrand complete ==="
echo "Next: Rename the auth service file itself"
