import { useState, useEffect } from "react";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import PageBreadCrumb from "../components/common/PageBreadCrumb";

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

const AddBank = () => {
  const [formData, setFormData] = useState({
    bankName: "",
    accountTitle: "",
    accountNo: "",
    ibn: "",
    bankAddress: "",
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch all banks
  const fetchBanks = async () => {
    try {
      setFetchLoading(true);
      const response = await axiosInstance.get("/bank");
      if (response.data.success) {
        setBanks(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching banks:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to fetch banks",
      });
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogo(e.target.files[0]);
    }
  };

  const handleEdit = (bank: Bank) => {
    setIsEditing(true);
    setEditingBank(bank);
    setFormData({
      bankName: bank.bankName,
      accountTitle: bank.accountTitle,
      accountNo: bank.accountNo,
      ibn: bank.ibn,
      bankAddress: bank.bankAddress,
    });
    setLogo(null);
    setMessage({ type: "", text: "" });
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingBank(null);
    setFormData({
      bankName: "",
      accountTitle: "",
      accountNo: "",
      ibn: "",
      bankAddress: "",
    });
    setLogo(null);
    setMessage({ type: "", text: "" });
    const fileInput = document.getElementById("logo") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const submitData = new FormData();
      submitData.append("bankName", formData.bankName);
      submitData.append("accountTitle", formData.accountTitle);
      submitData.append("accountNo", formData.accountNo);
      submitData.append("ibn", formData.ibn);
      submitData.append("bankAddress", formData.bankAddress);

      if (logo) {
        submitData.append("logo", logo);
      }

      let response;
      if (isEditing && editingBank) {
        // Update existing bank
        response = await axiosInstance.put(`/bank/${editingBank._id}`, submitData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        // Add new bank
        response = await axiosInstance.post("/bank/add", submitData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }


      if (response.data.success) {
        setMessage({
          type: "success",
          text: response.data.message || `Bank ${isEditing ? "updated" : "added"} successfully!`,
        });

        // Reset form
        setFormData({
          bankName: "",
          accountTitle: "",
          accountNo: "",
          ibn: "",
          bankAddress: "",
        });
        setLogo(null);
        setIsEditing(false);
        setEditingBank(null);

        // Reset file input
        const fileInput = document.getElementById("logo") as HTMLInputElement;
        if (fileInput) fileInput.value = "";

        // Refresh banks list
        fetchBanks();
      }
    } catch (error: any) {
      console.error(`Error ${isEditing ? "updating" : "adding"} bank:`, error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || `Failed to ${isEditing ? "update" : "add"} bank`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta title="Add New Bank - World Fly Ticket Travel" description="Manage and add bank accounts for World Fly Ticket Travel" />

      <div className="mb-6">
        <PageBreadCrumb pageTitle="Add New Bank" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          {isEditing ? "Edit Bank" : "Add New Bank"}
        </h2>

        {message.text && (
          <div
            className={`mb-4 p-4 rounded-lg ${message.type === "success"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label
                htmlFor="bankName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Bank Name
              </label>
              <input
                type="text"
                id="bankName"
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                placeholder="Enter Bank Name"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label
                htmlFor="accountTitle"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Account Title
              </label>
              <input
                type="text"
                id="accountTitle"
                name="accountTitle"
                value={formData.accountTitle}
                onChange={handleInputChange}
                placeholder="Enter Account Title"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label
                htmlFor="accountNo"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Account No
              </label>
              <input
                type="text"
                id="accountNo"
                name="accountNo"
                value={formData.accountNo}
                onChange={handleInputChange}
                placeholder="Enter Account No"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label
                htmlFor="ibn"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                IBN
              </label>
              <input
                type="text"
                id="ibn"
                name="ibn"
                value={formData.ibn}
                onChange={handleInputChange}
                placeholder="IBN Number"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label
                htmlFor="bankAddress"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Bank Address
              </label>
              <input
                type="text"
                id="bankAddress"
                name="bankAddress"
                value={formData.bankAddress}
                onChange={handleInputChange}
                placeholder="Enter Bank Address"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label
                htmlFor="logo"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Upload Logo
              </label>
              <input
                type="file"
                id="logo"
                name="logo"
                onChange={handleFileChange}
                accept="image/*"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            {isEditing && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition duration-200"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isEditing ? "Updating..." : "Adding...") : (isEditing ? "Update Bank" : "Add Bank")}
            </button>
          </div>
        </form>
      </div>

      {/* All Banks Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            All Banks
          </h2>
        </div>

        {fetchLoading ? (
          <div className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">Loading banks...</p>
          </div>
        ) : banks.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">No banks found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Bank ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Bank Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Account Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Account No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    IBN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    LOGO
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Edit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {banks.map((bank, index) => (
                  <tr key={bank._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {bank.bankName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {bank.accountTitle}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {bank.accountNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {bank.ibn}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {bank.logo ? (
                        <img
                          src={bank.logo}
                          alt={bank.bankName}
                          className="h-10 w-auto object-contain"
                        />
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">
                          No logo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${bank.status === "Active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}
                      >
                        {bank.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-4 rounded transition duration-200"
                        onClick={() => handleEdit(bank)}
                      >
                        Edit Bank
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default AddBank;
