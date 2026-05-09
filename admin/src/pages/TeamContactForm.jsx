import React, { useState, useEffect } from "react";

const TeamContactForm = ({ onSubmit, initialValues, isEditing, onCancel }) => {
  const [form, setForm] = useState({
    name: "",
    designation: "",
    gmail: "",
    number: "",
  });

  // Update form when initialValues changes (for editing)
  useEffect(() => {
    if (initialValues) {
      setForm({
        name: initialValues.name || "",
        designation: initialValues.designation || "",
        gmail: initialValues.gmail || "",
        number: initialValues.number || "",
      });
    } else {
      setForm({ name: "", designation: "", gmail: "", number: "" });
    }
  }, [initialValues]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
    if (!isEditing) {
      setForm({ name: "", designation: "", gmail: "", number: "" });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-xl shadow"
    >
      <div>
        <label className="block font-semibold mb-1">Name</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">Designation</label>
        <input
          name="designation"
          value={form.designation}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">Gmail</label>
        <input
          name="gmail"
          type="email"
          value={form.gmail}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">Number</label>
        <input
          name="number"
          value={form.number}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          {isEditing ? "Update Contact" : "Add Team Contact"}
        </button>
        {isEditing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default TeamContactForm;
