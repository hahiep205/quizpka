# Tach file pg_dump dang SQL text thanh tung bang rieng de migrate dan.
# Chay:  python scripts/split-sql-dump.py backup-database\supabase-full-20260930-061506.sql backup-database\split-20260930-061506
#
# Ket qua:
#   tables/<schema>.<table>.sql  (DROP + CREATE SEQUENCE + CREATE TABLE + COPY data + setval + INDEX + COMMENT)
#   00_header.sql                (SET, EXTENSION, SCHEMA -- chay dau tien)
#   90_fks.sql                   (FOREIGN KEY -- chay sau tables/)
#   99_post.sql                  (FUNCTION, TRIGGER, POLICY, ... -- chay cuoi)
#   restore-split.ps1            (chay toan bo theo dung thu tu)
#   manifest.txt                 (danh sach file + so dong data)

import re
import sys
from pathlib import Path


def split_statements(lines):
    """Cat dump thanh tung statement, ton trong COPY block, 'quote', \"ident\" va $tag$."""
    stmts = []
    buf = []
    in_copy = False
    squote = False
    dquote = False
    dollar = None
    paren = 0
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        s = line.rstrip("\n")
        buf.append(line)
        if in_copy:
            if s == "\\.":
                stmts.append("".join(buf))
                buf = []
                in_copy = False
            i += 1
            continue
        # quet ky tu de tim ket thuc statement
        j = 0
        L = len(s)
        end_at = None
        while j < L:
            ch = s[j]
            if dollar:
                if s.startswith(dollar, j):
                    j += len(dollar)
                    dollar = None
                    continue
                j += 1
                continue
            if squote:
                if ch == "'":
                    if j + 1 < L and s[j + 1] == "'":
                        j += 2
                        continue
                    squote = False
                j += 1
                continue
            if dquote:
                if ch == '"':
                    dquote = False
                j += 1
                continue
            if ch == "-" and j + 1 < L and s[j + 1] == "-":
                break  # comment cuoi dong
            if ch == "'":
                squote = True
                j += 1
                continue
            if ch == '"':
                dquote = True
                j += 1
                continue
            if ch == "$":
                m = re.match(r"\$[A-Za-z_][A-Za-z_0-9]*\$|\$\$", s[j:])
                if m:
                    dollar = m.group(0)
                    j += len(dollar)
                    continue
                j += 1
                continue
            if ch == "(":
                paren += 1
            elif ch == ")":
                paren = max(0, paren - 1)
            elif ch == ";" and paren == 0:
                end_at = True
                break
            j += 1
        # nhan dien COPY ... FROM stdin;
        if end_at and not squote and not dquote and not dollar:
            first = "".join(buf).lstrip()
            stmt_text = "".join(buf)
            code_head = strip_leading_comments(stmt_text)
            if re.match(r"(?is)^\s*COPY\s+\S.*\bFROM\s+stdin\s*;", code_head):
                in_copy = True
            else:
                stmts.append(stmt_text)
                buf = []
                paren = 0
        i += 1
    if buf:
        stmts.append("".join(buf))
    return stmts


def strip_leading_comments(st):
    """Bo cac dong comment/blank o dau de phan loai (giu nguyen st goc de ghi file)."""
    return re.sub(r"\A(?:[ \t]*--[^\n]*\n|[ \t\r]*\n)+", "", st)


def norm_name(raw):
    raw = raw.strip().strip('"')
    parts = [p.strip().strip('"') for p in raw.split(".")]
    if len(parts) == 1:
        return ("public", parts[0])
    return (parts[-2], parts[-1])


