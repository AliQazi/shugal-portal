import { useEffect, useState } from "react";
import { TbBriefcase, TbMail, TbPhone, TbPlus, TbRotateClockwise, TbUser, TbX } from "react-icons/tb";

const emptyForm = { name: "", designation: "", gmail: "", number: "" };

const TeamContactForm = ({ onSubmit, initialValues, isEditing, onCancel, submitting = false }) => {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setForm(initialValues ? {
      name: initialValues.name || "",
      designation: initialValues.designation || "",
      gmail: initialValues.gmail || "",
      number: initialValues.number || "",
    } : emptyForm);
  }, [initialValues]);

  const handleChange = (event) => {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const saved = await onSubmit(form);
    if (saved && !isEditing) setForm(emptyForm);
  };

  return (
    <form id="tc-contact-form" onSubmit={handleSubmit}>
      <div className="tc-form-grid">
        {[
          { name: "name", label: "Name", placeholder: "Enter full name", icon: TbUser, type: "text", autoComplete: "name" },
          { name: "designation", label: "Designation", placeholder: "Enter designation", icon: TbBriefcase, type: "text", autoComplete: "organization-title" },
          { name: "gmail", label: "Email", placeholder: "Enter email address", icon: TbMail, type: "email", autoComplete: "email" },
          { name: "number", label: "Number", placeholder: "Enter phone number", icon: TbPhone, type: "tel", autoComplete: "tel" },
        ].map(({ name, label, placeholder, icon: Icon, type, autoComplete }) => (
          <div className="tc-field" key={name}>
            <label htmlFor={`tc-${name}`}>{label} <span>*</span></label>
            <div className="tc-input-wrap"><Icon aria-hidden="true" /><input id={`tc-${name}`} name={name} type={type} autoComplete={autoComplete} value={form[name]} onChange={handleChange} placeholder={placeholder} required disabled={submitting} /></div>
          </div>
        ))}
      </div>
      <div className="tc-form-actions">
        <button type="submit" disabled={submitting} className="tc-button tc-button-primary"><TbPlus aria-hidden="true" />{submitting ? "Saving..." : isEditing ? "Update Contact" : "Add Team Contact"}</button>
        <button type="button" disabled={submitting} className="tc-button tc-button-secondary" onClick={() => { if (isEditing) onCancel?.(); else setForm(emptyForm); }}>
          {isEditing ? <TbX aria-hidden="true" /> : <TbRotateClockwise aria-hidden="true" />}{isEditing ? "Cancel" : "Reset"}
        </button>
      </div>
    </form>
  );
};

export default TeamContactForm;
