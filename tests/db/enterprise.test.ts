/**
 * The enterprise and portfolio layer (migrations 0017–0024), tested against a
 * real Postgres with RLS applied as each role.
 */

import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Transaction } from '@electric-sql/pglite';
import { createTestDb, seedTwoTenants, sqlState, type TestDb } from './harness';

let t: TestDb;
let s: Awaited<ReturnType<typeof seedTwoTenants>>;
let operator: string;

const VEC = `array_fill(0.1::real, array[1536])::vector`;

before(async () => {
  t = await createTestDb();
  s = await seedTwoTenants(t);
  operator = await t.createUser('ops@truss.test');
  await t.db.query(`insert into platform_admins (user_id) values ($1)`, [operator]);
});

async function count(tx: Transaction, sql: string, params: unknown[] = []): Promise<number> {
  const { rows } = await tx.query<{ n: number }>(`select count(*)::int as n from (${sql}) q`, params);
  return rows[0].n;
}

/** A scored practice session written the way the scoring route writes it. */
async function scorecard(
  org: string,
  user: string,
  scores: [number, number, number, number, number],
  opts: { critical?: boolean; at?: string } = {},
) {
  const { rows } = await t.db.query<{ id: string }>(
    `insert into practice_sessions (org_id, user_id, scenario_id) values ($1, $2, 'x') returning id`,
    [org, user],
  );
  await t.db.query(
    `insert into scorecards (session_id, org_id, user_id, trust, relate, understand, solve, secure,
       outcome, headline, summary, stages, critical_findings, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, 'next-step-set', 'h', 's', '[]', $9, coalesce($10::timestamptz, now()))`,
    [
      rows[0].id, org, user, ...scores,
      JSON.stringify(opts.critical ? [{ code: 'deductible', description: 'offered to cover it', evidence: 'we eat it' }] : []),
      opts.at ?? null,
    ],
  );
  await t.db.query(`update practice_sessions set duration_seconds = 600, status = 'scored' where id = $1`, [rows[0].id]);
}

describe('0017 findings and outcomes', () => {
  it('weights the rubric the way the knowledge base does', async () => {
    const { rows } = await t.db.query<{ w: number }>(
      `select round((20*4 + 15*4 + 25*4 + 25*4 + 15*4)::numeric / 4) as w`,
    );
    assert.equal(Number(rows[0].w), 100);
    await scorecard(s.orgA, s.repA, [3, 3, 3, 3, 3]);
    const { rows: sc } = await t.db.query<{ weighted_score: number; has_critical: boolean }>(
      `select weighted_score, has_critical from scorecards where user_id = $1 order by created_at desc limit 1`,
      [s.repA],
    );
    assert.equal(sc[0].weighted_score, 75);
    assert.equal(sc[0].has_critical, false);
  });

  it('a critical finding fails a session whatever the score', async () => {
    const { rows } = await t.db.query<{ a: boolean; b: boolean }>(
      `select truss_is_passing(100, true) as a, truss_is_passing(75, false) as b`,
    );
    assert.equal(rows[0].a, false);
    assert.equal(rows[0].b, true);
  });

  it('stamps won and lost dates from status, and clears them if the deal reopens', async () => {
    const { rows } = await t.db.query<{ id: string }>(
      `insert into accounts (org_id, name, owner_user_id) values ($1, 'Jones', $2) returning id`,
      [s.orgA, s.repA],
    );
    const id = rows[0].id;
    await t.db.query(`update accounts set status = 'signed' where id = $1`, [id]);
    let a = (await t.db.query<{ signed_at: string | null; lost_at: string | null }>(
      `select signed_at, lost_at from accounts where id = $1`, [id])).rows[0];
    assert.ok(a.signed_at);
    assert.equal(a.lost_at, null);

    await t.db.query(`update accounts set status = 'lost' where id = $1`, [id]);
    a = (await t.db.query<{ signed_at: string | null; lost_at: string | null }>(
      `select signed_at, lost_at from accounts where id = $1`, [id])).rows[0];
    assert.ok(a.signed_at, 'a cancelled job keeps the date it was won');
    assert.ok(a.lost_at);

    await t.db.query(`update accounts set status = 'lead' where id = $1`, [id]);
    a = (await t.db.query<{ signed_at: string | null; lost_at: string | null }>(
      `select signed_at, lost_at from accounts where id = $1`, [id])).rows[0];
    assert.equal(a.signed_at, null);
    assert.equal(a.lost_at, null);
  });

  it('keeps an imported signing date instead of overwriting it with now', async () => {
    const { rows } = await t.db.query<{ signed_at: Date }>(
      `insert into accounts (org_id, name, status, signed_at) values ($1, 'Imported', 'signed', '2026-03-01T00:00:00Z')
       returning signed_at`,
      [s.orgA],
    );
    assert.equal(new Date(rows[0].signed_at).toISOString(), '2026-03-01T00:00:00.000Z');
  });

  it('lets a manager record a company event and refuses a rep', async () => {
    await t.as(s.managerA, (tx) =>
      tx.query(`select record_org_event($1, 'knowledge.add', '{"title":"Playbook"}')`, [s.orgA]),
    );
    const code = await sqlState(() =>
      t.as(s.repA, (tx) => tx.query(`select record_org_event($1, 'knowledge.add', '{}')`, [s.orgA])),
    );
    assert.equal(code, '42501');
  });

  it('refuses an event name outside the allowed set', async () => {
    const code = await sqlState(() =>
      t.as(s.managerA, (tx) => tx.query(`select record_org_event($1, 'member.remove', '{}')`, [s.orgA])),
    );
    assert.equal(code, '22023');
  });

  it('shows the audit feed to owners, not managers, and never to another company', async () => {
    await t.db.query(`select 1`);
    const ownerRows = await t.as(s.ownerA, (tx) => count(tx, `select * from org_audit_feed($1)`, [s.orgA]));
    assert.ok(ownerRows >= 0);
    assert.equal(
      await sqlState(() => t.as(s.managerA, (tx) => tx.query(`select * from org_audit_feed($1)`, [s.orgA]))),
      '42501',
    );
    assert.equal(
      await sqlState(() => t.as(s.ownerB, (tx) => tx.query(`select * from org_audit_feed($1)`, [s.orgA]))),
      '42501',
    );
  });

  it('keeps audit rows out of reach of direct writes', async () => {
    const code = await sqlState(() =>
      t.as(s.ownerA, (tx) =>
        tx.query(`insert into org_audit_log (org_id, action) values ($1, 'forged')`, [s.orgA]),
      ),
    );
    assert.equal(code, '42501');
  });
});

