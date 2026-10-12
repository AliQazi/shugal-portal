import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { isAxiosError } from "axios";
import { TbCalendarEvent, TbChevronDown, TbCreditCard, TbExternalLink, TbFileDescription, TbFilter, TbHome, TbList, TbRefresh, TbSearch } from "react-icons/tb";
import { PiCheckCircleFill, PiClockFill, PiCoinsFill } from "react-icons/pi";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import emptyPayments from "../assets/images/payments-empty.png";
import "./view-payment-voucher.css";

interface Payment {
  _id: string;
  voucherId: string;
  date: string;
  description: string;
  bankAccount?: { _id: string; bankName: string; accountNo: string } | null;
  user?: { _id: string; name: string; email: string; companyName?: string } | null;
  amount: number;
  status: string;
  remarks?: string;
  receipt?: string;
  editedBy?: { _id: string; name: string; email: string } | null;
  editedAt?: string;
}
interface Filters { dateFrom: string; dateTo: string; status: string; search: string }

function defaultFilters(): Filters {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return { dateFrom: `${parts.year}-01-01`, dateTo: `${parts.year}-${parts.month}-${parts.day}`, status: "", search: "" };
}
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", year: "numeric" }).format(date);
}
function Receipt({ payment }: { payment: Payment }) {
  const [failedReceipt, setFailedReceipt] = useState<string>();
  if (!payment.receipt) return <span className="vp-muted">N/A</span>;
  return <a className="vp-receipt" href={payment.receipt} target="_blank" rel="noopener noreferrer" aria-label={`View receipt for ${payment.voucherId}`}>
    {failedReceipt !== payment.receipt ? <img src={payment.receipt} alt="Payment receipt" onError={() => setFailedReceipt(payment.receipt)} /> : <span className="vp-receipt-file"><TbFileDescription aria-hidden="true" />View</span>}
    <TbExternalLink className="vp-receipt-open" aria-hidden="true" />
  </a>;
}

