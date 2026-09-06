# Build a downloadable Velora Android APK (debug = install without Play Store signing setup).
# Requires: Android Studio (SDK) + JDK 17
# Usage: .\scripts\build-android-apk.ps1
#        .\scripts\build-android-apk.ps1 -BuildType release

param(
    [ValidateSet('debug', 'release')]
    [string]$BuildType = 'debug'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Frontend = Join-Path $Root 'frontend'
$Android = Join-Path $Frontend 'android'
$Releases = Join-Path $Root 'releases'

function Find-Jdk17 {
    $candidates = @(
        $env:JAVA_HOME,
        'C:\Program Files\Android\Android Studio\jbr',
        'C:\Program Files\Java\jdk-17',
        'C:\Program Files\Eclipse Adoptium\jdk-17*'
    ) | Where-Object { $_ }
    foreach ($c in $candidates) {
        $resolved = if ($c -like '*`**') { (Get-Item $c -ErrorAction SilentlyContinue | Select-Object -First 1).FullName } else { $c }
        if ($resolved -and (Test-Path (Join-Path $resolved 'bin\java.exe'))) {
            return $resolved
        }
    }
    return $null
}

Write-Host '==> Building Velora web bundle for mobile...' -ForegroundColor Cyan
Push-Location $Frontend
if (-not (Test-Path '.env.mobile')) {
    Copy-Item '.env.mobile.example' '.env.mobile'
    Write-Host 'Created .env.mobile from example — set VITE_API_URL if needed.' -ForegroundColor Yellow
}
npm run build:mobile
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
npx cap sync android
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Pop-Location

$jdk = Find-Jdk17
if (-not $jdk) {
    Write-Host ''
    Write-Host 'JDK 17 not found. Install Android Studio, then set JAVA_HOME to its JBR folder, e.g.:' -ForegroundColor Red
    Write-Host '  C:\Program Files\Android\Android Studio\jbr' -ForegroundColor Yellow
    exit 1
}
$env:JAVA_HOME = $jdk
Write-Host "==> Using JAVA_HOME=$jdk" -ForegroundColor Cyan

$sdk = $env:ANDROID_HOME
if (-not $sdk) {
    $sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
}
if (-not (Test-Path $sdk)) {
    Write-Host 'Android SDK not found. Open Android Studio once and install SDK Platform 35.' -ForegroundColor Red
    exit 1
}
$env:ANDROID_HOME = $sdk

$task = if ($BuildType -eq 'release') { 'assembleRelease' } else { 'assembleDebug' }
Write-Host "==> Gradle $task ..." -ForegroundColor Cyan
Push-Location $Android
.\gradlew.bat $task --no-daemon
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Pop-Location

$apkDir = Join-Path $Android "app\build\outputs\apk\$BuildType"
$apk = Get-ChildItem -Path $apkDir -Filter '*.apk' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $apk) {
    Write-Host "No APK found in $apkDir" -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force -Path $Releases | Out-Null
$destName = "Velora-1.0.0-$BuildType.apk"
$dest = Join-Path $Releases $destName
Copy-Item $apk.FullName $dest -Force

Write-Host ''
Write-Host 'Done! Install this file on your phone:' -ForegroundColor Green
Write-Host "  $dest"
Write-Host ''
Write-Host 'On the phone: enable Install unknown apps, open the APK, allow permissions.' -ForegroundColor Cyan
