#!/bin/bash

# Setup Sparse Checkout for Support Staging Monorepo
# This script configures git sparse checkout to work with only one platform at a time

set -e

PLATFORM="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}🔧 Support Staging Monorepo - Sparse Checkout Setup${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

show_usage() {
    echo "Usage: $0 <platform>"
    echo ""
    echo "Available platforms:"
    if [ -d "$REPO_ROOT/platforms" ]; then
        for platform_dir in "$REPO_ROOT/platforms"/*; do
            if [ -d "$platform_dir" ]; then
                platform_name=$(basename "$platform_dir")
                echo "  - $platform_name"
            fi
        done
    else
        echo "  (No platforms directory found)"
    fi
    echo ""
    echo "Examples:"
    echo "  $0 staging      # Setup sparse checkout for staging platform"
    echo "  $0 production   # Setup sparse checkout for production platform"
    echo ""
}

validate_platform() {
    local platform="$1"
    
    if [ -z "$platform" ]; then
        print_error "Platform name is required"
        show_usage
        exit 1
    fi
    
    if [ ! -d "$REPO_ROOT/platforms/$platform" ]; then
        print_error "Platform '$platform' does not exist"
        echo ""
        print_info "Available platforms:"
        for platform_dir in "$REPO_ROOT/platforms"/*; do
            if [ -d "$platform_dir" ]; then
                platform_name=$(basename "$platform_dir")
                echo "  - $platform_name"
            fi
        done
        exit 1
    fi
}

check_git_repo() {
    if [ ! -d "$REPO_ROOT/.git" ]; then
        print_error "Not in a git repository"
        exit 1
    fi
}

setup_sparse_checkout() {
    local platform="$1"
    
    print_info "Setting up sparse checkout for platform: $platform"
    
    # Navigate to repo root
    cd "$REPO_ROOT"
    
    # Enable sparse checkout
    print_info "Enabling sparse checkout..."
    git config core.sparseCheckout true
    
    # Create sparse checkout configuration
    print_info "Configuring sparse checkout patterns..."
    cat > .git/info/sparse-checkout << EOF
# Support Staging Monorepo Sparse Checkout Configuration
# Generated: $(date)
# Platform: $platform

# Include all root files and directories
/*

# Exclude all platforms
!platforms/*

# Include only the selected platform
platforms/$platform/
EOF
    
    # Apply sparse checkout
    print_info "Applying sparse checkout configuration..."
    git read-tree -m -u HEAD
    
    print_success "Sparse checkout configured successfully!"
    
    # Validate the setup
    print_info "Validating sparse checkout setup..."
    if node "$REPO_ROOT/scripts/validate-sparse-checkout.js" --quiet; then
        print_success "Validation passed!"
    else
        print_error "Validation failed!"
        exit 1
    fi
    
    # Show status
    echo ""
    print_info "Current sparse checkout status:"
    echo "  📁 Active Platform: $platform"
    echo "  📂 Platform Path: platforms/$platform/"
    
    # Check platform configuration
    local platform_path="platforms/$platform"
    local config_files=(".cursorrules" "package.json" ".cursor/mcp_settings.json")
    
    echo ""
    print_info "Platform configuration files:"
    for config_file in "${config_files[@]}"; do
        if [ -f "$platform_path/$config_file" ]; then
            print_success "$config_file"
        else
            print_warning "$config_file (missing)"
        fi
    done
    
    echo ""
    print_success "Setup complete! You can now work with the $platform platform."
    echo ""
    print_info "Next steps:"
    echo "  1. Run: npm install"
    echo "  2. Navigate to platform: cd platforms/$platform"
    echo "  3. Start a session: npm run open-session \"session-name\""
    echo ""
}

show_current_status() {
    cd "$REPO_ROOT"
    
    if ! git config core.sparseCheckout >/dev/null 2>&1 || [ "$(git config core.sparseCheckout)" != "true" ]; then
        print_warning "Sparse checkout is not enabled"
        return 1
    fi
    
    if [ ! -f ".git/info/sparse-checkout" ]; then
        print_warning "Sparse checkout configuration not found"
        return 1
    fi
    
    print_info "Current sparse checkout configuration:"
    cat .git/info/sparse-checkout
    
    echo ""
    node "$REPO_ROOT/scripts/validate-sparse-checkout.js" --validate
}

main() {
    print_header
    
    # Check if we're in a git repository
    check_git_repo
    
    # Handle special commands
    case "${1:-}" in
        "status"|"--status")
            show_current_status
            exit 0
            ;;
        "help"|"--help"|"-h")
            show_usage
            exit 0
            ;;
        "")
            print_error "Platform name is required"
            show_usage
            exit 1
            ;;
    esac
    
    # Validate platform
    validate_platform "$PLATFORM"
    
    # Setup sparse checkout
    setup_sparse_checkout "$PLATFORM"
}

# Run main function
main "$@"
