<#
.SYNOPSIS
  Restaura desde git los archivos VERSIONADOS que quedaron en 0 bytes en el working tree.

.DESCRIPTION
  Incidente 19/08/2026: ~48 archivos de la raiz del repo aparecieron truncados a 0 bytes
  (package.json, tsconfig.base.json, AGENTS.md, LOOP.md, opencode.json, ...) con mtimes
  agrupados en 3 segundos. Firma tipica de apagado sucio en NTFS: los metadatos se
  escribieron pero los datos no. El resto del arbol (packages/, apps/, docs/, scripts/,
  .opencode/) quedo intacto y .git conserva los objetos.

  Este script NO hace 'git restore .' (eso destruiria el WIP de las sesiones concurrentes).
  Solo toca archivos cuyo contenido actual esta VACIO -> no hay nada que perder.

.PARAMETER Apply
  Sin este flag el script solo informa (dry-run). Con -Apply restaura de verdad.

.PARAMETER BaseCommit
  Commit anterior al incidente (default 63ad94b). Se usa para detectar truncados que SI
  llegaron a commitearse: p.ej. loop-run-log.md perdio su historico y el commit 913e798
  lo dejo asi en HEAD -> git restore NO lo arregla, hay que sacarlo de $BaseCommit.

.PARAMETER ShrinkReport
  Ademas del vaciado total, lista los archivos versionados que encogieron >=90% respecto
  a HEAD (candidatos a truncado parcial). NO los toca: solo los reporta.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\restore-empty-tracked.ps1
  powershell -ExecutionPolicy Bypass -File scripts\restore-empty-tracked.ps1 -Apply
#>
[CmdletBinding()]
param(
  [switch]$Apply,
  [switch]$ShrinkReport,
  [string]$BaseCommit = '63ad94b'
)

$ErrorActionPreference = 'Stop'

function Get-HeadSize([string]$path) {
  $out = & git cat-file -s "HEAD:$path" 2>$null
  if ($LASTEXITCODE -ne 0) { return -1 }
  return [int64]$out
}

$root = (& git rev-parse --show-toplevel 2>$null)
if ($LASTEXITCODE -ne 0) { Write-Error 'No estas dentro de un repositorio git.'; exit 1 }
Set-Location $root
Write-Host "Repo: $root" -ForegroundColor Cyan
Write-Host "HEAD: $(& git rev-parse --short HEAD)" -ForegroundColor Cyan
Write-Host ''

$tracked = (& git ls-files -z) -split "`0" | Where-Object { $_ -ne '' }
Write-Host ("Archivos versionados: {0}" -f $tracked.Count)

$vacios = @()
$sinContenidoEnHead = @()
foreach ($f in $tracked) {
  if (-not (Test-Path -LiteralPath $f)) { continue }
  $item = Get-Item -LiteralPath $f -ErrorAction SilentlyContinue
  if ($null -eq $item -or $item.PSIsContainer) { continue }
  if ($item.Length -ne 0) { continue }
  $headSize = Get-HeadSize $f
  if ($headSize -gt 0) { $vacios += [pscustomobject]@{ Path = $f; HeadBytes = $headSize } }
  else { $sinContenidoEnHead += $f }
}

if ($vacios.Count -eq 0) {
  Write-Host 'OK: no hay archivos versionados vacios que restaurar.' -ForegroundColor Green
} else {
  Write-Host ''
  Write-Host ("RECUPERABLES desde HEAD: {0} archivo(s)" -f $vacios.Count) -ForegroundColor Yellow
  $vacios | Sort-Object Path | Format-Table -AutoSize | Out-String | Write-Host

  if ($Apply) {
    $ok = 0; $ko = 0
    foreach ($v in $vacios) {
      & git checkout HEAD -- $v.Path 2>$null
      if ($LASTEXITCODE -eq 0 -and (Get-Item -LiteralPath $v.Path).Length -eq $v.HeadBytes) {
        $ok++
      } else {
        $ko++; Write-Host ("  FALLO: {0}" -f $v.Path) -ForegroundColor Red
      }
    }
    Write-Host ("Restaurados {0} / {1}" -f $ok, ($ok + $ko)) -ForegroundColor Green
    Write-Host 'NOTA: git checkout HEAD -- <ruta> deja los archivos tambien en el index (staged).'
    Write-Host '      Si prefieres el index anterior: git reset -- <ruta>'
  } else {
    Write-Host 'DRY-RUN: vuelve a ejecutar con -Apply para restaurarlos.' -ForegroundColor Yellow
  }
}

