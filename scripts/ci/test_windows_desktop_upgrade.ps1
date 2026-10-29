param(
    [Parameter(Mandatory = $true)][string]$Installer,
    [Parameter(Mandatory = $true)][string]$ExpectedVersion,
    [ValidatePattern('^\d+\.\d+\.\d+$')][string]$PreviousVersion = '0.17.22'
)

# Installs real NSIS packages and therefore runs only on disposable hosted CI.
# Installer UI selection is covered through the actual bundled NsisUpdater in
# release-updater.test.ts. This unattended check exercises payload replacement.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ($env:OS -ne 'Windows_NT' -or $env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted') {
    throw 'The upgrade rehearsal requires a disposable GitHub-hosted Windows runner.'
}
$candidate = (Resolve-Path -LiteralPath $Installer).Path
$sandbox = Join-Path $env:RUNNER_TEMP ('hebri-upgrade-' + [Guid]::NewGuid().ToString('N'))
$installDir = Join-Path $sandbox 'installed'
New-Item -ItemType Directory -Path $sandbox | Out-Null

$previousName = "Hebri-$PreviousVersion-win-x64.exe"
& gh release download "v$PreviousVersion" --repo satoshilove/hebri --pattern $previousName --pattern 'SHA256SUMS.txt' --dir $sandbox
if ($LASTEXITCODE -ne 0) { throw 'Could not download the previous release for upgrade testing.' }
$previous = Join-Path $sandbox $previousName
$checksumPattern = '^[0-9a-fA-F]{64}\s+\*?' + [regex]::Escape($previousName) + '$'
$checksumLine = Get-Content -LiteralPath (Join-Path $sandbox 'SHA256SUMS.txt') |
    Where-Object { $_ -match $checksumPattern }
if (@($checksumLine).Count -ne 1) { throw 'Missing or ambiguous previous-release checksum.' }
$expectedHash = ($checksumLine -split '\s+')[0]
if ((Get-FileHash -LiteralPath $previous -Algorithm SHA256).Hash -ne $expectedHash) {
    throw 'Previous-release installer checksum mismatch.'
}
$signature = Get-AuthenticodeSignature -LiteralPath $previous
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notlike '*CN=Synapsek Labs Pty Ltd*') {
    throw 'Previous-release installer does not have the expected valid signature.'
}

function Install-Package([string]$File, [switch]$Update) {
    # /D must be last and deliberately unquoted inside the NSIS argument string.
    $arguments = '/S /currentuser /NODESKTOPSHORTCUT'
    if ($Update) { $arguments += ' --updated' }
    $arguments += " /D=$installDir"
    $process = Start-Process -FilePath $File -ArgumentList $arguments -PassThru -WindowStyle Hidden
    if (-not $process.WaitForExit(180000)) { throw 'Installer exceeded the three-minute deadline.' }
    $process.Refresh()
    if ($process.ExitCode -ne 0) { throw "Installer failed with exit code $($process.ExitCode)." }
}

function Assert-Version([string]$Version) {
    $binary = Join-Path $installDir 'Hebri.exe'
    $actual = (Get-Item -LiteralPath $binary).VersionInfo.ProductVersion
    # Windows PE resources encode the fourth (revision) component even when
    # the desktop's semantic version has only three components.
    if ($actual -notin @($Version, "$Version.0")) {
        throw "Expected installed version $Version, found $actual."
    }
}

Install-Package $previous
Assert-Version $PreviousVersion
# Check both real application-data locations survive an in-place upgrade.
$markers = @()
foreach ($parent in @($env:APPDATA, $env:LOCALAPPDATA)) {
    $profileDir = Join-Path $parent 'hebri'
    New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
    $marker = Join-Path $profileDir ('upgrade-check-' + [Guid]::NewGuid().ToString('N') + '.txt')
    [IO.File]::WriteAllText($marker, 'preserve-existing-profile')
    $markers += $marker
}
Install-Package $candidate -Update
Assert-Version $ExpectedVersion
foreach ($marker in $markers) {
    if ([IO.File]::ReadAllText($marker) -ne 'preserve-existing-profile') { throw 'Upgrade changed application data.' }
}
Write-Host "PASS: real NSIS upgrade $PreviousVersion -> $ExpectedVersion; both application-data markers preserved."
