import React, { useEffect, useState } from "react";
import axiosInstance from "../../Api/axios";
import { toast } from "react-toastify";

interface Transport {
  _id: string;
  route: string;
  transportType: string;
}

const emptyForm = { route: "", transportType: "" };

export default function TransportManagement() {
  const [transports, setTransports] = useState<Transport[]>([]); 
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTransports();
  }, []);

  const fetchTransports = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/transports");
      if (res.data.success) setTransports(res.data.data);
    } catch {
      toast.error("Failed to fetch transports");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.route.trim()) return toast.error("Route is required");
    if (!form.transportType.trim()) return toast.error("Transport type is required");
    setSubmitting(true);
    try {
      if (editId) {
        const res = await axiosInstance.put("/transports", { id: editId, ...form });
        if (res.data.success) {
          toast.success("Transport updated");
          setTransports((prev) => prev.map((t) => (t._id === editId ? res.data.data : t)));
          cancelEdit();
        }
      } else {
        const res = await axiosInstance.post("/transports", form);
        if (res.data.success) {
          toast.success("Transport added");
          setTransports((prev) => [res.data.data, ...prev]);
          setForm(emptyForm);
        }
      }
    } catch {
      toast.error("Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (t: Transport) => {
    setEditId(t._id);
    setForm({ route: t.route, transportType: t.transportType });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this transport?")) return;
    try {
      const res = await axiosInstance.delete("/transports", { data: { id } });
      if (res.data.success) {
        toast.success("Transport deleted");
        setTransports((prev) => prev.filter((t) => t._id !== id));
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transport Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Create, update and manage transports</p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          {editId ? "Edit Transport" : "Add Transport"}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Route</label>
            <input
              name="route"
              value={form.route}
              onChange={handleChange}
              placeholder="Makkah → Madinah"
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Transport Type</label>
            <input
              name="transportType"
              value={form.transportType}
              onChange={handleChange}
              placeholder="Bus / GMC / Car"
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg text-sm transition disabled:opacity-60"
            >
              {submitting ? "Saving..." : editId ? "Update Transport" : "Add Transport"}
            </button>
            {editId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-semibold px-6 py-2 rounded-lg text-sm transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">All Transports</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : transports.length === 0 ? (
          <p className="text-sm text-gray-500">No transports found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3 pr-4 font-semibold text-gray-700 dark:text-gray-300">Route</th>
                  <th className="py-3 pr-4 font-semibold text-gray-700 dark:text-gray-300">Transport Type</th>
                  <th className="py-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transports.map((t) => (
                  <tr key={t._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="py-3 pr-4 font-semibold text-gray-900 dark:text-white">{t.route}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{t.transportType}</td>
                    <td className="py-3 flex gap-2">
                      <button
                        onClick={() => handleEdit(t)}
                        className="bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t._id)}
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
