/**
 * Every migration applies, in order, to a clean database, and the isolation
 * guarantees the documentation makes hold against it.
 */

import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb, seedTwoTenants, sqlState, type TestDb } from './harness';

let t: TestDb;
let s: Awaited<ReturnType<typeof seedTwoTenants>>;

before(async () => {
  t = await createTestDb();
  s = await seedTwoTenants(t);
});

describe('tenant isolation', () => {
  it('a member sees only their own organization', async () => {
    const names = await t.as(s.repA, async (tx) =>
      (await tx.query<{ name: string }>('select name from organizations')).rows.map((r) => r.name),
    );
    assert.deepEqual(names, ['Apex Roofing']);
  });

  it('accounts written in one org are invisible to another', async () => {
    await t.db.query(`insert into accounts (org_id, name) values ($1, 'Smith residence')`, [s.orgA]);
    const seenByB = await t.as(s.repB, async (tx) => (await tx.query('select id from accounts')).rows.length);
    const seenByA = await t.as(s.repA, async (tx) => (await tx.query('select id from accounts')).rows.length);
    assert.equal(seenByB, 0);
    assert.equal(seenByA, 1);
  });

  it('a rep cannot insert into another org', async () => {
    const code = await sqlState(() =>
      t.as(s.repB, (tx) => tx.query(`insert into accounts (org_id, name) values ($1, 'x')`, [s.orgA])),
    );
    assert.equal(code, '42501');
  });

  it('the anonymous role reaches no tenant data', async () => {
    const rows = await t.asAnon(async (tx) => (await tx.query('select id from organizations')).rows.length);
    assert.equal(rows, 0);
  });
});

describe('coach privacy', () => {
  it('a manager cannot read a rep’s Coach conversation', async () => {
    await t.db.query(
      `insert into coach_conversations (org_id, user_id, title) values ($1, $2, 'private')`,
      [s.orgA, s.repA],
    );
    const managerSees = await t.as(s.managerA, async (tx) =>
      (await tx.query('select id from coach_conversations')).rows.length,
    );
    const repSees = await t.as(s.repA, async (tx) =>
      (await tx.query('select id from coach_conversations')).rows.length,
    );
    assert.equal(managerSees, 0);
    assert.equal(repSees, 1);
  });
});

describe('0016 lock-downs', () => {
  it('a rep cannot grant themselves Enterprise', async () => {
    const code = await sqlState(() =>
      t.as(s.ownerA, (tx) =>
        tx.query(`update organizations set plan_override = 'enterprise' where id = $1`, [s.orgA]),
      ),
    );
    assert.equal(code, '42501');
  });

  it('a rep cannot write their own scorecard', async () => {
    const { rows } = await t.db.query<{ id: string }>(
      `insert into practice_sessions (org_id, user_id, scenario_id) values ($1, $2, 'x') returning id`,
      [s.orgA, s.repA],
    );
    const code = await sqlState(() =>
      t.as(s.repA, (tx) =>
        tx.query(
          `insert into scorecards (session_id, org_id, user_id, trust, relate, understand, solve, secure,
             outcome, headline, summary, stages)
           values ($1, $2, $3, 4, 4, 4, 4, 4, 'signed', 'h', 's', '[]')`,
          [rows[0].id, s.orgA, s.repA],
        ),
      ),
    );
    assert.equal(code, '42501');
  });
});

describe('metering', () => {
  it('record_usage refuses another org', async () => {
    const code = await sqlState(() =>
      t.as(s.repB, (tx) => tx.query(`select record_usage($1, $2, 'coach_message', 1)`, [s.orgA, s.repB])),
    );
    assert.equal(code, '42501');
  });

  it('record_usage refuses a negative quantity', async () => {
    const code = await sqlState(() =>
      t.as(s.repA, (tx) => tx.query(`select record_usage($1, $2, 'coach_message', -50)`, [s.orgA, s.repA])),
    );
    assert.equal(code, '22023');
  });
});
