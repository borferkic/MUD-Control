# =============================================================================
#  MUD Control - backend
#  La app (Rust) ejecuta:  powershell -File backend.ps1 -Action <accion> -ArgsJson '<json>'
#  Responde un JSON en la ultima linea de stdout:  {"ok":true,"data":...}  o  {"ok":false,"error":"..."}
#  Las lineas "STEP:<paso>" informan el progreso de la reparacion.
#  Funciona sin Internet salvo: buscar INI nuevo, generar offsets, reparar Windows Update.
# =============================================================================
param([Parameter(Mandatory)][string]$Action, [string]$ArgsJson = '{}')

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$Res      = Split-Path -Parent $MyInvocation.MyCommand.Path          # recursos de la app
$Scripts  = Join-Path $Res 'scripts'
$Wrapper  = Join-Path $env:ProgramFiles 'RDP Wrapper'
$WrapIni  = Join-Path $Wrapper 'rdpwrap.ini'
$Data     = Join-Path $env:ProgramData 'MUD Control'
$Backups  = Join-Path $Data 'backups'
$Profiles = Join-Path $Data 'profiles'
$ActLog   = Join-Path $Data 'activity.jsonl'
$SetFile  = Join-Path $Data 'settings.json'
$TechLog  = Join-Path $Data 'backend.log'
$KTS      = 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server'
$KTCP     = "$KTS\WinStations\RDP-Tcp"
$KPOL     = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services'
$KUX      = 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings'
$RdpGroup = 'S-1-5-32-555'
$Utf8     = New-Object System.Text.UTF8Encoding $false
# La app pasa los argumentos por variable de entorno (evita problemas de comillas).
if ($env:MUD_ARGS) { $ArgsJson = $env:MUD_ARGS }
$A        = $ArgsJson | ConvertFrom-Json
foreach ($d in $Data, $Backups, $Profiles) { if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null } }

# ----------------------------------------------------------------- utilidades
function TLog([string]$m) { try { Add-Content $TechLog ((Get-Date).ToString('s') + "  [$Action] $m") -Encoding UTF8 } catch {} }
# text = espanol (registro legible); key + params = la interfaz lo traduce al idioma elegido.
function Activity([string]$kind, [string]$text, [string]$key = '', [hashtable]$params = @{}) {
    $line = [ordered]@{ date = (Get-Date).ToUniversalTime().ToString('o'); kind = $kind; text = $text; key = $key; params = $params } | ConvertTo-Json -Compress
    Add-Content -Path $ActLog -Value $line -Encoding UTF8
}
function Step([string]$s) { [Console]::Out.WriteLine("STEP:$s"); [Console]::Out.Flush() }
function RegVal($path, $name, $default = $null) {
    try { $v = (Get-ItemProperty -Path $path -Name $name -ErrorAction Stop).$name; if ($null -eq $v) { $default } else { $v } } catch { $default }
}
function SetDword($path, $name, $value) {
    if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
    Set-ItemProperty -Path $path -Name $name -Value ([int]$value) -Type DWord
}
function TermsrvVer {
    $vi = (Get-Item "$env:SystemRoot\System32\termsrv.dll").VersionInfo
    '{0}.{1}.{2}.{3}' -f $vi.FileMajorPart, $vi.FileMinorPart, $vi.FileBuildPart, $vi.FilePrivatePart
}
function IniHas([string]$path, [string]$ver) {
    (Test-Path $path) -and ([IO.File]::ReadAllText($path) -match ('(?m)^\[' + [regex]::Escape($ver) + '\]'))
}
function RunBat([string]$name, [string]$argLine) {
    $bat = Join-Path $Scripts $name
    TLog "cmd /c `"$bat`" $argLine"
    $p = Start-Process -FilePath 'cmd.exe' -ArgumentList "/c `"`"$bat`" $argLine`"" -Wait -PassThru -WindowStyle Hidden
    TLog "$name -> $($p.ExitCode)"
    return $p.ExitCode
}
function RestartRdp {
    cmd /c 'net stop UmRdpService /y >nul 2>&1'
    cmd /c 'net stop TermService /y >nul 2>&1'
    Start-Sleep -Seconds 2
    cmd /c 'net start TermService >nul 2>&1'
    cmd /c 'net start UmRdpService >nul 2>&1'
}
function Settings {
    $s = [ordered]@{ autoFix = $true; notify = $true; autoUpdateApp = $true; profile = 'Predeterminado' }
    if (Test-Path $SetFile) { (Get-Content $SetFile -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $s[$_.Name] = $_.Value } }
    $s
}
function SaveSettings($s) { [IO.File]::WriteAllText($SetFile, ($s | ConvertTo-Json), $Utf8) }

