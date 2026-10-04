import assert from "node:assert/strict";
import test from "node:test";
import { orientLedgerEntries } from "../utils/ledgerPerspective.js";

test("admin receivable and agent payable show opposite debit and credit entries", () => {
  const entries = [
    { voucherId: "ML-1", description: "Confirmed booking", debit: 250000, credit: 0 },
    { voucherId: "PRV-1", description: "Approved payment", debit: 0, credit: 100000 },
  ];

  const admin = orientLedgerEntries(entries, "admin");
  const agent = orientLedgerEntries(entries, "agent");

  assert.strictEqual(admin, entries);
  assert.deepEqual(agent.map(({ debit, credit }) => ({ debit, credit })), [
    { debit: 0, credit: 250000 },
    { debit: 100000, credit: 0 },
  ]);
  assert.equal(admin.reduce((balance, row) => balance + row.debit - row.credit, 0), 150000);
  assert.equal(agent.reduce((balance, row) => balance + row.debit - row.credit, 0), -150000);
  assert.deepEqual(entries.map(({ debit, credit }) => ({ debit, credit })), [
    { debit: 250000, credit: 0 },
    { debit: 0, credit: 100000 },
  ]);
});
