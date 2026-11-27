<#
.SYNOPSIS
  Publica la API de SEID en Cloudflare (Workers + D1). Se puede ejecutar varias veces: solo hace lo que falta.

.DESCRIPTION
  Requisito previo (una sola vez, abre el navegador):  npx wrangler login
  Luego, desde la carpeta api:
      powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1 -AdminEmail correo@ejemplo.com

  Pasos: dependencias -> pruebas -> base D1 (crea y anota el id) -> migraciones -> despliegue
         -> secretos (JWT y VAPID, solo si faltan) -> usuario de Abel (solo si falta) -> prueba /health.

.PARAMETER AdminEmail   Correo con el que Abel inicia sesión. Si se omite, no se crea usuario.
.PARAMETER AdminName    Nombre visible del usuario (por defecto "Ing. Abel Galarza").
.PARAMETER SkipTests    No correr las pruebas automáticas antes de publicar.
.PARAMETER EnableR2     Guardar fotos en R2 (exige tarjeta/PayPal registrado en Cloudflare). Por defecto, D1.
.PARAMETER Location     Ubicación de la base D1 (por defecto enam = este de Norteamérica, la más cercana a Bolivia).
#>
[CmdletBinding()]
param(
  [string]$AdminEmail = "",
  [string]$AdminName = "Ing. Abel Galarza",
  [switch]$SkipTests,
  [switch]$EnableR2,
  [string]$Location = "enam"
)

$ErrorActionPreference = 'Stop'
$ApiDir = Split-Path -Parent $PSScriptRoot
Set-Location $ApiDir
$Toml = Join-Path $ApiDir 'wrangler.toml'
$DbName = 'seid-db'
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Step($msg) { Write-Host ""; Write-Host "==> $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "    $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "    $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host ""; Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

# Ejecuta wrangler con node directamente (sin npx). Devuelve código, stdout y stderr por separado.
function Invoke-Wrangler {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$WArgs)
  $errFile = [System.IO.Path]::GetTempFileName()
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $env:WRANGLER_SEND_METRICS = 'false'
    $out = & node $script:WranglerJs @WArgs 2> $errFile
    $code = $LASTEXITCODE
  } finally { $ErrorActionPreference = $prev }
  $err = Get-Content -Raw -ErrorAction SilentlyContinue $errFile
  Remove-Item -Force -ErrorAction SilentlyContinue $errFile
  if ($null -eq $out) { $out = @() }
  return [pscustomobject]@{ Code = $code; Out = (@($out) -join "`n"); Err = "$err" }
}

# ---------------------------------------------------------------------------
Step "Revisando Node.js"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Fail "No se encontró Node.js. Instálelo con:  winget install OpenJS.NodeJS.LTS  y abra una terminal nueva."
}
$nodeVersion = (& node -v).Trim()
$major = [int]($nodeVersion.TrimStart('v').Split('.')[0])
if ($major -lt 20) { Fail "Se necesita Node.js 20 o superior (tiene $nodeVersion). Actualice con: winget upgrade OpenJS.NodeJS.LTS" }
Ok "Node $nodeVersion"

Step "Instalando dependencias (npm ci)"
$WranglerJs = Join-Path $ApiDir 'node_modules\wrangler\bin\wrangler.js'
if ($env:SEID_WRANGLER_JS) { $WranglerJs = $env:SEID_WRANGLER_JS } # solo para pruebas del script
if (-not (Test-Path $WranglerJs) -or -not (Test-Path (Join-Path $ApiDir 'node_modules\.package-lock.json'))) {
  $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  & npm ci --no-audit --no-fund
  $code = $LASTEXITCODE; $ErrorActionPreference = $prev
  if ($code -ne 0) { Fail "npm ci falló." }
}
if (-not (Test-Path $WranglerJs)) { Fail "No se encontró wrangler en node_modules." }
Ok "Listo"