# Una sesion por usuario SIEMPRE (no configurable). Registro y directiva.
function EnforceSingleSession {
    SetDword $KTS fSingleSessionPerUser 1
    SetDword $KPOL fSingleSessionPerUser 1
}

# ---------------------------------------------------------------- sesiones WTS
Add-Type -ErrorAction SilentlyContinue -TypeDefinition @'
using System; using System.Runtime.InteropServices; using System.Collections.Generic;
public static class MudWts {
  [DllImport("wtsapi32.dll", SetLastError=true, EntryPoint="WTSEnumerateSessionsW")] static extern bool WTSEnumerateSessions(IntPtr h, int r, int v, out IntPtr p, out int c);
  [DllImport("wtsapi32.dll")] static extern void WTSFreeMemory(IntPtr p);
  [DllImport("wtsapi32.dll", SetLastError=true, CharSet=CharSet.Unicode, EntryPoint="WTSQuerySessionInformationW")] static extern bool WTSQuerySessionInformation(IntPtr h, int id, int cls, out IntPtr buf, out int len);
  [DllImport("kernel32.dll")] static extern int WTSGetActiveConsoleSessionId();
  [StructLayout(LayoutKind.Sequential)] struct SI { public int Id; public IntPtr Station; public int State; }
  static string Str(int id, int cls) {
    IntPtr b; int l; if (!WTSQuerySessionInformation(IntPtr.Zero, id, cls, out b, out l)) return "";
    string s = Marshal.PtrToStringUni(b); WTSFreeMemory(b); return s ?? "";
  }
  static long Time(int id, int offset) {
    IntPtr b; int l; if (!WTSQuerySessionInformation(IntPtr.Zero, id, 24, out b, out l)) return 0;
    long t = Marshal.ReadInt64(b, offset); WTSFreeMemory(b); return t;
  }
  // WTSINFOW: State(4) SessionId(4) In/Out bytes+frames x4 (16) Compression(4) -> 32; Station 32 wchar(64) -> 96;
  // Domain 17 wchar(34) -> 130; UserName 21 wchar(42) -> 172; pad -> 176: ConnectTime, DisconnectTime, LastInputTime, LogonTime, CurrentTime
  public static List<object[]> List() {
    var r = new List<object[]>(); IntPtr p; int c;
    if (!WTSEnumerateSessions(IntPtr.Zero, 0, 1, out p, out c)) return r;
    int size = Marshal.SizeOf(typeof(SI)); int console = WTSGetActiveConsoleSessionId();
    for (int i = 0; i < c; i++) {
      var si = (SI)Marshal.PtrToStructure(new IntPtr(p.ToInt64() + i * size), typeof(SI));
      string user = Str(si.Id, 5); if (user.Length == 0) continue;
      string client = Str(si.Id, 10);
      long logon = Time(si.Id, 200), connect = Time(si.Id, 176), disc = Time(si.Id, 184);
      r.Add(new object[] { si.Id, user, client, si.State, logon, connect, disc, si.Id == console });
    }
    WTSFreeMemory(p); return r;
  }
}
'@

function Sessions {
    $me = [Environment]::UserName
    foreach ($s in [MudWts]::List()) {
        $id, $user, $client, $state, $logon, $connect, $disc, $isConsole = $s
        $active = ($state -eq 0)                    # WTSActive
        $t = if (-not $active -and $disc -gt 0) { $disc } elseif ($connect -gt 0) { $connect } else { $logon }
        $since = if ($t -gt 0) { [DateTime]::FromFileTimeUtc($t).ToString('o') } else { (Get-Date).ToUniversalTime().ToString('o') }
        [ordered]@{
            id = [int]$id; user = $user
            client = if ($client) { $client } elseif ($isConsole) { 'este equipo' } else { 'otro equipo' }
            since = $since; active = $active
            isSelf = ($user -eq $me -and $id -eq (Get-Process -Id $PID).SessionId)
        }
    }
}