describe('0018 portfolio hierarchy', () => {
  let portfolio: string;
  let holdcoLead: string;

  before(async () => {
    holdcoLead = await t.createUser('lead@holdco.test');
    const { rows } = await t.db.query<{ id: string }>(
      `insert into organizations (name, slug, plan, kind) values ('Summit Holdings', 'summit', 'enterprise', 'portfolio') returning id`,
    );
    portfolio = rows[0].id;
    await t.db.query(`insert into memberships (org_id, user_id, role) values ($1, $2, 'owner')`, [portfolio, holdcoLead]);
    await t.db.query(
      `insert into org_settings (org_id, playbook_rules) values ($1, array['Never quote at the door.'])`,
      [portfolio],
    );
  });

  it('only an operator can place a company in a portfolio', async () => {
    const code = await sqlState(() =>
      t.as(s.ownerA, (tx) =>
        tx.query(`select admin_set_org_hierarchy($1, 'company', $2)`, [s.orgA, portfolio]),
      ),
    );
    assert.equal(code, '42501');

    await t.db.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [operator]);
      await tx.exec('set local role authenticated');
      await tx.query(`select admin_set_org_hierarchy($1, 'company', $2)`, [s.orgA, portfolio]);
    });
    const { rows } = await t.db.query<{ parent_org_id: string }>(
      `select parent_org_id from organizations where id = $1`, [s.orgA],
    );
    assert.equal(rows[0].parent_org_id, portfolio);
  });

  it('refuses a company as a parent, and a portfolio inside a portfolio', async () => {
    assert.equal(
      await sqlState(() => t.db.query(`update organizations set parent_org_id = $1 where id = $2`, [s.orgB, s.orgA])),
      '23514',
    );
    assert.equal(
      await sqlState(() => t.db.query(`update organizations set kind = 'portfolio' where id = $1`, [s.orgA])),
      '23514',
    );
  });

  it('flows the portfolio playbook, knowledge, and published scenarios down to its companies only', async () => {
    const { rows: doc } = await t.db.query<{ id: string }>(
      `insert into knowledge_documents (org_id, title, status) values ($1, 'House Method', 'ready') returning id`,
      [portfolio],
    );
    await t.db.query(
      `insert into knowledge_chunks (document_id, org_id, chunk_index, content, embedding)
       values ($1, $2, 0, 'Holdco standard: scope after the adjuster meeting.', ${VEC})`,
      [doc[0].id, portfolio],
    );
    await t.db.query(
      `insert into custom_scenarios (org_id, title, setup, character_brief, is_published) values
         ($1, 'Holdco published', 'setup', 'brief', true),
         ($1, 'Holdco draft', 'setup', 'brief', false)`,
      [portfolio],
    );

    const repA = await t.as(s.repA, async (tx) => ({
      rules: (await tx.query<{ playbook_rules: string[] }>(
        `select playbook_rules from org_settings where org_id = $1`, [portfolio])).rows[0]?.playbook_rules,
      matches: await count(tx, `select * from match_knowledge(${VEC}, $1, 10, 0)`, [s.orgA]),
      scenarios: (await tx.query<{ title: string }>(
        `select title from custom_scenarios where org_id = $1`, [portfolio])).rows.map((r) => r.title),
      parent: (await tx.query<{ name: string }>(`select name from org_parent_summary($1)`, [s.orgA])).rows[0]?.name,
    }));
    assert.deepEqual(repA.rules, ['Never quote at the door.']);
    assert.equal(repA.matches, 1);
    assert.deepEqual(repA.scenarios, ['Holdco published']);
    assert.equal(repA.parent, 'Summit Holdings');

    const repB = await t.as(s.repB, async (tx) => ({
      chunks: await count(tx, `select id from knowledge_chunks where org_id = $1`, [portfolio]),
      matches: await count(tx, `select * from match_knowledge(${VEC}, $1, 10, 0)`, [portfolio]),
    }));
    assert.equal(repB.chunks, 0, 'a company outside the portfolio inherits nothing');
    assert.equal(repB.matches, 0);
  });

  it('gives portfolio leaders no row access to a company’s people', async () => {
    await scorecard(s.orgA, s.repA, [4, 4, 4, 4, 4]);
    const seen = await t.as(holdcoLead, async (tx) => ({
      scorecards: await count(tx, `select id from scorecards where org_id = $1`, [s.orgA]),
      accounts: await count(tx, `select id from accounts where org_id = $1`, [s.orgA]),
      org: await count(tx, `select id from organizations where id = $1`, [s.orgA]),
    }));
    assert.deepEqual(seen, { scorecards: 0, accounts: 0, org: 0 });
  });

  it('rolls a portfolio up for its leaders and refuses everyone else', async () => {
    const rows = await t.as(holdcoLead, async (tx) =>
      (await tx.query<{ name: string; simulations: number; reps: number }>(
        `select name, simulations, reps from portfolio_company_summary($1, now() - interval '90 days')`,
        [portfolio],
      )).rows,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, 'Apex Roofing');
    assert.ok(rows[0].simulations >= 1);
    assert.equal(rows[0].reps, 1);

    assert.equal(
      await sqlState(() =>
        t.as(s.managerA, (tx) => tx.query(`select * from portfolio_company_summary($1, now())`, [portfolio])),
      ),
      '42501',
    );
    assert.equal(
      await sqlState(() =>
        t.as(s.ownerA, (tx) => tx.query(`select * from portfolio_company_summary($1, now())`, [s.orgA])),
      ),
      '22023',
    );
  });

  it('keeps branches inside their own company', async () => {
    const { rows } = await t.db.query<{ id: string }>(
      `insert into branches (org_id, name) values ($1, 'Tulsa') returning id`, [s.orgB],
    );
    const code = await sqlState(() =>
      t.db.query(`update memberships set branch_id = $1 where org_id = $2 and user_id = $3`, [rows[0].id, s.orgA, s.repA]),
    );
    assert.equal(code, '23503');
  });
});