Step "Comprobando sesión de Cloudflare"
$who = Invoke-Wrangler whoami --json
if ($who.Code -ne 0) { Fail "No hay sesión de Cloudflare. Ejecute primero:  npx wrangler login  (se abre el navegador) y vuelva a correr este script." }
try { $whoJson = $who.Out | ConvertFrom-Json } catch { $whoJson = $null }
if ($whoJson -and $whoJson.email) { Ok "Sesión: $($whoJson.email)" } else { Ok "Sesión iniciada" }

if (-not $SkipTests) {
  Step "Corriendo pruebas automáticas"
  $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  & npm test --silent
  $code = $LASTEXITCODE; $ErrorActionPreference = $prev
  if ($code -ne 0) { Fail "Las pruebas fallaron; no se publica. (Use -SkipTests solo si sabe lo que hace.)" }
  Ok "Pruebas OK"
}

# ---------------------------------------------------------------------------
Step "Base de datos D1 ($DbName)"
function Get-DbId {
  $r = Invoke-Wrangler d1 list --json
  if ($r.Code -ne 0) { Fail "No se pudo listar las bases D1:`n$($r.Err)$($r.Out)" }
  $list = $r.Out | ConvertFrom-Json
  foreach ($d in @($list)) { if ($d.name -eq $DbName) { return $d.uuid } }
  return $null
}
$dbId = Get-DbId
if (-not $dbId) {
  $r = Invoke-Wrangler d1 create $DbName --location $Location
  if ($r.Code -ne 0) { Fail "No se pudo crear la base D1:`n$($r.Err)$($r.Out)" }
  $dbId = Get-DbId
  if (-not $dbId) { Fail "La base se creó pero no aparece en la lista; vuelva a ejecutar el script." }
  Ok "Creada: $dbId"
} else { Ok "Ya existía: $dbId" }

$tomlText = [System.IO.File]::ReadAllText($Toml)
$newToml = [regex]::Replace($tomlText, 'database_id\s*=\s*"[^"]*"', "database_id = `"$dbId`"")
if ($newToml -ne $tomlText) { [System.IO.File]::WriteAllText($Toml, $newToml, $Utf8NoBom); Ok "wrangler.toml actualizado" }

if ($EnableR2) {
  Step "Bucket R2 para fotos (opcional)"
  $r = Invoke-Wrangler r2 bucket list
  if ($r.Out -notmatch 'seid-fotos') {
    $r = Invoke-Wrangler r2 bucket create seid-fotos
    if ($r.Code -ne 0) { Fail "No se pudo crear el bucket R2. ¿Activó R2 con un medio de pago en el panel de Cloudflare?`n$($r.Err)$($r.Out)" }
    Ok "Bucket seid-fotos creado"
  } else { Ok "Bucket seid-fotos ya existía" }
  # Solo con el bucket listo se activa el binding (si no, el despliegue fallaría).
  $tomlText = [System.IO.File]::ReadAllText($Toml)
  $newToml = $tomlText -replace '(?m)^#\s*\[\[r2_buckets\]\]', '[[r2_buckets]]'
  $newToml = $newToml -replace '(?m)^#\s*binding\s*=\s*"FOTOS"', 'binding = "FOTOS"'
  $newToml = $newToml -replace '(?m)^#\s*bucket_name\s*=\s*"seid-fotos"', 'bucket_name = "seid-fotos"'
  if ($newToml -ne $tomlText) { [System.IO.File]::WriteAllText($Toml, $newToml, $Utf8NoBom); Ok "R2 activado en wrangler.toml" }
}

Step "Aplicando migraciones (remoto)"
$r = Invoke-Wrangler d1 migrations apply $DbName --remote --force
if ($r.Code -ne 0) { Fail "Fallaron las migraciones:`n$($r.Err)$($r.Out)" }
if ($r.Out -match 'No migrations to apply') { Ok "Sin migraciones pendientes" } else { Ok "Migraciones aplicadas" }

