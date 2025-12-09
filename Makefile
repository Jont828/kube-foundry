.PHONY: install dev dev-frontend dev-backend build compile lint test clean help

# Default target
help:
	@echo "KubeFoundry Development Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  install           Install all dependencies"
	@echo "  dev               Start frontend and backend dev servers"
	@echo "  dev-frontend      Start frontend dev server only"
	@echo "  dev-backend       Start backend dev server only"
	@echo "  build             Build all packages"
	@echo "  compile           Build single binary executable"
	@echo "  compile-all       Cross-compile for all platforms"
	@echo "  compile-linux     Cross-compile for Linux (x64 + arm64)"
	@echo "  compile-darwin    Cross-compile for macOS (x64 + arm64)"
	@echo "  compile-windows   Cross-compile for Windows (x64)"
	@echo "  lint              Run linters"
	@echo "  test              Run tests"
	@echo "  clean             Remove build artifacts and node_modules"
	@echo "  help              Show this help message"

# Install dependencies
install:
	bun install

# Development servers
dev:
	bun run dev

dev-frontend:
	bun run dev:frontend

dev-backend:
	bun run dev:backend

# Build
build:
	bun run build

# Compile single binary (includes frontend)
compile:
	bun run compile
	@echo ""
	@echo "✅ Binary created: dist/kubefoundry (includes frontend)"
	@ls -lh dist/kubefoundry

# Cross-compile for all platforms
compile-all: compile-linux compile-darwin compile-windows
	@echo ""
	@echo "✅ All binaries created in dist/"
	@ls -lh dist/

compile-linux:
	bun run build:frontend
	cd backend && bun run compile:linux-x64
	cd backend && bun run compile:linux-arm64
	@echo "✅ Linux binaries created"

compile-darwin:
	bun run build:frontend
	cd backend && bun run compile:darwin-x64
	cd backend && bun run compile:darwin-arm64
	@echo "✅ macOS binaries created"

compile-windows:
	bun run build:frontend
	cd backend && bun run compile:windows-x64
	@echo "✅ Windows binary created"

# Linting
lint:
	bun run lint

# Testing
test:
	bun run test

# Clean build artifacts
clean:
	rm -rf node_modules frontend/node_modules backend/node_modules shared/node_modules
	rm -rf dist frontend/dist backend/dist shared/dist
	rm -f bun.lockb
	@echo "✅ Cleaned all build artifacts"
