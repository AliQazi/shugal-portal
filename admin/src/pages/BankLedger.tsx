import { useEffect, useState } from "react";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import PageBreadCrumb from "../components/common/PageBreadCrumb";

interface Bank {
  _id: string;
  bankName: string;
  accountTitle: string;
  accountNo: string;
  ibn?: string;
  logo?: string;
  status: string;
}

interface BankLedgerEntry {
  voucherId: string;
  date: string;
  agentName: string;
  description: string;
  bankDebit: number;
  adminCredit: number;
  balance: number;
}

const BankLedger = () => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [selectedBankName, setSelectedBankName] = useState<string>("");
  const [ledgerData, setLedgerData] = useState<BankLedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [banksLoading, setBanksLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      setBanksLoading(true);
      const token = sessionStorage.getItem("admin_token");
      const response = await axiosInstance.get("/bank", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        const activeBanks = response.data.data.filter(
          (b: Bank) => b.status === "Active"
        );
        setBanks(activeBanks);
      }
    } catch (error) {
      console.error("Error fetching banks:", error);
    } finally {
      setBanksLoading(false);
    }
  };

  const fetchLedger = async (bankId: string) => {
    if (!bankId) return;
    try {
      setLoading(true);
      const token = sessionStorage.getItem("admin_token");
      const response = await axiosInstance.get(
        `/payment/bank-ledger/${bankId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { dateFrom, dateTo },
        }
      );
      if (response.data.success) {
        setLedgerData(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching bank ledger:", error);
      setLedgerData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBankSelect = (bankId: string) => {
    setSelectedBank(bankId);
    const bank = banks.find((b) => b._id === bankId);
    setSelectedBankName(bank ? bank.bankName : "");
    setLedgerData([]);
    if (bankId) {
      fetchLedger(bankId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBank) fetchLedger(selectedBank);
  };

  const totalBankDebit = ledgerData.reduce((s, e) => s + e.bankDebit, 0);
  const totalAdminCredit = ledgerData.reduce((s, e) => s + e.adminCredit, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = async () => {
    if (!ledgerData.length) return;
    const header = "Voucher ID\tDate\tAgent\tDescription\tBank Debit\tAdmin Credit\tBalance\n";
    const rows = ledgerData
      .map(
        (e) =>
          `${e.voucherId}\t${new Date(e.date).toLocaleDateString()}\t${e.agentName}\t${e.description}\t${e.bankDebit.toFixed(2)}\t${e.adminCredit.toFixed(2)}\t${e.balance.toFixed(2)}`
      )
      .join("\n");
    const totals = `\nTotal\t\t\t\t${totalBankDebit.toFixed(2)}\t${totalAdminCredit.toFixed(2)}\t`;
    const fullText = `Bank Ledger — ${selectedBankName}\nFrom ${dateFrom} To ${dateTo}\n\n${header}${rows}${totals}`;
    await navigator.clipboard.writeText(fullText);
    alert("Copied to clipboard!");
  };

  return (
    <>
      <PageMeta title="Bank Ledger" description="Bank-wise payment ledger" />
      <PageBreadCrumb pageTitle="Bank Ledger" />

      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 20mm; }
          nav, aside, header, footer, .no-print, button:not(.print-keep),
          [class*="sidebar"], [class*="breadcrumb"] { display: none !important; }
          body { margin: 0; padding: 0; background: white !important; }
          .rounded-2xl { border: none !important; box-shadow: none !important; border-radius: 0 !important; }
          form { display: none !important; }
          h2 { color: #dc2626 !important; font-size: 18pt !important; margin-bottom: 8pt !important; }
          p { color: #16a34a !important; font-size: 11pt !important; margin-bottom: 16pt !important; }
          table { width: 100% !important; border-collapse: collapse !important; font-size: 10pt !important; }
          thead { display: table-header-group !important; }
          thead th { background: #1f2937 !important; color: white !important; padding: 8pt 4pt !important;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          tbody td { padding: 6pt 4pt !important; border-bottom: 1px solid #e5e7eb !important; color: #000 !important; }
          tfoot td { background: #f3f4f6 !important; font-weight: bold !important; padding: 8pt 4pt !important;
            border-top: 2px solid #d1d5db !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .bg-gray-50 { background: #f9fafb !important; border: 1px solid #e5e7eb !important; padding: 12pt !important; margin-top: 16pt !important; }
        }
      `}</style>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
        <div className="px-4 py-6 md:px-6 xl:px-7.5">

          {/* Filter Panel */}
          <div className="bg-blue-600 dark:bg-blue-700 rounded-lg p-6 mb-6 no-print">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Bank selector */}
              <div>
                <label className="block mb-2 text-sm font-medium text-white">
                  Select Bank
                </label>
                {banksLoading ? (
                  <p className="text-white text-sm">Loading banks…</p>
                ) : (
                  <select
                    value={selectedBank}
                    onChange={(e) => handleBankSelect(e.target.value)}
                    className="w-full h-11 rounded-lg border border-blue-400 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                  >
                    <option value="">-- Select a Bank --</option>
                    {banks.map((bank) => (
                      <option key={bank._id} value={bank._id}>
                        {bank.bankName} — {bank.accountTitle} ({bank.accountNo})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Date range */}
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="block mb-2 text-sm font-medium text-white">
                    Date From
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full h-11 rounded-lg border border-blue-400 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block mb-2 text-sm font-medium text-white">
                    Date To
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full h-11 rounded-lg border border-blue-400 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-900 dark:text-white"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={!selectedBank}
                  className="px-8 py-2.5 h-11 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-gray-900 font-semibold rounded-lg transition-colors shadow-md"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>

          {/* Ledger Title */}
          {selectedBankName && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-500 mb-2">
                Bank Ledger — {selectedBankName.toUpperCase()}
              </h2>
              <p className="text-green-600 dark:text-green-500 font-semibold">
                From{" "}
                {new Date(dateFrom).toLocaleDateString("en-US", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}{" "}
                To{" "}
                {new Date(dateTo).toLocaleDateString("en-US", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          )}

          {/* Export buttons */}
          {selectedBank && ledgerData.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6 no-print">
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Copy
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Print
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Empty state */}
          {!loading && selectedBank && ledgerData.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No approved payments found for this bank in the selected date range.
            </div>
          )}

          {/* No bank selected */}
          {!selectedBank && !banksLoading && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              Please select a bank to view its ledger.
            </div>
          )}

          {/* Ledger Table */}
          {!loading && ledgerData.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800 dark:bg-gray-900 text-white">
                      <th className="px-3 py-3 text-left font-semibold">Date</th>
                      <th className="px-3 py-3 text-left font-semibold">Voucher ID</th>
                      <th className="px-3 py-3 text-left font-semibold">Agent</th>
                      <th className="px-3 py-3 text-left font-semibold">Description</th>
                      <th className="px-3 py-3 text-right font-semibold">Bank Debit</th>
                      <th className="px-3 py-3 text-right font-semibold">Credit</th>
                      <th className="px-3 py-3 text-right font-semibold">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.map((entry, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-3 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {new Date(entry.date).toLocaleDateString("en-US", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                          {entry.voucherId}
                        </td>
                        <td className="px-3 py-3 text-gray-700 dark:text-gray-300">
                          {entry.agentName}
                        </td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400">
                          {entry.description}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-red-600 dark:text-red-500">
                          {entry.bankDebit > 0 ? entry.bankDebit.toFixed(2) : ""}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-gray-400 dark:text-gray-500">
                          0
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-gray-800 dark:text-gray-200">
                          {entry.balance.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 dark:bg-gray-800 font-bold">
                      <td
                        colSpan={4}
                        className="px-3 py-3 text-gray-800 dark:text-gray-200"
                      >
                        Total
                      </td>
                      <td className="px-3 py-3 text-right text-red-600 dark:text-red-500">
                        {totalBankDebit.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-400 dark:text-gray-500">
                        0
                      </td>
                      <td className="px-3 py-3 text-right text-gray-800 dark:text-gray-200">
                        {(ledgerData[ledgerData.length - 1]?.balance ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Summary Box */}
              <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-4">
                  Summary
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Total Bank Debit
                    </p>
                    <p className="text-xl font-bold text-red-600 dark:text-red-500">
                      {totalBankDebit.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Total Admin Credit
                    </p>
                    <p className="text-xl font-bold text-gray-400 dark:text-gray-500">
                      0
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Closing Balance
                    </p>
                    <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
                      {totalBankDebit.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default BankLedger;