describe('0019 field reviews', () => {
  it('cannot be written from the browser', async () => {
    const code = await sqlState(() =>
      t.as(s.repA, (tx) =>
        tx.query(
          `insert into field_reviews (org_id, user_id, context, consent_attested_at, consent_statement,
             trust, relate, understand, solve, secure, outcome, headline, summary, stages)
           values ($1, $2, 'door', now(), 'yes', 4,4,4,4,4, 'signed', 'h', 's', '[]')`,
          [s.orgA, s.repA],
        ),
      ),
    );
    assert.equal(code, '42501');
  });

  it('is readable by the rep and their managers, not by teammates', async () => {
    await t.db.query(
      `insert into field_reviews (org_id, user_id, submitted_by, context, consent_attested_at, consent_statement,
         trust, relate, understand, solve, secure, outcome, headline, summary, stages)
       values ($1, $2, $2, 'door', now(), 'yes', 3,3,3,3,3, 'next-step-set', 'h', 's', '[]')`,
      [s.orgA, s.repA],
    );
    const otherRep = await t.createUser('rep2-a@example.com');
    await t.db.query(`insert into memberships (org_id, user_id, role) values ($1, $2, 'rep')`, [s.orgA, otherRep]);

    assert.equal(await t.as(s.repA, (tx) => count(tx, 'select id from field_reviews')), 1);
    assert.equal(await t.as(s.managerA, (tx) => count(tx, 'select id from field_reviews')), 1);
    assert.equal(await t.as(otherRep, (tx) => count(tx, 'select id from field_reviews')), 0);
    assert.equal(await t.as(s.managerB, (tx) => count(tx, 'select id from field_reviews')), 0);
  });

  it('is metered against the plan', async () => {
    await t.db.query(`update organizations set plan = 'free' where id = $1`, [s.orgB]);
    const first = await t.as(s.repB, async (tx) =>
      (await tx.query<{ ok: boolean }>(`select within_quota($1, 'field_review') as ok`, [s.orgB])).rows[0].ok,
    );
    assert.equal(first, true);
    await t.as(s.repB, async (tx) => {
      await tx.query(`select record_usage($1, $2, 'field_review', 1)`, [s.orgB, s.repB]);
      const after = (await tx.query<{ ok: boolean }>(`select within_quota($1, 'field_review') as ok`, [s.orgB])).rows[0].ok;
      assert.equal(after, false, 'the free plan allows one');
    });
    await t.db.query(`update organizations set plan = 'team' where id = $1`, [s.orgB]);
  });
});

