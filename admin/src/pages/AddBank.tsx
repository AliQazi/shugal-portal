import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router";
import {
  TbBuildingBank, TbChevronRight, TbCircleCheck, TbCreditCard, TbFileDescription,
  TbPhoto, TbPencil, TbPlus, TbRotateClockwise, TbSearch, TbDeviceFloppy,
  TbListDetails, TbMapPin, TbUser, TbX,
} from "react-icons/tb";
import PageMeta from "../components/common/PageMeta";
import axiosInstance from "../Api/axios";
import "./bank-management.css";

interface Bank {
  _id: string;
  bankName: string;
  accountTitle: string;
  accountNo: string;
  ibn: string;
  bankAddress: string;
  logo: string;
  status: "Active" | "De-Active";
  createdAt: string;
}

const emptyForm = { bankName: "", accountTitle: "", accountNo: "", ibn: "", bankAddress: "" };
const errorMessage = (error: unknown, fallback: string) => isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || fallback : fallback;

const AddBank = () => {
  const [formData, setFormData] = useState(emptyForm);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const formCard = useRef<HTMLElement>(null);

  const fetchBanks = async () => {
    setFetchLoading(true);
    setFetchError(false);
    try {
      const response = await axiosInstance.get("/bank");
      if (response.data.success) {
        setBanks(response.data.data);
        setMessage((previous) => previous.type === "error" ? { type: "", text: "" } : previous);
      }
      else throw new Error("Failed to fetch banks");
    } catch (error) {
      setFetchError(true);
      setMessage({ type: "error", text: errorMessage(error, "Failed to fetch banks") });
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => { fetchBanks(); }, []);
  useEffect(() => {
    if (!logo) { setLogoPreview(""); return; }
    const url = URL.createObjectURL(logo);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };
  const selectLogo = (file: File | undefined) => {
    if (!file) return;
    if (file.type && !file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image for the bank logo" });
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setLogo(file);
  };
  const resetForm = () => {
    setEditingBank(null);
    setFormData(emptyForm);
    setLogo(null);
    setDragging(false);
    if (fileInput.current) fileInput.current.value = "";
  };
  const focusForm = () => {
    requestAnimationFrame(() => {
      formCard.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
      nameInput.current?.focus({ preventScroll: true });
    });
  };
  const handleEdit = (bank: Bank) => {
    setEditingBank(bank);
    setFormData({ bankName: bank.bankName, accountTitle: bank.accountTitle, accountNo: bank.accountNo, ibn: bank.ibn, bankAddress: bank.bankAddress });
    setLogo(null);
    if (fileInput.current) fileInput.current.value = "";
    setMessage({ type: "", text: "" });
    focusForm();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    if (!Object.values(formData).every((value) => value.trim())) {
      setMessage({ type: "error", text: "Please fill in all required bank fields" });
      return;
    }
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([name, value]) => submitData.append(name, value));
      if (logo) submitData.append("logo", logo);
      const config = { headers: { "Content-Type": "multipart/form-data" } };
      const response = editingBank
        ? await axiosInstance.put(`/bank/${editingBank._id}`, submitData, config)
        : await axiosInstance.post("/bank/add", submitData, config);
      if (response.data.success) {
        setMessage({ type: "success", text: response.data.message || `Bank ${editingBank ? "updated" : "added"} successfully!` });
        resetForm();
        await fetchBanks();
      } else {
        setMessage({ type: "error", text: response.data.message || "Unable to save the bank" });
      }
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error, `Failed to ${editingBank ? "update" : "add"} bank`) });
    } finally {
      setLoading(false);
    }
  };

  const filteredBanks = banks.filter((bank) => [bank.bankName, bank.accountTitle, bank.accountNo, bank.ibn].join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  const preview = logoPreview || editingBank?.logo;

  return (
    <div className="bank-management">
      <PageMeta title="Add New Bank | Stack Works Flow" description="Manage your bank accounts for payments and ledger management." />
      <header className="bm-heading"><div><h1>Add New Bank</h1><p>Manage your bank accounts for payments and ledger management.</p></div><nav aria-label="Breadcrumb" className="bm-breadcrumb"><Link to="/">Home</Link><TbChevronRight aria-hidden="true" /><span aria-current="page">Add New Bank</span></nav></header>

      <div className="bm-stats" aria-label="Bank summary">{[
        { label: "Total Banks", value: banks.length, icon: TbBuildingBank, tone: "blue" },
        { label: "Active Accounts", value: banks.filter((bank) => bank.status === "Active").length, icon: TbCircleCheck, tone: "green" },
        { label: "Banks with Logos", value: banks.filter((bank) => bank.logo).length, icon: TbPhoto, tone: "violet" },
      ].map(({ label, value, icon: Icon, tone }) => <div className="bm-stat" key={label}><span className={`bm-stat-icon bm-tone-${tone}`}><Icon aria-hidden="true" /></span><div><span>{label}</span><strong>{fetchLoading || fetchError ? "—" : value}</strong></div></div>)}</div>

      <section className="bm-card bm-form-card" ref={formCard} aria-labelledby="bm-form-heading">
        <div className="bm-card-title"><span className="bm-section-icon"><TbBuildingBank aria-hidden="true" /></span><div><h2 id="bm-form-heading">{editingBank ? "Edit Bank Information" : "Bank Information"}</h2><p>{editingBank ? "Update the selected bank account details." : "Add a new bank account for payments and ledger management."}</p></div></div>
        {message.text && <div className={`bm-message bm-message-${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.text}</div>}
        <form id="bm-bank-form" onSubmit={handleSubmit}>
          <div className="bm-form-grid">{[
            { name: "bankName", label: "Bank Name", placeholder: "Enter Bank Name", icon: TbBuildingBank },
            { name: "accountTitle", label: "Account Title", placeholder: "Enter Account Title", icon: TbUser },
            { name: "accountNo", label: "Account No", placeholder: "Enter Account No", icon: TbCreditCard },
            { name: "ibn", label: "IBAN", placeholder: "IBAN Number", icon: TbFileDescription },
            { name: "bankAddress", label: "Bank Address", placeholder: "Enter Bank Address", icon: TbMapPin },
          ].map(({ name, label, placeholder, icon: Icon }) => <div className="bm-field" key={name}><label htmlFor={name}>{label} <span>*</span></label><div className="bm-input-wrap"><Icon aria-hidden="true" /><input ref={name === "bankName" ? nameInput : undefined} id={name} name={name} value={formData[name as keyof typeof emptyForm]} onChange={handleInputChange} placeholder={placeholder} required disabled={loading} /></div></div>)}
            <div className="bm-field"><label htmlFor="logo">Upload Logo</label><label className={`bm-upload${dragging ? " is-dragging" : ""}${loading ? " is-disabled" : ""}`} htmlFor="logo"
              onDragOver={(event) => { event.preventDefault(); if (!loading) setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); if (!loading) selectLogo(event.dataTransfer.files[0]); }}>
              <input ref={fileInput} type="file" id="logo" name="logo" accept="image/*" disabled={loading} onChange={(event) => selectLogo(event.target.files?.[0])} />
              {preview ? <img src={preview} alt="Bank logo preview" className="bm-upload-preview" /> : <span className="bm-upload-icon"><TbPhoto aria-hidden="true" /></span>}
              <span className="bm-upload-copy"><span>{logo ? logo.name : editingBank?.logo ? "Current bank logo" : "Drag and drop bank logo here"}</span><span className="bm-upload-browse">or click to {preview ? "replace" : "browse"}</span><small>Choose an image for your bank logo</small></span>
            </label></div>
          </div>
          <div className="bm-form-actions"><button type="button" className="bm-button bm-button-secondary" disabled={loading} onClick={() => { resetForm(); setMessage({ type: "", text: "" }); }}>{editingBank ? <TbX aria-hidden="true" /> : <TbRotateClockwise aria-hidden="true" />}{editingBank ? "Cancel" : "Reset"}</button><button type="submit" className="bm-button bm-button-primary" disabled={loading}><TbDeviceFloppy aria-hidden="true" />{loading ? "Saving..." : editingBank ? "Update Bank" : "Save Bank"}</button></div>
        </form>
      </section>

      <section className="bm-card bm-list-card" aria-labelledby="bm-list-heading" aria-busy={fetchLoading}>
        <div className="bm-list-heading"><div className="bm-card-title"><span className="bm-section-icon"><TbListDetails aria-hidden="true" /></span><div><h2 id="bm-list-heading">All Banks</h2><p>Manage and view added bank accounts.</p></div></div><label className="bm-search"><TbSearch aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search banks..." aria-label="Search banks" /></label></div>
        <div className="bm-table-scroll" role="region" aria-label="Banks table" tabIndex={0}><table className="bm-table"><thead><tr>{["#", "Bank Name", "Account Title", "Account No", "IBAN", "Logo", "Status", "Actions"].map((heading) => <th scope="col" key={heading}>{heading}</th>)}</tr></thead><tbody>
          {fetchLoading ? <tr><td colSpan={8} className="bm-empty" role="status">Loading banks...</td></tr> : fetchError ? <tr><td colSpan={8} className="bm-empty"><strong>Unable to load banks</strong><span>Please try again.</span><button type="button" className="bm-button bm-button-primary" onClick={fetchBanks}>Retry</button></td></tr> : !filteredBanks.length ? <tr><td colSpan={8} className="bm-empty"><span className="bm-empty-icon"><TbBuildingBank aria-hidden="true" /></span><strong>{banks.length ? "No matching banks found" : "No banks found"}</strong><span>{banks.length ? "Try a different bank or account detail." : "Add your first bank account to get started."}</span>{!banks.length && <button type="button" className="bm-button bm-button-primary" onClick={focusForm}><TbPlus aria-hidden="true" />Add Bank</button>}</td></tr> : filteredBanks.map((bank, index) => <tr key={bank._id}><td>{index + 1}</td><td className="bm-bank-name">{bank.bankName}</td><td>{bank.accountTitle}</td><td className="bm-account-number">{bank.accountNo}</td><td className="bm-account-number">{bank.ibn}</td><td>{bank.logo ? <img className="bm-table-logo" src={bank.logo} alt={`${bank.bankName} logo`} /> : <span className="bm-muted">No logo</span>}</td><td><span className={`bm-status${bank.status === "Active" ? " is-active" : " is-inactive"}`}><TbCircleCheck aria-hidden="true" />{bank.status}</span></td><td><button type="button" className="bm-action" onClick={() => handleEdit(bank)} disabled={loading} aria-label={`Edit ${bank.bankName}`} title="Edit bank"><TbPencil aria-hidden="true" /></button></td></tr>)}
        </tbody></table></div>
        {!fetchLoading && !fetchError && filteredBanks.length > 0 && <p className="bm-list-count" aria-live="polite">Showing {filteredBanks.length} of {banks.length} banks</p>}
      </section>
    </div>
  );
};

export default AddBank;
