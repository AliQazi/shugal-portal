import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import PageBreadCrumb from "../components/common/PageBreadCrumb";

const GROUP_TYPE_OPTIONS = [
  "UAE Groups",
  "KSA Groups",
  "Bahrain Groups",
  "Mascat Groups",
  "Qatar Groups",
  "UK Groups",
  "Umrah Groups",
];

interface Flight {
  airline: string;
  flightNo: string;
  depDate: string;
  depTime: string;
  arrDate: string;
  arrTime: string;
  sectorFrom: string;
  sectorTo: string;
  fromTerminal?: string;
  toTerminal?: string;
  flightClass?: string;
  baggage?: string;
  meal?: string;
}

interface Passenger {
  adults: number;
  children: number;
  infants: number;
}

interface Price {
  buyingCurrency: string;
  buyingAdultPrice: number;
  buyingChildPrice: number;
  buyingInfantPrice: number;
  sellingCurrencyB2B: string;
  sellingAdultPriceB2B: number;
  sellingChildPriceB2B: number;
  sellingInfantPriceB2B: number;
  total: number;
}

interface Payment {
  amount: number;
  method: "Cash" | "Bank" | "Online";
  status: "Pending" | "Paid" | "Refunded";
  paymentDate?: string;
}

interface GroupTicketing {
  _id: string;
  voucher_id: string;
  groupBookingId: string;
  user: string;
  evoucherAccount?: string;
  sector?: string;
  type?: string;
  airline?: string;
  groupCategory?: string;
  groupName?: string;
  showSeat?: boolean;
  groupType: string;
  flights: Flight[];
  passengers: Passenger;
  price: Price;
  payments: Payment[];
  totalSeats: number;
  pnr?: string;
  contactPersonPhone?: string;
  contactPersonEmail?: string;
  internalStatus?: string;
  createdAt: string;
  updatedAt: string;
}

const GroupTicketing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState<GroupTicketing[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [groupTypeFilter, setGroupTypeFilter] = useState<string>("All");
  const [entriesPerPage, setEntriesPerPage] = useState(50);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    const queryGroupType = new URLSearchParams(location.search).get("groupType");
    setGroupTypeFilter(queryGroupType || "All");
  }, [location.search]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");
      const response = await axiosInstance.get("/group-ticketing", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.data.success) {
        setBookings(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  console.log(bookings)

  const handleEdit = (bookingId: string) => {
    navigate(`/group-ticketing/edit/${bookingId}`);
  };

  const handleDelete = async (bookingId: string) => {
    if (!window.confirm("Are you sure you want to delete this group?")) {
      return;
    }

    try {
      const token = localStorage.getItem("admin_token");
      const response = await axiosInstance.delete(`/group-ticketing/${bookingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        window.alert("✅ Group deleted successfully!");
        fetchBookings();
      }
    } catch (error: any) {
      console.error("Error deleting group:", error);
      window.alert("❌ " + (error.response?.data?.message || "Failed to delete group"));
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch =
      booking.voucher_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.groupBookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.user && booking.user.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (booking.groupName && booking.groupName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (booking.airline && booking.airline.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesGroupType = groupTypeFilter === "All" || booking.groupType === groupTypeFilter;

    return matchesSearch && matchesGroupType;
  });


  return (
    <>
      <PageMeta title="Group Ticketing" description="Manage group ticketing groups" />
      <PageBreadCrumb pageTitle="Group Ticketing" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3" style={{ zIndex: 999999999999999999999999999999999999999999999999999 }}>
        <div className="px-4 py-6 md:px-6 xl:px-7.5">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Group Groups</h2>
            <button
              onClick={() => navigate("/group-ticketing/create")}
              className="rounded-lg bg-blue-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-600 transition"
            >
              + Create New Group
            </button>
          </div>

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by Group Type
              </label>
              <select
                value={groupTypeFilter}
                onChange={(e) => setGroupTypeFilter(e.target.value)}
                className="w-full h-11 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="All">All Types</option>
                {GROUP_TYPE_OPTIONS.map((groupType) => (
                  <option key={groupType} value={groupType}>
                    {groupType}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Search
              </label>
              <input
                type="text"
                placeholder="Search by voucher ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
          </div>

          {/* Entries */}
          <div className="mb-4 flex items-center gap-2">
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

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="text-gray-500 dark:text-gray-400">Loading groups...</div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex justify-center py-10">
              <div className="text-gray-500 dark:text-gray-400">No groups found</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-800 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">#</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Group & Voucher</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Sector (Route)</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Airline & PNR</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Available Seats</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">B2B Price (Adult)</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800/50 dark:divide-gray-700">
                  {filteredBookings.slice(0, entriesPerPage).map((booking, index) => (
                    <tr key={booking._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      {/* Index */}
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 font-medium">
                        {index + 1}
                      </td>

                      {/* Group & Voucher Info */}
                      <td className="px-4 py-4">
                        <div className="text-sm font-bold text-gray-800 dark:text-white">
                          {booking.groupName || "Unnamed Group"}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono">{booking.voucher_id}</div>
                        <div className="mt-1">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            {booking.groupType}
                          </span>
                        </div>
                      </td>

                      {/* Sector / Route */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white">
                          <span>{booking.flights[0]?.sectorFrom || "N/A"}</span>
                          <span className="text-blue-500">➔</span>
                          <span>{booking.flights[booking.flights.length - 1]?.sectorTo || "N/A"}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {booking.flights[0]?.depTime} | {new Date(booking.flights[0]?.depDate).toLocaleDateString('en-GB')}
                        </div>
                      </td>

                      {/* Airline & PNR */}
                      <td className="px-4 py-4 text-sm">
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                          {booking.airline || "Multiple"}
                        </div>
                        {booking.pnr ? (
                          <div className="mt-1 inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800 rounded text-[11px] font-mono font-bold">
                            {booking.pnr}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No PNR</span>
                        )}
                      </td>

                      {/* Seats */}
                      <td className="px-4 py-4 text-sm text-center md:text-left">
                        <div className="text-gray-800 dark:text-white font-bold text-base">
                          {booking.totalSeats}
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-tighter">Total Capacity</div>
                      </td>

                      {/* Pricing */}
                      <td className="px-4 py-4 text-sm">
                        <div className="text-green-600 dark:text-green-400 font-bold">
                          PKR {booking.price.sellingAdultPriceB2B?.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-tighter">Per Adult</div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(booking._id)}
                            className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 transition-colors shadow-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(booking._id)}
                            className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-colors shadow-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GroupTicketing;