describe('0020 curriculum and certification', () => {
  let cohort: string;
  let learner: string;

  before(async () => {
    learner = await t.createUser('learner-b@example.com');
    await t.db.query(`insert into memberships (org_id, user_id, role) values ($1, $2, 'rep')`, [s.orgB, learner]);
    cohort = await t.as(s.managerB, async (tx) =>
      (await tx.query<{ id: string }>(
        `insert into cohorts (org_id, name, starts_on) values ($1, 'Spring', current_date - 60) returning id`,
        [s.orgB],
      )).rows[0].id,
    );
    // as() rolls back, so create for real.
    const { rows } = await t.db.query<{ id: string }>(
      `insert into cohorts (org_id, name, starts_on) values ($1, 'Spring', current_date - 60) returning id`,
      [s.orgB],
    );
    cohort = rows[0].id;
    await t.db.query(`insert into cohort_members (cohort_id, org_id, user_id) values ($1, $2, $3)`, [cohort, s.orgB, learner]);
  });

  async function asUser<T>(user: string, fn: (tx: Transaction) => Promise<T>): Promise<T> {
    return t.db.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [user]);
      await tx.exec('set local role authenticated');
      return fn(tx);
    });
  }

  it('refuses enrolment of someone outside the company', async () => {
    const code = await sqlState(() =>
      t.db.query(`insert into cohort_members (cohort_id, org_id, user_id) values ($1, $2, $3)`, [cohort, s.orgB, s.repA]),
    );
    assert.equal(code, '23503');
  });

  it('lets a rep submit their own work, and nobody else’s', async () => {
    await asUser(learner, (tx) => tx.query(`select submit_module_work($1, 1, 'prework', 'My self-assessment')`, [cohort]));
    const code = await sqlState(() =>
      t.as(s.repB, (tx) => tx.query(`select submit_module_work($1, 1, 'prework', 'x')`, [cohort])),
    );
    assert.equal(code, '42501');
    const direct = await sqlState(() =>
      t.as(learner, (tx) =>
        tx.query(`update module_progress set manager_checked_at = now() where cohort_id = $1`, [cohort]),
      ),
    );
    assert.equal(direct, '42501', 'a rep cannot check their own week');
  });

  it('will not let a manager check a half-submitted week', async () => {
    const code = await sqlState(() =>
      t.as(s.managerB, (tx) => tx.query(`select record_manager_check($1, $2, 1)`, [cohort, learner])),
    );
    assert.equal(code, '22023');
  });

  it('will not certify before every criterion is met', async () => {
    const code = await sqlState(() =>
      t.as(s.managerB, (tx) => tx.query(`select issue_certification($1, $2, true, true)`, [cohort, learner])),
    );
    assert.equal(code, '23514');
  });

  it('certifies once the program document’s criteria are met, and anyone can verify it', async () => {
    for (let week = 1; week <= 8; week++) {
      await asUser(learner, async (tx) => {
        await tx.query(`select submit_module_work($1, $2, 'prework', 'prework')`, [cohort, week]);
        await tx.query(`select submit_module_work($1, $2, 'field', 'field evidence')`, [cohort, week]);
      });
      await asUser(s.managerB, (tx) => tx.query(`select record_manager_check($1, $2, $3, 'good')`, [cohort, learner, week]));
    }
    await scorecard(s.orgB, learner, [4, 4, 4, 4, 4], { at: new Date(Date.now() - 86400000).toISOString() });
    await scorecard(s.orgB, learner, [3, 3, 4, 4, 3]);

    const status = await t.as(learner, async (tx) =>
      (await tx.query<{ s: Record<string, unknown> }>(`select certification_status($1, $2) as s`, [cohort, learner])).rows[0].s,
    );
    assert.equal(status.modules_completed, 8);
    assert.equal(status.eligible, true);

    assert.equal(
      await sqlState(() =>
        t.as(s.managerB, (tx) => tx.query(`select issue_certification($1, $2, true, false)`, [cohort, learner])),
      ),
      '22023',
      'both manager attestations are required',
    );

    const code = await asUser(s.managerB, async (tx) =>
      (await tx.query<{ code: string }>(`select issue_certification($1, $2, true, true) as code`, [cohort, learner])).rows[0].code,
    );
    assert.match(code, /^TRS-[0-9A-F]{5}-[0-9A-F]{5}$/);

    const verified = await t.asAnon(async (tx) =>
      (await tx.query<{ company_name: string; revoked: boolean }>(`select * from verify_certification($1)`, [code.toLowerCase()])).rows[0],
    );
    assert.equal(verified.company_name, 'Bluebonnet Exteriors');
    assert.equal(verified.revoked, false);
  });

  it('refuses a manager certifying themselves', async () => {
    await t.db.query(`insert into cohort_members (cohort_id, org_id, user_id) values ($1, $2, $3)`, [cohort, s.orgB, s.managerB]);
    const code = await sqlState(() =>
      t.as(s.managerB, (tx) => tx.query(`select issue_certification($1, $2, true, true)`, [cohort, s.managerB])),
    );
    assert.equal(code, '42501');
  });
});