# ---------------------------------------------------------------------------
Step "Publicando el Worker"
$r = Invoke-Wrangler deploy
$all = "$($r.Out)`n$($r.Err)"
if ($r.Code -ne 0) {
  if ($all -match 'workers\.dev subdomain|register a workers\.dev') {
    Fail ("La cuenta todavía no tiene subdominio workers.dev. Entre a https://dash.cloudflare.com -> Workers y Pages " +
      "(Compute) -> cree cualquier cosa o abra 'Subdominio' y elija un nombre (p. ej. seid). Luego vuelva a correr el script.")
  }
  Fail "Falló el despliegue:`n$all"
}
$m = [regex]::Match($all, 'https://[A-Za-z0-9.-]+\.workers\.dev')
$WorkerUrl = if ($m.Success) { $m.Value } else { "" }
if ($WorkerUrl) { Ok "Publicado en $WorkerUrl" } else { Warn "Publicado, pero no se encontró la URL en la salida." }

Step "Secretos (JWT_SECRET, VAPID)"
$r = Invoke-Wrangler secret list --format json
$existing = @()
if ($r.Code -eq 0 -and $r.Out.Trim()) { try { $existing = @(($r.Out | ConvertFrom-Json) | ForEach-Object { $_.name }) } catch { $existing = @() } }
$secrets = @{}
if ($existing -notcontains 'JWT_SECRET') {
  $secrets['JWT_SECRET'] = (& node scripts/gen-secret.mjs | Out-String).Trim()
}
if (($existing -notcontains 'VAPID_PUBLIC_KEY') -or ($existing -notcontains 'VAPID_PRIVATE_KEY')) {
  $v = (& node scripts/gen-vapid.mjs --json | Out-String) | ConvertFrom-Json
  $secrets['VAPID_PUBLIC_KEY'] = $v.publicKey
  $secrets['VAPID_PRIVATE_KEY'] = $v.privateKey
}
if ($secrets.Count -gt 0) {
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("seid-secrets-" + [guid]::NewGuid().ToString() + ".json")
  try {
    [System.IO.File]::WriteAllText($tmp, ($secrets | ConvertTo-Json -Compress), $Utf8NoBom)
    $r = Invoke-Wrangler secret bulk $tmp
  } finally { Remove-Item -Force -ErrorAction SilentlyContinue $tmp }
  if ($r.Code -ne 0) { Fail "No se pudieron cargar los secretos:`n$($r.Err)$($r.Out)" }
  Ok ("Cargados: " + (($secrets.Keys | Sort-Object) -join ', '))
} else { Ok "Ya estaban cargados" }

# ---------------------------------------------------------------------------
$GeneratedPassword = $null
if ($AdminEmail) {
  Step "Usuario de la app ($AdminEmail)"
  $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  $out = & node scripts/create-user.mjs --email $AdminEmail --name $AdminName --generate --if-missing --remote
  $code = $LASTEXITCODE; $ErrorActionPreference = $prev
  $out | ForEach-Object { Write-Host "    $_" }
  if ($code -ne 0) { Fail "No se pudo crear el usuario." }
} else {
  Warn "No se indicó -AdminEmail: no se creó usuario. Después: npm run create-user -- --email ... --name `"Ing. Abel Galarza`" --generate"
}

if ($WorkerUrl) {
  Step "Probando $WorkerUrl/health"
  $okHealth = $false
  for ($i = 0; $i -lt 12 -and -not $okHealth; $i++) {
    try {
      $h = Invoke-RestMethod -Uri "$WorkerUrl/health" -TimeoutSec 10
      if ($h.ok) { $okHealth = $true }
    } catch { Start-Sleep -Seconds 5 }
  }
  if ($okHealth) { Ok "La API responde" } else { Warn "Todavía no responde (el subdominio nuevo puede tardar unos minutos)." }
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " API de SEID publicada" -ForegroundColor Green
if ($WorkerUrl) { Write-Host " URL: $WorkerUrl" -ForegroundColor Green }
Write-Host " En la app: API_BASE_URL = '$WorkerUrl' y agregar ese origen a connect-src (CSP)."
Write-Host "==========================================================" -ForegroundColor Green
if ($WorkerUrl) { Write-Output "WORKER_URL=$WorkerUrl" }
