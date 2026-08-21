$NodeVersion = "v22.14.0"
$NodeZip = "node-$NodeVersion-win-x64.zip"
$NodeUrl = "https://nodejs.org/dist/$NodeVersion/$NodeZip"
$InstallDir = "node_portable"
$NodeExtractDir = "$InstallDir\node-$NodeVersion-win-x64"
$NpmCmd = "$NodeExtractDir\npm.cmd"

if (-Not (Test-Path $NpmCmd)) {
    Write-Host "Downloading Node.js portable ($NodeVersion)..."
    Invoke-WebRequest -Uri $NodeUrl -OutFile $NodeZip
    Write-Host "Extracting..."
    Expand-Archive -Path $NodeZip -DestinationPath $InstallDir -Force
    Remove-Item $NodeZip
}

$env:Path = "$((Get-Item -Path $NodeExtractDir).FullName);$env:Path"

Write-Host "Installing dependencies..."
& $NpmCmd install

Write-Host "Starting Vite development server..."
& $NpmCmd run dev
