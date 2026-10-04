import { ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeftIcon, BuildingOffice2Icon, ComputerDesktopIcon, EnvelopeIcon,
  GlobeAltIcon, HashtagIcon, IdentificationIcon, MapPinIcon, PencilSquareIcon,
  PhoneIcon, ShieldCheckIcon, TagIcon, UserIcon,
} from "@heroicons/react/24/outline";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import banner from "../assets/images/agent-detail-sky.png";
import AgentEditForm from "./AgentEditForm";
import "./agent-detail.css";

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

  discountType?: "Percentage" | "Amount";
  discountPercent?: number;
  discountAmount?: number;

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

  discountType: "Percentage" | "Amount";
  discountPercent: number;
  discountAmount: number;

  status: "Active" | "Inactive" | "Pending" | "Suspended";
  password: string;
}

const toFormState = (data: Agent): FormState => ({
  name: data.name || "", email: data.email || "", phone: data.phone || "",
  companyName: data.companyName || "", address: data.address || "",
  city: data.city || "", country: data.country || "",
  marginType: data.marginType || "Percentage",
  flightMarginPercent: data.flightMarginPercent ?? 0,
  flightMarginAmount: data.flightMarginAmount ?? 0,
  discountType: data.discountType || "Percentage",
  discountPercent: data.discountPercent ?? 0,
  discountAmount: data.discountAmount ?? 0,
  status: data.status || "Inactive", password: "",
});

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

  const token = useMemo(() => sessionStorage.getItem("admin_token"), []);

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
          setFormState(toFormState(data));
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

    // MARGIN TYPE
    if (field === "marginType") {
      setFormState({
        ...formState,
        marginType: value as FormState["marginType"],
        flightMarginPercent:
          value === "Percentage" ? formState.flightMarginPercent : 0,
        flightMarginAmount:
          value === "Amount" ? formState.flightMarginAmount : 0,
      });

      return;
    }

    // DISCOUNT TYPE
    if (field === "discountType") {
      setFormState({
        ...formState,
        discountType: value as FormState["discountType"],
        discountPercent:
          value === "Percentage" ? formState.discountPercent : 0,
        discountAmount:
          value === "Amount" ? formState.discountAmount : 0,
      });

      return;
    }

    setFormState({
      ...formState,
      [field]: value,
    });
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

        discountPercent: Number(formState.discountPercent) || 0,
        discountAmount: Number(formState.discountAmount) || 0,
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
        setFormState(toFormState(response.data.data));
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

  const discountDisplay = useMemo(() => {
    if (!agent) return "0";

    if (agent.discountType === "Amount") {
      return `${agent.discountAmount ?? 0} PKR`;
    }

    return `${agent.discountPercent ?? 0}%`;
  }, [agent]);

  const statusLabel = agent?.status === "Inactive" ? "De-Active" : agent?.status || "Unknown";
  const registeredFrom = agent?.registeredFrom?.userAgent ? "Browser" : agent?.registeredFrom?.ipAddress ? "IP Address" : "Browser";
  const agentInitials = agent?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "A";
  const cancelEdit = () => {
    if (agent) setFormState(toFormState(agent));
    setError(null);
    setEditMode(false);
  };

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
    <div className={`agent-detail-page ${editMode ? "is-editing" : ""}`}>
      <PageMeta title={editMode ? "Edit Agent" : "Agent Detail"} description="View and edit agent" />
      {editMode && <><div className="agent-edit-heading"><button type="button" className="agent-edit-back-icon" onClick={cancelEdit} aria-label="Back to agent detail"><ArrowLeftIcon /></button><div><h1>Edit Agent</h1><p>Update agent information and settings</p></div><div className="agent-detail-breadcrumb">Home <span>›</span> Agents <span>›</span> <b>Edit Agent</b></div></div>
      <section className="agent-edit-summary"><div className="agent-edit-summary-person"><span className="agent-edit-avatar">{agentInitials}</span><div><div className="agent-edit-summary-name"><h2>{agent.name}</h2><span className={`agent-detail-badge ${agent.status.toLowerCase()}`}>{statusLabel}</span></div><p>Agency: {agent.companyName || "N/A"}</p><small>Code: {agent.agencyCode || "N/A"} <span>|</span> Registered from: {registeredFrom}</small></div></div><div className="agent-edit-summary-facts"><SummaryFact icon={<EnvelopeIcon />} value={agent.email || "N/A"} label="Email" /><SummaryFact icon={<PhoneIcon />} value={agent.phone || "N/A"} label="Phone" /><SummaryFact icon={<BuildingOffice2Icon />} value={agent.companyName || "N/A"} label="Agency" /><SummaryFact icon={<MapPinIcon />} value={agent.city || "N/A"} label="City" /></div></section></>}
      <div className="agent-detail-heading">
        <div><h1>Agent Detail</h1><p>View complete information about the travel agent and account details.</p></div>
        <div className="agent-detail-breadcrumb">Home <span>â€º</span> Agent Detail</div>
      </div>
      <div className="agent-detail-actions">
        <button className="agent-detail-back" onClick={() => navigate("/registered-agencies")}><ArrowLeftIcon />Back</button>
        <button className="agent-detail-edit-button" onClick={() => setEditMode(!editMode)}><PencilSquareIcon />{editMode ? "Cancel Edit" : "Edit Agent"}</button>
      </div>

      {(error || success) && (
        <div role="status" className={`agent-detail-notice ${error ? "error" : "success"}`}>{error || success}</div>
      )}

      <section className="agent-detail-hero" style={{ backgroundImage: `linear-gradient(90deg, #fff 0%, #fffffffa 42%, #f2f9ffb8 73%, #eaf7ff7a 100%), url(${banner})` }}>
        <div className="agent-detail-identity">
          <div className="agent-detail-avatar">{agent.name?.charAt(0).toUpperCase() || "A"}<span className={agent.status === "Active" ? "online" : ""} /></div>
          <div>
            <div className="agent-detail-name"><h2>{agent.name}</h2><span className={`agent-detail-badge ${agent.status.toLowerCase()}`}>{statusLabel}</span></div>
            <div className="agent-detail-meta">Agent Code: <b>{agent.agencyCode || "N/A"}</b><i />Agency: <b>{agent.companyName || "N/A"}</b></div>
          </div>
        </div>
        <div className="agent-detail-contact">
          <div><span><EnvelopeIcon /></span><div><small>Email</small><strong>{agent.email || "N/A"}</strong></div></div>
          <div><span><PhoneIcon /></span><div><small>Phone No</small><strong>{agent.phone || "N/A"}</strong></div></div>
          <div><span><BuildingOffice2Icon /></span><div><small>Agency Name</small><strong>{agent.companyName || "N/A"}</strong></div></div>
        </div>
      </section>

      <section className="agent-detail-metrics" aria-label="Agent summary">
        <Metric tone="blue" icon={<TagIcon />} label="Flight Ticket Margin" value={marginDisplay} detail={`${agent.marginType || "Percentage"} based`} />
        <Metric tone="mint" icon={<TagIcon />} label="Discount" value={discountDisplay} detail={`${agent.discountType || "Percentage"} based`} />
        <Metric tone="green" icon={<ShieldCheckIcon />} label="Account Status" value={statusLabel} detail="Agent account status" />
        <Metric tone="blue" icon={<BuildingOffice2Icon />} label="City" value={agent.city || "N/A"} detail="Location" />
        <Metric tone="violet" icon={<ComputerDesktopIcon />} label="Registered From" value={registeredFrom} detail="Account source" />
      </section>

        {!editMode ? (
          <section className="agent-detail-panel">
            <div className="agent-detail-panel-heading"><span><IdentificationIcon /></span><div><h3>Agent Information</h3><p>Complete details and configuration for this agent.</p></div></div>
            <div className="agent-detail-info-grid">
              <div>
                <InfoRow icon={<UserIcon />} label="Contact Person Name" value={agent.name} />
                <InfoRow icon={<EnvelopeIcon />} label="Email" value={agent.email} />
                <InfoRow icon={<BuildingOffice2Icon />} label="Agency Name" value={agent.companyName || "N/A"} />
                <InfoRow icon={<TagIcon />} label="Flight Ticket Margin" value={`${agent.marginType || "Percentage"} (${marginDisplay})`} />
                <InfoRow icon={<MapPinIcon />} label="Address" value={agent.address || "N/A"} />
                <InfoRow icon={<GlobeAltIcon />} label="Country" value={agent.country || "N/A"} />
              </div>
              <div>
                <InfoRow icon={<HashtagIcon />} label="Agent Code" value={agent.agencyCode || "N/A"} />
                <InfoRow icon={<PhoneIcon />} label="Phone No" value={agent.phone} />
                <InfoRow icon={<ShieldCheckIcon />} label="Status" value={<span className={`agent-detail-badge ${agent.status.toLowerCase()}`}>{statusLabel}</span>} />
                <InfoRow icon={<TagIcon />} label="Discount" value={`${agent.discountType || "Percentage"} (${discountDisplay})`} />
                <InfoRow icon={<BuildingOffice2Icon />} label="City" value={agent.city || "N/A"} />
                <InfoRow icon={<ComputerDesktopIcon />} label="Registered From" value={<span title={`${agent.registeredFrom?.ipAddress || ""} ${agent.registeredFrom?.userAgent || ""}`.trim()}>{registeredFrom}</span>} />
              </div>
            </div>
          </section>
        ) : (
          <AgentEditForm values={formState} agencyCode={agent.agencyCode} saving={saving} onChange={handleChange} onSubmit={handleUpdate} onCancel={cancelEdit} onBackToAgents={() => navigate("/registered-agencies")} />
        )}
    </div>
  );
};

const Metric = ({ tone, icon, label, value, detail }: { tone: string; icon: ReactNode; label: string; value: string; detail: string }) => (
  <div className={`agent-detail-metric ${tone}`}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{detail}</em></div></div>
);

const InfoRow = ({ icon, label, value }: { icon: ReactNode; label: string; value?: ReactNode }) => (
  <div className="agent-detail-info-row"><span>{icon}</span><small>{label}</small><strong>{value || "N/A"}</strong></div>
);

const SummaryFact = ({ icon, value, label }: { icon: ReactNode; value: string; label: string }) => (
  <div className="agent-edit-summary-fact"><span>{icon}</span><div><strong title={value}>{value}</strong><small>{label}</small></div></div>
);

export default AgentDetail;
