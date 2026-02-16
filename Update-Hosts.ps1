#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Adblock para Windows: actualiza el archivo hosts para bloquear anuncios y rastreadores.
    Fuentes: StevenBlack/hosts, EasyList (easylist.to), AdGuard Filters (github.com/AdguardTeam/AdguardFilters).
#>
param(
    [Parameter(Position = 0)]
    [ValidateSet('activar', 'desactivar', 'restaurar', 'estado')]
    [string]$Accion = 'activar'
)

$ErrorActionPreference = 'Stop'
$HostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$BackupDir = "$PSScriptRoot\backups"
$ConfigPath = "$PSScriptRoot\config.json"
$UserBlockPath = "$PSScriptRoot\user-block.txt"
$UserAllowPath = "$PSScriptRoot\user-allow.txt"

$BaseUrl = 'https://raw.githubusercontent.com/StevenBlack/hosts/master'
# Listas tipo Adblock (||dominio^): EasyList + AdGuard Filters (AdguardTeam/AdguardFilters)
$FilterListUrls = @(
    'https://easylist.to/easylist/easylist.txt',
    'https://raw.githubusercontent.com/AdguardTeam/AdguardFilters/master/BaseFilter/sections/general_url.txt',
    'https://raw.githubusercontent.com/AdguardTeam/AdguardFilters/master/BaseFilter/sections/adservers.txt',
    'https://raw.githubusercontent.com/AdguardTeam/AdguardFilters/master/BaseFilter/sections/specific.txt',
    'https://raw.githubusercontent.com/AdguardTeam/AdguardFilters/master/SpywareFilter/sections/general_url.txt',
    'https://raw.githubusercontent.com/AdguardTeam/AdguardFilters/master/SpywareFilter/sections/specific.txt'
)
$Variants = @{
    'unified'  = "$BaseUrl/hosts"
    'fakenews' = "$BaseUrl/alternates/fakenews/hosts"
    'gambling' = "$BaseUrl/alternates/gambling/hosts"
    'porn'     = "$BaseUrl/alternates/porn/hosts"
    'social'   = "$BaseUrl/alternates/social/hosts"
}

$MarkerStart = '# ----- BEGIN Adblock -----'
$MarkerEnd   = '# ----- END Adblock -----'

function Get-Config {
    $variant = 'unified'
    if (Test-Path $ConfigPath) {
        try {
            $cfg = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($cfg.PSObject.Properties['blocklistVariant']) { $variant = $cfg.blocklistVariant }
        } catch { }
    }
    if (-not $Variants.ContainsKey($variant)) { $variant = 'unified' }
    $Variants[$variant]
}

function Get-UserBlockList {
    if (-not (Test-Path $UserBlockPath)) { return @() }
    Get-Content $UserBlockPath -Encoding UTF8 | ForEach-Object { $_.Trim() } | Where-Object { $_ -and $_ -notmatch '^\s*#' }
}

function Get-UserAllowList {
    if (-not (Test-Path $UserAllowPath)) { return @() }
    Get-Content $UserAllowPath -Encoding UTF8 | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ -and $_ -notmatch '^\s*#' }
}

# Extrae SOLO dominios válidos para hosts: líneas que son exactamente ||dominio^
# Ignora líneas con $, /, * (sintaxis de extensiones) para no corromper el archivo hosts.
# RegEx: ^\|\|([a-zA-Z0-9.-]+)\^  → solo grupo 1, luego "0.0.0.0 dominio"
function Get-DomainsFromFilterContent {
    param([string]$Content)
    $entries = @()
    foreach ($line in ($Content -split "`n")) {
        $line = $line.Trim()
        if (-not $line -or $line.StartsWith('!') -or $line.StartsWith('[') -or $line.StartsWith('@@')) { continue }
        if ($line -match '\$' -or $line -match '/' -or $line -match '\*') { continue }
        if ($line -match '^\|\|([a-zA-Z0-9.-]+)\^') {
            $domain = $Matches[1].ToLowerInvariant()
            if ($domain -match '\.' -and $domain.Length -ge 4 -and $domain.Length -le 253 -and $domain -match '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$') {
                $entries += "0.0.0.0 $domain"
            }
        }
    }
    $entries
}

# Descarga una URL de lista Adblock y devuelve entradas 0.0.0.0 dominio
function Get-DomainsFromFilterUrl {
    param([string]$Url)
    try {
        $content = (Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 25).Content
        Get-DomainsFromFilterContent -Content $content
    } catch {
        Write-Warning "Lista no disponible: $Url"
        @()
    }
}

# Obtiene todos los dominios de EasyList + AdGuard Filters (AdguardTeam/AdguardFilters)
function Get-AllFilterListDomains {
    $all = @()
    foreach ($url in $FilterListUrls) {
        $all += Get-DomainsFromFilterUrl -Url $url
    }
    $all | Select-Object -Unique
}

