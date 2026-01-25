param(
  [string]$PgBinPath = "",
  [string]$LocalDbName = "postgres",
  [string]$LocalUser = "postgres",
  [string]$LocalPassword = "123456",
  [string]$DumpFile = ".\backup.dump"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "[1/5] Resolving PostgreSQL bin path..."
if ($PgBinPath -and (Test-Path -LiteralPath $PgBinPath)) {
  $resolvedBin = $PgBinPath
} elseif ($PgBinPath) {
  throw "PostgreSQL bin path not found: $PgBinPath (update -PgBinPath)"
} else {
  $candidateRoots = @(
    "C:\Program Files\PostgreSQL",
    "C:\Program Files (x86)\PostgreSQL"
  )
  $resolvedBin = $null
  foreach ($root in $candidateRoots) {
    if (Test-Path -LiteralPath $root) {
      $versionDirs = Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue |
        Sort-Object -Property Name -Descending
      foreach ($dir in $versionDirs) {
        $binPath = Join-Path $dir.FullName "bin"
        if (Test-Path -LiteralPath $binPath) {
          $resolvedBin = $binPath
          break
        }
      }
    }
    if ($resolvedBin) { break }
  }
  if (-not $resolvedBin) {
    throw "PostgreSQL bin path not found. Please pass -PgBinPath like `"C:\Program Files\PostgreSQL\15\bin`"."
  }
}
Write-Host "[1/5] Using PostgreSQL bin: $resolvedBin"
$env:Path += ";$resolvedBin"

Write-Host "[2/5] Reading remote POSTGRES_URL from .env..."
if (-not (Test-Path -LiteralPath ".\.env")) {
  throw ".env not found in current directory."
}
$remoteLine = (Get-Content .\.env | Where-Object { $_ -match '^POSTGRES_URL=' } | Select-Object -First 1)
$remote = $remoteLine -replace '^POSTGRES_URL=',''
$remote = $remote.Trim().Trim('"').Trim("'")
if (-not $remote) {
  throw "POSTGRES_URL not found in .env"
}

Write-Host "[3/5] Checking server/client versions..."
$pgDumpVersionRaw = (& pg_dump --version) 2>$null
$pgDumpMajor = ($pgDumpVersionRaw -replace '[^\d\.]', '').Split('.')[0]
$serverVersionRaw = (& psql --dbname="$remote" -Atc "SHOW server_version;") 2>$null
$serverMajor = $serverVersionRaw.Split('.')[0]
if ($pgDumpMajor -and $serverMajor -and ($pgDumpMajor -ne $serverMajor)) {
  throw "pg_dump major version ($pgDumpMajor) does not match server ($serverMajor). Install PostgreSQL $serverMajor client tools and pass -PgBinPath to that bin folder."
}

Write-Host "[3/5] Dumping remote database to $DumpFile ..."
pg_dump --dbname="$remote" --format=c --file="$DumpFile"

Write-Host "[4/5] Recreating local database $LocalDbName ..."
$env:PGPASSWORD = $LocalPassword

# First, terminate all connections to the database (if it exists)
Write-Host "Terminating existing connections..." -ForegroundColor Gray
$terminateQuery = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$LocalDbName' AND pid <> pg_backend_pid();"
& psql -h 127.0.0.1 -U $LocalUser -d postgres -c $terminateQuery 2>$null | Out-Null

# Wait a moment for connections to close
Start-Sleep -Seconds 2

# Drop database (ignore errors if it doesn't exist)
Write-Host "Dropping database (if exists)..." -ForegroundColor Gray
$dropResult = & dropdb -h 127.0.0.1 -U $LocalUser $LocalDbName 2>&1
if ($LASTEXITCODE -ne 0 -and $dropResult -notmatch "does not exist") {
  Write-Host "Warning: dropdb failed, but continuing..." -ForegroundColor Yellow
  Write-Host $dropResult -ForegroundColor Gray
}

# Create database
Write-Host "Creating database..." -ForegroundColor Gray
& createdb -h 127.0.0.1 -U $LocalUser $LocalDbName
if ($LASTEXITCODE -ne 0) {
  throw "Failed to create database. It may already exist and be in use."
}

Write-Host "[5/5] Restoring dump into local database..."
Write-Host "Note: Using --no-owner and --no-privileges to avoid permission errors (data will still be imported)" -ForegroundColor Yellow
pg_restore -h 127.0.0.1 -U $LocalUser -d $LocalDbName --no-owner --no-privileges --verbose "$DumpFile" 2>&1 | ForEach-Object {
  if ($_ -match "error:") {
    Write-Host $_ -ForegroundColor Yellow
  } else {
    Write-Host $_ -ForegroundColor Gray
  }
}

Write-Host "Done. Update POSTGRES_URL to local:"
Write-Host "POSTGRES_URL=postgres://${LocalUser}:${LocalPassword}@127.0.0.1:5432/${LocalDbName}"