describe('0021 people and access', () => {
  it('lets owners and admins invite, not managers', async () => {
    await t.as(s.ownerA, (tx) => tx.query(`select * from org_invite($1, 'new-hire@example.com', 'rep')`, [s.orgA]));
    const code = await sqlState(() =>
      t.as(s.managerA, (tx) => tx.query(`select * from org_invite($1, 'x@example.com', 'rep')`, [s.orgA])),
    );
    assert.equal(code, '42501');
  });

  it('never adds an existing account without its owner accepting', async () => {
    const outsider = await t.createUser('outsider@example.com');
    await t.db.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [s.ownerB]);
      await tx.exec('set local role authenticated');
      const { rows } = await tx.query<{ existing_user: boolean }>(
        `select * from org_invite($1, 'outsider@example.com', 'rep')`, [s.orgB],
      );
      assert.equal(rows[0].existing_user, true);
    });
    const member = await t.db.query(`select 1 from memberships where org_id = $1 and user_id = $2`, [s.orgB, outsider]);
    assert.equal(member.rows.length, 0, 'inviting does not join');

    const invites = await t.as(outsider, async (tx) =>
      (await tx.query<{ invitation_id: string; org_name: string }>(`select * from my_invitations()`)).rows,
    );
    assert.equal(invites.length, 1);
    assert.equal(invites[0].org_name, 'Bluebonnet Exteriors');

    // Someone else cannot accept it on their behalf.
    const stolen = await sqlState(() =>
      t.as(s.repA, (tx) => tx.query(`select accept_invitation($1)`, [invites[0].invitation_id])),
    );
    assert.equal(stolen, '42501');

    await t.db.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [outsider]);
      await tx.exec('set local role authenticated');
      await tx.query(`select accept_invitation($1)`, [invites[0].invitation_id]);
    });
    const joined = await t.db.query(`select role from memberships where org_id = $1 and user_id = $2`, [s.orgB, outsider]);
    assert.equal(joined.rows.length, 1);
  });

  it('refuses an unconfirmed address', async () => {
    const unconfirmed = await t.createUser('unconfirmed@example.com', { confirmed: false });
    await t.db.query(`insert into invitations (org_id, email) values ($1, 'unconfirmed@example.com')`, [s.orgA]);
    const invites = await t.as(unconfirmed, (tx) => count(tx, 'select * from my_invitations()'));
    assert.equal(invites, 0);
  });

  it('counts open invitations against the seat limit', async () => {
    // Four members (owner, manager, two reps) and one open invitation hold five
    // of six seats, so one more invite fits and the next does not.
    await t.db.query(`update organizations set seat_limit = 6 where id = $1`, [s.orgA]);
    try {
      await t.db.transaction(async (tx) => {
        await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [s.ownerA]);
        await tx.exec('set local role authenticated');
        await tx.query(`select * from org_invite($1, 'seat-six@example.com', 'rep')`, [s.orgA]);
      });
      const code = await sqlState(() =>
        t.as(s.ownerA, (tx) => tx.query(`select * from org_invite($1, 'seat-seven@example.com', 'rep')`, [s.orgA])),
      );
      assert.equal(code, '23514');
    } finally {
      await t.db.query(`update organizations set seat_limit = null where id = $1`, [s.orgA]);
    }
  });

  it('will not remove the last owner, and admins cannot remove owners', async () => {
    assert.equal(
      await sqlState(() => t.as(s.ownerA, (tx) => tx.query(`select org_remove_member($1, $2)`, [s.orgA, s.ownerA]))),
      '23514',
    );
    const admin = await t.createUser('admin-a@example.com');
    await t.db.query(`insert into memberships (org_id, user_id, role) values ($1, $2, 'admin')`, [s.orgA, admin]);
    assert.equal(
      await sqlState(() => t.as(admin, (tx) => tx.query(`select org_remove_member($1, $2)`, [s.orgA, s.ownerA]))),
      '42501',
    );
    assert.equal(
      await sqlState(() => t.as(admin, (tx) => tx.query(`select org_set_member($1, $2, 'owner')`, [s.orgA, s.repA]))),
      '42501',
    );
  });

  it('joins by verified domain, never a public mail domain, and never as an admin', async () => {
    const asOperator = <T>(fn: (tx: Transaction) => Promise<T>) =>
      t.db.transaction(async (tx) => {
        await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [operator]);
        await tx.exec('set local role authenticated');
        return fn(tx);
      });

    assert.equal(
      await sqlState(() => asOperator((tx) => tx.query(`select admin_set_org_domain($1, 'gmail.com')`, [s.orgA]))),
      '22023',
    );
    assert.equal(
      await sqlState(() => asOperator((tx) => tx.query(`select admin_set_org_domain($1, 'apex.test', 'admin')`, [s.orgA]))),
      '23514',
    );
    await asOperator((tx) => tx.query(`select admin_set_org_domain($1, 'apex.test', 'rep', true, true)`, [s.orgA]));

    const hire = await t.createUser('hire@apex.test');
    const joined = await t.as(hire, async (tx) =>
      (await tx.query<{ org: string }>(`select join_by_email_domain() as org`)).rows[0].org,
    );
    assert.equal(joined, s.orgA);

    const required = await t.asAnon(async (tx) =>
      (await tx.query<{ r: boolean }>(`select sso_required_for('someone@APEX.test') as r`)).rows[0].r,
    );
    assert.equal(required, true);
  });
});

