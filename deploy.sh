#!/bin/bash

# deploy.sh - Deployment script for portfolio.sdelka.ai
# This script runs ON THE DEPLOYMENT SERVER
# Usage: ./deploy.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration (override via environment variables)
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/portfolio.sdelka.ai}"
WEB_USER="${WEB_USER:-www-data}"
WEB_GROUP="${WEB_GROUP:-www-data}"

print_info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
print_step()    { echo -e "${BLUE}[STEP]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

command_exists() { command -v "$1" >/dev/null 2>&1; }

echo "========================================"
echo "  portfolio.sdelka.ai Deployment Script"
echo "========================================"
echo ""
print_info "Starting deployment process..."
echo ""

# Step 1: Verify project directory
print_step "1/7 Verifying project directory..."
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi
print_info "Project directory verified"
echo ""

# Step 2: Pull latest changes
print_step "2/7 Pulling latest changes from git..."
if [ -d ".git" ]; then
    git pull origin main
    print_info "Git pull successful"
else
    print_warning "Not a git repository, skipping git pull"
fi
echo ""

# Step 3: Check required commands
print_step "3/7 Checking required commands..."
MISSING_COMMANDS=()
command_exists node  || MISSING_COMMANDS+=("node")
command_exists pnpm  || MISSING_COMMANDS+=("pnpm")
command_exists rsync || MISSING_COMMANDS+=("rsync")

if [ ${#MISSING_COMMANDS[@]} -ne 0 ]; then
    print_error "Missing required commands: ${MISSING_COMMANDS[*]}"
    exit 1
fi

print_info "Node $(node --version), pnpm $(pnpm --version)"
echo ""

# Step 4: Install dependencies
print_step "4/7 Installing dependencies..."
pnpm install --frozen-lockfile
print_info "Dependencies installed"
echo ""

# Step 5: Clean & build
print_step "5/7 Building production bundle..."
rm -rf dist/
pnpm build

if [ ! -d "dist" ]; then
    print_error "Build failed — dist/ directory not created"
    exit 1
fi

BUILD_SIZE=$(du -sh dist/ | cut -f1)
FILE_COUNT=$(find dist/ -type f | wc -l)
print_info "Build completed ($BUILD_SIZE, $FILE_COUNT files)"
echo ""

# Step 6: Deploy files
print_step "6/7 Deploying files to $DEPLOY_PATH..."
mkdir -p "$DEPLOY_PATH"
rsync -av --delete dist/ "$DEPLOY_PATH/"
print_info "Files deployed"
echo ""

# Step 7: Set permissions
print_step "7/7 Setting permissions..."
find "$DEPLOY_PATH" -type d -exec chmod 755 {} \;
find "$DEPLOY_PATH" -type f -exec chmod 644 {} \;
print_info "Permissions set"
echo ""

# Verify
print_step "Verifying deployment..."
for file in "index.html" "assets"; do
    if [ ! -e "$DEPLOY_PATH/$file" ]; then
        print_error "Critical file/directory missing: $file"
        exit 1
    fi
done
print_info "All critical files verified"
echo ""

# Test endpoint
print_step "Testing HTTPS endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://portfolio.sdelka.ai/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    print_info "HTTPS test successful (HTTP $HTTP_CODE)"
elif [ "$HTTP_CODE" = "000" ]; then
    print_warning "Could not reach https://portfolio.sdelka.ai (curl failed)"
else
    print_warning "HTTPS test returned HTTP $HTTP_CODE"
fi
echo ""

echo "========================================"
echo -e "${GREEN}   Deployment Completed Successfully!${NC}"
echo "========================================"
echo ""
echo "  Build size:     $BUILD_SIZE"
echo "  Files deployed: $FILE_COUNT"
echo "  Deploy path:    $DEPLOY_PATH"
echo ""
echo "  1. Visit https://portfolio.sdelka.ai"
echo "  2. Hard refresh (Ctrl+Shift+R)"
echo ""
