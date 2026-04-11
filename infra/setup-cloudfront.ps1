<#
.SYNOPSIS
    Creates CloudFront distributions and Route 53 records for tradequt.com
    Run this AFTER the ACM certificate has been validated (nameservers pointed to Route 53)
#>

param(
    [string]$AwsCli = "C:\Program Files\Amazon\AWSCLIV2\aws.exe",
    [string]$Region = "us-east-1",
    [string]$HostedZoneId = "Z00955773GZIPKHCD66GR",
    [string]$CertArn = "arn:aws:acm:us-east-1:675016865482:certificate/46a1a4e3-507c-4e7c-a5cf-36bab5be4f2a",
    [string]$OacId = "ETMIE2QI4KCLY"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n=== TradeQut CloudFront Setup ===" -ForegroundColor Cyan

# Step 1: Check certificate status
Write-Host "`n[1/5] Checking ACM certificate status..." -ForegroundColor Yellow
$certStatus = & $AwsCli acm describe-certificate `
    --certificate-arn $CertArn `
    --region $Region `
    --query "Certificate.Status" `
    --output text

if ($certStatus -ne "ISSUED") {
    Write-Host "ERROR: Certificate status is '$certStatus'. It must be 'ISSUED' before proceeding." -ForegroundColor Red
    Write-Host "Make sure nameservers in Hostinger are pointing to Route 53 and wait for DNS propagation." -ForegroundColor Red
    exit 1
}
Write-Host "Certificate is ISSUED. Proceeding..." -ForegroundColor Green

# Step 2: Create PROD CloudFront distribution
Write-Host "`n[2/5] Creating PROD CloudFront distribution..." -ForegroundColor Yellow
$prodResult = & $AwsCli cloudfront create-distribution `
    --distribution-config "file://$ScriptDir/cf-prod.json" `
    --output json | ConvertFrom-Json

$prodDistId = $prodResult.Distribution.Id
$prodDomain = $prodResult.Distribution.DomainName
Write-Host "PROD Distribution: $prodDistId ($prodDomain)" -ForegroundColor Green

# Step 3: Create DEV CloudFront distribution
Write-Host "`n[3/5] Creating DEV CloudFront distribution..." -ForegroundColor Yellow
$devResult = & $AwsCli cloudfront create-distribution `
    --distribution-config "file://$ScriptDir/cf-dev.json" `
    --output json | ConvertFrom-Json

$devDistId = $devResult.Distribution.Id
$devDomain = $devResult.Distribution.DomainName
Write-Host "DEV Distribution: $devDistId ($devDomain)" -ForegroundColor Green

# Step 4: Add S3 bucket policies for OAC
Write-Host "`n[4/5] Adding S3 bucket policies for CloudFront OAC..." -ForegroundColor Yellow

$prodBucketPolicy = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Sid = "AllowCloudFrontServicePrincipalReadOnly"
            Effect = "Allow"
            Principal = @{ Service = "cloudfront.amazonaws.com" }
            Action = "s3:GetObject"
            Resource = "arn:aws:s3:::tradequt.com-prod/*"
            Condition = @{
                StringEquals = @{
                    "AWS:SourceArn" = "arn:aws:cloudfront::675016865482:distribution/$prodDistId"
                }
            }
        }
    )
} | ConvertTo-Json -Depth 10

$prodPolicyFile = "$ScriptDir/s3-policy-prod.json"
$prodBucketPolicy | Out-File -FilePath $prodPolicyFile -Encoding utf8

& $AwsCli s3api put-bucket-policy --bucket tradequt.com-prod --policy "file://$prodPolicyFile"
Write-Host "PROD bucket policy applied" -ForegroundColor Green

$devBucketPolicy = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Sid = "AllowCloudFrontServicePrincipalReadOnly"
            Effect = "Allow"
            Principal = @{ Service = "cloudfront.amazonaws.com" }
            Action = "s3:GetObject"
            Resource = "arn:aws:s3:::tradequt.com-dev/*"
            Condition = @{
                StringEquals = @{
                    "AWS:SourceArn" = "arn:aws:cloudfront::675016865482:distribution/$devDistId"
                }
            }
        }
    )
} | ConvertTo-Json -Depth 10

$devPolicyFile = "$ScriptDir/s3-policy-dev.json"
$devBucketPolicy | Out-File -FilePath $devPolicyFile -Encoding utf8

& $AwsCli s3api put-bucket-policy --bucket tradequt.com-dev --policy "file://$devPolicyFile"
Write-Host "DEV bucket policy applied" -ForegroundColor Green

# Step 5: Create Route 53 alias records
Write-Host "`n[5/5] Creating Route 53 alias records..." -ForegroundColor Yellow

# CloudFront hosted zone ID is always Z2FDTNDATAQYW2
$cfHostedZone = "Z2FDTNDATAQYW2"

$dnsChanges = @{
    Changes = @(
        @{
            Action = "UPSERT"
            ResourceRecordSet = @{
                Name = "tradequt.com."
                Type = "A"
                AliasTarget = @{
                    HostedZoneId = $cfHostedZone
                    DNSName = $prodDomain
                    EvaluateTargetHealth = $false
                }
            }
        },
        @{
            Action = "UPSERT"
            ResourceRecordSet = @{
                Name = "www.tradequt.com."
                Type = "A"
                AliasTarget = @{
                    HostedZoneId = $cfHostedZone
                    DNSName = $prodDomain
                    EvaluateTargetHealth = $false
                }
            }
        },
        @{
            Action = "UPSERT"
            ResourceRecordSet = @{
                Name = "dev.tradequt.com."
                Type = "A"
                AliasTarget = @{
                    HostedZoneId = $cfHostedZone
                    DNSName = $devDomain
                    EvaluateTargetHealth = $false
                }
            }
        }
    )
} | ConvertTo-Json -Depth 10

$dnsFile = "$ScriptDir/dns-records.json"
$dnsChanges | Out-File -FilePath $dnsFile -Encoding utf8

& $AwsCli route53 change-resource-record-sets `
    --hosted-zone-id $HostedZoneId `
    --change-batch "file://$dnsFile"

Write-Host "DNS records created" -ForegroundColor Green

# Summary
Write-Host "`n=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "PROD Distribution ID: $prodDistId" -ForegroundColor White
Write-Host "PROD Domain: tradequt.com, www.tradequt.com -> $prodDomain" -ForegroundColor White
Write-Host "DEV  Distribution ID: $devDistId" -ForegroundColor White
Write-Host "DEV  Domain: dev.tradequt.com -> $devDomain" -ForegroundColor White
Write-Host "`nIMPORTANT: Save these distribution IDs!" -ForegroundColor Yellow
Write-Host "  Update deploy-frontend-dev.ps1 and deploy-frontend-prod.ps1 with the distribution IDs" -ForegroundColor Yellow
Write-Host "  Update GitHub Actions secrets: CF_DISTRIBUTION_ID_DEV and CF_DISTRIBUTION_ID_PROD" -ForegroundColor Yellow
Write-Host "`nCloudFront distributions take 10-30 minutes to deploy. Check status with:" -ForegroundColor Yellow
Write-Host "  aws cloudfront get-distribution --id $prodDistId --query 'Distribution.Status'" -ForegroundColor Gray
Write-Host "  aws cloudfront get-distribution --id $devDistId --query 'Distribution.Status'" -ForegroundColor Gray
