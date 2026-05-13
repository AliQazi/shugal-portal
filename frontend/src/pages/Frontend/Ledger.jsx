import { useState, useEffect } from "react";
import axiosInstance from "../../api/axios";
import MaskedDatePicker from "../../components/MaskedDatePicker";
import TopBar from "../../components/TopBar/TopBar";
import { jsPDF } from "jspdf";
import { useRef } from "react";
import html2canvas from "html2canvas";

const Ledger = () => {
  const printRef = useRef(null);
  const getCurrentYearStart = () => {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  };

  const [filters, setFilters] = useState({
    dateFrom: getCurrentYearStart(),
    dateTo: new Date().toISOString().split("T")[0],
  });

  const [ledgerData, setLedgerData] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [pdfRendering, setPdfRendering] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [userProfile, setUserProfile] = useState(null);

  // Calculate totals
  const calculateTotals = () => {
    const debit = ledgerData.reduce((sum, item) => sum + (item.debit || 0), 0);
    const credit = ledgerData.reduce(
      (sum, item) => sum + (item.credit || 0),
      0,
    );
    const closingBalance = debit - credit;

    return { debit, credit, closingBalance };
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const fetchLedger = async () => {
    try {
      setFetching(true);
      setError(null);

      const user = JSON.parse(sessionStorage.getItem("frontend_user"));
      const userId = user?._id || user?.id;

      if (!userId) {
        setError("User not authenticated. Please login again.");
        setFetching(false);
        return;
      }

      const response = await axiosInstance.get(`/payment/ledger/${userId}`, {
        params: {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          ledgerView: "agent",
        },
      });

      if (response.data.success) {
        console.log("Fetched ledger data:", response.data.data);
        setLedgerData(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching ledger:", error);
      setError("Failed to fetch ledger data. Please try again later.");
    } finally {
      setInitialLoading(false);
      setFetching(false);
    }
  };

  const fetchUserProfile = async () => {
    // Seed immediately from session storage so logo renders without waiting for API
    const sessionUser = JSON.parse(sessionStorage.getItem("frontend_user") || "{}");
    if (sessionUser && Object.keys(sessionUser).length > 0) {
      setUserProfile(sessionUser);
    }

    try {
      const response = await axiosInstance.get("/auth/profile");
      if (response.data.success) {
        const profileData = response.data.data;
        setUserProfile(profileData);
        // Keep session in sync so future renders are fast
        sessionStorage.setItem(
          "frontend_user",
          JSON.stringify({ ...sessionUser, ...profileData }),
        );
      }
    } catch (err) { 
      console.error("Error fetching user profile:", err);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [filters]);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

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

  const handleExport = async (type) => {
    try {
      const user = JSON.parse(sessionStorage.getItem("frontend_user"));
      const userId = user?._id || user?.id;
      const userName = user?.name || "User";

      if (type === "copy") {
        const tableData = dataWithRunningBalance
          .map(
            (entry) =>
              `${entry.voucherId || "-"}\t${entry.date ? new Date(entry.date).toLocaleDateString() : "-"}\t${entry.ticketNumber || "-"}\t${entry.description || "-"}\t${entry.debit > 0 ? formatCurrency(entry.debit) : ""}\t${entry.credit > 0 ? formatCurrency(entry.credit) : ""}\t${formatCurrency(entry.runningBalance)}`,
          )
          .join("\n");

        const header =
          "Voucher Id\tDate\tTicket #\tDescription\tDebit\tCredit\tBalance\n";
        const totals = `\nTotal\t\t\t\t${formatCurrency(calculateTotals().debit)}\t${formatCurrency(calculateTotals().credit)}\t${formatCurrency(calculateTotals().closingBalance)}`;
        const fullText = `Ledger of ${userName.toUpperCase()}\nFrom ${filters.dateFrom} To ${filters.dateTo}\n\n${header}${tableData}${totals}`;

        await navigator.clipboard.writeText(fullText);
        alert("Table data copied to clipboard!");
        return;
      }

      if (type === "pdf") {
        setDownloadingPDF(true);
        try {
          const container = printRef.current;

          // Temporarily make the container visible for html2canvas
          const prevDisplay = container.style.display;
          const prevPosition = container.style.position;
          const prevLeft = container.style.left;
          const prevTop = container.style.top;
          const prevZIndex = container.style.zIndex;
          const prevWidth = container.style.width;
          const prevBackground = container.style.background;

          // Show container off-screen for capture
          setPdfRendering(true);
          container.style.display = "block";
          container.style.position = "fixed";
          container.style.left = "-9999px";
          container.style.top = "0";
          container.style.zIndex = "-1";
          container.style.width = "794px"; // A4 at 96dpi

          // Wait for React re-render + images to load
          await new Promise((r) => setTimeout(r, 300));

          const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            logging: false,
            width: 794,
          });

          // Restore
          setPdfRendering(false);
          container.style.display = prevDisplay;
          container.style.position = prevPosition;
          container.style.left = prevLeft;
          container.style.top = prevTop;
          container.style.zIndex = prevZIndex;
          container.style.width = prevWidth;
          container.style.background = prevBackground;
          container.style.padding = "";
          container.style.fontFamily = "";

          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

          const pdfWidth = pdf.internal.pageSize.getWidth();   // 210mm
          const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
          const imgWidth = pdfWidth;
          const imgHeight = (canvas.height * pdfWidth) / canvas.width;

          let heightLeft = imgHeight;
          let position = 0;

          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;

          while (heightLeft > 0) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
          }

          pdf.save(`ledger-${userName}-${Date.now()}.pdf`);
        } finally {
          setDownloadingPDF(false);
        }
        return;
      }

      const exportUrl = `/payment/ledger/${userId}/export/${type}`;

      const response = await axiosInstance.get(exportUrl, {
        params: {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          userName,
        },
        responseType: "blob",
      });

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

  const filteredData = ledgerData.filter((item) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.voucherId?.toString().includes(search) ||
      item.ticketNumber?.toLowerCase().includes(search) ||
      item.description?.toLowerCase().includes(search)
    );
  });

  const totals = calculateTotals();

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

  // Opening balance — not provided by API, default to 0
  const openingBalance = 0;

  const dataWithRunningBalance = filteredData.map((item, index) => {
    // Calculate running balance: Opening + Sum(Debits) - Sum(Credits)
    const previousDebits = filteredData.slice(0, index + 1).reduce((sum, i) => sum + (i.debit || 0), 0);
    const previousCredits = filteredData.slice(0, index + 1).reduce((sum, i) => sum + (i.credit || 0), 0);
    const runningBalance = openingBalance + previousDebits - previousCredits;

    return { ...item, runningBalance };
  });

  const formatDateWithDay = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).replace(/ /g, ' ').replace(',', ''); // Result: Sat, 09 May 2026
  };


  return (
    <div className="w-full min-h-screen mx-auto">
      {/* Print / PDF Styles */}
      <style>{`
  /* ── Hidden on screen; shown only in print or during PDF capture ── */
  @media screen {
    .print-layout-container { display: none; }
  }

  /* ── Layout styles apply always (container is hidden on screen anyway) ── */
  .print-layout-container {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #000;
    background: #fff;
    padding: 20px 24px;
    box-sizing: border-box;
  }

  /* Print Date Header */
  .print-date-header { text-align: right; font-size: 8pt; color: #666; margin-bottom: 12px; }

  /* Header Layout */
  .header-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; margin-top: 30px; }
  .company-details { font-size: 8pt; line-height: 1.4; color: #444; }
  .company-name { font-size: 10pt; font-weight: bold; color: #000; margin-bottom: 2px; }

  /* Opening Balance Box */
  .ob-box { border: 1px solid #000; width: 220px; text-align: center; }
  .ob-title {
    background: #f4f4f4;
    border-bottom: 1px solid #000;
    padding: 4px;
    font-weight: bold;
    font-size: 8.5pt;
    color: #333;
  }
  .ob-val { padding: 6px; font-weight: bold; font-size: 10pt; color: #000; }

  /* Separator Line */
  .grey-line { border: none; border-top: 1px solid #999; margin: 30px 0 12px; }

  /* Statement Bar */
  .statement-bar {
    background: #75b9e7;
    border: 1px solid #000;
    padding: 6px 10px;
    display: flex;
    justify-content: space-between;
    font-weight: bold;
    font-size: 9pt;
    margin-bottom: 12px;
  }

  /* Table */
  .print-table { width: 100%; border-collapse: collapse; border: 1px solid #999; }
  .print-table th {
    background: #d6d6d6;
    border: 1px solid #999;
    padding: 6px 8px;
    font-size: 8.5pt;
    text-align: left;
  }
  .print-table td { border: 1px solid #bbb; padding: 6px 8px; font-size: 8.5pt; }

  .v-link { color: #3498db; text-decoration: none; font-weight: 500; }
  .text-right { text-align: right !important; }
  .bold { font-weight: bold; }

  /* Special Notes */
  .special-notes-section { margin-top: 20px; font-size: 9pt; }
  .notes-title { font-weight: bold; margin-bottom: 4px; }

  /* ── Print-only overrides ── */
  @media print {
    @page { size: A4; margin: 0mm; }
    .no-print, nav, aside, header, footer { display: none !important; }
    html, body, body * { background: white !important; box-shadow: none !important; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #000; }
    .statement-bar *, .ob-title *, .print-table th *, .print-table td * { background: transparent !important; }
    .print-layout-container { display: block !important; width: 100%; padding: 0; }
    html, body { height: auto !important; min-height: 0 !important; }
    div, section, main { min-height: 0 !important; }
    .print-layout-container { page-break-after: avoid; break-after: avoid; }

    /* Force color printing */
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    .statement-bar { background: #75b9e7 !important; }
    .ob-title { background: #f4f4f4 !important; }
    .print-table th { background: #d6d6d6 !important; }
  }
`}</style>



      {/* Print Title - Only visible in print */}
      <div className="print-layout-container" ref={printRef}>
        <div className="print-date-header">
          Print Date: {formatDateWithDay(new Date())}
        </div>

        <div className="header-section">
          <div className="flex gap-4">
            {userProfile?.logo ? (
              <img
                src={userProfile.logo}
                alt="Company Logo"
                style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ height: '48px', width: '48px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>
                Company Logo
              </div>
            )}
            <div className="company-details">
              <div className="company-name">{userProfile?.companyName || userProfile?.name || "-"}</div>
              {userProfile?.address && <div>{userProfile.address}{userProfile.city ? `, ${userProfile.city}` : ""}{userProfile.country ? `, ${userProfile.country}` : ""}</div>}
              {userProfile?.phone && <div>Phone: {userProfile.phone}</div>}
              {userProfile?.agencyCode && <div>Agency Code: {userProfile.agencyCode}</div>}
            </div>
          </div>

          <div className="ob-box">
            <div className="ob-title">Opening Balance</div>
            <div className="ob-val">{formatCurrency(openingBalance)} DR</div>
          </div>
        </div>

        <div className="grey-line"></div>

        <div className="statement-bar">
          <span>Account Statement of Cash</span>
          <span>From {formatDateWithDay(filters.dateFrom)} To {formatDateWithDay(filters.dateTo)}</span>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>Date</th>
              <th style={{ width: '10%' }}>V.no</th>
              <th style={{ width: '40%' }}>Details</th>
              <th className="text-right" style={{ width: '10%' }}>Debit</th>
              <th className="text-right" style={{ width: '10%' }}>Credit</th>
              <th className="text-right" style={{ width: '15%' }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {/* If data exists, map it; otherwise show the "Closing/Total" lines as per image */}
            {dataWithRunningBalance.length > 0 ? (
              dataWithRunningBalance.map((item, idx) => (
                <tr key={idx}>
                  <td>{formatDateWithDay(item.date)}</td>
                  <td><span className="v-link">{item.voucherId || '-'}</span></td>
                  <td>{item.description || '-'}</td>
                  <td className="text-right">{item.debit || 0}</td>
                  <td className="text-right">{item.credit ? formatCurrency(item.credit) : '0'}</td>
                  <td className="text-right bold">{formatCurrency(item.runningBalance)} DR</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-4 text-gray-400 italic">No ledger entries found</td>
              </tr>
            )}

            {/* Closing Balance Row */}
            <tr className="bold">
              <td colSpan="5">Closing Balance as on {formatDateWithDay(filters.dateTo)}</td>
              <td className="text-right">{formatCurrency(totals.closingBalance)} DR</td>
            </tr>

            {/* Totals Row */}
            <tr className="bold">
              <td colSpan="3" className="text-center">Total</td>
              <td className="text-right">{totals.debit || 0}</td>
              <td className="text-right">{formatCurrency(totals.credit)}</td>
              <td className="text-right">{formatCurrency(totals.closingBalance)} DR</td>
            </tr>
          </tbody>
        </table>

        <div className="special-notes-section">
          <div className="notes-title">SPECIAL NOTES :</div>
          <div>{userProfile?.remarks || userProfile?.notes || ""}</div>
        </div>
      </div>

      {/* Header */}
      {/* WRAP THE TOPBAR HERE */}
      <div className="no-print">
        <TopBar
          title={`${userProfile?.name || userProfile?.companyName || "Agent"} Ledger`}
        />
      </div>

      {/* Filters Section */}
      <div className="mb-6 bg-white rounded-lg shadow p-4 sm:p-6 no-print">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            Date Range & Export
          </h3>
          <button
            onClick={resetFilters}
            className="text-sm text-red-600 hover:text-red-800 font-medium self-start sm:self-auto"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          {/* From Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            {/* <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            /> */}
            <MaskedDatePicker
              value={filters.dateFrom}
              onChange={(date) => handleFilterChange("dateFrom", date)}
              placeholderText="From Date"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            {/* <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            /> */}
            <MaskedDatePicker
              value={filters.dateTo}
              onChange={(date) => handleFilterChange("dateTo", date)}
              placeholderText="To Date"
            />
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap gap-2 no-print">
          <button
            onClick={() => handleExport("copy")}
            className="px-3 sm:px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
          >
            Copy
          </button>
          <button
            onClick={() => handleExport("pdf")}
            disabled={downloadingPDF}
            className="px-3 sm:px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:opacity-60 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
          >
            {downloadingPDF ? "Generating..." : "PDF"}
          </button>
          <button
            onClick={handlePrint}
            className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
          >
            Print
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4 bg-white rounded-lg shadow p-4 no-print">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by voucher, ticket, or description..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden relative no-print">
        {fetching && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f]">
                <tr>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                    Voucher Id
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                    Ticket #
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                    Debit
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                    Credit
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-2 sm:px-4 py-6 sm:py-8 text-center text-sm text-gray-500"
                    >
                      No ledger entries found
                    </td>
                  </tr>
                ) : (
                  dataWithRunningBalance.map((item, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                        {item.voucherId || "-"}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                        {item.date
                          ? new Date(item.date).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                        {item.ticketNumber || "-"}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                        <div
                          className="max-w-xs sm:max-w-md truncate"
                          title={item.description}
                        >
                          {item.description || "-"}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-right font-semibold text-gray-900">
                        {item.debit ? formatCurrency(item.debit) : ""}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-right font-semibold text-gray-900">
                        {item.credit ? formatCurrency(item.credit) : "0"}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-right font-bold text-gray-900">
                        {formatCurrency(item.runningBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr className="border-t-2 border-gray-300">
                  <td
                    colSpan="4"
                    className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-right text-gray-900"
                  >
                    Total:
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-right text-gray-900 whitespace-nowrap">
                    {formatCurrency(totals.debit)}
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-right text-gray-900 whitespace-nowrap">
                    {formatCurrency(totals.credit)}
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-right text-gray-900 whitespace-nowrap">
                    {formatCurrency(totals.closingBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="no-print mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">
            Total Debit
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-600">
            {formatCurrency(totals.debit)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">
            Total Credit
          </div>
          <div className="text-xl sm:text-2xl font-bold text-green-600">
            {formatCurrency(totals.credit)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Closing Balance</div>
          <div
            className={`text-2xl font-bold ${totals.closingBalance >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {formatCurrency(totals.closingBalance)}
          </div>
        </div>
      </div>

      {/* Info */}
      {/* <div className="no-print mt-4 text-center text-sm text-gray-600">
        Showing {filteredData.length} of {ledgerData.length} entries
      </div> */}
    </div>
  );
};

export default Ledger;