# -------------------------------------------------------------------- accesos
function AccessList {
    $members = @(Get-LocalGroupMember -SID $RdpGroup -ErrorAction SilentlyContinue | Where-Object { $_.ObjectClass -eq 'Usuario' -or $_.ObjectClass -eq 'User' })
    foreach ($m in $members) {
        $n = ($m.Name -split '\\')[-1]
        $u = Get-LocalUser -Name $n -ErrorAction SilentlyContinue
        [ordered]@{ name = $n; fullName = if ($u -and $u.FullName) { $u.FullName } else { $n } }
    }
}
function LocalUsers {
    Get-LocalUser | Where-Object { $_.Enabled -and $_.SID.Value -notmatch '-(500|501|503|504)$' } |
        ForEach-Object { [ordered]@{ name = $_.Name; fullName = if ($_.FullName) { $_.FullName } else { $_.Name } } }
}
function DisplayName([string]$n) { $u = Get-LocalUser -Name $n -ErrorAction SilentlyContinue; if ($u -and $u.FullName) { $u.FullName } else { $n } }

# --------------------------------------------------------- configuracion/perfil
function FirewallState {
    $r = @(Get-NetFirewallRule -DisplayName 'RDP Wrapper TCP' -ErrorAction SilentlyContinue)
    $p = if ($r) { [string]$r[0].Profile } else { '' }
    @{ private = ($p -match 'Private|Domain|Any'); public = ($p -match 'Public|Any') }
}
function Specialist {
    $fw = FirewallState
    [ordered]@{
        port            = [int](RegVal $KTCP PortNumber 3389)
        maxSessions     = [int](RegVal $KPOL MaxInstanceCount 20)
        nla             = ([int](RegVal $KTCP UserAuthentication 0) -eq 1)
        firewallPrivate = $fw.private
        firewallPublic  = $fw.public
        shadow          = ([int](RegVal $KPOL Shadow 1) -ne 0)
    }
}
function ApplySpecialist($c) {
    $oldPort = [int](RegVal $KTCP PortNumber 3389)
    SetDword $KTS  fDenyTSConnections 0
    SetDword $KPOL fDenyTSConnections 0
    SetDword $KTCP PortNumber ([int]$c.port)
    SetDword $KTCP UserAuthentication ([int][bool]$c.nla)
    SetDword $KTCP SecurityLayer ($(if ($c.nla) { 2 } else { 0 }))
    SetDword $KPOL MaxInstanceCount ([int]$c.maxSessions)
    SetDword $KPOL Shadow ($(if ($c.shadow) { 1 } else { 0 }))
    SetDword $KPOL fDisableAutoReconnect 0
    EnforceSingleSession
    $prof = @(); if ($c.firewallPrivate) { $prof += 'Domain', 'Private' }; if ($c.firewallPublic) { $prof += 'Public' }
    Get-NetFirewallRule -DisplayName 'RDP Wrapper TCP', 'RDP Wrapper UDP' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    if ($prof) {
        foreach ($proto in 'TCP', 'UDP') {
            New-NetFirewallRule -DisplayName "RDP Wrapper $proto" -Direction Inbound -Protocol $proto -LocalPort ([int]$c.port) -Action Allow -Profile ($prof -join ',') | Out-Null
        }
    }
    if ($oldPort -ne [int]$c.port) { RestartRdp }
}
# Perfil compatible con mud/perfiles/*.json (el mismo formato que usa kit.ps1).
function CurrentProfile([string]$name) {
    $c = Specialist
    $fw = @(); if ($c.firewallPrivate) { $fw += 'Domain', 'Private' }; if ($c.firewallPublic) { $fw += 'Public' }
    $task = Get-ScheduledTask -TaskName 'RDPWrap-AutoFix' -ErrorAction SilentlyContinue
    [ordered]@{
        Nombre = $name; Puerto = $c.port; MaxSesiones = $c.maxSessions; NLA = [int]$c.nla; Shadow = [int]$c.shadow
        UsuariosRDP = @(AccessList | ForEach-Object { $_.name }); TareaAutoFix = [bool]($task -and $task.State -ne 'Disabled')
        PerfilesFirewall = $fw
    }
}
function ApplyProfile($p) {
    ApplySpecialist ([pscustomobject]@{
        port = [int]$p.Puerto; maxSessions = [int]$p.MaxSesiones; nla = [bool][int]$p.NLA; shadow = [bool][int]$p.Shadow
        firewallPrivate = (@($p.PerfilesFirewall) -contains 'Private'); firewallPublic = (@($p.PerfilesFirewall) -contains 'Public')
    })
    $missing = @()
    foreach ($u in @($p.UsuariosRDP)) {
        if (Get-LocalUser -Name $u -ErrorAction SilentlyContinue) { try { Add-LocalGroupMember -SID $RdpGroup -Member $u -ErrorAction Stop } catch {} }
        else { $missing += $u }
    }
    $s = Settings; $s.profile = [string]$p.Nombre; SaveSettings $s
    return $missing
}