export default function ViewPaymentVoucher() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError("");
    void axiosInstance.get("/payment", { params: { dateFrom: appliedFilters.dateFrom, dateTo: appliedFilters.dateTo, status: appliedFilters.status } }).then((response) => {
      if (cancelled) return;
      if (!response.data.success) throw new Error(response.data.message || "Failed to load payments");
      setPayments(response.data.data);
    }).catch((caught: unknown) => {
      if (cancelled) return;
      setError(isAxiosError<{ message?: string }>(caught) ? caught.response?.data?.message || "Unable to load payments. Please try again." : caught instanceof Error ? caught.message : "Unable to load payments. Please try again.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [appliedFilters, refreshKey]);

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
      setValidationError("Date From must be on or before Date To."); return;
    }
    setValidationError(""); setAppliedFilters({ ...filters });
  };
  const resetFilters = () => {
    const defaults = defaultFilters(); setValidationError(""); setFilters(defaults); setAppliedFilters(defaults);
  };
  const query = appliedFilters.search.trim().toLowerCase();
  const visiblePayments = loading || error ? [] : payments.filter((payment) => [payment.voucherId, payment.description].some((value) => (value || "").toLowerCase().includes(query)));
  const approved = visiblePayments.filter((payment) => payment.status === "Approved").length;
  const pending = visiblePayments.filter((payment) => payment.status === "Applied").length;
  const total = visiblePayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const stats = [
    { label: "Total Records", value: visiblePayments.length.toLocaleString("en-PK"), icon: TbFileDescription, color: "blue" },
    { label: "Approved", value: approved.toLocaleString("en-PK"), icon: PiCheckCircleFill, color: "green" },
    { label: "Pending", value: pending.toLocaleString("en-PK"), icon: PiClockFill, color: "amber" },
    { label: "Total Amount", value: `PKR ${formatCurrency(total)}`, icon: PiCoinsFill, color: "purple" },
  ];

  return <div className="view-payments-page">
    <PageMeta title="View Payments" description="Review and filter payment vouchers and receipts" />
    <div className="vp-page-heading">
      <span className="vp-heading-icon"><TbCreditCard aria-hidden="true" /></span>
      <div><h1>View Payments</h1><p>Review and filter payment vouchers and receipts</p></div>
      <nav aria-label="Breadcrumb"><Link to="/"><TbHome aria-hidden="true" />Home</Link><span aria-hidden="true">/</span><span aria-current="page">View Payments</span></nav>
    </div>

    <section className="vp-filter-card" aria-labelledby="vp-filter-heading">
      <div className="vp-filter-heading"><span><TbFilter aria-hidden="true" /></span><div><h2 id="vp-filter-heading">Filter Payments</h2><p>Use the filters below to find specific payment records</p></div></div>
      <form onSubmit={applyFilters}>
        <div className="vp-filter-grid">
          <div className="vp-field"><label htmlFor="vp-date-from">Date From</label><div className="vp-control vp-date-control"><span className="vp-input-icon"><TbCalendarEvent aria-hidden="true" /></span><input id="vp-date-from" type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} /></div></div>
          <div className="vp-field"><label htmlFor="vp-date-to">Date To</label><div className="vp-control vp-date-control"><span className="vp-input-icon"><TbCalendarEvent aria-hidden="true" /></span><input id="vp-date-to" type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} /></div></div>
          <div className="vp-field"><label htmlFor="vp-status">Status</label><div className="vp-control"><span className="vp-input-icon"><TbList aria-hidden="true" /></span><select id="vp-status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Select Status</option><option value="Applied">Applied</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option></select><TbChevronDown className="vp-select-chevron" aria-hidden="true" /></div></div>
          <div className="vp-field"><label htmlFor="vp-search">Search (Voucher ID or Description)</label><div className="vp-control vp-search-control"><span className="vp-input-icon"><TbSearch aria-hidden="true" /></span><input id="vp-search" type="search" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search voucher ID or description..." /></div></div>
        </div>
        {validationError && <p className="vp-validation-error" role="alert">{validationError}</p>}
        <div className="vp-filter-actions"><button className="vp-primary" type="submit" disabled={loading}><TbFilter aria-hidden="true" />{loading ? "Loading..." : "Apply Filter"}</button><button className="vp-secondary" type="button" onClick={resetFilters} disabled={loading}><TbRefresh aria-hidden="true" />Reset</button></div>
      </form>
    </section>

    <section className="vp-results-card" aria-label="Payment records" aria-busy={loading}>
      <div className="vp-stats" aria-label="Payment summary" aria-live="polite">{stats.map(({ label, value, icon: Icon, color }) => <div className={`vp-stat vp-stat-${color}`} key={label}><span className="vp-stat-icon"><Icon aria-hidden="true" /></span><div><h2>{label}</h2><strong>{loading ? "..." : value}</strong></div></div>)}</div>
      <div className="vp-table-wrap">
        <div className="vp-table-scroll" role="region" aria-label="Payment vouchers" tabIndex={0}>
          <table className="vp-table"><colgroup><col className="vp-col-number" /><col className="vp-col-voucher" /><col className="vp-col-date" /><col className="vp-col-company" /><col className="vp-col-account" /><col className="vp-col-description" /><col className="vp-col-credit" /><col className="vp-col-amount" /><col className="vp-col-status" /><col className="vp-col-receipt" /><col className="vp-col-editor" /><col className="vp-col-action" /></colgroup>
            <thead><tr>{["#", "Voucher ID", "Date", "Company Agent", "Debit Account", "Description", "Credit Account", "Amount", "Status", "Receipt", "Edited By", "Action"].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
            <tbody>{visiblePayments.map((payment, index) => <tr key={payment._id}>
              <td className="vp-row-number">{index + 1}</td>
              <td className="vp-voucher-cell" data-label="Voucher ID"><strong>{payment.voucherId}</strong></td>
              <td data-label="Date"><time dateTime={payment.date}>{formatDate(payment.date)}</time></td>
              <td data-label="Company Agent">{payment.user?.companyName || payment.user?.name || "-"}</td>
              <td data-label="Debit Account"><span className="vp-muted">-</span></td>
              <td className="vp-description-cell" data-label="Description">{payment.description}</td>
              <td data-label="Credit Account">{payment.remarks || "-"}</td>
              <td data-label="Amount"><span className="vp-row-amount">PKR {formatCurrency(payment.amount)}</span></td>
              <td data-label="Status"><span className={`vp-status-badge ${payment.status === "Approved" ? "vp-status-approved" : payment.status === "Rejected" ? "vp-status-rejected" : "vp-status-pending"}`}>{payment.status}</span></td>
              <td data-label="Receipt"><Receipt payment={payment} /></td>
              <td data-label="Edited By"><div className="vp-editor"><span>{payment.editedBy?.name || "Not Yet Approved"}</span>{payment.editedAt && <small>Dated: {formatDate(payment.editedAt)}</small>}</div></td>
              <td className="vp-details-cell"><Link className="vp-details" to={`/view-payment-voucher/edit/${payment._id}`}>Details<TbExternalLink aria-hidden="true" /></Link></td>
            </tr>)}</tbody>
          </table>
        </div>
        {loading ? <div className="vp-empty vp-loading" role="status">Loading payments...</div> : error ? <div className="vp-empty vp-error" role="alert"><TbFileDescription aria-hidden="true" /><h2>Unable to load payments</h2><p>{error}</p><button type="button" className="vp-secondary" onClick={() => setRefreshKey((key) => key + 1)}><TbRefresh aria-hidden="true" />Try again</button></div> : visiblePayments.length === 0 ? <div className="vp-empty"><img src={emptyPayments} alt="" /><h2>No payments found for the selected filters</h2><p>Try adjusting your filter criteria or date range to see results.</p></div> : null}
        <div className="vp-total-footer" aria-live="polite"><span>Total:</span><strong>{loading ? "..." : `PKR ${formatCurrency(total)}`}</strong></div>
      </div>
    </section>
  </div>;
}
