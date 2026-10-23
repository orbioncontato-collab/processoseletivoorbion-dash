# Cria a pasta Downloads\Kit_10_Relatorios_Gestao_Residuos (Windows) e copia
# para ela os arquivos finais do Kit de 10 Relatórios.
# Não sobrescreve nada: se a pasta já existir, cria Kit_10_Relatorios_Gestao_Residuos_2, _3...
# Uso (PowerShell): powershell -ExecutionPolicy Bypass -File .\copiar_para_downloads.ps1
$ErrorActionPreference = 'Stop'
$origem = Split-Path -Parent $MyInvocation.MyCommand.Path
$nome = 'Kit_10_Relatorios_Gestao_Residuos'

# Pasta Downloads real do usuário (respeita a pasta movida para outro disco)
$downloads = $null
try { $downloads = (New-Object -ComObject Shell.Application).Namespace('shell:Downloads').Self.Path } catch {}
if (-not $downloads -or -not (Test-Path $downloads)) { $downloads = Join-Path $env:USERPROFILE 'Downloads' }
if (-not (Test-Path $downloads)) { New-Item -ItemType Directory -Path $downloads | Out-Null }

$destino = Join-Path $downloads $nome
$n = 2
while (Test-Path $destino) { $destino = Join-Path $downloads ("{0}_{1}" -f $nome, $n); $n++ }
New-Item -ItemType Directory -Path $destino | Out-Null

foreach ($arq in 'Kit_10_Relatorios_Gestao_Residuos.html', 'Kit_10_Relatorios_Gestao_Residuos.pdf', 'LEIA-ME.txt') {
  Copy-Item (Join-Path $origem $arq) $destino
}
Copy-Item (Join-Path $origem 'Relatorios_Individuais') $destino -Recurse

# Confere se tudo chegou com tamanho maior que zero
$arquivos = Get-ChildItem $destino -Recurse -File
$vazios = $arquivos | Where-Object { $_.Length -eq 0 }
if ($vazios) { throw "Arquivos vazios: $($vazios.FullName -join ', ')" }
Write-Host "Pasta criada: $destino"
Write-Host "$($arquivos.Count) arquivos copiados"
