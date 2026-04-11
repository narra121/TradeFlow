<#
.SYNOPSIS
    Build and deploy TradeQut frontend to DEV (dev.tradequt.com)
#>

param(
    [string]$AwsCli = "C:\Program Files\Amazon\AWSCLIV2\aws.exe",
    [string]$Bucket = "tradequt.com-dev",
    [string]$DistributionId = "" # Set after running setup-cloudfront.ps1
)

$ErrorActionPreference = "Stop"

if (-not $DistributionId) {
    Write-Host "ERROR: Set the DistributionId parameter or update the default in this script" -ForegroundColor Red
    Write-Host "Run infra/setup-cloudfront.ps1 first to create CloudFront distributions" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== Deploying to DEV (dev.tradequt.com) ===" -ForegroundColor Cyan

# Step 1: Build
Write-Host "`n[1/3] Building for development..." -ForegroundColor Yellow
bun run build:dev
if ($LASTEXITCODE -ne 0) { Write-Host "Build failed" -ForegroundColor Red; exit 1 }

# Step 2: Sync to S3
Write-Host "`n[2/3] Syncing to S3..." -ForegroundColor Yellow
& $AwsCli s3 sync ./dist "s3://$Bucket" --delete --region us-east-1
if ($LASTEXITCODE -ne 0) { Write-Host "S3 sync failed" -ForegroundColor Red; exit 1 }

# Set cache headers: long cache for hashed assets, short for index.html
& $AwsCli s3 cp "s3://$Bucket/index.html" "s3://$Bucket/index.html" `
    --metadata-directive REPLACE `
    --cache-control "no-cache, no-store, must-revalidate" `
    --content-type "text/html" `
    --region us-east-1

& $AwsCli s3 cp "s3://$Bucket/assets/" "s3://$Bucket/assets/" `
    --recursive `
    --metadata-directive REPLACE `
    --cache-control "public, max-age=31536000, immutable" `
    --region us-east-1

# Step 3: Invalidate CloudFront cache
Write-Host "`n[3/3] Invalidating CloudFront cache..." -ForegroundColor Yellow
& $AwsCli cloudfront create-invalidation `
    --distribution-id $DistributionId `
    --paths "/*" `
    --output json | Out-Null

Write-Host "`n=== DEV deployment complete ===" -ForegroundColor Green
Write-Host "Site: https://dev.tradequt.com" -ForegroundColor White
