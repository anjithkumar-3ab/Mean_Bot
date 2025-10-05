#!/bin/bash

# Attendance Automation System - Quick Deployment Script
# This script helps prepare your project for cloud deployment

echo "======================================"
echo "Attendance Automation - Deployment Prep"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Initializing Git repository...${NC}"
    git init
    echo -e "${GREEN}✓ Git initialized${NC}"
else
    echo -e "${GREEN}✓ Git already initialized${NC}"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}✗ .env file not found${NC}"
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ .env created. Please update with your credentials${NC}"
    else
        echo -e "${RED}✗ .env.example not found${NC}"
    fi
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Check required files
echo ""
echo "Checking deployment files..."

files=("Procfile" "ecosystem.config.js" "render.yaml" "railway.json" ".gitignore")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file${NC}"
    else
        echo -e "${RED}✗ $file missing${NC}"
    fi
done

# Check package.json has engines
echo ""
echo "Checking package.json..."
if grep -q "engines" package.json; then
    echo -e "${GREEN}✓ Node.js engines specified${NC}"
else
    echo -e "${YELLOW}⚠ Node.js engines not specified${NC}"
fi

# Commit changes
echo ""
echo -e "${YELLOW}Do you want to commit all changes? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    git add .
    git commit -m "Prepare for cloud deployment"
    echo -e "${GREEN}✓ Changes committed${NC}"
fi

# Display next steps
echo ""
echo "======================================"
echo "Next Steps:"
echo "======================================"
echo "1. Push to GitHub:"
echo "   git remote add origin https://github.com/yourusername/repo.git"
echo "   git push -u origin main"
echo ""
echo "2. Setup MongoDB Atlas (FREE):"
echo "   - Visit: https://www.mongodb.com/cloud/atlas"
echo "   - Create cluster and get connection string"
echo ""
echo "3. Choose deployment platform:"
echo "   • Render (FREE): https://render.com"
echo "   • Railway (FREE): https://railway.app"
echo "   • Heroku (PAID): https://heroku.com"
echo ""
echo "4. Read DEPLOYMENT_GUIDE.md for detailed instructions"
echo ""
echo -e "${GREEN}Preparation complete!${NC}"
