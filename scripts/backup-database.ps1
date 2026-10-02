# Backup toan bo Supabase Postgres ve thu muc backup-database/
# Chay:  $env:SUPABASE_DB_PASSWORD="..."; .\scripts\backup-database.ps1
# Hoac:  .\scripts\backup-database.ps1 -DbPassword "..."   (khong khuyen nghi: hien lich su shell)
#
# Lay password: Supabase Dashboard -> project qwbujoppcqpnummhpfbs -> Settings -> Database
#   -> Database password (neu quen: Reset database password) -> copy.
# Yeu cau: pg_dump trong PATH. Neu chua co: winget install -e --id PostgreSQL.PostgreSQL.17
#   (sau do mo lai terminal) hoac https://www.postgresql.org/download/windows/
#   Luu y: neu AppControl chan pg_dump o Program Files, copy thu muc
#   "C:\Program Files\PostgreSQL\17\bin" sang cho khac roi them vao PATH.

param(
  [string]$DbPassword = $env:SUPABASE_DB_PASSWORD,
  [string]$ProjectRef = "qwbujoppcqpnummhpfbs",
  [string]$DbHost,
  [int]$DbPort = 5432,
  [string]$DbUser,
  [string]$DbName = "postgres",
  [string]$OutDir
)

$ErrorActionPreference = "Stop"

# Mac dinh dung Session pooler (IPv4). Lay host/port/user chinh xac:
# Dashboard -> nut Connect -> Connection String -> Session pooler.
# Direct connection (db.<ref>.supabase.co) thuong la IPv6, hay timeout o mang IPv4.
if ([string]::IsNullOrWhiteSpace($DbHost)) { $DbHost = "aws-0-ap-southeast-1.pooler.supabase.co" }
if ([string]::IsNullOrWhiteSpace($DbUser)) { $DbUser = "postgres.$ProjectRef" }
if ([string]::IsNullOrWhiteSpace($OutDir)) {
  $OutDir = Join-Path $PSScriptRoot "..\backup-database"
}
$OutDir = [System.IO.Path]::GetFullPath($OutDir)
if (-not (Test-Path -LiteralPath $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir | Out-Null
}

if ([string]::IsNullOrWhiteSpace($DbPassword)) {
  throw "Thieu password. Chay: `$env:SUPABASE_DB_PASSWORD='...'  roi chay lai script. Lay password: Supabase Dashboard -> Settings -> Database."
}

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
  throw "Khong tim thay pg_dump trong PATH. Cai: winget install -e --id PostgreSQL.16  (sau do mo lai terminal) hoac https://www.postgresql.org/download/windows/"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$sqlFile  = Join-Path $OutDir "supabase-full-$stamp.sql"
$dumpFile = Join-Path $OutDir "supabase-full-$stamp.dump"
$schemaFile = Join-Path $OutDir "supabase-schema-$stamp.sql"

$env:PGPASSWORD = $DbPassword
try {
  # 1) Full backup dang SQL text (de doc, de restore tung phan)
  & pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName `
    --no-owner --no-acl --clean --if-exists -F p -f $sqlFile
  if ($LASTEXITCODE -ne 0) { throw "pg_dump full SQL that bai (exit $LASTEXITCODE)." }

  # 2) Full backup dang custom format (nho gon, restore nhanh bang pg_restore)
  & pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName `
    --no-owner --no-acl -F c -f $dumpFile
  if ($LASTEXITCODE -ne 0) { throw "pg_dump custom format that bai (exit $LASTEXITCODE)." }

  # 3) Schema-only (de doi chieu voi supabase/migrations/)
  & pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName `
    --no-owner --no-acl --schema-only -F p -f $schemaFile
  if ($LASTEXITCODE -ne 0) { throw "pg_dump schema-only that bai (exit $LASTEXITCODE)." }
}
finally {
  Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "OK. Da ghi backup vao $OutDir :"
Get-ChildItem -LiteralPath $OutDir -Filter "supabase-*-$stamp.*" |
  Format-Table Name, @{N="SizeMB";E={[math]::Round($_.Length/1MB,2)}} -AutoSize

Write-Host ""
Write-Host "Restore (can than, ghi de):"
Write-Host "  SQL   : `$env:PGPASSWORD='...'; psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -f `"$sqlFile`""
Write-Host "  Custom: `$env:PGPASSWORD='...'; pg_restore -h $DbHost -p $DbPort -U $DbUser -d $DbName --clean --if-exists `"$dumpFile`""