function Get-HostsContent { Get-Content -Path $HostsPath -Raw -Encoding UTF8 }

function Get-HostsWithoutAdblock {
    $content = Get-HostsContent
    if ($content -match "(?s)$([regex]::Escape($MarkerStart)).*?$([regex]::Escape($MarkerEnd))") {
        $content = $content -replace "(?s)$([regex]::Escape($MarkerStart)).*?$([regex]::Escape($MarkerEnd))\r?\n?", ''
    }
    $content.TrimEnd()
}

function Test-AdblockActive {
    (Get-HostsContent) -match [regex]::Escape($MarkerStart)
}

function Backup-Hosts {
    if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null }
    $date = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backupPath = Join-Path $BackupDir "hosts.$date.backup"
    Copy-Item -Path $HostsPath -Destination $backupPath -Force
    $backupPath
}

function Get-Blocklist {
    $BlocklistUrl = Get-Config
    $lines = (Invoke-WebRequest -Uri $BlocklistUrl -UseBasicParsing).Content
    $entries = @()
    foreach ($line in ($lines -split "`n")) {
        $line = $line.Trim()
        if ($line -match '^\s*0\.0\.0\.0\s+(\S+)' -or $line -match '^\s*127\.0\.0\.1\s+(\S+)') {
            $domain = $Matches[1]
            if ($domain -notmatch '^#|^localhost$') { $entries += "0.0.0.0 $domain" }
        }
    }
    # Añadir dominios de EasyList + AdGuard Filters (AdguardTeam/AdguardFilters)
    $filterDomains = Get-AllFilterListDomains
    $entries = $entries + $filterDomains
    $entries = $entries | Select-Object -Unique
    $allow = Get-UserAllowList
    if ($allow.Count -gt 0) {
        $entries = $entries | Where-Object {
            $dom = ($_ -split '\s+', 2)[1]
            $allow -notcontains $dom.ToLowerInvariant()
        }
    }
    foreach ($d in (Get-UserBlockList)) {
        $d = $d.Trim().ToLowerInvariant()
        if ($d -and $d -notmatch '^\s*#') { $entries += "0.0.0.0 $d" }
    }
    $entries | Select-Object -Unique
}

function Enable-Adblock {
    if (Test-AdblockActive) { Write-Host "Adblock ya activo. Actualizando..." -ForegroundColor Yellow }
    Backup-Hosts | Out-Null
    $base = Get-HostsWithoutAdblock
    $blockEntries = Get-Blocklist
    $blockSection = @('', $MarkerStart, "# Actualizado: $(Get-Date -Format 'yyyy-MM-dd HH:mm')", "# Dominios bloqueados: $($blockEntries.Count)", $blockEntries, $MarkerEnd)
    $newContent = $base + ($blockSection -join "`r`n")
    [System.IO.File]::WriteAllText($HostsPath, $newContent, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Adblock ACTIVADO. $($blockEntries.Count) dominios bloqueados." -ForegroundColor Green
    Write-Output "Adblock ACTIVADO. $($blockEntries.Count) dominios bloqueados."
    Write-Output "Dominios bloqueados: $($blockEntries.Count)"
}

function Disable-Adblock {
    if (-not (Test-AdblockActive)) { Write-Host "Adblock no estaba activo." -ForegroundColor Yellow; return }
    Backup-Hosts | Out-Null
    $newContent = Get-HostsWithoutAdblock
    [System.IO.File]::WriteAllText($HostsPath, $newContent, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Adblock DESACTIVADO." -ForegroundColor Green
    Write-Output "Adblock DESACTIVADO."
}

function Restore-Backup {
    $backups = Get-ChildItem -Path $BackupDir -Filter 'hosts.*.backup' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    if (-not $backups) { Write-Host "No hay backups." -ForegroundColor Red; return }
    Copy-Item -Path $backups[0].FullName -Destination $HostsPath -Force
    Write-Host "Restaurado: $($backups[0].FullName)" -ForegroundColor Green
}

function Show-Status {
    if (Test-AdblockActive) {
        Write-Host "Estado: Adblock ACTIVO" -ForegroundColor Green
        $content = Get-HostsContent
        if ($content -match "# Dominios bloqueados: (\d+)") {
            Write-Host "Dominios bloqueados: $($Matches[1])"
            Write-Output "Dominios bloqueados: $($Matches[1])"
        }
        Write-Output "Estado: Adblock ACTIVO"
    } else {
        Write-Host "Estado: Adblock INACTIVO" -ForegroundColor Yellow
        Write-Output "Estado: Adblock INACTIVO"
    }
}

switch ($Accion) {
    'activar'   { Enable-Adblock }
    'desactivar' { Disable-Adblock }
    'restaurar' { Restore-Backup }
    'estado'    { Show-Status }
}
