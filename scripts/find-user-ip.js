/**
 * Tim dia chi IP cua 1 user chi dinh qua Supabase Logs Explorer API.
 *
 * Cach dung:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node ./scripts/find-user-ip.js <user-id-hoac-email> [--hours 24]
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node ./scripts/find-user-ip.js 24100093@st.phenikaa-uni.edu.vn --hours 12
 *
 * Can lay SUPABASE_ACCESS_TOKEN (Personal Access Token) o:
 *   Supabase Dashboard -> Account (avatar goc trai duoi) -> Access Tokens -> Generate New Token
 * Neu truyen email thay vi user-id thi can them:
 *   SUPABASE_URL=https://<ref>.supabase.co  SUPABASE_SERVICE_ROLE_KEY=eyJ...
 * de doi email -> user-id qua bang profiles (chay local tren may admin, KHONG commit key).
 *
 * Luu y:
 * - Chi tra ve request DA XAC THUC (co JWT): log gateway giu user id o
 *   log_attributes['request.sb.auth_user']. Request anon (khong dang nhap)
 *   khong gan duoc cho user nao.
 * - Free plan giu log ~24h: muon tra xa hon thi giam --hours khong co tac dung,
 *   phai nang plan / export log ra ngoai.
 * - IP chi la manh moi (NAT chung, 4G doi IP, VPN), khong phai bang chung dinh danh.
 */
const API_BASE = "https://api.supabase.com/v1";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function usage() {
  console.log(`[find-user-ip] Cach dung:
  SUPABASE_ACCESS_TOKEN=sbp_xxx node ./scripts/find-user-ip.js <user-id-hoac-email> [--hours 24] [--ref <project-ref>]

  Vi du:
  SUPABASE_ACCESS_TOKEN=sbp_xxx node ./scripts/find-user-ip.js d787b921-4ed7-4df0-b2f4-75252f4a2ff7 --hours 24`);
}

function parseArgs(argv) {
  const out = { target: null, hours: 24, ref: process.env.SUPABASE_PROJECT_REF ?? "qwbujoppcqpnummhpfbs" };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--hours" && argv[i + 1]) out.hours = Math.max(1, Math.min(24 * 30, Number(argv[++i]) || 24));
    else if (argv[i] === "--ref" && argv[i + 1]) out.ref = argv[++i];
    else if (argv[i] === "--help" || argv[i] === "-h") { usage(); process.exit(0); }
    else rest.push(argv[i]);
  }
  out.target = rest[0] ?? null;
  return out;
}

function escapeSingleQuotes(value) {
  return String(value).replace(/'/g, "''");
}

async function resolveUserId(target) {
  if (UUID_RE.test(target)) return target;
  if (!target.includes("@")) throw new Error(`Khong phai user-id (uuid) cung khong phai email: ${target}`);
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Truyen email can SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY de doi sang user-id (hoac truyen thang user-id).");
  }
  const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/profiles?select=id,email&email=eq.${encodeURIComponent(target)}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) throw new Error(`Doi email -> user-id that bai: HTTP ${res.status} ${await res.text()}`);
  const rows = await res.json();
  if (!rows.length) throw new Error(`Khong tim thay profile co email ${target}`);
  console.log(`[find-user-ip] ${target} -> user-id ${rows[0].id}`);
  return rows[0].id;
}

async function queryLogs({ ref, token, sql, start, end }) {
  const endpoint = `${API_BASE}/projects/${ref}/analytics/endpoints/logs?` + new URLSearchParams({
    sql,
    iso_timestamp_start: start.toISOString(),
    iso_timestamp_end: end.toISOString(),
  });
  const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  if (!res.ok) throw new Error(`Logs API HTTP ${res.status}: ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

function pad(value, width) {
  const s = String(value ?? "");
  return s.length >= width ? s.slice(0, width) : s + " ".repeat(width - s.length);
}

async function main() {
  const { target, hours, ref } = parseArgs(process.argv.slice(2));
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!target) { usage(); process.exit(1); }
  if (!token) throw new Error("Thieu SUPABASE_ACCESS_TOKEN (Personal Access Token lay tu Dashboard -> Account -> Access Tokens).");

  const userId = await resolveUserId(target);
  if (!UUID_RE.test(userId)) throw new Error(`User-id khong hop le: ${userId}`);

  const end = new Date();
  const start = new Date(end.getTime() - hours * 3600 * 1000);
  console.log(`[find-user-ip] project=${ref} user=${userId}`);
  console.log(`[find-user-ip] khoang ${start.toISOString()} -> ${end.toISOString()} (Free plan thuong chi giu log ~24h)`);

  const sql = `select log_attributes['request.headers.cf_connecting_ip'] as ip,`
    + ` log_attributes['request.path'] as path,`
    + ` log_attributes['request.headers.user_agent'] as user_agent,`
    + ` count() as requests, min(timestamp) as first_seen, max(timestamp) as last_seen`
    + ` from logs where source = 'edge_logs'`
    + ` and log_attributes['request.sb.auth_user'] = '${escapeSingleQuotes(userId)}'`
    + ` group by ip, path, user_agent order by requests desc limit 200`;

  const data = await queryLogs({ ref, token, sql, start, end });
  const rows = data.result ?? data.data ?? [];
  if (!rows.length) {
    console.log("[find-user-ip] Khong co request nao cua user nay trong khoang thoi gian tren.");
    console.log("[find-user-ip] Thu tang --hours (toi da theo retention), hoac user nay chi goi request anon (khong JWT) nen log khong gan duoc user-id.");
    return;
  }
  const distinctIps = [...new Set(rows.map((r) => r.ip).filter(Boolean))];
  console.log(`[find-user-ip] ${rows.length} dong, ${distinctIps.length} IP khac nhau: ${distinctIps.join(", ")}`);
  console.log(`${pad("REQUESTS", 9)}${pad("IP", 18)}${pad("LAST_SEEN", 22)}PATH`);
  for (const r of rows) {
    console.log(`${pad(r.requests, 9)}${pad(r.ip || "(an)", 18)}${pad(r.last_seen || "", 22)}${r.path || ""}`);
    if (r.user_agent) console.log(`         UA: ${String(r.user_agent).slice(0, 160)}`);
  }
}

main().catch((err) => { console.error(`[find-user-ip] LOI: ${err instanceof Error ? err.message : err}`); process.exit(1); });
