// Disposable in-memory database only. Pass an installed PGlite module path if needed.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : '@electric-sql/pglite');
const db = new PGlite();
const sql = async (path) => readFile(new URL(path, import.meta.url), 'utf8');
try {
  await db.exec(await sql('./notification_batches_bootstrap.sql'));
  // Replace only the disposable bootstrap's legacy fixtures.
  await db.exec(`delete from public.notifications;
    insert into public.notifications
      (recipient_id,sender_id,title,message,is_direct,read_at,created_at,revoked_at)
    select ('00000000-0000-0000-0000-' || lpad(recipient::text,12,'0'))::uuid,
      ('00000000-0000-0000-0000-' || lpad(sender::text,12,'0'))::uuid,
      title, message, direct,
      case when recipient=3 then '2026-09-07 13:00:00+00'::timestamptz end,
      '2026-09-07 12:46:18.709025+00'::timestamptz + delta * interval '1 microsecond',
      case when revoked > 0 then '2026-09-07 14:00:00+00'::timestamptz + revoked * interval '1 microsecond' end
    from (values
      ('exact','body',2,1,false,0,0), ('exact','body',3,1,false,0,0),
      ('exact','body',4,1,false,1,0), ('exact','body',4,5,false,0,0),
      ('exact','different',4,1,false,0,0), ('different','body',4,1,false,0,0),
      ('direct','body',2,1,true,0,0), ('direct','body',3,1,true,0,0),
      ('duplicate','body',2,1,false,0,0), ('duplicate','body',2,1,false,0,0),
      ('duplicate','body',3,1,false,0,0),
      ('mixed','body',2,1,false,0,0), ('mixed','body',3,1,false,0,0),
      ('mixed','body',2,1,false,0,1), ('mixed','body',3,1,false,0,1),
      ('mixed','body',4,1,false,0,2)
    ) v(title,message,recipient,sender,direct,delta,revoked);`);
  await db.exec(await sql('../migrations/20260909210000_notification_batches.sql'));
  await db.exec(`insert into public.notification_batches
    (title,message,sender_id,audience_mode,recipient_count,created_at,idempotency_key)
    select 'exact','body','00000000-0000-0000-0000-000000000001','all',1,
      '2026-09-07 12:46:18.709025+00',gen_random_uuid() from generate_series(1,2);
    insert into public.notification_recipients (batch_id,recipient_id)
      select id,'00000000-0000-0000-0000-000000000004' from public.notification_batches where not legacy;
    insert into public.notification_batch_events (batch_id)
      select id from public.notification_batches where not legacy;
    -- Acknowledgment since the upgrade must not be reset to the archive's null.
    update public.notification_recipients set read_at='2026-09-07 13:30:00+00'
      where id=(select min(id) from public.notification_batches where title='exact');`);
  const rows = async (query) => (await db.query(query)).rows;
  const stateQuery = `select r.id,r.recipient_id,r.read_at::text,r.created_at::text,
    b.title,b.message,b.sender_id,b.created_at::text as sent_at,b.revoked_at::text,b.audience_mode,b.legacy
    from public.notification_recipients r join public.notification_batches b on b.id=r.batch_id order by r.id`;
  const before = await rows(stateQuery);
  const archive = await rows('select * from public.notifications order by id');
  const untouchedQuery = `select * from public.notification_batches
    where not legacy or audience_mode='selected' or title='duplicate' order by id`;
  const untouched = await rows(untouchedQuery);
  const expected = await rows(`select min(id) id,sum(recipient_count)::int recipient_count
    from public.notification_batches where legacy and audience_mode='all' and title<>'duplicate'
    group by sender_id,title,message,created_at,revoked_at order by id`);
  const migration = await sql('../migrations/20260909220000_consolidate_legacy_notification_broadcasts.sql');
  await db.exec(migration);
  assert.deepEqual(await rows(stateQuery), before, 'all delivery IDs, read/timestamp/content/revocation state preserved');
  assert.deepEqual(await rows('select * from public.notifications order by id'), archive, 'archive unchanged');
  assert.deepEqual(await rows(untouchedQuery), untouched, 'direct, new and duplicate-recipient groups untouched');
  assert.deepEqual(await rows(`select id,recipient_count from public.notification_batches
    where legacy and audience_mode='all' and title<>'duplicate' order by id`), expected,
  'exact groups merge to minimum existing ID; microseconds, senders, content and revoke states stay separate');
  assert.equal((await rows('select count(*)::int n from public.notification_batches'))[0].n, 15);
  assert.equal((await rows('select count(*)::int n from public.notification_batch_events'))[0].n, 15);
  const snapshotQuery = `select jsonb_build_object(
    'batches',(select jsonb_agg(b order by id) from public.notification_batches b),
    'recipients',(select jsonb_agg(r order by id) from public.notification_recipients r),
    'events',(select jsonb_agg(e order by batch_id) from public.notification_batch_events e)) state`;
  const snapshot = await rows(snapshotQuery);
  await db.exec(migration);
  assert.deepEqual(await rows(snapshotQuery), snapshot, 'rerun is a no-op');
  await db.exec(`select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false)`);
  const removed = archive.find((n) => !expected.some((b) => b.id === n.id) && n.title === 'exact' && n.message === 'body');
  assert.ok(removed, 'fixture has a removed batch ID');
  assert.deepEqual(await rows(`select public.get_notification_batch_details(${removed.id}) details,
    public.revoke_notification_batch(${removed.id}) revoked,
    (select count(*)::int from public.list_notification_batch_recipients(${removed.id})) recipients`),
  [{ details: null, revoked: false, recipients: 0 }], 'stale admin IDs safely return missing without aliases');
  console.log('PASS: exact grouping, exclusions, mixed revocation, state/archive preservation, event cleanup, stale IDs, idempotence');
} finally {
  await db.close();
}
