import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axiosInstance from "../../Api/axios";
import { toast } from "react-toastify";

interface UmrahPackage {
  _id: string;
  packageName: string;
  logo: string;
  flightLogo: string;
  packageDuration: number;
  availablePackages: number;
  roomTypes: { sharing: number; quint: number; quad: number; triple: number; double: number };
  isActive: boolean;
  createdAt: string;
}

export default function UmrahPackageList() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<UmrahPackage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchPackages(); }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/umrah-packages");
      if (res.data.success) setPackages(res.data.data);
    } catch { toast.error("Failed to fetch packages"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this package?")) return;
    try {
      const res = await axiosInstance.delete("/umrah-packages", { data: { id } });
      if (res.data.success) {
        toast.success("Package deleted");
        setPackages((prev) => prev.filter((p) => p._id !== id));
      }
    } catch { toast.error("Delete failed"); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Umrah Packages</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage all Umrah packages</p>
        </div>
        <button
          onClick={() => navigate("/umrah-packages/create")}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
        >
          + Add Package
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading...</div>
        ) : packages.length === 0 ? (
          <div className="p-6 text-sm text-gray-500 text-center">No packages found. Create the first one!</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
                {["#", "Package Name", "Duration", "Available", "Sharing", "Quint", "Quad", "Triple", "Double", "Actions"].map((h) => (
                  <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg, idx) => (
                <tr key={pkg._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{idx + 1}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {pkg.logo && <img src={pkg.logo} alt="" className="w-8 h-8 object-contain rounded" />}
                      <span className="font-semibold text-gray-900 dark:text-white">{pkg.packageName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{pkg.packageDuration} Days</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{pkg.availablePackages}</td>
                  <td className="py-3 px-4 text-blue-600 font-medium">{pkg.roomTypes?.sharing?.toLocaleString() || 0}</td>
                  <td className="py-3 px-4 text-purple-600 font-medium">{pkg.roomTypes?.quint?.toLocaleString() || 0}</td>
                  <td className="py-3 px-4 text-orange-600 font-medium">{pkg.roomTypes?.quad?.toLocaleString() || 0}</td>
                  <td className="py-3 px-4 text-green-600 font-medium">{pkg.roomTypes?.triple?.toLocaleString() || 0}</td>
                  <td className="py-3 px-4 text-yellow-600 font-medium">{pkg.roomTypes?.double?.toLocaleString() || 0}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/umrah-packages/edit/${pkg._id}`)}
                        className="bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(pkg._id)}
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
