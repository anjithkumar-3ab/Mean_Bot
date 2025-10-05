# Azure Deployment Pre-Check Script
# Run this before deploying to Azure to verify your setup

Write-Host "`n=== Azure Deployment Pre-Check ===" -ForegroundColor Cyan
Write-Host "This script will verify your deployment is ready for Azure`n" -ForegroundColor Gray

$errors = 0
$warnings = 0

# Check Node.js
Write-Host "Checking Node.js..." -NoNewline
try {
    $nodeVersion = node --version
    if ($nodeVersion -match "v(\d+)\.") {
        $majorVersion = [int]$Matches[1]
        if ($majorVersion -ge 16) {
            Write-Host " OK ($nodeVersion)" -ForegroundColor Green
        } else {
            Write-Host " WARNING: Version $nodeVersion (recommend v16+)" -ForegroundColor Yellow
            $warnings++
        }
    }
} catch {
    Write-Host " ERROR: Node.js not found" -ForegroundColor Red
    $errors++
}

# Check npm
Write-Host "Checking npm..." -NoNewline
try {
    $npmVersion = npm --version
    Write-Host " OK ($npmVersion)" -ForegroundColor Green
} catch {
    Write-Host " ERROR: npm not found" -ForegroundColor Red
    $errors++
}

# Check Git
Write-Host "Checking Git..." -NoNewline
try {
    $gitVersion = git --version
    Write-Host " OK ($gitVersion)" -ForegroundColor Green
} catch {
    Write-Host " WARNING: Git not found (needed for deployment)" -ForegroundColor Yellow
    $warnings++
}

# Check package.json
Write-Host "Checking package.json..." -NoNewline
if (Test-Path "package.json") {
    $pkg = Get-Content "package.json" | ConvertFrom-Json
    if ($pkg.scripts.start) {
        Write-Host " OK (start script found)" -ForegroundColor Green
    } else {
        Write-Host " ERROR: No start script defined" -ForegroundColor Red
        $errors++
    }
} else {
    Write-Host " ERROR: package.json not found" -ForegroundColor Red
    $errors++
}

# Check required files
Write-Host "Checking deployment files..." -NoNewline
$requiredFiles = @("server.js", "web.config", ".deployment")
$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}
if ($missingFiles.Count -eq 0) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " WARNING: Missing files: $($missingFiles -join ', ')" -ForegroundColor Yellow
    $warnings++
}

# Check GitHub workflow
Write-Host "Checking GitHub Actions workflow..." -NoNewline
if (Test-Path ".github\workflows\azure-deploy.yml") {
    $workflow = Get-Content ".github\workflows\azure-deploy.yml" -Raw
    if ($workflow -match "AZURE_WEBAPP_NAME:\s*your-app-name") {
        Write-Host " WARNING: Update AZURE_WEBAPP_NAME in workflow" -ForegroundColor Yellow
        $warnings++
    } else {
        Write-Host " OK" -ForegroundColor Green
    }
} else {
    Write-Host " WARNING: GitHub Actions workflow not found" -ForegroundColor Yellow
    $warnings++
}

# Check .env file
Write-Host "Checking .env configuration..." -NoNewline
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    $requiredEnvVars = @(
        "TELEGRAM_BOT_TOKEN",
        "MONGODB_URI",
        "ENCRYPTION_KEY"
    )
    $missingEnvVars = @()
    foreach ($var in $requiredEnvVars) {
        if ($envContent -notmatch "$var=.+") {
            $missingEnvVars += $var
        }
    }
    if ($missingEnvVars.Count -eq 0) {
        Write-Host " OK (remember to set these in Azure Portal)" -ForegroundColor Green
    } else {
        Write-Host " WARNING: Missing vars: $($missingEnvVars -join ', ')" -ForegroundColor Yellow
        $warnings++
    }
    
    # Check HEADLESS_MODE
    if ($envContent -match "HEADLESS_MODE=false") {
        Write-Host "  → INFO: Local .env has HEADLESS_MODE=false (OK for local dev)" -ForegroundColor Cyan
        Write-Host "    Remember to set HEADLESS_MODE=true in Azure!" -ForegroundColor Yellow
    }
} else {
    Write-Host " WARNING: .env file not found (use .env.azure.example)" -ForegroundColor Yellow
    $warnings++
}

# Check .gitignore
Write-Host "Checking .gitignore..." -NoNewline
if (Test-Path ".gitignore") {
    $gitignore = Get-Content ".gitignore" -Raw
    if ($gitignore -match "\.env" -and $gitignore -match "node_modules") {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " WARNING: .gitignore might be incomplete" -ForegroundColor Yellow
        $warnings++
    }
} else {
    Write-Host " WARNING: .gitignore not found" -ForegroundColor Yellow
    $warnings++
}

# Check dependencies
Write-Host "Checking dependencies..." -NoNewline
if (Test-Path "node_modules") {
    Write-Host " OK (installed)" -ForegroundColor Green
} else {
    Write-Host " WARNING: Run 'npm install' first" -ForegroundColor Yellow
    $warnings++
}

# Azure CLI check
Write-Host "Checking Azure CLI (optional)..." -NoNewline
try {
    $azVersion = az --version 2>$null | Select-Object -First 1
    Write-Host " OK (installed)" -ForegroundColor Green
} catch {
    Write-Host " INFO: Not installed (optional)" -ForegroundColor Gray
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "✅ All checks passed! Ready for deployment." -ForegroundColor Green
} elseif ($errors -eq 0) {
    Write-Host "⚠️  $warnings warning(s) found. Review above." -ForegroundColor Yellow
} else {
    Write-Host "❌ $errors error(s) and $warnings warning(s) found." -ForegroundColor Red
}

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Create Azure App Service at https://portal.azure.com" -ForegroundColor Gray
Write-Host "2. Create MongoDB Atlas cluster at https://cloud.mongodb.com" -ForegroundColor Gray
Write-Host "3. Configure environment variables in Azure Portal" -ForegroundColor Gray
Write-Host "4. Set up GitHub Actions secrets" -ForegroundColor Gray
Write-Host "5. Push to GitHub to trigger deployment" -ForegroundColor Gray
Write-Host "`nSee AZURE_DEPLOYMENT_GUIDE.md for detailed instructions`n" -ForegroundColor Gray
