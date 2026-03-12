# Migrate-S3Buckets.ps1
# Migrates all objects from a source S3 bucket (old-account profile) to a
# destination S3 bucket (new-account profile), preserving object properties,
# setting ACL to 'bucket-owner-full-control', and logging all activity.

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [string]$SourceBucket,

    [Parameter(Mandatory = $true)]
    [string]$DestinationBucket,

    [string]$SourceProfile    = "old-account",
    [string]$DestProfile      = "new-account",

    # Optional key prefix to migrate only a subfolder (e.g. "images/")
    [string]$Prefix           = "",

    [string]$LogFile          = "S3Migration_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"   # keep going on non-terminating errors

# ---------------------------------------------------------------------------
# Helper: write a timestamped line to both the console and the log file
# ---------------------------------------------------------------------------
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $line = "[{0}] [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
    switch ($Level) {
        "ERROR" { Write-Host $line -ForegroundColor Red    }
        "WARN"  { Write-Host $line -ForegroundColor Yellow }
        default { Write-Host $line -ForegroundColor Cyan   }
    }
    Add-Content -Path $LogFile -Value $line
}

# ---------------------------------------------------------------------------
# Validate that the AWS CLI is available
# ---------------------------------------------------------------------------
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Log "AWS CLI not found. Install it from https://aws.amazon.com/cli/ and ensure it is in your PATH." "ERROR"
    exit 1
}

Write-Log "=== S3 Migration Started ==="
Write-Log "Source      : s3://$SourceBucket  (profile: $SourceProfile)"
Write-Log "Destination : s3://$DestinationBucket  (profile: $DestProfile)"
Write-Log "Log file    : $LogFile"
if ($Prefix) { Write-Log "Key prefix  : $Prefix" }

# ---------------------------------------------------------------------------
# Counters
# ---------------------------------------------------------------------------
$totalObjects = 0
$successCount = 0
$failCount    = 0

# ---------------------------------------------------------------------------
# Step 1: List all objects in the source bucket
# ---------------------------------------------------------------------------
Write-Log "Listing objects in source bucket..."

$listArgs = @(
    "s3api", "list-objects-v2",
    "--bucket", $SourceBucket,
    "--profile", $SourceProfile,
    "--output", "json",
    "--query", "Contents[].Key"
)
if ($Prefix) { $listArgs += @("--prefix", $Prefix) }

try {
    $rawJson = aws @listArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Failed to list objects: $rawJson" "ERROR"
        exit 1
    }
    $objectKeys = $rawJson | ConvertFrom-Json
} catch {
    Write-Log "Error parsing object list: $_" "ERROR"
    exit 1
}

if (-not $objectKeys -or $objectKeys.Count -eq 0) {
    Write-Log "No objects found in source bucket. Nothing to migrate." "WARN"
    exit 0
}

$totalObjects = $objectKeys.Count
Write-Log "Found $totalObjects object(s) to migrate."

# ---------------------------------------------------------------------------
# Step 2: Copy each object, preserving metadata & storage class
# ---------------------------------------------------------------------------
foreach ($key in $objectKeys) {
    Write-Log "Copying: s3://$SourceBucket/$key  -->  s3://$DestinationBucket/$key"

    # 2a. Retrieve the object's metadata and storage class from the source
    try {
        $headJson = aws s3api head-object `
            --bucket $SourceBucket `
            --key    $key `
            --profile $SourceProfile `
            --output json 2>&1

        if ($LASTEXITCODE -ne 0) {
            Write-Log "  head-object failed for '$key': $headJson" "WARN"
            $storageClass = "STANDARD"
            $contentType  = "application/octet-stream"
            $metadata     = $null
        } else {
            $headObj      = $headJson | ConvertFrom-Json
            $storageClass = if ($headObj.PSObject.Properties['StorageClass']) { $headObj.StorageClass } else { "STANDARD" }
            $contentType  = if ($headObj.PSObject.Properties['ContentType'])  { $headObj.ContentType  } else { "application/octet-stream" }
            $metadata     = if ($headObj.PSObject.Properties['Metadata'])     { $headObj.Metadata     } else { $null }
        }
    } catch {
        Write-Log "  Exception reading metadata for '$key': $_" "WARN"
        $storageClass = "STANDARD"
        $contentType  = "application/octet-stream"
        $metadata     = $null
    }

    # 2b. Build the copy-object arguments
    $copyArgs = @(
        "s3api", "copy-object",
        "--copy-source",    "$SourceBucket/$key",
        "--bucket",          $DestinationBucket,
        "--key",             $key,
        "--acl",             "bucket-owner-full-control",
        "--storage-class",   $storageClass,
        "--content-type",    $contentType,
        "--profile",         $DestProfile,
        "--metadata-directive", "REPLACE"
    )

    # Attach user-defined metadata if present
    if ($metadata -and ($metadata | Get-Member -MemberType NoteProperty)) {
        # Convert PSCustomObject to "key1=val1,key2=val2" format expected by AWS CLI
        $metaPairs = ($metadata | Get-Member -MemberType NoteProperty |
            ForEach-Object { "$($_.Name)=$($metadata.$($_.Name))" }) -join ","
        $copyArgs += @("--metadata", $metaPairs)
    }

    # 2c. Execute the copy using the DESTINATION account's profile
    try {
        $copyResult = aws @copyArgs 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "  FAILED '$key': $copyResult" "ERROR"
            $failCount++
        } else {
            Write-Log "  OK '$key' (StorageClass: $storageClass)"
            $successCount++
        }
    } catch {
        Write-Log "  Exception copying '$key': $_" "ERROR"
        $failCount++
    }
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
Write-Log "=== Migration Complete ==="
Write-Log "Total   : $totalObjects"
Write-Log "Success : $successCount"
Write-Log "Failed  : $failCount"

if ($failCount -gt 0) {
    Write-Log "Some objects failed to copy. Review $LogFile for details." "WARN"
    exit 1
}

exit 0
