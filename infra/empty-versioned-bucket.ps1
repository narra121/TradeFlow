param([string]$Bucket)
$aws = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"

# Delete all object versions
$versions = & $aws s3api list-object-versions --bucket $Bucket --query "Versions[].{Key:Key,VersionId:VersionId}" --output json | ConvertFrom-Json
if ($versions) {
    foreach ($v in $versions) {
        & $aws s3api delete-object --bucket $Bucket --key $v.Key --version-id $v.VersionId | Out-Null
    }
    Write-Host "Deleted $($versions.Count) object versions"
}

# Delete all delete markers
$markers = & $aws s3api list-object-versions --bucket $Bucket --query "DeleteMarkers[].{Key:Key,VersionId:VersionId}" --output json | ConvertFrom-Json
if ($markers) {
    foreach ($m in $markers) {
        & $aws s3api delete-object --bucket $Bucket --key $m.Key --version-id $m.VersionId | Out-Null
    }
    Write-Host "Deleted $($markers.Count) delete markers"
}

# Delete bucket
& $aws s3api delete-bucket --bucket $Bucket
Write-Host "Bucket $Bucket deleted"