# ------------------------------------------------------------ copias de seguridad
function NewBackup([string]$reason, [string]$key = '', [hashtable]$params = @{}) {
    $id = (Get-Date).ToString('yyyyMMdd-HHmmss')
    $dir = Join-Path $Backups $id
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    if (Test-Path $WrapIni) { Copy-Item $WrapIni (Join-Path $dir 'rdpwrap.ini') }
    cmd /c "reg export `"HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server`" `"$dir\terminal-server.reg`" /y >nul 2>&1"
    cmd /c "reg export `"HKLM\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services`" `"$dir\politicas.reg`" /y >nul 2>&1"
    [IO.File]::WriteAllText((Join-Path $dir 'perfil.json'), ((CurrentProfile (Settings).profile) | ConvertTo-Json), $Utf8)
    $meta = [ordered]@{ id = $id; date = (Get-Date).ToUniversalTime().ToString('o'); reason = $reason; reasonKey = $key; reasonParams = $params }
    [IO.File]::WriteAllText((Join-Path $dir 'meta.json'), ($meta | ConvertTo-Json), $Utf8)
    # Retencion: ultimas 20
    Get-ChildItem $Backups -Directory | Sort-Object Name -Descending | Select-Object -Skip 20 | Remove-Item -Recurse -Force
    return $meta
}
function BackupList {
    Get-ChildItem $Backups -Directory | Sort-Object Name -Descending | ForEach-Object {
        $m = Join-Path $_.FullName 'meta.json'
        if (Test-Path $m) { Get-Content $m -Raw | ConvertFrom-Json }
    }
}

# --------------------------------------------------------------------- estado
function Status {
    $svcDll = RegVal 'HKLM:\SYSTEM\CurrentControlSet\Services\TermService\Parameters' ServiceDll ''
    $loaded = $svcDll -match 'rdpwrap\.dll'
    $ver = TermsrvVer
    $iniOk = IniHas $WrapIni $ver
    $svc = (Get-Service TermService).Status -eq 'Running'
    $health = if (-not $loaded) { 'not_installed' } elseif ($iniOk -and $svc) { 'ok' } else { 'broken' }
    $paused = RegVal $KUX PauseUpdatesExpiryTime $null
    $pausedDate = $null
    if ($paused) { try { $d = [datetime]::Parse($paused).ToUniversalTime(); if ($d -gt (Get-Date).ToUniversalTime()) { $pausedDate = $d.ToString('yyyy-MM-dd') } } catch {} }
    $last = BackupList | Select-Object -First 1
    $c = Specialist
    $cv = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
    [ordered]@{
        health = $health
        connected = @(Sessions | Where-Object { $_.active }).Count
        maxSessions = $c.maxSessions
        updatesPausedUntil = $pausedDate
        lastBackup = if ($last) { $last.date } else { $null }
        accessCount = @(AccessList).Count
        technical = [ordered]@{
            termsrvVersion = $ver; iniSupported = $iniOk
            windowsVersion = "$(($cv.ProductName -replace 'Windows 10','Windows 11')) $($cv.DisplayVersion)"
            serviceRunning = $svc; wrapperLoaded = $loaded; profile = (Settings).profile
            port = $c.port; nla = $c.nla; firewallPrivate = $c.firewallPrivate; firewallPublic = $c.firewallPublic; shadow = $c.shadow
        }
    }
}

