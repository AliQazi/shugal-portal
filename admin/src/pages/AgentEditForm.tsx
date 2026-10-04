import { useState, type ReactNode } from "react";
import {
  ArrowLeftIcon, BuildingOffice2Icon, EnvelopeIcon, EyeIcon, EyeSlashIcon,
  GlobeAltIcon, IdentificationIcon, InformationCircleIcon, LockClosedIcon,
  MapPinIcon, PhoneIcon, ShieldCheckIcon, TagIcon, UserIcon,
} from "@heroicons/react/24/outline";
import countryCodes from "../../../frontend/src/data/countryCodes.json";

export interface AgentEditValues {
  name: string; email: string; phone: string; companyName: string;
  address: string; city: string; country: string;
  marginType: "Percentage" | "Amount"; flightMarginPercent: number; flightMarginAmount: number;
  discountType: "Percentage" | "Amount"; discountPercent: number; discountAmount: number;
  status: "Active" | "Inactive" | "Pending" | "Suspended"; password: string;
}

interface Props {
  values: AgentEditValues;
  agencyCode?: string;
  saving: boolean;
  onChange: (field: keyof AgentEditValues, value: string | number) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onBackToAgents: () => void;
}

const Field = ({ label, required, icon, children, className = "" }: { label: string; required?: boolean; icon?: ReactNode; children: ReactNode; className?: string }) => (
  <label className={`agent-edit-field ${className}`}>
    <span>{label}{required && <em> *</em>}</span>
    <div className="agent-edit-control">{icon && <span className="agent-edit-control-icon">{icon}</span>}{children}</div>
  </label>
);

const CardTitle = ({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) => (
  <div className="agent-edit-card-title"><span>{icon}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div>
);

export default function AgentEditForm({ values, agencyCode, saving, onChange, onSubmit, onCancel, onBackToAgents }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const numberValue = (value: number) => Number.isFinite(value) ? value : 0;
  return <form className="agent-edit-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
    <div className="agent-edit-card-grid">
      <section className="agent-edit-card">
        <CardTitle icon={<UserIcon />} title="Basic Information" subtitle="Personal and agency details" />
        <div className="agent-edit-fields two-columns">
          <Field label="Contact Person Name" required icon={<UserIcon />}><input required value={values.name} onChange={(e) => onChange("name", e.target.value)} /></Field>
          <Field label="Email" required icon={<EnvelopeIcon />}><input required type="email" value={values.email} onChange={(e) => onChange("email", e.target.value)} /></Field>
          <Field label="Phone No" required icon={<PhoneIcon />}><input required type="tel" value={values.phone} onChange={(e) => onChange("phone", e.target.value)} /></Field>
          <Field label="Agency Name" required icon={<BuildingOffice2Icon />}><input required value={values.companyName} onChange={(e) => onChange("companyName", e.target.value)} /></Field>
          <Field label="Status" required icon={<ShieldCheckIcon />}><select required value={values.status} onChange={(e) => onChange("status", e.target.value)}><option value="Active">Active</option><option value="Inactive">De-Active</option><option value="Pending">Pending</option><option value="Suspended">Suspended</option></select></Field>
          <Field label="Agent Code" required icon={<TagIcon />}><input readOnly value={agencyCode || "N/A"} className="agent-edit-readonly" /></Field>
        </div>
      </section>
      <section className="agent-edit-card">
        <CardTitle icon={<span className="agent-edit-percent">%</span>} title="Margin & Discount Settings" subtitle="Set flight ticket margin and discount rules" />
        <div className="agent-edit-fields two-columns">
          <Field label="Margin Type"><select value={values.marginType} onChange={(e) => onChange("marginType", e.target.value)}><option value="Percentage">Percentage</option><option value="Amount">Amount</option></select></Field>
          <Field label="Flight Margin %" icon={<span>%</span>}><input type="number" min="0" step="any" value={numberValue(values.flightMarginPercent)} disabled={values.marginType !== "Percentage"} onChange={(e) => onChange("flightMarginPercent", Number(e.target.value))} /></Field>
          <Field label="Flight Margin Amount (PKR)" icon={<span>Rs</span>}><input type="number" min="0" step="any" value={numberValue(values.flightMarginAmount)} disabled={values.marginType !== "Amount"} onChange={(e) => onChange("flightMarginAmount", Number(e.target.value))} /></Field>
          <span className="agent-edit-field-spacer" aria-hidden="true" />
          <Field label="Discount Type"><select value={values.discountType} onChange={(e) => onChange("discountType", e.target.value)}><option value="Percentage">Percentage</option><option value="Amount">Amount</option></select></Field>
          <Field label="Discount %" icon={<span>%</span>}><input type="number" min="0" step="any" value={numberValue(values.discountPercent)} disabled={values.discountType !== "Percentage"} onChange={(e) => onChange("discountPercent", Number(e.target.value))} /></Field>
          <Field label="Discount Amount (PKR)" icon={<span>Rs</span>}><input type="number" min="0" step="any" value={numberValue(values.discountAmount)} disabled={values.discountType !== "Amount"} onChange={(e) => onChange("discountAmount", Number(e.target.value))} /></Field>
        </div>
      </section>
      <section className="agent-edit-card">
        <CardTitle icon={<MapPinIcon />} title="Address Information" subtitle="Location details of the agent" />
        <div className="agent-edit-fields two-columns">
          <Field label="Address" icon={<MapPinIcon />}><input value={values.address} onChange={(e) => onChange("address", e.target.value)} /></Field>
          <Field label="City" icon={<BuildingOffice2Icon />}><input value={values.city} onChange={(e) => onChange("city", e.target.value)} /></Field>
          <Field label="Country" icon={<GlobeAltIcon />}><select value={values.country} onChange={(e) => onChange("country", e.target.value)}><option value="">Select Country</option>{values.country && !countryCodes.some((entry) => entry.country === values.country) && <option value={values.country}>{values.country}</option>}{countryCodes.map((entry) => <option value={entry.country} key={entry.iso}>{entry.country}</option>)}</select></Field>
        </div>
      </section>
      <section className="agent-edit-card">
        <CardTitle icon={<LockClosedIcon />} title="Account & Access" subtitle="Login credentials and access settings" />
        <div className="agent-edit-fields">
          <Field label="New Password" icon={<LockClosedIcon />}><input type={showPassword ? "text" : "password"} autoComplete="new-password" value={values.password} onChange={(e) => onChange("password", e.target.value)} placeholder="Leave blank to keep current password" /><button type="button" className="agent-edit-password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeSlashIcon /> : <EyeIcon />}</button></Field>
          <div className="agent-edit-security-note"><InformationCircleIcon /><div><strong>Security Note</strong><p>Only fill this field if you want to change the password. Otherwise leave it empty.</p></div></div>
        </div>
      </section>
    </div>
    <div className="agent-edit-footer"><button type="button" className="agent-edit-back-agents" onClick={onBackToAgents}><ArrowLeftIcon />Back to Agents</button><div><button type="button" className="agent-edit-cancel" onClick={onCancel} disabled={saving}>Cancel</button><button type="submit" className="agent-edit-submit" disabled={saving}><IdentificationIcon />{saving ? "Updating..." : "Update Agent"}</button></div></div>
  </form>;
}
