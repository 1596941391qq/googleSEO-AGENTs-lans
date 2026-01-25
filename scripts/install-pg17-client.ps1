# PostgreSQL 17.2 Client Tools Silent Install Script
# Install command-line tools only, does not affect existing PostgreSQL 15 service

param(
  [string]$InstallDir = "C:\Program Files\PostgreSQL\17"
)

$ErrorActionPreference = "Stop"

# Set console output encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

Write-Host "=== PostgreSQL 17.2 Client Tools Installation ===" -ForegroundColor Cyan

# 1. Check administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  throw "Administrator privileges required. Please run PowerShell as Administrator."
}

# 2. Download installer (from official EDB download page)
Write-Host "[1/3] Downloading PostgreSQL 17.2 installer..." -ForegroundColor Yellow

$tempDir = $env:TEMP
$exeName = "postgresql-17.2-1-windows-x64.exe"
$exePath = Join-Path $tempDir $exeName

# Remove existing file if present
if (Test-Path $exePath) {
  Remove-Item $exePath -Force
}

# EDB official download URL (may need to access page to get real link)
# Fallback: manually download and place in temp directory
$downloadUrl = "https://get.enterprisedb.com/postgresql/$exeName"

Write-Host "Downloading from $downloadUrl ..." -ForegroundColor Gray

try {
  # Use -UseBasicParsing to avoid IE engine issues
  $ProgressPreference = 'SilentlyContinue'
  Invoke-WebRequest -Uri $downloadUrl -OutFile $exePath -UseBasicParsing -ErrorAction Stop
  
  # Check file size (should be > 100MB)
  $fileSize = (Get-Item $exePath).Length
  Write-Host "Download complete, file size: $([math]::Round($fileSize/1MB, 2)) MB" -ForegroundColor Green
  
  if ($fileSize -lt 50MB) {
    throw "Downloaded file is too small, may be incomplete. Please download manually: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads"
  }
} catch {
  Write-Host "Auto download failed: $_" -ForegroundColor Red
  Write-Host "Please manually download PostgreSQL 17.2 installer:" -ForegroundColor Yellow
  Write-Host "1. Visit: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads" -ForegroundColor Yellow
  Write-Host "2. Select PostgreSQL 17.2 for Windows x64" -ForegroundColor Yellow
  Write-Host "3. Download and place at: $exePath" -ForegroundColor Yellow
  Write-Host "4. Then run this script again" -ForegroundColor Yellow
  throw
}

# 3. Execute silent installation (command-line tools only)
Write-Host "[2/3] Executing silent installation (command-line tools only)..." -ForegroundColor Yellow

# Build argument string manually to properly quote paths with spaces
$installArgsString = @(
  "--mode unattended",
  "--unattendedmodeui none",
  "--enable-components commandlinetools",
  "--disable-components server,pgAdmin,stackbuilder",
  "--prefix `"$InstallDir`"",
  "--superpassword postgres"
) -join " "

Write-Host "Install arguments: $installArgsString" -ForegroundColor Gray

$process = Start-Process -FilePath $exePath -ArgumentList $installArgsString -Wait -PassThru -NoNewWindow

if ($process.ExitCode -ne 0) {
  Write-Host "Installation failed, exit code: $($process.ExitCode)" -ForegroundColor Red
  Write-Host "If error is 'Installer payload initialization failed', the downloaded file is corrupted, please re-download manually." -ForegroundColor Yellow
  throw "Installation failed"
}

# 4. Verify installation
Write-Host "[3/3] Verifying installation..." -ForegroundColor Yellow

$binPath = Join-Path $InstallDir "bin"
$pgDumpPath = Join-Path $binPath "pg_dump.exe"

if (Test-Path $pgDumpPath) {
  $version = & $pgDumpPath --version
  Write-Host "Installation successful!" -ForegroundColor Green
  Write-Host "PostgreSQL tools path: $binPath" -ForegroundColor Green
  Write-Host "Version info: $version" -ForegroundColor Green
  Write-Host ""
  Write-Host "You can now use the following command to clone remote database:" -ForegroundColor Cyan
  Write-Host "powershell -ExecutionPolicy Bypass -File .\scripts\clone-remote-db.ps1 -PgBinPath `"$binPath`"" -ForegroundColor White
} else {
  throw "pg_dump.exe not found after installation, installation may have failed"
}

# 5. Clean up temporary files
Write-Host ""
Write-Host "Cleaning up temporary files..." -ForegroundColor Gray
Remove-Item $exePath -Force -ErrorAction SilentlyContinue

Write-Host "Done!" -ForegroundColor Green
