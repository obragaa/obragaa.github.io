# Gera assets/vendor/three.slim.min.js a partir de entrada.js (tree-shaking).
# Roda OFFLINE, uma vez, na máquina de quem desenvolve — o site publicado segue
# estático, sem build. Requer Node; baixa three e esbuild só nesta pasta.
#
# Uso:  powershell -ExecutionPolicy Bypass -File gerar.ps1
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Test-Path package.json)) { npm init -y | Out-Null }
npm install --no-audit --no-fund three@0.186.1 esbuild@0.25.4 | Out-Null

npx esbuild entrada.js --bundle --minify --format=esm --target=es2022 `
  --outfile=..\..\assets\vendor\three.slim.min.js --legal-comments=inline

$kb = [math]::Round((Get-Item ..\..\assets\vendor\three.slim.min.js).Length / 1KB)
Write-Host "Gerado assets/vendor/three.slim.min.js ($kb KB)"