def main():
    src = Path(sys.argv[1])
    out = Path(sys.argv[2])
    lines = src.read_text(encoding="utf-8", errors="replace").splitlines(keepends=True)
    stmts = split_statements(lines)

    header, post, fks = [], [], []
    tables = {}  # (schema, table) -> dict(drop, seqs, create, alters, copy, setvals, indexes, comments)
    seq_buf = {}  # seqname -> [create_stmt]
    seq_owner = {}  # seqname -> (schema, table)
    setval_buf = []  # (seqname, stmt)
    seen_table = False

    def T(key):
        return tables.setdefault(key, {"drop": [], "seqs": [], "create": [],
                                       "alters": [], "copy": [], "setvals": [],
                                       "indexes": [], "comments": []})

    pending_comments = []

    def flush_pending(target):
        if pending_comments:
            target.extend(pending_comments)
            pending_comments.clear()

    for st in stmts:
        code = strip_leading_comments(st)  # pg_dump ghep TOC comment lien truoc object
        if not code.strip():
            pending_comments.append(st)
            continue
        up = code.upper()

        m = re.match(r"(?is)^\s*CREATE\s+(?:UNLOGGED\s+|TEMPORARY\s+|TEMP\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\S+)", code)
        if m:
            seen_table = True
            key = norm_name(m.group(1).rstrip("("))
            t = T(key)
            flush_pending(t["create"])
            t["create"].append(st)
            continue

        m = re.match(r"(?is)^\s*DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(\S+)", code)
        if m:
            key = norm_name(m.group(1).rstrip(";"))
            flush_pending(T(key)["drop"])
            T(key)["drop"].append(st)
            continue

        m = re.match(r"(?is)^\s*COPY\s+(\S+)", code)
        if m:
            key = norm_name(m.group(1))
            t = T(key)
            flush_pending(t["copy"])
            t["copy"].append(st)
            continue

        m = re.match(r"(?is)^\s*ALTER\s+TABLE\s+(?:ONLY\s+)?(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(\S+)", code)
        if m and ("FOREIGN KEY" in up or "VALIDATE CONSTRAINT" in up):
            flush_pending(fks)
            fks.append(st)
            continue
        if m:
            key = norm_name(m.group(1))
            flush_pending(T(key)["alters"])
            T(key)["alters"].append(st)
            continue

        m = re.match(r"(?is)^\s*CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?\S+\s+ON\s+(?:ONLY\s+)?(\S+)", code)
        if m:
            key = norm_name(m.group(1))
            flush_pending(T(key)["indexes"])
            T(key)["indexes"].append(st)
            continue

        m = re.match(r"(?is)^\s*CREATE\s+(?:TEMPORARY\s+|TEMP\s+|UNLOGGED\s+)?SEQUENCE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\S+)", code)
        if m:
            seq_buf.setdefault(norm_name(m.group(1).rstrip(";")), []).append(st)
            pending_comments.clear()  # comment TOC cua sequence khong can giu rieng
            continue

        m = re.match(r"(?is)^\s*ALTER\s+SEQUENCE\s+(?:IF\s+EXISTS\s+)?(\S+)\s+OWNED\s+BY\s+(\S+?)(?:\s|;|$)", code)
        if m:
            seq = norm_name(m.group(1))
            own = m.group(2).rstrip(";")
            parts = [p.strip().strip('"') for p in own.split(".")]
            tbl = (parts[-3], parts[-2]) if len(parts) >= 3 else (seq[0], parts[-2] if len(parts) > 1 else parts[-1])
            seq_owner[seq] = tbl
            T(tbl)["seqs"].append(st)
            continue

        m = re.match(r"(?is)^\s*SELECT\s+pg_catalog\.setval\('([^']+)'", code)
        if m:
            setval_buf.append((norm_name(m.group(1)), st))
            continue

        m = re.match(r"(?is)^\s*COMMENT\s+ON\s+(?:TABLE|COLUMN|SEQUENCE|INDEX)\s+(\S+)", code)
        if m:
            raw = m.group(1)
            base = raw.split("(")[0]
            key = norm_name(base)
            if key in tables:
                flush_pending(T(key)["comments"])
                T(key)["comments"].append(st)
            else:
                flush_pending(post)
                post.append(st)
            continue

        # CREATE SCHEMA / EXTENSION / search_path luon vao header de restore khong loi thu tu
        if (up.startswith("CREATE SCHEMA") or up.startswith("CREATE EXTENSION")
                or "SET_CONFIG('SEARCH_PATH'" in up.replace(" ", "")):
            flush_pending(header)
            header.append(st)
            continue

        if not seen_table:
            flush_pending(header)
            header.append(st)
        else:
            flush_pending(post)
            post.append(st)

    if pending_comments:
        post.extend(pending_comments)

    # gan CREATE SEQUENCE + setval vao bang chu
    for seq, key in seq_owner.items():
        if seq in seq_buf:
            T(key)["seqs"] = seq_buf.pop(seq) + T(key)["seqs"]
    for seq, lst in seq_buf.items():
        post = lst + post  # sequence le -> post (dau file)
    for seq, st in setval_buf:
        if seq in seq_owner and seq_owner[seq] in tables:
            tables[seq_owner[seq]]["setvals"].append(st)
        else:
            post.append(st)

    # ghi file
    tdir = out / "tables"
    tdir.mkdir(parents=True, exist_ok=True)
    manifest = []
    total_rows = 0
    for (schema, table) in sorted(tables):
        t = tables[(schema, table)]
        rows = 0
        for c in t["copy"]:
            ls = c.splitlines()
            i = 0
            while i < len(ls) and not re.match(r"(?i)^\s*COPY\s", ls[i]):
                i += 1  # bo TOC comment dung truoc COPY
            for l in ls[i + 1:]:
                if l == "\\.":
                    break
                rows += 1
        total_rows += rows
        fname = f"{schema}.{table}.sql"
        with open(tdir / fname, "w", encoding="utf-8") as f:
            f.write(f"-- Split tu {src.name} | bang {schema}.{table} | {rows} dong data\n")
            f.write("-- Thu tu restore: 00_header.sql -> tables/*.sql -> 90_fks.sql -> 99_post.sql\n\n")
            for part in ("drop", "seqs", "create", "alters", "copy", "setvals", "indexes", "comments"):
                for s in t[part]:
                    f.write(s)
                    if not s.endswith("\n"):
                        f.write("\n")
        manifest.append((fname, rows))

    (out / "00_header.sql").write_text("".join(header), encoding="utf-8")
    (out / "90_fks.sql").write_text("".join(fks), encoding="utf-8")
    (out / "99_post.sql").write_text("".join(post), encoding="utf-8")
    with open(out / "manifest.txt", "w", encoding="utf-8") as f:
        f.write(f"nguon: {src.name}\nso bang: {len(manifest)}\ntong dong data: {total_rows}\n\n")
        for fname, rows in manifest:
            f.write(f"{rows}\ttables/{fname}\n")

    restore_ps1 = """param(
  [string]$DbPassword = $env:SUPABASE_DB_PASSWORD,
  [string]$DbHost = "aws-0-ap-southeast-1.pooler.supabase.com",
  [int]$DbPort = 5432,
  [string]$DbUser = "postgres.mbhzkugcfovdthjdjqtx",
  [string]$DbName = "postgres"
)
$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($DbPassword)) { throw "Thieu password. Dat `$env:SUPABASE_DB_PASSWORD truoc." }
$env:PGPASSWORD = $DbPassword
try {
  $dir = Split-Path -Parent $MyInvocation.MyCommand.Path
  psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -f (Join-Path $dir "00_header.sql")
  Get-ChildItem -LiteralPath (Join-Path $dir "tables") -Filter "*.sql" | Sort-Object Name | ForEach-Object {
    psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -f $_.FullName
  }
  psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -f (Join-Path $dir "90_fks.sql")
  psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -f (Join-Path $dir "99_post.sql")
} finally { Remove-Item Env:\\PGPASSWORD -ErrorAction SilentlyContinue }
Write-Host "Restore split xong."
"""
    (out / "restore-split.ps1").write_text(restore_ps1, encoding="utf-8")

    n_in = len(stmts)
    print(f"statements nguon: {n_in}")
    print(f"so bang: {len(manifest)} | tong dong data: {total_rows}")
    print(f"thu muc: {out}")


if __name__ == "__main__":
    main()