describe('0022 integrations', () => {
  it('returns a token once and never exposes its hash', async () => {
    await t.db.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [s.ownerA]);
      await tx.exec('set local role authenticated');
      const { rows } = await tx.query<{ token: string }>(
        `select * from org_create_integration($1, 'JobNimbus via Zapier', 'zapier')`, [s.orgA],
      );
      assert.match(rows[0].token, /^trs_[0-9a-f]{48}$/);
    });

    const hash = await sqlState(() =>
      t.as(s.ownerA, (tx) => tx.query(`select token_hash from integration_endpoints`)),
    );
    assert.equal(hash, '42501');
    const prefix = await t.as(s.managerA, (tx) => count(tx, `select token_prefix from integration_endpoints`));
    assert.equal(prefix, 1);
  });

  it('resolves a token only for the service role', async () => {
    const token = await t.db.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [s.ownerB]);
      await tx.exec('set local role authenticated');
      return (await tx.query<{ token: string }>(
        `select * from org_create_integration($1, 'CSV bridge', 'other')`, [s.orgB],
      )).rows[0].token;
    });
    assert.equal(
      await sqlState(() => t.as(s.ownerB, (tx) => tx.query(`select * from integration_for_token($1)`, [token]))),
      '42501',
    );
    const resolved = await t.asService(async (tx) =>
      (await tx.query<{ org_id: string }>(`select * from integration_for_token($1)`, [token])).rows,
    );
    assert.equal(resolved[0].org_id, s.orgB);
    const wrong = await t.asService((tx) => count(tx, `select * from integration_for_token('trs_nope')`));
    assert.equal(wrong, 0);
  });
});

