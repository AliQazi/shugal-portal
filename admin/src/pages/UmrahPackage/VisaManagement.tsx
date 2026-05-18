import React, { useEffect, useState } from "react";
import axiosInstance from "../../Api/axios";
import { toast } from "react-toastify";

interface Visa {
  _id: string;
  visaType: string;
  processingTime: number;
  buyingPrice: number;
  sellingPrice: number;
  currency: string;
  transport: "without" | "with";
  description: string;
}

const CURRENCIES = [
  "PKR — Pakistani Rupee",
  "USD — US Dollar",
  "SAR — Saudi Riyal",
  "AED — UAE Dirham",
  "GBP — British Pound",
  "EUR — Euro",
];

const emptyForm = {
  visaType: "",
  processingTime: 0,
  buyingPrice: 0,
  sellingPrice: 0,
  currency: "PKR",
  transport: "without" as "without" | "with",
  description: "",
};

export default function VisaManagement() {
  const [visas, setVisas] = useState<Visa[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVisas();
  }, []);

  const fetchVisas = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/visas");
      if (res.data.success) setVisas(res.data.data);
    } catch {
      toast.error("Failed to fetch visas");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "processingTime" || name === "buyingPrice" || name === "sellingPrice"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.visaType.trim()) return toast.error("Visa type is required");
    setSubmitting(true);
    try {
      if (editId) {
        const res = await axiosInstance.put("/visas", { id: editId, ...form });
        if (res.data.success) {
          toast.success("Visa updated");
          setVisas((prev) => prev.map((v) => (v._id === editId ? res.data.data : v)));
          cancelEdit();
        }
      } else {
        const res = await axiosInstance.post("/visas", form);
        if (res.data.success) {
          toast.success("Visa added");
          setVisas((prev) => [res.data.data, ...prev]);
          setForm(emptyForm);
        }
      }
    } catch {
      toast.error("Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (v: Visa) => {
    setEditId(v._id);
    setForm({
      visaType: v.visaType,
      processingTime: v.processingTime,
      buyingPrice: v.buyingPrice,
      sellingPrice: v.sellingPrice,
      currency: v.currency,
      transport: v.transport,
      description: v.description,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this visa?")) return;
    try {
      const res = await axiosInstance.delete("/visas", { data: { id } });
      if (res.data.success) {
        toast.success("Visa deleted");
        setVisas((prev) => prev.filter((v) => v._id !== id));
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  const withoutTransport = visas.filter((v) => v.transport === "without");
  const withTransport = visas.filter((v) => v.transport === "with");

  const margin = (v: Visa) =>
    v.sellingPrice > 0 ? ((v.sellingPrice - v.buyingPrice) / v.sellingPrice * 100).toFixed(1) + "%" : "—";

  const VisaTable = ({ list }: { list: Visa[] }) =>
    list.length === 0 ? (
      <div className="flex flex-col items-center py-8 text-gray-400">
        <span className="text-3xl mb-2">☰</span>
        <span className="text-sm">No records found</span>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {["VISA TYPE", "PROCESSING", "BUY PRICE", "SELL PRICE", "MARGIN", "CURRENCY", "ACTIONS"].map((h) => (
                <th key={h} className="py-3 pr-4 text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((v) => (
              <tr key={v._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{v.visaType}</td>
                <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{v.processingTime} days</td>
                <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{v.buyingPrice.toLocaleString()}</td>
                <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{v.sellingPrice.toLocaleString()}</td>
                <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{margin(v)}</td>
                <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{v.currency}</td>
                <td className="py-3 flex gap-2">
                  <button onClick={() => handleEdit(v)} className="bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(v._id)} className="bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-lg">🪪</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visa Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage Umrah visa packages and pricing</p>
        </div>
        <div className="ml-auto flex gap-3">
          {[
            { label: "TOTAL", value: visas.length, color: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700" },
            { label: "NO TRANSPORT", value: withoutTransport.length, color: "bg-cyan-50 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-700" },
            { label: "WITH TRANSPORT", value: withTransport.length, color: "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700" },
          ].map((stat) => (
            <div key={stat.label} className={`flex items-center gap-2 border rounded-xl px-4 py-2 ${stat.color}`}>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</span>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-blue-600">+</span> {editId ? "Edit Visa" : "Add New Visa"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">VISA TYPE *</label>
              <input
                name="visaType"
                value={form.visaType}
                onChange={handleChange}
                placeholder="e.g. Umrah 15 Days"
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">PROCESSING TIME (DAYS)</label>
              <input
                name="processingTime"
                type="number"
                min={0}
                value={form.processingTime}
                onChange={handleChange}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">BUYING PRICE *</label>
              <input
                name="buyingPrice"
                type="number"
                min={0}
                value={form.buyingPrice}
                onChange={handleChange}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">SELLING PRICE *</label>
              <input
                name="sellingPrice"
                type="number"
                min={0}
                value={form.sellingPrice}
                onChange={handleChange}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">CURRENCY</label>
              <select
                name="currency"
                value={form.currency}
                onChange={handleChange}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c.split(" — ")[0]}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transport Toggle */}
          <div>
            <label className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 block mb-2">TRANSPORT</label>
            <div className="flex gap-2">
              {(["without", "with"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, transport: opt }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${
                    form.transport === opt
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {opt === "without" ? "🚫" : "🚌"} {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">DESCRIPTION</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Additional details, inclusions, restrictions..."
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg text-sm transition disabled:opacity-60"
            >
              {submitting ? "Saving..." : editId ? "Update Visa" : "+ Add Visa"}
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

      {/* Without Transport */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center text-cyan-600">🚫</div>
            <span className="font-semibold text-gray-800 dark:text-white">Umrah Visa — Without Transport</span>
          </div>
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full font-medium">
            {withoutTransport.length} RECORDS
          </span>
        </div>
        <div className="p-6">
          {loading ? <p className="text-sm text-gray-500">Loading...</p> : <VisaTable list={withoutTransport} />}
        </div>
      </div>

      {/* With Transport */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600">🚌</div>
            <span className="font-semibold text-gray-800 dark:text-white">Umrah Visa — With Transport</span>
          </div>
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full font-medium">
            {withTransport.length} RECORDS
          </span>
        </div>
        <div className="p-6">
          {loading ? <p className="text-sm text-gray-500">Loading...</p> : <VisaTable list={withTransport} />}
        </div>
      </div>
    </div>
  );
}