# ------------------------------------------------------------------- reparar
function Fix {
    Step 'check'
    if (-not (Test-Path $WrapIni)) { throw 'RDP Wrapper no esta instalado.' }
    $ver = TermsrvVer
    Step 'search'
    # Primero los datos que trae la app (sin Internet); fix-rdpwrap busca en linea solo si hace falta.
    $bundled = Join-Path $Res 'rdpwrap.ini'
    $needBundled = (-not (IniHas $WrapIni $ver)) -and (IniHas $bundled $ver)
    Step 'backup'
    NewBackup 'Antes de arreglar las conexiones' 'fix' | Out-Null
    Activity 'backup' 'Se guardó una copia de seguridad antes de arreglar' 'fix_backup'
    Step 'apply'
    if ($needBundled) { Copy-Item $bundled $WrapIni -Force; TLog "INI de la app aplicado para $ver" }
    $rc = RunBat 'fix-rdpwrap.bat' '/silent'
    Step 'verify'
    $ok = ($rc -eq 0)
    if ($ok) { Activity 'ok' 'Las conexiones múltiples volvieron a funcionar' 'fix_ok' }
    elseif ($rc -eq 7) { Activity 'warning' 'Todavía no hay solución para esta versión de Windows. Se volverá a intentar solo.' 'fix_pending' }
    else { Activity 'error' "No se pudo arreglar (código $rc)" 'fix_error' @{ code = "$rc" } }
    return $ok
}

function SupportReport {
    $name = 'informe-mud-control-' + (Get-Date).ToString('yyyyMMdd-HHmm')
    $tmp = Join-Path $env:TEMP $name
    New-Item -ItemType Directory -Path $tmp -Force | Out-Null
    (Status | ConvertTo-Json -Depth 5) | Set-Content (Join-Path $tmp 'estado.json') -Encoding UTF8
    foreach ($f in $WrapIni, (Join-Path $Wrapper 'fix-rdpwrap.log'), $TechLog, $ActLog, "$env:SystemRoot\Logs\kit-rdpwrapper.log") {
        if (Test-Path $f) { Copy-Item $f $tmp }
    }
    qwinsta 2>&1 | Out-File (Join-Path $tmp 'sesiones.txt') -Encoding UTF8
    $desk = [Environment]::GetFolderPath('CommonDesktopDirectory')
    $zip = Join-Path $desk "$name.zip"
    Compress-Archive -Path "$tmp\*" -DestinationPath $zip -Force
    Remove-Item $tmp -Recurse -Force
    return $zip
}

