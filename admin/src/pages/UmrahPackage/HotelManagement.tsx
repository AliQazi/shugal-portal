import React, { useEffect, useState } from "react";
import axiosInstance from "../../Api/axios";
import { toast } from "react-toastify";

interface Hotel {
  _id: string;
  name: string;
  city: string;
  distance: number;
  rating: number;
  mapUrl: string;
}

const emptyForm = { name: "", city: "", distance: 0, rating: 0, mapUrl: "" };

export default function HotelManagement() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/hotels");
      if (res.data.success) setHotels(res.data.data);
    } catch {
      toast.error("Failed to fetch hotels");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "distance" || name === "rating" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Hotel name is required");
    if (!form.city.trim()) return toast.error("City is required");
    setSubmitting(true);
    try {
      if (editId) {
        const res = await axiosInstance.put("/hotels", { id: editId, ...form });
        if (res.data.success) {
          toast.success("Hotel updated");
          setHotels((prev) => prev.map((h) => (h._id === editId ? res.data.data : h)));
          cancelEdit();
        }
      } else {
        const res = await axiosInstance.post("/hotels", form);
        if (res.data.success) {
          toast.success("Hotel added");
          setHotels((prev) => [res.data.data, ...prev]);
          setForm(emptyForm);
        }
      }
    } catch {
      toast.error("Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (hotel: Hotel) => {
    setEditId(hotel._id);
    setForm({ name: hotel.name, city: hotel.city, distance: hotel.distance, rating: hotel.rating, mapUrl: hotel.mapUrl });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this hotel?")) return;
    try {
      const res = await axiosInstance.delete("/hotels", { data: { id } });
      if (res.data.success) {
        toast.success("Hotel deleted");
        setHotels((prev) => prev.filter((h) => h._id !== id));
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hotel Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Create, update and manage hotels</p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          {editId ? "Edit Hotel" : "Add Hotel"}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hotel Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Type hotel..."
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="Type city..."
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Distance (m)</label>
            <input
              name="distance"
              type="number"
              min={0}
              value={form.distance}
              onChange={handleChange}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rating</label>
            <input
              name="rating"
              type="number"
              min={0}
              max={5}
              step={0.5}
              value={form.rating}
              onChange={handleChange}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Map URL</label>
            <input
              name="mapUrl"
              value={form.mapUrl}
              onChange={handleChange}
              placeholder="Google map link..."
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-3 flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg text-sm transition disabled:opacity-60"
            >
              {submitting ? "Saving..." : editId ? "Update Hotel" : "Add Hotel"}
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
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">All Hotels</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : hotels.length === 0 ? (
          <p className="text-sm text-gray-500">No hotels found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3 pr-4 font-semibold text-gray-700 dark:text-gray-300">Hotel</th>
                  <th className="py-3 pr-4 font-semibold text-gray-700 dark:text-gray-300">City</th>
                  <th className="py-3 pr-4 font-semibold text-gray-700 dark:text-gray-300">Distance</th>
                  <th className="py-3 pr-4 font-semibold text-gray-700 dark:text-gray-300">Rating</th>
                  <th className="py-3 pr-4 font-semibold text-gray-700 dark:text-gray-300">Map</th>
                  <th className="py-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {hotels.map((hotel) => (
                  <tr key={hotel._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="py-3 pr-4 font-semibold text-gray-900 dark:text-white uppercase">{hotel.name}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{hotel.city}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{hotel.distance} m</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                      <span className="text-yellow-500">★</span> {hotel.rating}
                    </td>
                    <td className="py-3 pr-4">
                      {hotel.mapUrl ? (
                        <a href={hotel.mapUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm">
                          Open Map
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="py-3 flex gap-2">
                      <button
                        onClick={() => handleEdit(hotel)}
                        className="bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(hotel._id)}
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
