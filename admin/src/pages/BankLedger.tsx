import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";
import { TbArrowDownLeft, TbArrowUpRight, TbBuildingBank, TbCalendarEvent, TbChartPieFilled, TbCheck, TbChevronDown, TbChevronRight, TbChevronUp, TbCopy, TbPrinter, TbRefresh, TbSearch, TbSelector, TbWallet } from "react-icons/tb";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import bankIllustration from "../assets/images/bank-ledger-illustration.png";
import "./bank-ledger.css";

interface Bank { _id: string; bankName: string; accountTitle: string; accountNo: string; status: string }
interface LedgerEntry { voucherId: string; date: string; agentName: string; description: string; bankDebit: number; adminCredit: number; balance: number }
interface Filters { bankId: string; dateFrom: string; dateTo: string }
interface AppliedFilters extends Filters { bankName: string }
type SortKey = keyof LedgerEntry;
interface Sort { key: SortKey; direction: "ascending" | "descending" }
const defaultSort: Sort = { key: "date", direction: "descending" };
const columns: { label: string; key: SortKey; numeric?: boolean }[] = [{ label: "Date", key: "date" }, { label: "Voucher ID", key: "voucherId" }, { label: "Agent", key: "agentName" }, { label: "Description", key: "description" }, { label: "Bank Debit (PKR)", key: "bankDebit", numeric: true }, { label: "Credit (PKR)", key: "adminCredit", numeric: true }, { label: "Balance (PKR)", key: "balance", numeric: true }];
const money = (value: number) => new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
function defaults(): Filters {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return { bankId: "", dateFrom: `${parts.year}-${parts.month}-01`, dateTo: `${parts.year}-${parts.month}-${parts.day}` };
}
function dateLabel(value: string, period = false) {
  const date = new Date(period ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-US", { timeZone: period ? "UTC" : "Asia/Karachi", ...(period ? { weekday: "short" as const } : {}), month: "short", day: "2-digit", year: "numeric" }).format(date);
}
function timeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", hour12: true }).format(date);
}
function errorMessage(error: unknown, fallback: string) {
  return isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || fallback : error instanceof Error ? error.message : fallback;
}