if ($sinContenidoEnHead.Count -gt 0) {
  Write-Host ''
  Write-Host ("Vacios TAMBIEN en HEAD (nada que restaurar): {0}" -f $sinContenidoEnHead.Count)
}

# --- No versionados: git no los puede recuperar ------------------------------
$noVersionados = (& git ls-files -z --others --exclude-standard) -split "`0" | Where-Object { $_ -ne '' }
$huerfanos = @()
foreach ($f in $noVersionados) {
  $item = Get-Item -LiteralPath $f -ErrorAction SilentlyContinue
  if ($null -ne $item -and -not $item.PSIsContainer -and $item.Length -eq 0) { $huerfanos += $f }
}
if ($huerfanos.Count -gt 0) {
  Write-Host ''
  Write-Host ("NO RECUPERABLES (sin seguimiento en git): {0}" -f $huerfanos.Count) -ForegroundColor Magenta
  $huerfanos | Sort-Object | ForEach-Object { Write-Host "  $_" }
  Write-Host '  Revisa si tienes copia: .env (apps/web/.env sigue intacto),'
  Write-Host '  FundamentosDeLaProgramcon.txt (copia fiel en learning/sources/fundamentos-programacion.md),'
  Write-Host '  loop-verifier.md (espejo en .opencode/skills/), repomix-output.xml (regenerable: npm run repomix).'
}

if ($ShrinkReport) {
  Write-Host ''
  Write-Host 'Candidatos a truncado PARCIAL (>=90% mas pequenos que en HEAD, NO se tocan):' -ForegroundColor Yellow
  foreach ($f in $tracked) {
    if (-not (Test-Path -LiteralPath $f)) { continue }
    $item = Get-Item -LiteralPath $f -ErrorAction SilentlyContinue
    if ($null -eq $item -or $item.PSIsContainer -or $item.Length -eq 0) { continue }
    $headSize = Get-HeadSize $f
    if ($headSize -gt 0 -and $item.Length -lt ($headSize * 0.1)) {
      Write-Host ("  {0}  worktree={1}B  HEAD={2}B" -f $f, $item.Length, $headSize)
    }
  }
}

# --- Truncados que SI se commitearon ----------------------------------------
Write-Host ''
& git rev-parse --verify --quiet "$BaseCommit^{commit}" > $null
if ($LASTEXITCODE -eq 0) {
  Write-Host ("Comparando HEAD contra {0} (pre-incidente) ..." -f $BaseCommit) -ForegroundColor Cyan
  $committed = @()
  foreach ($f in $tracked) {
    $headSize = Get-HeadSize $f
    $baseOut = & git cat-file -s "${BaseCommit}:$f" 2>$null
    if ($LASTEXITCODE -ne 0) { continue }
    $baseSize = [int64]$baseOut
    if ($baseSize -gt 0 -and $headSize -ge 0 -and $headSize -lt ($baseSize * 0.1)) {
      $committed += [pscustomobject]@{ Path = $f; HeadBytes = $headSize; BaseBytes = $baseSize }
    }
  }
  if ($committed.Count -eq 0) {
    Write-Host 'OK: ningun truncado llego a commitearse.' -ForegroundColor Green
  } else {
    Write-Host 'TRUNCADOS COMMITEADOS (git restore NO los arregla):' -ForegroundColor Red
    $committed | Format-Table -AutoSize | Out-String | Write-Host
    foreach ($c in $committed) {
      Write-Host ("  Recuperar con:  git show {0}:{1} > {1}" -f $BaseCommit, $c.Path)
    }
    Write-Host '  (revisa el resultado antes de commitear: puede que quieras reaplicar encima'
    Write-Host '   las entradas nuevas que si eran validas, p.ej. la bitacora de la iteracion 63)'
  }
} else {
  Write-Host ("AVISO: el commit base {0} no existe en este repo; me salto esa comprobacion." -f $BaseCommit) -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Verificacion sugerida despues de restaurar:' -ForegroundColor Cyan
Write-Host '  npm run typecheck; npm run lint; npm run test; npm run build'
