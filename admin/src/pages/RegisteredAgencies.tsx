import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import PageBreadCrumb from "../components/common/PageBreadCrumb";
import { toast } from "react-toastify";


interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  agencyCode?: string;
  role: string;
  status: "Active" | "Inactive" | "Pending";
  priceOnCall?: boolean;
  showHideButton?: boolean;
  plainPassword?: string;
  city?: string;
  accountId?: string;
  accountName?: string;
  consultant?: string;
  country?: string;
  marginType?: "Percentage" | "Amount";
  flightMarginPercent?: number;
  flightMarginAmount?: number;
  registeredFrom?: {
    ipAddress?: string;
    userAgent?: string;
  };
  margin?: string;
  activatedBy?: string;
  deactivatedBy?: string;
  deactivatedAt?: string;
  createdAt: string;
}

const RegisteredAgencies = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null);
  const [sendingCredentials, setSendingCredentials] = useState<string | null>(null);
  const [entriesPerPage, setEntriesPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [priceLoading, setPriceLoading] = useState<string | null>(null);
  const [showLoading, setShowLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // const frontendUrl = import.meta.env.VITE_FRONTEND_URL || "https://shaheenwingstravels.com";
  const frontendUrl = "http://localhost:5173";

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
    setCurrentPage(1); // Reset to first page on filter change
  }, [users, searchTerm, cityFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("admin_token");
      const response = await axiosInstance.get("/auth/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by role - only show agencies
    filtered = filtered.filter((user) => user.role === "Agency");

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.agencyCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by city
    if (cityFilter !== "All") {
      filtered = filtered.filter((user) => user.city === cityFilter);
    }

    // Filter by status
    if (statusFilter !== "All") {
      filtered = filtered.filter((user) => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / entriesPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  );

  const updateUserStatus = async (userId: string, newStatus: "Active" | "Inactive" | "Pending") => {
    try {
      setApprovalLoading(userId);
      const token = sessionStorage.getItem("admin_token");
      const response = await axiosInstance.patch(
        `/auth/users/${userId}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        const updated = response.data.data as User;
        setUsers(
          users.map((user) =>
            user._id === userId
              ? {
                ...user,
                status: newStatus,
                activatedBy: updated.activatedBy,
                deactivatedBy: updated.deactivatedBy,
                deactivatedAt: updated.deactivatedAt
              }
              : user
          )
        );
      }
    } catch (error) {
      console.error("Error updating user status:", error);
    } finally {
      setApprovalLoading(null);
    }
  };

  const handleAgentLogin = (user: User) => {
    if (!user.agencyCode || !user.email || !user.plainPassword) {
      window.alert("Missing agent credentials for auto login. Ensure email, code, and password are set.");
      return;
    }

    const params = new URLSearchParams({
      agentCode: user.agencyCode,
      email: user.email,
      password: user.plainPassword,
      auto: "true",
    });

    const target = `${frontendUrl.replace(/\/$/, "")}/?${params.toString()}`;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const handleSendCredentials = async (userId: string) => {
    try {
      setSendingCredentials(userId);
      const token = sessionStorage.getItem("admin_token");

      const response = await axiosInstance.post(
        `/auth/users/${userId}/send-credentials`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        window.alert("✅ " + (response.data.message || "Credentials sent successfully!"));
      }
    } catch (error: any) {
      console.error("Error sending credentials:", error);

      let errorMessage = "❌ Failed to send credentials email.\n\n";

      if (error.response?.status === 500) {
        errorMessage += "Email service is not configured properly.\n\n";
        errorMessage += "Please check the backend EMAIL_SETUP_GUIDE.md for instructions on:\n";
        errorMessage += "1. Setting up Gmail App Password\n";
        errorMessage += "2. Or configuring alternative email service\n\n";
        errorMessage += "Contact system administrator to configure email settings.";
      } else {
        errorMessage += error.response?.data?.message || "An unexpected error occurred. Please try again.";
      }

      window.alert(errorMessage);
    } finally {
      setSendingCredentials(null);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloadingPDF(true);
      const token = sessionStorage.getItem("admin_token");

      const params = new URLSearchParams({
        searchTerm: searchTerm,
        city: cityFilter,
        status: statusFilter,
      });

      const response = await axiosInstance.get(`/export/users/pdf?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `agencies-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Error downloading PDF:", error);
      window.alert("Failed to download PDF. Please try again.");
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setDownloadingExcel(true);
      const token = sessionStorage.getItem("admin_token");

      const params = new URLSearchParams({
        searchTerm: searchTerm,
        city: cityFilter,
        status: statusFilter,
      });

      const response = await axiosInstance.get(`/export/users/excel?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',
      });
      console.log(response.data, 'excel response')
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `agencies-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Error downloading Excel:", error);
      window.alert("Failed to download Excel. Please try again.");
    } finally {
      setDownloadingExcel(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "text-green-600 dark:text-green-400";
      case "Pending":
        return "text-red-600 dark:text-red-400";
      case "Inactive":
        return "text-gray-600 dark:text-gray-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const formatMargin = (user: User) => {
    if (user.marginType === "Amount") {
      return `${user.flightMarginAmount ?? 0} PKR`;
    }
    if (user.marginType === "Percentage") {
      return `${user.flightMarginPercent ?? 0}%`;
    }
    return user.margin || "0";
  };

  const togglePriceOnCall = async (userId: string, currentValue?: boolean) => {
    try {
      setPriceLoading(userId);
      const token = sessionStorage.getItem("admin_token");

      const response = await axiosInstance.patch(
        `/auth/users/${userId}/price-on-call`,
        { priceOnCall: !currentValue },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setUsers(prev =>
          prev.map(u =>
            u._id === userId ? { ...u, priceOnCall: response.data.data.priceOnCall } : u
          )
        );
      }
    } catch (error) {
      console.error("Error updating Price on Call:", error);
      window.alert("Failed to update Price on Call");
    } finally {
      setPriceLoading(null);
    }
  };
  const toggleShowButton = async (userId: string, currentValue?: boolean) => {
    const newValue = !currentValue;
    console.log(newValue, 'newvalue')
    setUsers(prev =>
      prev.map(u =>
        u._id === userId
          ? { ...u, showHideButton: newValue }
          : u
      )
    );

    try {
      setShowLoading(userId)
      const token = sessionStorage.getItem("admin_token");

      await axiosInstance.patch(
        `/auth/users/${userId}/show-booking-now`,
        { showHideButton: newValue },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

    } catch (error) {
      console.error("Error updating Booking now:", error);
      window.alert("Failed to update Booking now");
    } finally {
      setShowLoading(null)
    }
  };

  const handleBulkBookingNowToggle = async () => {
    try {
      setBulkLoading(true);
      const token = sessionStorage.getItem("admin_token");

      const newValue = !allBookingOn;

      await axiosInstance.patch(
        "/auth/users/bulk-show-booking-now",
        { showHideButton: newValue },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setUsers(prev =>
        prev.map(u =>
          u.role === "Agency"
            ? { ...u, showHideButton: newValue }
            : u
        )
      );

      toast.success(
        `Booking Now turned ${newValue ? "ON" : "OFF"} for all agencies`
      );

    } catch (error) {
      console.error("Bulk Booking update failed:", error);
      toast.error("Failed to update Booking Now");
    } finally {
      setBulkLoading(false);
    }
  };


  const handleBulkPriceOnCallToggle = async () => {
    try {
      setBulkLoading(true);
      const token = sessionStorage.getItem("admin_token");

      const newValue = !allPriceOnCallOn;

      const response = await axiosInstance.patch(
        "/bookings/bulkTogglePriceOnCall",
        { value: newValue },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log(response)
      // Update UI instantly
      setUsers(prev =>
        prev.map(u =>
          u.role === "Agency"
            ? { ...u, priceOnCall: newValue }
            : u
        )
      );
      toast.success(
        `Price On Call turned ${newValue ? "ON" : "OFF"} for all agencies`
      );

    } catch (error) {
      console.error("Bulk Price on Call update failed:", error);
      toast.error("Failed to update Bulk Price On Call");

    } finally {
      setBulkLoading(false);
    }
  };

  // Check all agencies booking status
  const agencyUsers = users.filter(u => u.role === "Agency");

  const allBookingOn =
    agencyUsers.length > 0 &&
    agencyUsers.every(u => u.showHideButton === true);



  // Check if all agencies have Price on Call ON
  const allPriceOnCallOn =
    agencyUsers.length > 0 &&
    agencyUsers.every(u => u.priceOnCall === true);

  const activeCount = users.filter(u => u.role === "Agency" && u.status === "Active").length;
  const pendingCount = users.filter(u => u.role === "Agency" && u.status === "Pending").length;
  const inactiveCount = users.filter(u => u.role === "Agency" && u.status === "Inactive").length;
  const totalAgents = 1000; // This can be dynamic based on your requirements

  const uniqueCities = Array.from(new Set(users.filter(u => u.city).map(u => u.city)));

  return (
    <>
      <PageMeta title="All Agents" description="Manage all registered agents" />
      <PageBreadCrumb pageTitle="All Agents" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
        {/* Active Agents Card */}
        <div className="flex items-center gap-4 p-6 bg-linear-to-br from-emerald-400 to-teal-500 rounded-xl shadow-lg">
          <div className="flex items-center justify-center w-14 h-14 bg-white/90 rounded-full shadow-md">
            <svg className="w-7 h-7 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
          </div>
          <div className="text-white">
            <div className="text-sm font-semibold tracking-wide">Active Agents</div>
            <div className="text-3xl font-bold">{activeCount}/{totalAgents}</div>
          </div>
        </div>

        {/* Pending Agents Card */}
        <div className="flex items-center gap-4 p-6 bg-linear-to-br from-sky-400 to-blue-500 rounded-xl shadow-lg">
          <div className="flex items-center justify-center w-14 h-14 bg-white/90 rounded-full shadow-md">
            <svg className="w-7 h-7 text-sky-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
          </div>
          <div className="text-white">
            <div className="text-sm font-semibold tracking-wide">Pending Agents</div>
            <div className="text-3xl font-bold">{pendingCount}</div>
          </div>
        </div>

        {/* De-Active Agents Card */}
        <div className="flex items-center gap-4 p-6 bg-linear-to-br from-rose-400 to-pink-500 rounded-xl shadow-lg">
          <div className="flex items-center justify-center w-14 h-14 bg-white/90 rounded-full shadow-md">
            <svg className="w-7 h-7 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
          </div>
          <div className="text-white">
            <div className="text-sm font-semibold tracking-wide">De-Active Agents</div>
            <div className="text-3xl font-bold">{inactiveCount}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
        <div className="px-4 py-6 md:px-6 xl:px-7.5">
          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by City
              </label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full h-11 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="All">All Cities</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-11 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Entries and Search */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Show</span>
              <select
                value={entriesPerPage}
                onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                className="h-9 rounded border border-gray-300 bg-white px-3 text-sm outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-600 dark:text-gray-400">entries</span>
            </div>


            <div className="flex gap-2 items-center">
              {/* <span>Book Now </span> */}
              {/* Price On Call Toggle */}
              <button
                onClick={handleBulkPriceOnCallToggle}
                disabled={bulkLoading || agencyUsers.length === 0}
                className={`rounded px-4 py-2 text-sm text-white transition-all
      ${allPriceOnCallOn
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-purple-600 hover:bg-purple-700"} 
      disabled:opacity-50`}
              >
                {bulkLoading
                  ? "Updating..."
                  : `Price On Call: ${allPriceOnCallOn ? "ALL OFF" : "ALL ON"}`}
              </button>

              {/* Booking Now Toggle (Single Button) */}
              <button
                onClick={handleBulkBookingNowToggle}
                disabled={bulkLoading || agencyUsers.length === 0}
                className={`rounded px-4 py-2 text-sm text-white transition-all
      ${allBookingOn
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-600 hover:bg-gray-700"} 
      disabled:opacity-50`}
              >
                {bulkLoading
                  ? "Updating..."
                  : `Booking Now: ${allBookingOn ? "ALL OFF" : "ALL ON"}`}
              </button>


              <button
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
                className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                {downloadingPDF ? "Downloading..." : "PDF"}
              </button>
              <button
                onClick={handleDownloadExcel}
                disabled={downloadingExcel}
                className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                {downloadingExcel ? "Downloading..." : "Excel"}
              </button>
              <input
                type="text"
                placeholder="Filter Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded border border-gray-300 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 sm:w-64"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="text-gray-500 dark:text-gray-400">Loading agents...</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex justify-center py-10">
              <div className="text-gray-500 dark:text-gray-400">No agents found</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-800 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-4 text-left text-sm font-medium text-white">#</th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-white">User</th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-white">Agency</th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-white">City</th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-white">Margin</th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-white">Status</th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-white">Register Date</th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-white">Price on Call</th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-white">Booking Now</th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-white">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-50 dark:bg-gray-800/50">
                  {paginatedUsers.map((user, index) => (
                    <tr
                      key={user._id}
                      className="border-b border-gray-200 dark:border-gray-700"
                    >
                      <td className="px-4 py-4 text-sm text-gray-800 dark:text-white/90">
                        {(currentPage - 1) * entriesPerPage + index + 1}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Agent Code: {user.agencyCode || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-800 dark:text-white/90">{user.name}</div>
                        <div className="text-sm text-gray-800 dark:text-white/90">{user.phone}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 dark:text-white/90">
                        {user.companyName || "N/A"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 dark:text-white/90">
                        {user.city || "N/A"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 dark:text-white/90">
                        <span className="font-semibold">Margin:</span> {formatMargin(user)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold">
                          <div className={getStatusColor(user.status)}>{user.status}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Activated by: {user.activatedBy || "N/A"}
                          </div>
                          {user.status === "Inactive" && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Deactivated by: {user.deactivatedBy || "N/A"}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 dark:text-white/90">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 dark:text-white/90">
                        <button
                          onClick={() => togglePriceOnCall(user._id, user.priceOnCall)}
                          disabled={priceLoading === user._id}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition ${user.priceOnCall
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                            } disabled:opacity-50`}
                        >
                          {priceLoading === user._id
                            ? "Updating..."
                            : user.priceOnCall
                              ? "ON"
                              : "OFF"}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 dark:text-white/90">
                        <button
                          onClick={() => toggleShowButton(user._id, user.showHideButton)}
                          disabled={showLoading === user._id}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition ${user.showHideButton
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                            } disabled:opacity-50`}
                        >
                          {showLoading === user._id
                            ? "Updating..."
                            : user.showHideButton
                              ? "ON"
                              : "OFF"}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          {user.status === "Active" ? (
                            <button
                              onClick={() => updateUserStatus(user._id, "Inactive")}
                              disabled={approvalLoading === user._id}
                              className="rounded bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                            >
                              De-active this Agent
                            </button>
                          ) : (
                            <button
                              onClick={() => updateUserStatus(user._id, "Active")}
                              disabled={approvalLoading === user._id}
                              className="rounded bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                            >
                              Active this Agent
                            </button>
                          )}
                          <button
                            onClick={() => handleSendCredentials(user._id)}
                            disabled={sendingCredentials === user._id}
                            className="rounded bg-yellow-500 px-3 py-1 text-xs font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
                          >
                            {sendingCredentials === user._id ? "Sending..." : "Send Credential"}
                          </button>
                          {user.status === "Active" && (
                            <button
                              onClick={() => handleAgentLogin(user)}
                              className="rounded bg-yellow-400 px-3 py-1 text-xs font-medium text-gray-800 hover:bg-yellow-500"
                            >
                              Agent Login
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/registered-agencies/${user._id}`)}
                            className="rounded bg-green-500 px-3 py-1 text-xs font-medium text-white hover:bg-green-600"
                          >
                            Detail
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-end items-end gap-2 mt-6">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-white/80 disabled:opacity-50"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded ${currentPage === page
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-white/80"
                    }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-white/80 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default RegisteredAgencies;
