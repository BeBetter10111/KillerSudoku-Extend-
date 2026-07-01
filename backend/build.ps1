$ErrorActionPreference = 'Stop'

$backendRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$srcRoot = Join-Path $backendRoot 'src/main/java'
$outDir = Join-Path $backendRoot 'out'

New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$javaFiles = Get-ChildItem -Recurse -Path $srcRoot -Filter *.java | Select-Object -ExpandProperty FullName

if (-not $javaFiles) {
    throw 'No Java source files found.'
}

javac -d $outDir @($javaFiles)
Write-Host "Backend compiled successfully to $outDir"
