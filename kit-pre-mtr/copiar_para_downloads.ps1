# Copia os arquivos finais do Kit Pré-MTR para a pasta Downloads (Windows).
# Não sobrescreve nada: se o arquivo já existir, cria uma cópia com sufixo _2, _3...
# Uso (PowerShell): powershell -ExecutionPolicy Bypass -File .\copiar_para_downloads.ps1
$ErrorActionPreference = 'Stop'
$origem = Split-Path -Parent $MyInvocation.MyCommand.Path

# Pasta Downloads real do usuário (respeita a pasta movida para outro disco)
$destino = $null
try {
  $destino = (New-Object -ComObject Shell.Application).Namespace('shell:Downloads').Self.Path
} catch {}
if (-not $destino -or -not (Test-Path $destino)) {
  $destino = Join-Path $env:USERPROFILE 'Downloads'
}
if (-not (Test-Path $destino)) { New-Item -ItemType Directory -Path $destino | Out-Null }

function Copia($arquivo) {
  $base = [IO.Path]::GetFileNameWithoutExtension($arquivo)
  $ext = [IO.Path]::GetExtension($arquivo)
  $alvo = Join-Path $destino $arquivo
  $n = 2
  while (Test-Path $alvo) { $alvo = Join-Path $destino ("{0}_{1}{2}" -f $base, $n, $ext); $n++ }
  Copy-Item (Join-Path $origem $arquivo) $alvo
  $tam = (Get-Item $alvo).Length
  if ($tam -gt 0) { Write-Host "Copiado: $alvo ($tam bytes)" } else { throw "A cópia de $arquivo ficou vazia" }
}

Copia 'Kit_Pre_MTR_15_Formularios.html'
Copia 'Kit_Pre_MTR_15_Formularios.pdf'
Copia 'Kit_Pre_MTR_Formularios_Impressao.pdf'
Copia 'Kit_Pre_MTR_Formularios_Individuais.zip'
