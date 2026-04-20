import { ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import PageBreadCrumb from "../components/common/PageBreadCrumb";

interface Agent {
  _id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  agencyCode?: string;
  role: string;
  status: "Active" | "Inactive" | "Pending" | "Suspended";
  city?: string;
  address?: string;
  country?: string;
  marginType?: "Percentage" | "Amount";
  flightMarginPercent?: number;
  flightMarginAmount?: number;
  registeredFrom?: {
    ipAddress?: string;
    userAgent?: string;
  };
  createdAt?: string;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  address: string;
  city: string;
  country: string;
  marginType: "Percentage" | "Amount";
  flightMarginPercent: number;
  flightMarginAmount: number;
  status: "Active" | "Inactive" | "Pending" | "Suspended";
  password: string;
}

const AgentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const token = useMemo(() => localStorage.getItem("admin_token"), []);

  useEffect(() => {
    const fetchAgent = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await axiosInstance.get(`/auth/users/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.data?.success) {
          const data: Agent = response.data.data;
          setAgent(data);
          setFormState({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            companyName: data.companyName || "",
            address: data.address || "",
            city: data.city || "",
            country: data.country || "",
            marginType: data.marginType || "Percentage",
            flightMarginPercent: data.flightMarginPercent ?? 0,
            flightMarginAmount: data.flightMarginAmount ?? 0,
            status: (data.status as FormState["status"]) || "Inactive",
            password: "",
          });
        }
      } catch (err: unknown) {
        setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to load agent details");
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [id, token]);

  const handleChange = (field: keyof FormState, value: string | number) => {
    if (!formState) return;

    if (field === "marginType") {
      setFormState({
        ...formState,
        marginType: value as FormState["marginType"],
        flightMarginPercent: value === "Percentage" ? formState.flightMarginPercent : 0,
        flightMarginAmount: value === "Amount" ? formState.flightMarginAmount : 0,
      });
      return;
    }

    setFormState({ ...formState, [field]: value });
  };

  const handleUpdate = async () => {
    if (!id || !formState) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        ...formState,
        flightMarginPercent: Number(formState.flightMarginPercent) || 0,
        flightMarginAmount: Number(formState.flightMarginAmount) || 0,
      };

      // Remove empty password so we do not overwrite unintentionally
      if (!payload.password) {
        delete (payload as Partial<FormState>).password;
      }

      const response = await axiosInstance.put(`/auth/users/${id}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data?.success) {
        setAgent(response.data.data);
        setEditMode(false);
        setSuccess("Agent updated successfully");
        // Reset password field to blank after save
        setFormState({ ...formState, password: "" });
      }
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to update agent");
    } finally {
      setSaving(false);
    }
  };

  const marginDisplay = useMemo(() => {
    if (!agent) return "0";
    if (agent.marginType === "Amount") {
      return `${agent.flightMarginAmount ?? 0} PKR`;
    }
    return `${agent.flightMarginPercent ?? 0}%`;
  }, [agent]);

  if (loading) {
    return (
      <div className="p-6">
        <PageMeta title="Agent Detail" description="View and edit agent" />
        <div className="text-gray-600">Loading agent details...</div>
      </div>
    );
  }

  if (!agent || !formState) {
    return (
      <div className="p-6">
        <PageMeta title="Agent Detail" description="View and edit agent" />
        <div className="text-gray-600">Agent not found.</div>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Agent Detail" description="View and edit agent" />
      <PageBreadCrumb pageTitle="Agent Detail" />

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditMode(!editMode)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {editMode ? "Cancel Edit" : "Edit Agent"}
          </button>
        </div>
      </div>

      {(error || success) && (
        <div
          className={`mb-4 rounded px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
            }`}
        >
          {error || success}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/2">
        <div className="bg-blue-600 px-6 py-4 text-white">
          <div className="text-lg font-semibold">Agent Details</div>
          <div className="text-sm text-blue-100">Code: {agent.agencyCode || "N/A"}</div>
        </div>

        {!editMode ? (
          <div className="divide-y divide-gray-200 text-sm text-gray-800 dark:text-white/90">
            <DetailRow label="Contact Person Name" value={agent.name} />
            <DetailRow label="Agent Code" value={agent.agencyCode || "N/A"} />
            <DetailRow label="Email" value={agent.email} />
            <DetailRow label="Phone No" value={agent.phone} />
            <DetailRow label="Agency Name" value={agent.companyName || "N/A"} />
            <DetailRow label="Status" value={agent.status} />
            <DetailRow label="Flight Ticket Margin" value={`${agent.marginType || "Percentage"} (${marginDisplay})`} />
            <DetailRow label="Address" value={agent.address || "N/A"} />
            <DetailRow label="City" value={agent.city || "N/A"} />
            <DetailRow label="Country" value={agent.country || "N/A"} />
            <DetailRow
              label="Registered From"
              value={`${agent.registeredFrom?.ipAddress || "-"} | ${agent.registeredFrom?.userAgent || "Browser"}`}
            />
          </div>
        ) : (
          <div className="grid gap-4 p-6 text-sm text-gray-800 dark:text-white/90">
            <FormRow label="Contact Person Name">
              <input
                value={formState.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </FormRow>
            <FormRow label="Email">
              <input
                type="email"
                value={formState.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </FormRow>
            <FormRow label="Phone No">
              <input
                value={formState.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </FormRow>
            <FormRow label="Agency Name">
              <input
                value={formState.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </FormRow>
            <FormRow label="Status">
              <select
                value={formState.status}
                onChange={(e) => handleChange("status", e.target.value as FormState["status"])}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Pending">Pending</option>
                <option value="Suspended">Suspended</option>
              </select>
            </FormRow>

            <div className="grid gap-3 md:grid-cols-3">
              <FormRow label="Margin Type">
                <select
                  value={formState.marginType}
                  onChange={(e) => handleChange("marginType", e.target.value as FormState["marginType"])}
                  className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Percentage">Percentage</option>
                  <option value="Amount">Amount</option>
                </select>
              </FormRow>
              <FormRow label="Flight Margin%">
                <input
                  type="number"
                  value={formState.flightMarginPercent > 0 ? formState.flightMarginPercent : ""}
                  placeholder="0"
                  onChange={(e) => handleChange("flightMarginPercent", Number(e.target.value))}
                  disabled={formState.marginType !== "Percentage"}
                  className={`w-full rounded border px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${formState.marginType !== "Percentage"
                    ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "border-gray-300"
                    }`}
                />
              </FormRow>
              <FormRow label="Flight Margin Amount PKR">
                <input
                  type="number"
                  value={formState.flightMarginAmount > 0 ? formState.flightMarginAmount : ""}
                  placeholder="0"
                  onChange={(e) => handleChange("flightMarginAmount", Number(e.target.value))}
                  disabled={formState.marginType !== "Amount"}
                  className={`w-full rounded border px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${formState.marginType !== "Amount"
                    ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "border-gray-300"
                    }`}
                />
              </FormRow>
            </div>

            <FormRow label="Address">
              <input
                value={formState.address}
                onChange={(e) => handleChange("address", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </FormRow>
            <FormRow label="City">
              <input
                value={formState.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </FormRow>
            <FormRow label="Country">
              <input
                value={formState.country}
                onChange={(e) => handleChange("country", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </FormRow>
            <FormRow label="New Password">
              <input
                type="password"
                value={formState.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="Leave blank to keep current password"
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </FormRow>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditMode(false)}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const DetailRow = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex flex-col border-b border-gray-200 px-6 py-4 last:border-b-0 md:flex-row md:items-center">
    <div className="w-full md:w-1/3 text-xs font-semibold uppercase tracking-wide text-gray-500">
      {label}
    </div>
    <div className="w-full md:w-2/3 text-sm text-gray-900 dark:text-white/90">{value || "-"}</div>
  </div>
);

const FormRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
    {children}
  </div>
);

export default AgentDetail;