import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";
import { TbBuildingBank, TbCalendarEvent, TbChevronDown, TbChevronRight, TbCircleCheck, TbCircleX, TbClock, TbCoin, TbCreditCard, TbExternalLink, TbFileDescription, TbInfoCircle, TbMessage, TbRefresh, TbDeviceFloppy, TbShieldCheck, TbUpload, TbUser, TbUsers, TbX } from "react-icons/tb";
import axiosInstance from "../Api/axios";
import { useAuth } from "../context/AuthContext";
import PageMeta from "../components/common/PageMeta";
import "./edit-payment-voucher.css";

interface Payment {
  _id: string;
  voucherId: string;
  date: string;
  description: string;
  bankAccount?: { _id: string; bankName: string; accountNo: string } | null;
  user?: { _id: string; name: string; companyName?: string } | null;
  amount: number;
  status: string;
  remarks?: string;
  receipt?: string | null;
}
interface VoucherForm { description: string; amount: string; status: string; date: string; remarks: string }
const emptyForm: VoucherForm = { description: "", amount: "", status: "Applied", date: "", remarks: "" };
const receiptTypes = ["image/jpeg", "image/png", "image/gif", "image/svg+xml", "image/webp"];

function errorMessage(error: unknown, fallback: string) {
  return isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || fallback : error instanceof Error ? error.message : fallback;
}
function Field({ label, id, icon, children, className = "" }: { label: string; id: string; icon: ReactNode; children: ReactNode; className?: string }) {
  return <div className={`ev-field ${className}`}><label htmlFor={id}>{label}</label><div className="ev-control"><span className="ev-input-icon" aria-hidden="true">{icon}</span>{children}</div></div>;
}
function StatusBadge({ status }: { status: string }) {
  const Icon = status === "Approved" ? TbCircleCheck : status === "Rejected" ? TbCircleX : TbClock;
  return <span className={`ev-status ev-status-${status.toLowerCase()}`}><Icon aria-hidden="true" />{status}</span>;
}

