import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import PageBreadCrumb from "../components/common/PageBreadCrumb";
// import { useAuth } from "../context/AuthContext";
// import { hasPermission } from "../utils/permissions";
import logo from "../assets/images/logo2-.png";
import { BuildingOffice2Icon, CalendarDaysIcon, CircleStackIcon, ClipboardDocumentIcon, DocumentTextIcon, EnvelopeIcon, FunnelIcon, PrinterIcon } from "@heroicons/react/24/outline";
import "../../../frontend/src/pages/Frontend/Ledger.css";

interface LedgerEntry {
  voucherId: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
}

interface LedgerEntryWithBalance extends LedgerEntry {
  runningBalance: number;
}

interface LedgerMeta {
  openingBalance: number;
  closingBalance: number | null;
  totals: { debit: number; credit: number } | null;
}

const Ledger = () => {
  // const { user } = useAuth();
  const canView = true;
  const canUseActions = true;
  const { id } = useParams();
  const location = useLocation();

  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([]);
  const [ledgerMeta, setLedgerMeta] = useState<LedgerMeta>({
    openingBalance: 0,
    closingBalance: null,
    totals: null,
  });
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(0, 1);
    return date.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const statementRef = useRef<HTMLDivElement>(null);

  const userName = location.state?.companyname || location.state?.userName || "User";
  const userEmail = location.state?.email || "Email unavailable";

  useEffect(() => {
    if (canView && dateFrom && dateTo) {
      fetchLedger();
    } else if (!canView) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");

      const response = await axiosInstance.get(`/payment/ledger/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params: { dateFrom, dateTo, ledgerView: "admin" },
      });

      if (response.data.success) {
        setLedgerData(response.data.data || []);
        setLedgerMeta({
          openingBalance: Number(response.data.openingBalance || 0),
          closingBalance:
            response.data.closingBalance === undefined
              ? null
              : Number(response.data.closingBalance || 0),
          totals: response.data.totals || null,
        });
      }
    } catch (error) {
      console.error("Error fetching ledger:", error);
      setLedgerData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canView) return;
    fetchLedger();
  };

  // Mirrors the agent-side calculateTotals logic
  const calculateTotals = () => {
    const debit =
      ledgerMeta.totals
        ? Number(ledgerMeta.totals.debit || 0)
        : ledgerData.reduce((sum, e) => sum + Number(e.debit || 0), 0);

    const credit =
      ledgerMeta.totals
        ? Number(ledgerMeta.totals.credit || 0)
        : ledgerData.reduce((sum, e) => sum + Number(e.credit || 0), 0);

    const openingBalance = Number(ledgerMeta.openingBalance || 0);

    const closingBalance =
      ledgerMeta.closingBalance !== null
        ? ledgerMeta.closingBalance
        : openingBalance + debit - credit;

    return { debit, credit, openingBalance, closingBalance };
  };

  const { debit: totalDebit, credit: totalCredit, openingBalance, closingBalance } =
    calculateTotals();

  // Running balance per row — same approach as agent side
  const rowsWithBalance: LedgerEntryWithBalance[] = (() => {
    let running = openingBalance;
    return ledgerData.map((entry) => {
      running += Number(entry.debit || 0) - Number(entry.credit || 0);
      return { ...entry, runningBalance: running };
    });
  })();

  const formatAmount = (amount: number) =>
    Math.abs(Number(amount || 0)).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  // DR = agent owes us (positive), CR = we owe agent (negative)
  const formatBalance = (amount: number) => {
    const n = Number(amount || 0);
    return `${formatAmount(n)} ${n < 0 ? "CR" : "DR"}`;
  };

  const formatPrintDate = (date = new Date()) =>
    date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const handlePrint = () => {
    if (!canView || !canUseActions) return;
    window.print();
  };

  const sanitizeFilename = (value: string) =>
    value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").trim() ||
    "ledger";

  const downloadStatementPdf = async () => {
    const source = statementRef.current;
    if (!source) return;

    const wrapper = document.createElement("div");
    const clone = source.cloneNode(true) as HTMLElement;
    clone.classList.add("ledger-pdf-layout");

    Object.assign(wrapper.style, {
      position: "fixed",
      left: "-10000px",
      top: "0",
      width: "794px",
      background: "#ffffff",
      pointerEvents: "none",
    });

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;
      const printableHeight = pageHeight - margin * 2;

      let heightLeft = imageHeight;
      let position = margin;

      pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight);
      heightLeft -= printableHeight;

      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imageHeight - heightLeft);
        pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight);
        heightLeft -= printableHeight;
      }

      pdf.save(`ledger-${sanitizeFilename(userName)}-${Date.now()}.pdf`);
    } finally {
      document.body.removeChild(wrapper);
    }
  };

  const handleExport = async (type: string) => {
    if (!canView || !canUseActions) return;

    try {
      const token = localStorage.getItem("admin_token");

      if (type === "copy") {
        const tableData = rowsWithBalance
          .map(
            (entry) =>
              `${entry.voucherId}\t${new Date(entry.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}\t${entry.description}\t${entry.debit > 0 ? formatAmount(entry.debit) : ""}\t${entry.credit > 0 ? formatAmount(entry.credit) : ""}\t${formatBalance(entry.runningBalance)}`
          )
          .join("\n");

        const header = "Voucher Id\tDate\tDescription\tDebit\tCredit\tBalance\n";
        const totalsLine = `\nTotal\t\t\t${formatAmount(totalDebit)}\t${formatAmount(totalCredit)}\t${formatBalance(closingBalance)}`;
        const fullText = `Ledger of ${userName.toUpperCase()}\nFrom ${dateFrom} To ${dateTo}\n\nOpening Balance: ${formatBalance(openingBalance)}\n\n${header}${tableData}${totalsLine}`;

        await navigator.clipboard.writeText(fullText);
        alert("Table data copied to clipboard!");
        return;
      }

      if (type === "pdf") {
        await downloadStatementPdf();
        return;
      }

      const exportUrl = `/payment/ledger/${id}/export/${type}`;
      const response = await axiosInstance.get(exportUrl, {
        headers: { Authorization: `Bearer ${token}` },
        params: { dateFrom, dateTo, userName, ledgerView: "admin" },
        responseType: "blob",
      });

      const contentTypeHeader = response.headers["content-type"];
      const contentType =
        typeof contentTypeHeader === "string"
          ? contentTypeHeader
          : Array.isArray(contentTypeHeader)
            ? contentTypeHeader.join(", ")
            : "";

      if (contentType.includes("application/json")) {
        const reader = new FileReader();
        const errorText = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsText(response.data);
        });
        throw new Error(JSON.parse(errorText).message || "Export failed");
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const extension = type === "csv" ? "csv" : type === "excel" ? "xlsx" : "pdf";
      link.setAttribute("download", `ledger-${userName}-${Date.now()}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error(`Error exporting as ${type}:`, error);
      let errorMessage = `Failed to export as ${type.toUpperCase()}.`;

      if (error.response?.data instanceof Blob) {
        try {
          const reader = new FileReader();
          const errorText = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsText(error.response.data);
          });
          errorMessage += ` ${JSON.parse(errorText).message || ""}`;
        } catch {
          errorMessage += ` Server error (Status: ${error.response.status})`;
        }
      } else if (error.response?.data?.message) {
        errorMessage += ` ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage += ` ${error.message}`;
      }

      alert(errorMessage);
    }
  };

  if (!canView) {
    return (
      <>
        <PageMeta title="Ledger - Access denied" description="Access denied" />
        <PageBreadCrumb pageTitle="Ledger" />
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-200">
          You do not have permission to view Ledger.
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title={`Ledger - ${userName}`} description="View agent ledger" />
      {/* <div className="ledger-page-heading no-print">
        <div className="ledger-page-heading-title"><span><WalletIcon aria-hidden="true" /></span><h1>Ledger</h1></div>
        <nav aria-label="Breadcrumb"><HomeIcon aria-hidden="true" /> Home <ChevronRightIcon aria-hidden="true" /> <strong>Ledger</strong></nav>
      </div> */}

      {/* Screen layout */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3 ledger-screen-content">
        <div className="px-4 py-6 md:px-6 xl:px-7.5">

          <div className="ledger-filter-panel no-print">
            <div className="ledger-filter-heading">
              <span className="ledger-filter-heading-icon"><FunnelIcon aria-hidden="true" /></span>
              <div><h3>Filter Ledger</h3><p>Select a date range to view ledger statement.</p></div>
            </div>
            <form onSubmit={handleSubmit} className="ledger-filter-fields">
              <div className="ledger-filter-field">
                <label htmlFor="admin-ledger-date-from">Date From</label>
                <input
                  id="admin-ledger-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker()}
                  className="ledger-native-date"
                  required
                />
              </div>
              <div className="ledger-filter-field">
                <label htmlFor="admin-ledger-date-to">Date To</label>
                <input
                  id="admin-ledger-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker()}
                  className="ledger-native-date"
                  required
                />
              </div>
              <button
                type="submit"
                className="ledger-apply-button"
              >
                <FunnelIcon aria-hidden="true" /> Apply Filter
              </button>
            </form>
            <div className="ledger-export-row">
              <div className="ledger-export-heading"><span className="ledger-export-icon"><DocumentTextIcon aria-hidden="true" /></span><div><strong>Export / Print</strong><p>Download or print the ledger in your preferred format.</p></div></div>
              <div className="ledger-filter-actions">
            {(["copy", "csv", "excel", "pdf"] as const).map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => handleExport(type)}
                disabled={!canUseActions}
              >
                {type === "copy" ? <ClipboardDocumentIcon aria-hidden="true" /> : <DocumentTextIcon aria-hidden="true" />}
                {type === "copy" ? "Copy" : type === "csv" ? "CSV" : type === "excel" ? "Excel" : "PDF"}
              </button>
            ))}
            <button
              type="button"
              onClick={handlePrint}
              disabled={!canUseActions}
            >
              <PrinterIcon aria-hidden="true" /> Print
            </button>
              </div>
            </div>
          </div>

          <section ref={statementRef} className="ledger-statement admin-ledger-statement">
            <div className="ledger-company-row">
              <div className="ledger-company">
                <img src={logo} alt="Stack Works Flow logo" />
                <div className="ledger-company-details">
                  <h1>{userName.toUpperCase()}</h1>
                  <p><BuildingOffice2Icon aria-hidden="true" />Stack Works Flow</p>
                  <p><EnvelopeIcon aria-hidden="true" />{userEmail}</p>
                  <p><DocumentTextIcon aria-hidden="true" />Account statement generated from Stack Works Flow portal</p>
                </div>
              </div>
              <div className="ledger-summary-cards">
                <div className="ledger-info-card"><span className="ledger-info-icon"><CalendarDaysIcon aria-hidden="true" /></span><div><span>Print Date</span><strong>{formatPrintDate()}</strong></div></div>
                <div className="ledger-info-card"><span className="ledger-info-icon"><CircleStackIcon aria-hidden="true" /></span><div><span>Opening Balance</span><strong>{formatBalance(openingBalance)}</strong></div></div>
              </div>
            </div>
            <div className="ledger-report-card">
            <div className="ledger-title-bar"><span className="ledger-title-icon"><DocumentTextIcon aria-hidden="true" /></span><div><strong>Account Statement of {userName.toUpperCase()}</strong><span>From {formatPrintDate(new Date(dateFrom))} To {formatPrintDate(new Date(dateTo))}</span></div></div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="text-gray-500 dark:text-gray-400">Loading ledger...</div>
            </div>
          ) : (
            <>
              {/* Table — now with Balance column */}
              <div className="ledger-table-scroll">
                <table className="ledger-report-table">
                  <thead className="bg-gray-800 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-4 text-left text-sm font-medium text-white">Date</th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-white">V.no</th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-white">Details</th>
                      <th className="px-4 py-4 text-right text-sm font-medium text-white">Debit</th>
                      <th className="px-4 py-4 text-right text-sm font-medium text-white">Credit</th>
                      <th className="px-4 py-4 text-right text-sm font-medium text-white">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800/50">
                    {rowsWithBalance.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          <div className="ledger-empty-icon"><DocumentTextIcon aria-hidden="true" /></div>
                          <strong>No transactions found for the selected period</strong>
                          <span>There are no ledger entries to display between the selected dates.</span>
                        </td>
                      </tr>
                    ) : (
                      rowsWithBalance.map((entry, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/80"
                        >
                          <td className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                            {new Date(entry.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400">
                            {entry.voucherId || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                            {entry.description || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-800 dark:text-white/90">
                            {entry.debit > 0 ? formatAmount(entry.debit) : ""}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-800 dark:text-white/90">
                            {entry.credit > 0 ? formatAmount(entry.credit) : ""}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                            {formatBalance(entry.runningBalance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-gray-100 dark:bg-gray-800 font-semibold">
                    <tr className="ledger-closing-total"><td colSpan={5}>Closing Balance as on {formatPrintDate(new Date(dateTo))}</td><td className="ledger-number">{formatBalance(closingBalance)}</td></tr>
                    <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                      <td colSpan={3} className="px-4 py-3 text-sm text-right text-gray-800 dark:text-white">
                        Total:
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-800 dark:text-white">
                        {formatAmount(totalDebit)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-800 dark:text-white">
                        {formatAmount(totalCredit)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                        {formatBalance(closingBalance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

            </>
          )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default Ledger;
