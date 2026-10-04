import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import axiosInstance from "../../api/axios";
import MaskedDatePicker from "../../components/MaskedDatePicker";
import logo from "../../assets/images/logo2-.png";
import { Building2, CalendarDays, ChevronRight, Coins, Copy, FileText, Filter, Home, Mail, Printer, RotateCcw, Search, Table2, Wallet } from "lucide-react";
import {
  getFrontendUserName,
  getStoredFrontendUser,
} from "../../utils/authUser";
import "./Ledger.css";

const Ledger = () => {
  const getCurrentYearStart = () => {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  };

  const [filters, setFilters] = useState({
    dateFrom: getCurrentYearStart(),
    dateTo: new Date().toISOString().split("T")[0],
  });

  const [ledgerData, setLedgerData] = useState([]);
  const [ledgerMeta, setLedgerMeta] = useState({
    account: null,
    openingBalance: 0,
    closingBalance: null,
    totals: null,
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const statementRef = useRef(null);

  const storedUser = getStoredFrontendUser();
  const userName = getFrontendUserName(storedUser);
  const accountName = ledgerMeta.account?.account_name || userName;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PK", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Math.abs(Number(amount || 0)));
  };

  const formatBalance = (amount) => {
    const numericAmount = Number(amount || 0);
    const suffix = numericAmount < 0 ? "CR" : "DR";
    return `${formatCurrency(numericAmount)} ${suffix}`;
  };

  const formatStatementDate = (dateValue) => {
    const date = dateValue ? new Date(dateValue) : new Date();

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatPrintDate = () => {
    return new Date().toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const calculateTotals = (rows = ledgerData) => {
    const isFullStatement = rows.length === ledgerData.length && !searchTerm;
    const debit =
      isFullStatement && ledgerMeta.totals
        ? Number(ledgerMeta.totals.debit || 0)
        : rows.reduce((sum, item) => sum + Number(item.debit || 0), 0);
    const credit =
      isFullStatement && ledgerMeta.totals
        ? Number(ledgerMeta.totals.credit || 0)
        : rows.reduce((sum, item) => sum + Number(item.credit || 0), 0);
    const openingBalance = Number(ledgerMeta.openingBalance || 0);
    const closingBalance =
      isFullStatement && ledgerMeta.closingBalance !== null
        ? ledgerMeta.closingBalance
        : openingBalance + debit - credit;

    return {
      debit,
      credit,
      openingBalance,
      closingBalance: Number(closingBalance || 0),
    };
  };

  const fetchLedger = async () => {
    try {
      setFetching(true);
      setError(null);

      const response = await axiosInstance.get(
        `/payment/ledger/${storedUser.id}`,
        {
          params: {
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            ledgerView: "agent",
          },
        },
      );

      if (response.data.success) {
        setLedgerData(response.data.data || []);
        setLedgerMeta({
          account: response.data.account || null,
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
      setError("Failed to fetch ledger data. Please try again later.");
    } finally {
      setInitialLoading(false);
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [filters.dateFrom, filters.dateTo]);

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const dateForPicker = (value) => value ? new Date(`${value}T00:00:00`) : null;
  const dateFromPicker = (date) => date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    : "";

  const resetFilters = () => {
    setFilters({
      dateFrom: getCurrentYearStart(),
      dateTo: new Date().toISOString().split("T")[0],
    });
    setSearchTerm("");
  };

  const handlePrint = () => {
    window.print();
  };

  const sanitizeFilename = (value) =>
    value
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .trim() || "ledger";

  const downloadStatementPdf = async () => {
    const source = statementRef.current;
    if (!source) return;

    const wrapper = document.createElement("div");
    const clone = source.cloneNode(true);
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
        pdf.addImage(
          imageData,
          "PNG",
          margin,
          position,
          imageWidth,
          imageHeight,
        );
        heightLeft -= printableHeight;
      }

      pdf.save(`ledger-${sanitizeFilename(userName)}-${Date.now()}.pdf`);
    } finally {
      document.body.removeChild(wrapper);
    }
  };

  const filteredData = useMemo(() => {
    if (!searchTerm) return ledgerData;

    const search = searchTerm.toLowerCase();

    return ledgerData.filter((item) => {
      return (
        item.voucherId?.toString().toLowerCase().includes(search) ||
        item.ticketNumber?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search)
      );
    });
  }, [ledgerData, searchTerm]);

  const totals = calculateTotals(filteredData);

  const rowsWithBalance = useMemo(() => {
    let runningBalance = totals.openingBalance;

    return filteredData.map((item) => {
      runningBalance += Number(item.debit || 0) - Number(item.credit || 0);

      return {
        ...item,
        runningBalance,
      };
    });
  }, [filteredData, totals.openingBalance]);

  const handleExport = async (type) => {
    try {
      if (type === "copy") {
        const tableData = rowsWithBalance
          .map(
            (entry) =>
              `${formatStatementDate(entry.date)}\t${entry.voucherId || "-"}\t${entry.description || "-"}\t${entry.debit > 0 ? formatCurrency(entry.debit) : ""}\t${entry.credit > 0 ? formatCurrency(entry.credit) : ""}\t${formatBalance(entry.runningBalance)}`,
          )
          .join("\n");

        const header = "Date\tV.no\tDetails\tDebit\tCredit\tBalance\n";
        const totalLine = `\nTotal\t\t\t${formatCurrency(totals.debit)}\t${formatCurrency(totals.credit)}\t${formatBalance(totals.closingBalance)}`;
        const fullText = `Account Statement of ${accountName}\nFrom ${formatStatementDate(filters.dateFrom)} To ${formatStatementDate(filters.dateTo)}\n\n${header}${tableData}${totalLine}`;

        await navigator.clipboard.writeText(fullText);
        alert("Table data copied to clipboard!");
        return;
      }

      if (type === "pdf") {
        await downloadStatementPdf();
        return;
      }

      const response = await axiosInstance.get(
        `/payment/ledger/${storedUser.id}/export/${type}`,
        {
          params: {
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            userName,
            ledgerView: "agent",
          },
          responseType: "blob",
        },
      );

      if (response.headers["content-type"]?.includes("application/json")) {
        const reader = new FileReader();
        const errorText = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsText(response.data);
        });
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || "Export failed");
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      const extension =
        type === "csv" ? "csv" : type === "excel" ? "xlsx" : "pdf";
      link.setAttribute(
        "download",
        `ledger-${userName}-${Date.now()}.${extension}`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error exporting as ${type}:`, error);
      alert(
        `Failed to export as ${type.toUpperCase()}. ${error.message || ""}`,
      );
    }
  };

  if (initialLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ledger...</p>
        </div>
      </div>
    );
  }

  if (error && ledgerData.length === 0) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchLedger}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ledger-page w-full min-h-screen mx-auto">
      <div className="no-print">
        {/* <div className="ledger-page-heading">
          <div className="ledger-page-heading-title"><span><Wallet aria-hidden="true" /></span><h1>Ledger</h1></div>
          <nav aria-label="Breadcrumb"><Home aria-hidden="true" /> Home <ChevronRight aria-hidden="true" /> <strong>Ledger</strong></nav>
        </div> */}
        <div className="ledger-filter-panel">
          <div className="ledger-filter-heading">
            <span className="ledger-filter-heading-icon"><Filter aria-hidden="true" /></span>
            <div>
              <h3>Filter Ledger</h3>
              <p>Select a date range to view ledger statement.</p>
            </div>
            <div className="ledger-filter-utilities">
              <div className="ledger-filter-search"><Search aria-hidden="true" /><input aria-label="Search ledger" type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search ledger..." /></div>
              <button type="button" className="ledger-filter-reset" onClick={resetFilters}><RotateCcw aria-hidden="true" /> Reset</button>
            </div>
          </div>

          <div className="ledger-filter-fields">
            <div className="ledger-filter-field">
              <label>Date From</label>
              <div className="ledger-filter-date">
                <CalendarDays aria-hidden="true" />
                <MaskedDatePicker
                  value={dateForPicker(filters.dateFrom)}
                  onChange={(date) => handleFilterChange("dateFrom", dateFromPicker(date))}
                  placeholderText="DD/MM/YYYY"
                />
              </div>
            </div>
            <div className="ledger-filter-field">
              <label>Date To</label>
              <div className="ledger-filter-date">
                <CalendarDays aria-hidden="true" />
                <MaskedDatePicker
                  value={dateForPicker(filters.dateTo)}
                  onChange={(date) => handleFilterChange("dateTo", dateFromPicker(date))}
                  placeholderText="DD/MM/YYYY"
                />
              </div>
            </div>
            <button type="button" className="ledger-apply-button" onClick={fetchLedger}><Filter aria-hidden="true" /> Apply Filter</button>
          </div>

          <div className="ledger-export-row">
            <div className="ledger-export-heading"><span className="ledger-export-icon"><FileText aria-hidden="true" /></span><div><strong>Export / Print</strong><p>Download or print the ledger in your preferred format.</p></div></div>
            <div className="ledger-filter-actions">
              <button type="button" onClick={() => handleExport("copy")}><Copy aria-hidden="true" /> Copy</button>
              <button type="button" onClick={() => handleExport("csv")}><FileText aria-hidden="true" /> CSV</button>
              <button type="button" onClick={() => handleExport("excel")}><Table2 aria-hidden="true" /> Excel</button>
              <button type="button" onClick={() => handleExport("pdf")}><FileText aria-hidden="true" /> PDF</button>
              <button type="button" className="ledger-filter-print" onClick={handlePrint}><Printer aria-hidden="true" /> Print</button>
            </div>
          </div>
        </div>
      </div>

      <div className="ledger-statement-shell">
        <section ref={statementRef} className="ledger-statement">
          {fetching && (
            <div className="ledger-fetching no-print">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          <div className="ledger-company-row">
            <div className="ledger-company">
              <img src={logo} alt="Company logo" />
              <div className="ledger-company-details">
                <h1>{accountName.toUpperCase()}</h1>
                <p><Building2 aria-hidden="true" />Stack Works Flow</p>
                <p><Mail aria-hidden="true" />{storedUser?.email || "Email unavailable"}</p>
                <p><FileText aria-hidden="true" />Account statement generated from Stack Works Flow portal</p>
              </div>
            </div>
            <div className="ledger-summary-cards">
              <div className="ledger-info-card"><span className="ledger-info-icon"><CalendarDays aria-hidden="true" /></span><div><span>Print Date</span><strong>{formatPrintDate()}</strong></div></div>
              <div className="ledger-info-card"><span className="ledger-info-icon"><Coins aria-hidden="true" /></span><div><span>Opening Balance</span><strong>{formatBalance(totals.openingBalance)}</strong></div></div>
            </div>
          </div>

          <div className="ledger-report-card">
          <div className="ledger-title-bar">
            <span className="ledger-title-icon"><FileText aria-hidden="true" /></span>
            <div><strong>Account Statement of {accountName.toUpperCase()}</strong><span>From {formatStatementDate(filters.dateFrom)} To {formatStatementDate(filters.dateTo)}</span></div>
          </div>

          <div className="ledger-table-scroll">
            <table className="ledger-report-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>V.no</th>
                  <th>Details</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {rowsWithBalance.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="ledger-empty-cell">
                      <div className="ledger-empty-icon"><FileText aria-hidden="true" /></div>
                      <strong>No transactions found for the selected period</strong>
                      <span>There are no ledger entries to display between the selected dates.</span>
                    </td>
                  </tr>
                ) : (
                  rowsWithBalance.map((entry, index) => (
                    <tr key={`${entry.voucherId || "entry"}-${index}`}>
                      <td>{formatStatementDate(entry.date)}</td>
                      <td className="ledger-voucher">
                        {entry.voucherId || "-"}
                      </td>
                      <td>{entry.description || entry.ticketNumber || "-"}</td>
                      <td className="ledger-number">
                        {entry.debit ? formatCurrency(entry.debit) : ""}
                      </td>
                      <td className="ledger-number">
                        {entry.credit ? formatCurrency(entry.credit) : ""}
                      </td>
                      <td className="ledger-number ledger-balance">
                        {formatBalance(entry.runningBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="ledger-closing-total"><td colSpan="5">Closing Balance as on {formatStatementDate(filters.dateTo)}</td><td className="ledger-number">{formatBalance(totals.closingBalance)}</td></tr>
                <tr>
                  <td colSpan="3">Total</td>
                  <td className="ledger-number">
                    {formatCurrency(totals.debit)}
                  </td>
                  <td className="ledger-number">
                    {formatCurrency(totals.credit)}
                  </td>
                  <td className="ledger-number">
                    {formatBalance(totals.closingBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          </div>
        </section>
      </div>

      <div className="no-print mt-4 text-center text-sm text-gray-600">
        Showing {filteredData.length} of {ledgerData.length} entries
      </div>
    </div>
  );
};

export default Ledger;
