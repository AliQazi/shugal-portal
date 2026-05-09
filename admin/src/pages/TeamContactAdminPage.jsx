import React, { useState, useEffect } from "react";
import TeamContactForm from "./TeamContactForm";
import {
  addTeamContact,
  getTeamContacts,
  updateTeamContact,
  deleteTeamContact,
} from "../Api/teamContactApi";

const TeamContactAdminPage = () => {
  const [contacts, setContacts] = useState([]);
  const [editingContact, setEditingContact] = useState(null);

  // Load contacts from backend on mount
  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const data = await getTeamContacts();

      setContacts(
        data.map((c) => ({
          id: c._id,
          name: c.name,
          designation: c.role,
          gmail: c.email,
          number: c.phone,
        })),
      );
    } catch (err) {
      console.log(err);
    }
  };

  const handleSubmit = async (contact) => {
    const payload = {
      name: contact.name,
      email: contact.gmail,
      phone: contact.number,
      role: contact.designation,
    };

    try {
      // UPDATE
      if (editingContact) {
        const res = await updateTeamContact(editingContact.id, payload);

        setContacts((prev) =>
          prev.map((c) =>
            c.id === editingContact.id
              ? {
                  id: res.data._id,
                  name: res.data.name,
                  designation: res.data.role,
                  gmail: res.data.email,
                  number: res.data.phone,
                }
              : c,
          ),
        );

        setEditingContact(null);

        alert("Contact updated successfully");
      }

      // ADD
      else {
        const saved = await addTeamContact(payload);

        setContacts((prev) => [
          ...prev,
          {
            id: saved._id,
            name: saved.name,
            designation: saved.role,
            gmail: saved.email,
            number: saved.phone,
          },
        ]);

        alert("Contact added successfully");
      }
    } catch (err) {
      alert(
        "Operation failed: " + (err?.response?.data?.message || err.message),
      );
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this contact?",
    );

    if (!confirmDelete) return;

    try {
      await deleteTeamContact(id);

      setContacts((prev) => prev.filter((c) => c.id !== id));

      alert("Contact deleted successfully");
    } catch (err) {
      alert("Delete failed: " + (err?.response?.data?.message || err.message));
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleCancelEdit = () => {
    setEditingContact(null);
  };

  return (
    <div className="main-container py-8">
      {/* TOP SECTION */}
      <div className="bg-linear-to-r from-blue-400 to-indigo-800 rounded-xl shadow-lg p-8 mb-8 flex flex-col items-center">
        <h2 className="text-3xl text-white font-bold mb-2 tracking-wide">
          Team Contact Management
        </h2>

        <p className="text-white/80 mb-4">
          Add and manage your team contacts easily.
        </p>

        <div className="w-full max-w-lg">
          <TeamContactForm
            onSubmit={handleSubmit}
            initialValues={editingContact}
            isEditing={!!editingContact}
            onCancel={handleCancelEdit}
          />
        </div>
      </div>

      {/* CONTACT LIST */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h3 className="text-2xl font-semibold mb-6 text-blue-700 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-7 h-7 text-blue-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118A7.5 7.5 0 0112 15.75a7.5 7.5 0 017.5 4.368"
            />
          </svg>
          Team Contacts
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contacts.length === 0 ? (
            <div className="col-span-2 text-center text-gray-400 py-8">
              No team contacts found.
            </div>
          ) : (
            contacts.map((c) => (
              <div
                key={c.id}
                className="bg-blue-50 rounded-lg p-5 shadow hover:shadow-md transition"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-14 h-14 rounded-full bg-linear-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white text-2xl font-bold">
                    {c.name?.[0]?.toUpperCase() || "?"}
                  </div>

                  <div className="flex-1">
                    <div className="text-lg font-semibold text-blue-900">
                      {c.name}
                    </div>

                    <div className="text-sm text-blue-600">{c.designation}</div>

                    <div className="text-sm text-gray-700 mt-2">
                      <span className="font-medium">Email:</span> {c.gmail}
                    </div>

                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Phone:</span> {c.number}
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => handleEdit(c)}
                    className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium transition"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(c.id)}
                    className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamContactAdminPage;
