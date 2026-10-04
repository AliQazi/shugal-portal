// The stored ledger is the admin's receivable account. The agent's payable
// account shows the same transaction on the opposite side.
export const orientLedgerEntries = (entries, ledgerView = "admin") => {
  if (String(ledgerView).toLowerCase() !== "agent") return entries;

  return entries.map((entry) => ({
    ...entry,
    debit: Number(entry.credit || 0),
    credit: Number(entry.debit || 0),
  }));
};