describe('0023 team dashboard', () => {
  it('is for managers', async () => {
    assert.equal(
      await sqlState(() => t.as(s.repA, (tx) => tx.query(`select * from team_rep_summary($1, now())`, [s.orgA]))),
      '42501',
    );
  });

  it('summarizes practice, ramp, and outcomes per rep', async () => {
    await t.db.query(
      `insert into accounts (org_id, name, owner_user_id, status, contract_value_cents) values
         ($1, 'Won one', $2, 'signed', 1845000), ($1, 'Lost one', $2, 'lost', null)`,
      [s.orgA, s.repA],
    );
    const rows = await t.as(s.managerA, async (tx) =>
      (await tx.query<{
        user_id: string; simulations: number; deals_won: number; deals_lost: number;
        won_value_cents: string; ramp_days: number | null; practice_seconds: number;
      }>(`select * from team_rep_summary($1, now() - interval '30 days')`, [s.orgA])).rows,
    );
    const rep = rows.find((r) => r.user_id === s.repA)!;
    assert.ok(rep.simulations >= 2);
    assert.ok(rep.practice_seconds >= 1200);
    // 'Jones' reopened to lead, and the imported March deal has no owner, so
    // only 'Won one' counts.
    assert.equal(rep.deals_won, 1);
    assert.equal(rep.deals_lost, 1);
    assert.equal(Number(rep.won_value_cents), 1845000);
    assert.equal(rep.ramp_days, 0);
  });

  it('never returns another company’s people', async () => {
    const rows = await t.as(s.managerB, async (tx) =>
      (await tx.query<{ user_id: string }>(`select user_id from team_rep_summary($1, now() - interval '30 days')`, [s.orgB])).rows,
    );
    assert.ok(!rows.some((r) => r.user_id === s.repA));
  });
});

describe('0024 unit economics', () => {
  it('records token usage only for the caller’s own company', async () => {
    await t.as(s.repA, (tx) => tx.query(`select record_tokens($1, 'coach', 'gpt-4.1', 18000, 900)`, [s.orgA]));
    assert.equal(
      await sqlState(() => t.as(s.repA, (tx) => tx.query(`select record_tokens($1, 'coach', 'gpt-4.1', 1, 1)`, [s.orgB]))),
      '42501',
    );
    assert.equal(
      await sqlState(() => t.as(s.repA, (tx) => tx.query(`select record_tokens($1, 'coach', 'gpt-4.1', -5, 1)`, [s.orgA]))),
      '22023',
    );
  });

  it('shows margin data to operators only', async () => {
    assert.equal(
      await sqlState(() => t.as(s.ownerA, (tx) => tx.query(`select * from admin_unit_economics(current_date)`))),
      '42501',
    );
    const rows = await t.as(operator, (tx) => count(tx, `select * from admin_unit_economics(current_date)`));
    assert.ok(rows >= 2);
  });

  it('lets only an operator record a contract value', async () => {
    assert.equal(
      await sqlState(() => t.as(s.ownerA, (tx) => tx.query(`select admin_set_contract($1, 5000000)`, [s.orgA]))),
      '42501',
    );
    assert.equal(
      await sqlState(() => t.as(s.ownerA, (tx) =>
        tx.query(`update organizations set contract_annual_value_cents = 1 where id = $1`, [s.orgA]))),
      '42501',
    );
  });
});