export default function EditPaymentVoucher() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [form, setForm] = useState<VoucherForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState("");
  const [failedPreview, setFailedPreview] = useState<string>();
  const uploadInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoadError(""); setSaveError(""); setPayment(null); setReceiptFile(null); setReceiptError("");
    void axiosInstance.get(`/payment/${id}`).then((response) => {
      if (cancelled) return;
      if (!response.data.success || !response.data.data) throw new Error(response.data.message || "Payment voucher not found.");
      const record: Payment = response.data.data;
      setPayment(record);
      const date = new Date(record.date);
      setForm({ description: record.description || "", amount: record.amount?.toString() || "", status: record.status || "Applied", date: Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10), remarks: record.remarks || "" });
    }).catch((error: unknown) => { if (!cancelled) setLoadError(errorMessage(error, "Unable to load this payment voucher. Please try again.")); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, reloadKey]);

  useEffect(() => {
    if (!receiptFile) { setReceiptPreview(null); return; }
    const url = URL.createObjectURL(receiptFile);
    setReceiptPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptFile]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setSaveError("");
  };
  const handleReceiptChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!receiptTypes.includes(file.type)) { setReceiptError("Choose a JPG, PNG, GIF, SVG or WEBP image."); return; }
    if (file.size > 5 * 1024 * 1024) { setReceiptError("Receipt images must be 5 MB or smaller."); return; }
    setReceiptError(""); setReceiptFile(file);
  };
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !payment) return;
    if (!form.description.trim()) { setSaveError("Enter a payment description."); return; }
    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) < 0) { setSaveError("Enter a valid amount of zero or more."); return; }
    setSaving(true); setSaveError("");
    try {
      const data = new FormData();
      data.append("description", form.description.trim()); data.append("amount", form.amount); data.append("status", form.status); data.append("remarks", form.remarks); data.append("date", form.date);
      if (payment.bankAccount?._id) data.append("bankAccount", payment.bankAccount._id);
      if (user?.id) data.append("editedBy", user.id);
      if (receiptFile) data.append("receipt", receiptFile);
      const response = await axiosInstance.put(`/payment/${id}`, data, { headers: { "Content-Type": "multipart/form-data" } });
      if (!response.data.success) throw new Error(response.data.message || "Failed to update payment voucher.");
      toast.success("Payment voucher updated successfully.");
      navigate("/view-payment-voucher");
    } catch (error: unknown) { setSaveError(errorMessage(error, "Unable to update this payment voucher. Please try again.")); }
    finally { setSaving(false); }
  };

  const agent = payment?.user?.companyName || payment?.user?.name || "Unavailable";
  const bank = payment?.bankAccount?.bankName || "Unavailable";
  const account = payment?.bankAccount?.accountNo || "Unavailable";
  const receiptUrl = receiptFile ? receiptPreview : payment?.receipt;
  const amount = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 }).format(Number(form.amount) || 0);
  const date = form.date ? new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${form.date}T00:00:00Z`)) : "Not set";
  const summary = [
    { label: "Status", value: <StatusBadge status={form.status} />, icon: form.status === "Approved" ? TbCircleCheck : form.status === "Rejected" ? TbCircleX : TbClock, color: form.status === "Approved" ? "green" : form.status === "Rejected" ? "red" : "amber" },
    { label: "Amount", value: `Rs. ${amount}`, icon: TbCoin, color: "blue" },
    { label: "Bank", value: bank, icon: TbBuildingBank, color: "purple" },
    { label: "Date", value: date, icon: TbCalendarEvent, color: "blue" },
    { label: "Agent", value: payment?.user?.name, icon: TbUsers, color: "blue" },
    { label: "Account #", value: account, icon: TbCreditCard, color: "blue" },
  ];

  return <div className="edit-voucher-page">
    <PageMeta title="View Payment Voucher" description="Review and update payment voucher details" />
    <nav className="ev-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><TbChevronRight aria-hidden="true" /><Link to="/view-payment-voucher">Payments</Link><TbChevronRight aria-hidden="true" /><span aria-current="page">View Payment Voucher</span></nav>
    <div className="ev-page-heading"><span className="ev-heading-icon"><TbFileDescription aria-hidden="true" /></span><div><h1>View Payment Voucher</h1><p>Review and update payment voucher details.</p></div></div>
    {loading ? <section className="ev-card ev-state" role="status"><TbRefresh className="ev-loading-icon" aria-hidden="true" /><p>Loading payment voucher...</p></section> : loadError ? <section className="ev-card ev-state" role="alert"><TbFileDescription aria-hidden="true" /><h2>Unable to load payment voucher</h2><p>{loadError}</p><div><button className="ev-secondary" type="button" onClick={() => navigate("/view-payment-voucher")}>Back to payments</button><button className="ev-primary" type="button" onClick={() => setReloadKey((key) => key + 1)}><TbRefresh aria-hidden="true" />Try again</button></div></section> : payment && <div className="ev-layout">
      <section className="ev-card ev-details" aria-labelledby="ev-details-title">
        <div className="ev-details-heading"><h2 id="ev-details-title">Payment Voucher Details</h2><p>Update the payment voucher information and receipt if needed.</p></div>
        <form onSubmit={handleSubmit} aria-busy={saving}>
          {saveError && <p className="ev-error" role="alert">{saveError}</p>}
          <fieldset disabled={saving} className="ev-fieldset">
            <legend className="sr-only">Payment voucher fields</legend>
            <div className="ev-grid ev-grid-two">
              <Field label="Agent Credit Account Name" id="ev-credit-agent" icon={<TbBuildingBank />}><input id="ev-credit-agent" value={agent} readOnly /></Field>
              <Field label="Bank Name" id="ev-bank" icon={<TbBuildingBank />}><input id="ev-bank" value={bank} readOnly /></Field>
            </div>
            <div className="ev-grid ev-grid-three">
              <Field label="Agent Name" id="ev-agent" icon={<TbUser />}><input id="ev-agent" value={payment?.user?.name} readOnly /></Field>
              <Field label="Description" id="ev-description" icon={<TbFileDescription />}><input id="ev-description" name="description" value={form.description} readOnly /></Field>
              <Field label="Amount" id="ev-amount" icon={<TbCoin />}><input id="ev-amount" name="amount" type="text" value={amount} readOnly /></Field>
              <Field label="Account #" id="ev-account" icon={<TbCreditCard />}><input id="ev-account" value={account} readOnly /></Field>
              <Field label="Status" id="ev-status" icon={<TbShieldCheck />}><select id="ev-status" name="status" value={form.status} onChange={handleChange}><option value="Applied">Applied</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option></select><TbChevronDown className="ev-chevron" aria-hidden="true" /></Field>
              <Field label="Date" id="ev-date" icon={<TbCalendarEvent />}><input id="ev-date" name="date" type="date" value={form.date} readOnly /></Field>
            </div>
            <Field label="Remarks (Optional)" id="ev-remarks" icon={<TbMessage />} className="ev-remarks"><textarea id="ev-remarks" name="remarks" value={form.remarks} onChange={handleChange} placeholder="Add any additional remarks about this payment voucher..." rows={2} /></Field>
            <div className={`ev-receipt-panel ${receiptUrl ? "ev-has-receipt" : ""}`}>
              {receiptUrl && failedPreview !== receiptUrl ? <a className="ev-receipt-preview" href={receiptUrl} target="_blank" rel="noopener noreferrer" aria-label="Open payment receipt"><img src={receiptUrl} alt="Payment receipt" onError={() => setFailedPreview(receiptUrl)} /></a> : <span className="ev-receipt-icon"><TbFileDescription aria-hidden="true" /></span>}
              <div className="ev-receipt-info"><h3>{receiptFile ? "Receipt selected" : receiptUrl ? "Payment Receipt" : "No Receipt"}</h3><p>{receiptFile ? receiptFile.name : receiptUrl ? failedPreview === receiptUrl ? "Preview unavailable. Open the receipt to view it." : "Current receipt attached to this payment voucher." : "No receipt uploaded for this payment voucher."}</p><div className="ev-receipt-actions"><button className="ev-upload" type="button" onClick={() => uploadInput.current?.click()}><TbUpload aria-hidden="true" />Change Receipt</button>{receiptUrl && <a className="ev-receipt-link" href={receiptUrl} target="_blank" rel="noopener noreferrer">Open receipt<TbExternalLink aria-hidden="true" /></a>}</div></div>
              <input ref={uploadInput} type="file" accept={receiptTypes.join(",")} onChange={handleReceiptChange} className="ev-file-input" aria-label="Upload payment receipt" tabIndex={-1} />
            </div>
            {receiptError && <p className="ev-error ev-receipt-error" role="alert">{receiptError}</p>}
            <div className="ev-form-actions"><button className="ev-secondary" type="button" onClick={() => navigate("/view-payment-voucher")}><TbX aria-hidden="true" />Cancel</button><button className="ev-primary" type="submit"><TbDeviceFloppy aria-hidden="true" />{saving ? "Updating..." : "Update Payment Voucher"}</button></div>
          </fieldset>
        </form>
      </section>
      <aside className="ev-sidebar" aria-label="Voucher information">
        <section className="ev-card ev-summary" aria-labelledby="ev-summary-title"><h2 id="ev-summary-title"><span className="ev-section-icon"><TbFileDescription aria-hidden="true" /></span>Voucher Summary</h2><dl>{summary.map(({ label, value, icon: Icon, color }) => <div className="ev-summary-row" key={label}><dt><span className={`ev-summary-icon ev-icon-${color}`}><Icon aria-hidden="true" /></span>{label}</dt><dd>{value}</dd></div>)}</dl></section>
        <section className="ev-card ev-quick-info" aria-labelledby="ev-info-title"><h2 id="ev-info-title"><span className="ev-section-icon"><TbInfoCircle aria-hidden="true" /></span>Quick Info</h2><div className="ev-info-panel"><span className="ev-info-icon"><TbFileDescription aria-hidden="true" /></span><div><h3>Payment Receipt</h3><p>Upload or change the receipt image for this voucher. Supported formats: JPG, PNG, GIF, SVG and WEBP (Max 5 MB).</p></div></div></section>
      </aside>
    </div>}
  </div>;
}