# ------------------------------------------------------------------ acciones
# Las listas se devuelven siempre como arreglo JSON (PowerShell desarma los de 0 o 1 elemento).
$ArrayActions = 'list_sessions', 'list_access', 'list_local_users', 'list_backups', 'get_activity', 'list_profiles'
function Out-Result($data) {
    $d = if ($ArrayActions -contains $Action) { ConvertTo-Json -InputObject @($data | Where-Object { $null -ne $_ }) -Depth 8 -Compress }
         else { ConvertTo-Json -InputObject $data -Depth 8 -Compress }
    if ([string]::IsNullOrEmpty($d)) { $d = 'null' }
    [Console]::Out.WriteLine('{"ok":true,"data":' + $d + '}')
}
function RunKit([string]$accion) {
    $kit = Join-Path $Res 'kit\kit.ps1'
    $p = Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$kit`" -Accion $accion -Auto" -Wait -PassThru -WindowStyle Hidden
    TLog "kit.ps1 -Accion $accion -> $($p.ExitCode)"
    if ($p.ExitCode -ne 0) { throw "kit.ps1 termino con codigo $($p.ExitCode)" }
}
try {
    TLog "args=$ArgsJson"
    $result = switch ($Action) {
        'get_status'        { Status }
        'run_fix'           { Fix }
        'list_sessions'     { @(Sessions) }
        'send_message'      {
            $text = [string]$A.text
            if ($null -eq $A.id) { cmd /c "msg * /TIME:0 `"$($text -replace '"','')`"" ; Activity 'message' 'Se envió un aviso a todos los conectados' 'msg_all' }
            else { cmd /c "msg $([int]$A.id) /TIME:0 `"$($text -replace '"','')`""; Activity 'message' 'Se envió un mensaje a una persona conectada' 'msg_one' }
            $null
        }
        'logoff_session'    {
            $s = Sessions | Where-Object { $_.id -eq [int]$A.id }
            logoff ([int]$A.id); Activity 'access' "Se cerró la sesión de $($s.user)" 'logoff' @{ name = "$($s.user)" }; $null
        }
        'list_access'       { @(AccessList) }
        'list_local_users'  { @(LocalUsers) }
        'grant_access'      { Add-LocalGroupMember -SID $RdpGroup -Member ([string]$A.name); Activity 'access' "Se dio acceso a $(DisplayName $A.name)" 'grant' @{ name = "$(DisplayName $A.name)" }; $null }
        'revoke_access'     { Remove-LocalGroupMember -SID $RdpGroup -Member ([string]$A.name); Activity 'access' "Se quitó el acceso a $(DisplayName $A.name)" 'revoke' @{ name = "$(DisplayName $A.name)" }; $null }
        'get_settings'      { $s = Settings; [ordered]@{ autoFix = [bool]$s.autoFix; notify = [bool]$s.notify; autoUpdateApp = [bool]$s.autoUpdateApp } }
        'save_settings'     {
            $s = Settings; foreach ($k in 'autoFix', 'notify', 'autoUpdateApp') { $s[$k] = [bool]$A.settings.$k }; SaveSettings $s
            $t = Get-ScheduledTask -TaskName 'RDPWrap-AutoFix' -ErrorAction SilentlyContinue
            if ($t) { if ($s.autoFix) { $t | Enable-ScheduledTask | Out-Null } else { $t | Disable-ScheduledTask | Out-Null } }
            $null
        }
        'pause_updates'     {
            if ($A.until) { $rc = RunBat 'bloquear-actualizaciones.bat' "/hasta:$($A.until) /silent"; Activity 'update' "Actualizaciones de Windows en pausa hasta el $($A.until)" 'pause' @{ date = "$($A.until)" } }
            else { $rc = RunBat 'bloquear-actualizaciones.bat' '/desbloquear /silent'; Activity 'update' 'Se reanudaron las actualizaciones de Windows' 'resume' }
            if ($rc -ne 0) { throw "bloquear-actualizaciones termino con $rc" }; $null
        }
        'list_backups'      { @(BackupList) }
        'create_backup'     { $b = NewBackup ([string]$A.reason) 'manual'; Activity 'backup' 'Se guardó una copia de seguridad' 'backup'; $b }
        'restore_backup'    {
            $dir = Join-Path $Backups ([string]$A.id)
            if (-not (Test-Path (Join-Path $dir 'meta.json'))) { throw "No existe la copia $($A.id)" }
            NewBackup 'Antes de volver a una copia' 'before_restore' | Out-Null
            if (Test-Path "$dir\rdpwrap.ini") { Copy-Item "$dir\rdpwrap.ini" $WrapIni -Force }
            foreach ($r in 'terminal-server.reg', 'politicas.reg') { if (Test-Path "$dir\$r") { cmd /c "reg import `"$dir\$r`" >nul 2>&1" } }
            if (Test-Path "$dir\perfil.json") { ApplyProfile (Get-Content "$dir\perfil.json" -Raw | ConvertFrom-Json) | Out-Null }
            EnforceSingleSession; RestartRdp
            Activity 'backup' 'Se volvió a una copia de seguridad' 'restore'; $null
        }
        'backup_to_folder'  {
            $dst = Join-Path ([string]$A.path) 'MUD-Control'
            $b = NewBackup 'Copia en USB o carpeta externa' 'usb'
            New-Item -ItemType Directory -Path $dst -Force | Out-Null
            Copy-Item (Join-Path $Backups $b.id) $dst -Recurse -Force
            Activity 'backup' "Se guardó una copia en $dst" 'backup_folder' @{ path = "$dst" }; $dst
        }
        'export_config'     {
            $p = CurrentProfile (Settings).profile
            [IO.File]::WriteAllText([string]$A.path, ($p | ConvertTo-Json), $Utf8)
            Activity 'export' 'Se exportó la configuración' 'export'; [string]$A.path
        }
        'import_config'     {
            $p = Get-Content ([string]$A.path) -Raw | ConvertFrom-Json
            if (-not ($p.PSObject.Properties.Name -contains 'Puerto')) { throw 'El archivo no es una configuración de MUD Control.' }
            NewBackup 'Antes de importar una configuración' 'before_import' | Out-Null
            $missing = ApplyProfile $p
            Activity 'export' "Se importó la configuración $($p.Nombre)" 'import' @{ name = "$($p.Nombre)" }
            [ordered]@{ missing = @($missing) }
        }
        'get_activity'      {
            $n = if ($A.limit) { [int]$A.limit } else { 50 }
            if (Test-Path $ActLog) { @(Get-Content $ActLog -Tail $n -Encoding UTF8 | ForEach-Object { $_ | ConvertFrom-Json } | Sort-Object { $_.date } -Descending) } else { @() }
        }
        'support_report'    { SupportReport }
        'get_specialist'    { Specialist }
        'save_specialist'   { NewBackup 'Antes de cambiar conexión y seguridad' 'before_specialist' | Out-Null; ApplySpecialist $A.settings; Activity 'update' 'Se cambiaron opciones de conexión y seguridad' 'specialist'; $null }
        'list_profiles'     {
            $active = (Settings).profile
            $list = @(Get-ChildItem $Profiles -Filter *.json -ErrorAction SilentlyContinue | ForEach-Object {
                $p = Get-Content $_.FullName -Raw | ConvertFrom-Json
                [ordered]@{ name = [string]$p.Nombre; active = ($p.Nombre -eq $active); port = [int]$p.Puerto; maxSessions = [int]$p.MaxSesiones; accessCount = @($p.UsuariosRDP).Count }
            })
            if (-not ($list | Where-Object { $_.active })) {
                $c = Specialist
                $list = @([ordered]@{ name = $active; active = $true; port = $c.port; maxSessions = $c.maxSessions; accessCount = @(AccessList).Count }) + $list
            }
            $list
        }
        'profile_from_machine' {
            $name = ([string]$A.name).Trim()
            $file = Join-Path $Profiles (($name -replace '[^\w\- ]', '_') + '.json')
            [IO.File]::WriteAllText($file, ((CurrentProfile $name) | ConvertTo-Json), $Utf8)
            Activity 'export' "Se creó el perfil $name" 'profile_new' @{ name = "$name" }; $null
        }
        'activate_profile'  {
            $f = Get-ChildItem $Profiles -Filter *.json | Where-Object { (Get-Content $_.FullName -Raw | ConvertFrom-Json).Nombre -eq $A.name } | Select-Object -First 1
            if (-not $f) { throw "No existe el perfil $($A.name)" }
            NewBackup "Antes de aplicar el perfil $($A.name)" 'before_profile' @{ name = "$($A.name)" } | Out-Null
            ApplyProfile (Get-Content $f.FullName -Raw | ConvertFrom-Json) | Out-Null
            Activity 'update' "Se aplicó el perfil $($A.name)" 'profile_apply' @{ name = "$($A.name)" }; $null
        }
        'update_ini'        { NewBackup 'Antes de actualizar los datos de Windows' 'before_ini' | Out-Null; $rc = RunBat 'fix-rdpwrap.bat' '/silent'; Activity ($(if ($rc -eq 0) { 'ok' } else { 'warning' })) 'Se buscaron datos nuevos para esta versión de Windows' 'ini'; ($rc -eq 0) }
        'generate_offsets'  { NewBackup 'Antes de generar offsets' 'before_offsets' | Out-Null; $rc = RunBat 'fix-rdpwrap.bat' '/finder /silent'; if ($rc -eq 8) { throw 'Microsoft Defender bloqueó el generador de offsets.' }; Activity 'update' 'Se generaron offsets en este equipo' 'offsets'; ($rc -eq 0) }
        'repair_windows_update' { $rc = RunBat 'reparar-windowsupdate.bat' '/auto'; Activity 'update' 'Se reparó Windows Update' 'wu'; $null }
        'open_logs'         { Start-Process explorer.exe $Data; $null }
        'reinstall'         { NewBackup 'Antes de reinstalar' 'before_reinstall' | Out-Null; RunKit 1; EnforceSingleSession; Activity 'update' 'Se reinstaló RDP Wrapper' 'reinstall'; $null }
        'uninstall'         { NewBackup 'Antes de desinstalar' 'before_uninstall' | Out-Null; RunKit 5; Activity 'warning' 'Se desinstaló RDP Wrapper: solo puede entrar una persona' 'uninstall'; $null }
        default             { throw "Accion desconocida: $Action" }
    }
    Out-Result $result
} catch {
    TLog "ERROR: $($_.Exception.Message)"
    [Console]::Out.WriteLine((@{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress))
    exit 1
}