export default function BankLedger() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [banksError, setBanksError] = useState("");
  const [banksRetry, setBanksRetry] = useState(0);
  const [filters, setFilters] = useState<Filters>(defaults);
  const [applied, setApplied] = useState<AppliedFilters | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [ledgerRetry, setLedgerRetry] = useState(0);
  const [sort, setSort] = useState<Sort>(defaultSort);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBanksLoading(true); setBanksError("");
    void axiosInstance.get("/bank").then((response) => {
      if (cancelled) return;
      if (!response.data.success) throw new Error(response.data.message || "Unable to load banks.");
      setBanks(response.data.data.filter((bank: Bank) => bank.status === "Active"));
    }).catch((error: unknown) => { if (!cancelled) setBanksError(errorMessage(error, "Unable to load banks. Please try again.")); }).finally(() => { if (!cancelled) setBanksLoading(false); });
    return () => { cancelled = true; };
  }, [banksRetry]);

  useEffect(() => {
    let cancelled = false;
    setLedger([]); setLoadError(""); setCopied(false);
    if (!applied) { setLoading(false); return; }
    setLoading(true);
    void axiosInstance.get(`/payment/bank-ledger/${applied.bankId}`, { params: { dateFrom: applied.dateFrom, dateTo: applied.dateTo } }).then((response) => {
      if (cancelled) return;
      if (!response.data.success) throw new Error(response.data.message || "Unable to load the bank ledger.");
      setLedger(response.data.data || []);
    }).catch((error: unknown) => { if (!cancelled) setLoadError(errorMessage(error, "Unable to load the bank ledger. Please try again.")); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [applied, ledgerRetry]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const apply = (next: Filters) => {
    const bank = banks.find((item) => item._id === next.bankId);
    if (!bank) { setApplied(null); setLedger([]); setLoading(false); return; }
    if (!next.dateFrom || !next.dateTo || next.dateFrom > next.dateTo) { setValidationError("Choose a valid date range with Date From on or before Date To."); return; }
    setValidationError(""); setLedger([]); setLoading(true); setSort(defaultSort);
    setApplied({ ...next, bankName: bank.bankName });
  };
  const selectBank = (bankId: string) => {
    const next = { ...filters, bankId }; setFilters(next); setValidationError("");
    setApplied(null); setLedger([]); setLoadError(""); setLoading(false);
    apply(next);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); apply(filters); };
  const reset = () => { setFilters(defaults()); setApplied(null); setLedger([]); setLoading(false); setLoadError(""); setValidationError(""); setSort(defaultSort); setCopied(false); };
  const visible = loading || loadError ? [] : ledger;
  const debit = visible.reduce((sum, entry) => sum + (Number(entry.bankDebit) || 0), 0);
  const credit = visible.reduce((sum, entry) => sum + (Number(entry.adminCredit) || 0), 0);
  const closing = Number(visible[visible.length - 1]?.balance) || 0;
  const debitCount = visible.filter((entry) => entry.bankDebit > 0).length;
  const creditCount = visible.filter((entry) => entry.adminCredit > 0).length;
  const sorted = [...visible].sort((a, b) => {
    const left = a[sort.key], right = b[sort.key];
    const order = sort.key === "date" ? (new Date(String(left)).getTime() || 0) - (new Date(String(right)).getTime() || 0) : typeof left === "number" && typeof right === "number" ? left - right : String(left || "").localeCompare(String(right || ""), "en", { numeric: true, sensitivity: "base" });
    return sort.direction === "ascending" ? order : -order;
  });
  const sortBy = (key: SortKey) => setSort((current) => ({ key, direction: current.key === key && current.direction === "ascending" ? "descending" : "ascending" }));
  const copyLedger = async () => {
    if (!applied || !sorted.length || copying) return;
    setCopying(true);
    const cell = (value: string) => value.replace(/[\t\r\n]+/g, " ");
    const header = "Voucher ID\tDate\tAgent\tDescription\tBank Debit (PKR)\tCredit (PKR)\tBalance (PKR)";
    const rows = sorted.map((entry) => [entry.voucherId, dateLabel(entry.date), entry.agentName, entry.description, Number(entry.bankDebit).toFixed(2), Number(entry.adminCredit).toFixed(2), Number(entry.balance).toFixed(2)].map(cell).join("\t"));
    const text = [`Bank Ledger — ${applied.bankName}`, `From ${applied.dateFrom} To ${applied.dateTo}`, "", header, ...rows, `Total\t\t\t\t${debit.toFixed(2)}\t${credit.toFixed(2)}\t${closing.toFixed(2)}`].join("\n");
    try { await navigator.clipboard.writeText(text); setCopied(true); }
    catch { toast.error("Unable to copy the ledger. Please try again."); }
    finally { setCopying(false); }
  };

  return <div className="bank-ledger-page">
    <PageMeta title="Bank Ledger" description="View bank transactions, vouchers and balances" />
    <div className="bl-page-heading bl-print-hidden"><span className="bl-heading-icon"><TbBuildingBank aria-hidden="true" /></span><div><h1>Bank Ledger</h1><p>View bank transactions, vouchers and balances</p></div><nav aria-label="Breadcrumb"><Link to="/">Home</Link><TbChevronRight aria-hidden="true" /><span aria-current="page">Bank Ledger</span></nav></div>
    <section className="bl-filter-card bl-print-hidden" aria-label="Bank ledger filters">
      <img className="bl-bank-art" src={bankIllustration} alt="" />
      <form className="bl-filter-content" onSubmit={submit}>
        <div className="bl-field bl-bank-field"><label htmlFor="bl-bank">Select Bank</label><div className="bl-control"><span className="bl-input-icon"><TbBuildingBank aria-hidden="true" /></span><select id="bl-bank" value={filters.bankId} onChange={(event) => selectBank(event.target.value)} required disabled={banksLoading || !!banksError || !banks.length}><option value="">{banksLoading ? "Loading banks..." : banksError ? "Unable to load banks" : !banks.length ? "No active banks available" : "Select a bank"}</option>{banks.map((bank) => <option value={bank._id} key={bank._id}>{bank.bankName} — {bank.accountTitle} ({bank.accountNo})</option>)}</select><TbChevronDown className="bl-chevron" aria-hidden="true" /></div></div>
        <div className="bl-filter-row">
          <div className="bl-field"><label htmlFor="bl-from">Date From</label><div className="bl-control"><span className="bl-input-icon"><TbCalendarEvent aria-hidden="true" /></span><input id="bl-from" type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} required /></div></div>
          <div className="bl-field"><label htmlFor="bl-to">Date To</label><div className="bl-control"><span className="bl-input-icon"><TbCalendarEvent aria-hidden="true" /></span><input id="bl-to" type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} required /></div></div>
          <div className="bl-filter-actions"><button className="bl-primary" type="submit" disabled={!filters.bankId || loading || banksLoading}><TbSearch aria-hidden="true" />{loading ? "Loading..." : "Show Ledger"}</button><button className="bl-secondary" type="button" onClick={reset}><TbRefresh aria-hidden="true" />Reset</button></div>
        </div>
        {validationError && <p className="bl-validation" role="alert">{validationError}</p>}
        {banksError && <div className="bl-bank-error" role="alert"><span>{banksError}</span><button type="button" onClick={() => setBanksRetry((value) => value + 1)}>Try again</button></div>}
      </form>
    </section>
    <section className="bl-card bl-ledger-card" aria-labelledby="bl-ledger-heading" aria-busy={loading}>
      <div className="bl-ledger-heading"><span className="bl-ledger-icon"><TbBuildingBank aria-hidden="true" /></span><div><h2 id="bl-ledger-heading">Bank Ledger{applied ? ` — ${applied.bankName.toUpperCase()}` : ""}</h2><p className={applied ? "bl-period" : "bl-subtitle"}>{applied && <TbCalendarEvent aria-hidden="true" />}{applied ? `From ${dateLabel(applied.dateFrom, true)} To ${dateLabel(applied.dateTo, true)}` : "Select a bank and date range to view transactions."}</p></div><div className="bl-export-actions bl-print-hidden"><button className="bl-secondary" type="button" onClick={copyLedger} disabled={!visible.length || copying}>{copied ? <TbCheck aria-hidden="true" /> : <TbCopy aria-hidden="true" />}{copied ? "Copied" : copying ? "Copying..." : "Copy"}</button><button className="bl-primary" type="button" onClick={() => window.print()} disabled={!visible.length}><TbPrinter aria-hidden="true" />Print</button></div></div>
      <div className="bl-mobile-sort bl-print-hidden"><label htmlFor="bl-sort">Sort by</label><select id="bl-sort" value={`${sort.key}:${sort.direction}`} onChange={(event) => { const [key, direction] = event.target.value.split(":"); setSort({ key: key as SortKey, direction: direction as Sort["direction"] }); }}>{columns.flatMap((column) => ([<option value={`${column.key}:ascending`} key={`${column.key}:asc`}>{column.label} (ascending)</option>, <option value={`${column.key}:descending`} key={`${column.key}:desc`}>{column.label} (descending)</option>]))}</select></div>
      <div className="bl-table-scroll" role="region" aria-label="Bank ledger transactions" tabIndex={0}>
        <table className="bl-table"><colgroup><col className="bl-col-number" /><col className="bl-col-date" /><col className="bl-col-voucher" /><col className="bl-col-agent" /><col className="bl-col-description" /><col className="bl-col-money" /><col className="bl-col-credit" /><col className="bl-col-money" /></colgroup><thead><tr><th scope="col">#</th>{columns.map((column) => <th scope="col" key={column.key} className={column.numeric ? "bl-number" : ""} aria-sort={sort.key === column.key ? sort.direction : "none"}><span className="bl-header-text">{column.label}</span><button type="button" onClick={() => sortBy(column.key)}>{column.label}{sort.key === column.key ? sort.direction === "ascending" ? <TbChevronUp aria-hidden="true" /> : <TbChevronDown aria-hidden="true" /> : <TbSelector aria-hidden="true" />}</button></th>)}</tr></thead>
          <tbody>{sorted.map((entry, index) => <tr key={`${entry.voucherId}-${entry.date}-${index}`}><td className="bl-row-number">{index + 1}</td><td data-label="Date"><time dateTime={entry.date}>{dateLabel(entry.date)}</time><small className="bl-time">{timeLabel(entry.date)}</small></td><td data-label="Voucher ID"><span className="bl-voucher">{entry.voucherId}</span></td><td className="bl-agent" data-label="Agent">{entry.agentName || "-"}</td><td className="bl-description" data-label="Description">{entry.description || "-"}</td><td className={`bl-number ${entry.bankDebit > 0 ? "bl-debit" : ""}`} data-label="Bank Debit (PKR)">{money(Number(entry.bankDebit) || 0)}</td><td className={`bl-number ${entry.adminCredit > 0 ? "bl-credit" : ""}`} data-label="Credit (PKR)">{money(Number(entry.adminCredit) || 0)}</td><td className="bl-number bl-balance" data-label="Balance (PKR)">{money(Number(entry.balance) || 0)}</td></tr>)}</tbody>
          {!!visible.length && <tfoot><tr><td colSpan={5}>Total</td><td className="bl-number bl-debit" data-label="Bank Debit (PKR)">{money(debit)}</td><td className="bl-number bl-credit" data-label="Credit (PKR)">{money(credit)}</td><td className="bl-number bl-balance" data-label="Balance (PKR)">{money(closing)}</td></tr></tfoot>}
        </table>
      </div>
      {loading ? <div className="bl-empty" role="status">Loading bank ledger...</div> : loadError ? <div className="bl-empty bl-load-error" role="alert"><TbBuildingBank aria-hidden="true" /><h3>Unable to load the ledger</h3><p>{loadError}</p><button className="bl-secondary" type="button" onClick={() => setLedgerRetry((value) => value + 1)}><TbRefresh aria-hidden="true" />Try again</button></div> : !visible.length ? <div className="bl-empty"><TbBuildingBank aria-hidden="true" /><h3>{applied ? "No transactions found" : "Select a bank to get started"}</h3><p>{applied ? "No approved payments found for this bank in the selected date range." : "Choose a bank above to view its vouchers and balances."}</p></div> : null}
    </section>
    <section className="bl-card bl-summary-card" aria-labelledby="bl-summary-heading"><div className="bl-summary-heading"><span><TbChartPieFilled aria-hidden="true" /></span><div><h2 id="bl-summary-heading">Ledger Summary</h2><p>Summary of transactions for the selected period</p></div></div><div className="bl-summary-grid">
      <div className="bl-stat bl-stat-debit"><span className="bl-stat-icon"><TbArrowDownLeft aria-hidden="true" /></span><div><h3>Total Bank Debit</h3><strong>{loading ? "..." : `PKR ${money(debit)}`}</strong><p>{debitCount} {debitCount === 1 ? "Transaction" : "Transactions"}</p></div></div>
      <div className="bl-stat bl-stat-credit"><span className="bl-stat-icon"><TbArrowUpRight aria-hidden="true" /></span><div><h3>Total Admin Credit</h3><strong>{loading ? "..." : `PKR ${money(credit)}`}</strong><p>{creditCount} {creditCount === 1 ? "Transaction" : "Transactions"}</p></div></div>
      <div className="bl-stat bl-stat-balance"><span className="bl-stat-icon"><TbWallet aria-hidden="true" /></span><div><h3>Closing Balance</h3><strong>{loading ? "..." : `PKR ${money(closing)}`}</strong><p>{applied ? `As of ${dateLabel(applied.dateTo, true).replace(/^\w+, /, "")}` : "Select a bank to view balance"}</p></div></div>
    </div></section>
  </div>;
}
