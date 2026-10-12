import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import AsyncSelect from "react-select/async";
import type { StylesConfig } from "react-select";
import type { IconType } from "react-icons";
import { FiArrowLeft, FiChevronDown, FiChevronRight, FiCalendar, FiLayers, FiLock, FiMail, FiMapPin, FiPhone, FiShield, FiShoppingCart, FiTag, FiTrash2, FiUser, FiUsers, FiX } from "react-icons/fi";
import { PiAirplaneTilt, PiBaby, PiCoins, PiTicket } from "react-icons/pi";
import axios from "axios";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import "./group-ticketing-form.css";

interface Flight {
  airline: string; flightNo: string; depDate: string; depTime: string; arrDate: string; arrTime: string;
  sectorFrom: string; sectorTo: string; fromTerminal: string; toTerminal: string; flightClass: string; baggage: string; meal: string;
}
interface Payment { amount: number; method: "Cash" | "Bank" | "Online"; status: "Pending" | "Paid" | "Refunded"; paymentDate?: string }
interface Sector { _id: string; groupType: string; sectorTitle: string; fullSector: string }
interface Airline { _id: string; airlineName: string }
interface City { airportCode: string; cityEn: string }
interface CityOption { value: string; label: string }
const emptyFlight = (airline = ""): Flight => ({ airline, flightNo: "", depDate: "", depTime: "", arrDate: "", arrTime: "", sectorFrom: "", sectorTo: "", fromTerminal: "", toTerminal: "", flightClass: "", baggage: "", meal: "" });
const initialForm = {
  user: "", evoucherAccount: "", sector: "", airline: "", groupCategory: "", groupName: "", totalSeats: 0, days: 0, showSeat: false, groupType: "", flights: [emptyFlight()],
  passengers: { adults: 0, children: 0, infants: 0 },
  price: { buyingCurrency: "PKR", buyingAdultPrice: 0, buyingChildPrice: 0, buyingInfantPrice: 0, sellingCurrencyB2B: "PKR", sellingAdultPriceB2B: 0, sellingChildPriceB2B: 0, sellingInfantPriceB2B: 0 },
  priceOnCall: { seats: false, adult: false, child: false, infant: false },
  pnr: "", contactPersonPhone: "", contactPersonEmail: "", internalStatus: "Public", payments: [] as Payment[],
};
const steps = [
  { id: "basic", title: "Basic Details", description: "Supplier, sector and group info" },
  { id: "flights", title: "Flight Details", description: "Add flight sectors and schedule" },
  { id: "pricing", title: "Pricing", description: "Set buying and selling prices" },
  { id: "additional", title: "Additional Info", description: "Contact details and settings" },
];
function Field({ id, label, icon: Icon, required, children, extra }: { id: string; label: string; icon?: IconType; required?: boolean; children: ReactNode; extra?: ReactNode }) {
  return <div className="cg-field"><div className="cg-label-row"><label htmlFor={id}>{label}{required && <span className="cg-required"> *</span>}</label>{extra}</div><div className={`cg-control${Icon ? " cg-control-icon" : ""}`}>{Icon && <span className="cg-input-icon"><Icon aria-hidden="true" /></span>}{children}</div></div>;
}
function Toggle({ label, checked, onChange, small = false, disabled = false }: { label: string; checked: boolean; onChange: (checked: boolean) => void; small?: boolean; disabled?: boolean }) {
  return <label className={`cg-toggle${small ? " cg-toggle-small" : ""}`}><input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} /><span>{label}</span></label>;
}
function SectionHeading({ number, title, description, children }: { number: number; title: string; description: string; children?: ReactNode }) {
  return <div className="cg-section-heading"><span className="cg-number">{number}</span><div><h2 id={`cg-heading-${number}`}>{title}</h2><p>{description}</p></div>{children && <div className="cg-heading-action">{children}</div>}</div>;
}
const priceFields = [
  { label: "Adult", passenger: "adult", buying: "buyingAdultPrice", selling: "sellingAdultPriceB2B", icon: FiUser },
  { label: "Child", passenger: "child", buying: "buyingChildPrice", selling: "sellingChildPriceB2B", icon: PiBaby },
  { label: "Infant", passenger: "infant", buying: "buyingInfantPrice", selling: "sellingInfantPriceB2B", icon: PiBaby },
] as const;

const GroupTicketingForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const editMode = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [activeStep, setActiveStep] = useState("basic");
  const [sameAsBuying, setSameAsBuying] = useState(false);
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    let cancelled = false;
    const fetchOptions = async () => {
      const results = await Promise.allSettled([
        axiosInstance.get("/sector"), axiosInstance.get("/airline"),
        fetch(`${import.meta.env.BASE_URL}data/cities.json`).then((response) => {
          if (!response.ok) throw new Error("Could not load airport options");
          return response.json() as Promise<City[]>;
        }),
      ]);
      if (cancelled) return;
      const [sectorResult, airlineResult, cityResult] = results;
      if (sectorResult.status === "fulfilled" && sectorResult.value.data.success) setSectors(sectorResult.value.data.data);
      if (airlineResult.status === "fulfilled" && airlineResult.value.data.success) setAirlines(airlineResult.value.data.data);
      if (cityResult.status === "fulfilled") setCityOptions(cityResult.value.map((city) => ({ value: city.airportCode, label: `${city.cityEn} (${city.airportCode})` })));
      if (results.some((result) => result.status === "rejected")) setError("Some form options could not be loaded. Refresh the page to try again.");
    };
    void fetchOptions();
    if (id) {
      setLoading(true);
      axiosInstance.get(`/group-ticketing/${id}`, { headers: { Authorization: `Bearer ${sessionStorage.getItem("admin_token")}` } }).then((response) => {
        if (cancelled) return;
        if (!response.data.success) throw new Error("Failed to load group details");
        const booking = response.data.data;
        setFormData({
          user: booking.user || "", evoucherAccount: booking.evoucherAccount || "",
          sector: booking.sector || "", airline: booking.airline || "", groupCategory: booking.groupCategory || "",
          groupName: booking.groupName || "", totalSeats: booking.totalSeats || 0, days: booking.days || 0,
          showSeat: booking.showSeat || false, groupType: booking.groupType || "",
          pnr: booking.pnr || "", contactPersonPhone: booking.contactPersonPhone || "",
          contactPersonEmail: booking.contactPersonEmail || "", internalStatus: booking.internalStatus || "Public",
          flights: booking.flights?.length ? booking.flights.map((flight: Partial<Flight>) => ({ ...emptyFlight(booking.airline), ...flight, depDate: flight.depDate?.slice(0, 10) || "", arrDate: flight.arrDate?.slice(0, 10) || "" })) : [emptyFlight(booking.airline)],
          passengers: { ...initialForm.passengers, ...booking.passengers }, price: { ...initialForm.price, ...booking.price },
          priceOnCall: { ...initialForm.priceOnCall, ...booking.priceOnCall }, payments: booking.payments || [],
        });
      }).catch(() => { if (!cancelled) setError("Failed to load group details. Refresh the page to try again."); }).finally(() => { if (!cancelled) setLoading(false); });
    }
    return () => { cancelled = true; };
  }, [id]);

  const selectStyles: StylesConfig<CityOption, false> = {
    control: (base) => ({ ...base, minHeight: 36, height: 36, fontSize: 11, borderRadius: 7, borderColor: "var(--cg-border)", backgroundColor: "var(--cg-input)", boxShadow: "none" }),
    valueContainer: (base) => ({ ...base, padding: "0 6px" }),
    input: (base) => ({ ...base, margin: 0, padding: 0, color: "var(--cg-ink)" }),
    singleValue: (base) => ({ ...base, color: "var(--cg-ink)" }), placeholder: (base) => ({ ...base, color: "var(--cg-muted)" }),
    dropdownIndicator: (base) => ({ ...base, padding: 4 }), indicatorSeparator: () => ({ display: "none" }),
    menuPortal: (base) => ({ ...base, zIndex: 9999, fontSize: 12 }),
    menu: (base) => ({ ...base, backgroundColor: "var(--travel-surface)", color: "var(--travel-ink)" }),
    option: (base, state) => ({ ...base, backgroundColor: state.isSelected ? "#0756ff" : state.isFocused ? "var(--travel-canvas)" : "transparent", color: state.isSelected ? "white" : "var(--travel-ink)" }),
  };
  const loadCityOptions = (input: string) => Promise.resolve(cityOptions.filter((city) => city.label.toLowerCase().includes(input.toLowerCase())).slice(0, 50));
  const updateFlight = (index: number, fields: Partial<Flight>) => setFormData((previous) => ({ ...previous, flights: previous.flights.map((flight, flightIndex) => flightIndex === index ? { ...flight, ...fields } : flight) }));
  const updatePrice = (key: keyof typeof initialForm.price, value: string | number) => {
    setFormData((previous) => {
      const price = { ...previous.price, [key]: value };
      if (sameAsBuying) {
        price.sellingCurrencyB2B = price.buyingCurrency;
        price.sellingAdultPriceB2B = price.buyingAdultPrice;
        price.sellingChildPriceB2B = price.buyingChildPrice;
        price.sellingInfantPriceB2B = price.buyingInfantPrice;
      }
      return { ...previous, price };
    });
  };
  const toggleSameAsBuying = (checked: boolean) => {
    setSameAsBuying(checked);
    if (checked) setFormData((previous) => ({ ...previous,
      price: { ...previous.price, sellingCurrencyB2B: previous.price.buyingCurrency, sellingAdultPriceB2B: previous.price.buyingAdultPrice, sellingChildPriceB2B: previous.price.buyingChildPrice, sellingInfantPriceB2B: previous.price.buyingInfantPrice },
      priceOnCall: { ...previous.priceOnCall, adult: false, child: false, infant: false },
    }));
  };
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setSaving(true);
    try {
      const config = { headers: { Authorization: `Bearer ${sessionStorage.getItem("admin_token")}`, "Content-Type": "application/json" } };
      const response = editMode ? await axiosInstance.put(`/group-ticketing/${id}`, formData, config) : await axiosInstance.post("/group-ticketing", formData, config);
      if (!response.data.success) throw new Error(response.data.message || "Failed to save group");
      window.alert(editMode ? "Group updated successfully!" : "Group created successfully!"); navigate("/group-ticketing");
    } catch (caught) {
      setError(axios.isAxiosError<{ message: string }>(caught) ? caught.response?.data?.message || "Failed to save group. Please try again." : caught instanceof Error ? caught.message : "Failed to save group. Please try again.");
    } finally { setSaving(false); }
  };
  const currencyOptions = (current: string) => Array.from(new Set(["PKR", current].filter(Boolean))).map((currency) => <option key={currency} value={currency}>{currency}</option>);
  const goToStep = (step: string) => { setActiveStep(step); document.getElementById(`cg-${step}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  return <div className="create-group-page">
    <PageMeta title={editMode ? "Edit Group" : "Create Group"} description="Configure airline group flights, pricing and settings" />
    <aside className="cg-sidebar" aria-label="Group form sections">
      <div className="cg-sidebar-intro"><Link className="cg-back" to="/group-ticketing"><FiArrowLeft aria-hidden="true" />Back to Groups</Link><h1>{editMode ? "Edit Group" : "Create Group"}</h1><p>Configure airline group with flight<br className="cg-desktop-break" /> sectors, pricing and settings.</p></div>
      <nav className="cg-step-nav">{steps.map((step, index) => <button key={step.id} type="button" className={`cg-step${activeStep === step.id ? " is-active" : ""}`} aria-current={activeStep === step.id ? "step" : undefined} onClick={() => goToStep(step.id)}><span className="cg-step-number">{index + 1}</span><span><strong>{step.title}</strong><small>{step.description}</small></span></button>)}<p className="cg-sidebar-note">Organize group flights<br />effortlessly.</p></nav>
    </aside>
    <main className="cg-main">
      <nav className="cg-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><FiChevronRight aria-hidden="true" /><Link to="/group-ticketing">Airline Groups</Link><FiChevronRight aria-hidden="true" /><span aria-current="page">{editMode ? "Edit Group" : "Create Group"}</span></nav>
      {error && <div className="cg-error" role="alert">{error}<button type="button" aria-label="Dismiss message" onClick={() => setError("")}><FiX /></button></div>}
      {loading ? <div className="cg-loading" role="status">Loading group details...</div> : <form onSubmit={handleSubmit} onInvalidCapture={(event) => { const section = (event.target as HTMLElement).closest(".cg-section"); if (section) setActiveStep(section.id.replace("cg-", "")); }}>
        <fieldset className="cg-form-fields" disabled={saving}>
          <section id="cg-basic" className="cg-section cg-basic" aria-labelledby="cg-heading-1" onFocusCapture={() => setActiveStep("basic")}>
            <SectionHeading number={1} title="Basic Information" description="Enter supplier, sector and airline details"><span className="cg-required-note"><FiShield aria-hidden="true" />Fields marked with <span className="cg-required">*</span> are required</span></SectionHeading>
            <div className="cg-basic-fields">
              <div className="cg-grid cg-grid-two">
                <Field id="cg-supplier" label="Supplier Account" icon={FiUser} required><input id="cg-supplier" required value={formData.user} onChange={(event) => setFormData({ ...formData, user: event.target.value })} placeholder="Enter supplier account" /></Field>
                <Field id="cg-sector" label="Sector" icon={FiMapPin} required><select id="cg-sector" required value={formData.sector} onChange={(event) => { const selected = sectors.find((sector) => sector.sectorTitle === event.target.value); setFormData({ ...formData, sector: event.target.value, groupCategory: selected?.groupType || "", groupType: selected?.groupType || "" }); }}><option value="">Select sector</option>{sectors.map((sector) => <option key={sector._id} value={sector.sectorTitle}>{sector.sectorTitle} - {sector.fullSector}</option>)}</select><FiChevronDown className="cg-select-chevron" aria-hidden="true" /></Field>
              </div>
              <div className="cg-grid cg-grid-three">
                <Field id="cg-airline" label="Airline" icon={PiAirplaneTilt} required><select id="cg-airline" required value={formData.airline} onChange={(event) => { const selected = airlines.find((airline) => airline.airlineName === event.target.value); setFormData({ ...formData, airline: event.target.value, groupName: selected ? `${selected.airlineName}-${formData.sector || "NULL"}` : formData.groupName, flights: formData.flights.map((flight) => ({ ...flight, airline: event.target.value })) }); }}><option value="">Select airline</option>{airlines.map((airline) => <option key={airline._id} value={airline.airlineName}>{airline.airlineName}</option>)}</select><FiChevronDown className="cg-select-chevron" aria-hidden="true" /></Field>
                <Field id="cg-category" label="Group Category" icon={FiLayers}><select id="cg-category" value={formData.groupCategory} onChange={(event) => setFormData({ ...formData, groupCategory: event.target.value, groupType: event.target.value })}><option value="">Select category</option>{Array.from(new Set([formData.groupCategory, ...sectors.map((sector) => sector.groupType)].filter(Boolean))).map((category) => <option key={category} value={category}>{category}</option>)}</select><FiChevronDown className="cg-select-chevron" aria-hidden="true" /></Field>
                <Field id="cg-name" label="Group Name" icon={FiTag} required><input id="cg-name" required value={formData.groupName} onChange={(event) => setFormData({ ...formData, groupName: event.target.value })} placeholder="e.g. AIR SIAL-NULL" /></Field>
                <Field id="cg-seats" label="Total Seats" icon={FiUsers} extra={<Toggle small label="On Call" checked={formData.priceOnCall.seats} onChange={(checked) => setFormData({ ...formData, priceOnCall: { ...formData.priceOnCall, seats: checked } })} />}><input id="cg-seats" type="number" min="0" step="1" disabled={formData.priceOnCall.seats} value={formData.priceOnCall.seats ? "" : formData.totalSeats || ""} onChange={(event) => setFormData({ ...formData, totalSeats: Number(event.target.value) || 0 })} placeholder={formData.priceOnCall.seats ? "On Call" : "Enter total seats"} /></Field>
                <div className="cg-show-seat"><Toggle label="Show Seat" checked={formData.showSeat} onChange={(checked) => setFormData({ ...formData, showSeat: checked })} /><p>Enable to show seat selection for this group</p></div>
                <Field id="cg-days" label="Days" icon={FiCalendar}><input id="cg-days" type="number" min="0" step="1" value={formData.days || ""} onChange={(event) => setFormData({ ...formData, days: Number(event.target.value) || 0 })} placeholder="e.g. 7" /></Field>
              </div>
            </div>
          </section>
          <section id="cg-flights" className="cg-section cg-flights" aria-labelledby="cg-heading-2" onFocusCapture={() => setActiveStep("flights")}>
            <SectionHeading number={2} title="Flight Details" description="Add flight sectors for this group"><button className="cg-primary" type="button" onClick={() => setFormData((previous) => ({ ...previous, flights: [...previous.flights, emptyFlight(previous.airline)] }))}><PiAirplaneTilt aria-hidden="true" />Add Flight</button></SectionHeading>
            <div className="cg-flight-scroll" role="region" aria-label="Flight schedules" tabIndex={0}>
              <table className="cg-flight-table"><thead><tr>{["#", "Flight No.", "Dep Date", "Dep Time", "Sector From", "From Terminal", "Sector To", "To Terminal", "Class", "Arr Date", "Arr Time", "Baggage", "Meal", "Action"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
                <tbody>{formData.flights.map((flight, index) => <tr key={index}>
                  <td className="cg-row-number">{index + 1}</td>
                  <td><input aria-label={`Flight ${index + 1} number`} required value={flight.flightNo} onChange={(event) => updateFlight(index, { flightNo: event.target.value })} placeholder="e.g. PK 301" /></td>
                  <td><input type="date" aria-label={`Flight ${index + 1} departure date`} required value={flight.depDate} onChange={(event) => updateFlight(index, { depDate: event.target.value })} /></td>
                  <td><input type="time" aria-label={`Flight ${index + 1} departure time`} required value={flight.depTime} onChange={(event) => updateFlight(index, { depTime: event.target.value })} /></td>
                  <td><AsyncSelect<CityOption> inputId={`cg-from-${index}`} aria-label={`Flight ${index + 1} sector from`} required cacheOptions defaultOptions={cityOptions.slice(0, 50)} loadOptions={loadCityOptions} styles={selectStyles} value={cityOptions.find((city) => city.value === flight.sectorFrom) || (flight.sectorFrom ? { value: flight.sectorFrom, label: flight.sectorFrom } : null)} onChange={(option) => updateFlight(index, { sectorFrom: option?.value || "", fromTerminal: option?.label || "" })} placeholder="Select city" classNamePrefix="cg-city" menuPortalTarget={document.body} menuPosition="fixed" /></td>
                  <td><input aria-label={`Flight ${index + 1} from terminal`} value={flight.fromTerminal} onChange={(event) => updateFlight(index, { fromTerminal: event.target.value })} placeholder="Terminal" /></td>
                  <td><AsyncSelect<CityOption> inputId={`cg-to-${index}`} aria-label={`Flight ${index + 1} sector to`} required cacheOptions defaultOptions={cityOptions.slice(0, 50)} loadOptions={loadCityOptions} styles={selectStyles} value={cityOptions.find((city) => city.value === flight.sectorTo) || (flight.sectorTo ? { value: flight.sectorTo, label: flight.sectorTo } : null)} onChange={(option) => updateFlight(index, { sectorTo: option?.value || "", toTerminal: option?.label || "" })} placeholder="Select city" classNamePrefix="cg-city" menuPortalTarget={document.body} menuPosition="fixed" /></td>
                  <td><input aria-label={`Flight ${index + 1} to terminal`} value={flight.toTerminal} onChange={(event) => updateFlight(index, { toTerminal: event.target.value })} placeholder="Terminal" /></td>
                  <td><select aria-label={`Flight ${index + 1} class`} value={flight.flightClass} onChange={(event) => updateFlight(index, { flightClass: event.target.value })}><option value="">Select</option>{["Economy", "Business", "First"].map((value) => <option key={value}>{value}</option>)}</select></td>
                  <td><input type="date" aria-label={`Flight ${index + 1} arrival date`} required value={flight.arrDate} onChange={(event) => updateFlight(index, { arrDate: event.target.value })} /></td>
                  <td><input type="time" aria-label={`Flight ${index + 1} arrival time`} required value={flight.arrTime} onChange={(event) => updateFlight(index, { arrTime: event.target.value })} /></td>
                  <td><input aria-label={`Flight ${index + 1} baggage`} value={flight.baggage} onChange={(event) => updateFlight(index, { baggage: event.target.value })} placeholder="e.g. 30kg" /></td>
                  <td><select aria-label={`Flight ${index + 1} meal`} value={flight.meal} onChange={(event) => updateFlight(index, { meal: event.target.value })}><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select></td>
                  <td><button type="button" className="cg-remove-flight" aria-label={`Remove flight ${index + 1}`} disabled={formData.flights.length === 1} onClick={() => setFormData((previous) => ({ ...previous, flights: previous.flights.filter((_, flightIndex) => flightIndex !== index) }))}><FiTrash2 aria-hidden="true" /></button></td>
                </tr>)}</tbody>
              </table>
            </div>
          </section>
          <section id="cg-pricing" className="cg-section cg-pricing" aria-labelledby="cg-heading-3" onFocusCapture={() => setActiveStep("pricing")}>
            <SectionHeading number={3} title="Pricing Information" description="Set buying and selling prices for this group"><label className="cg-default-currency" htmlFor="cg-default-currency">Default Currency<PiCoins aria-hidden="true" /><select id="cg-default-currency" value={formData.price.buyingCurrency} onChange={(event) => setFormData({ ...formData, price: { ...formData.price, buyingCurrency: event.target.value, sellingCurrencyB2B: event.target.value } })}>{currencyOptions(formData.price.buyingCurrency)}</select><FiChevronDown aria-hidden="true" /></label></SectionHeading>
            <div className="cg-price-panels">{(["buying", "selling"] as const).map((side) => {
              const selling = side === "selling"; const currencyKey = selling ? "sellingCurrencyB2B" : "buyingCurrency";
              return <div className={`cg-price-panel cg-price-${side}`} key={side}>
                <div className="cg-price-heading"><span className="cg-price-icon">{selling ? <FiTag aria-hidden="true" /> : <FiShoppingCart aria-hidden="true" />}</span><h3>{selling ? "Selling Price (B2B)" : "Buying Price"}</h3>{selling && <Toggle small label="Same as Buying" checked={sameAsBuying} onChange={toggleSameAsBuying} />}</div>
                <div className="cg-price-grid">
                  <Field id={`cg-${side}-currency`} label="Currency" required><select id={`cg-${side}-currency`} disabled={selling && sameAsBuying} value={formData.price[currencyKey]} onChange={(event) => updatePrice(currencyKey, event.target.value)}>{currencyOptions(formData.price[currencyKey])}</select><FiChevronDown className="cg-select-chevron" aria-hidden="true" /></Field>
                  {priceFields.map((field) => {
                    const key = selling ? field.selling : field.buying; const onCall = selling && formData.priceOnCall[field.passenger];
                    return <div className="cg-passenger-price" key={field.passenger}><Field id={`cg-${side}-${field.passenger}`} label={`${field.label} (Per Seat)`} icon={field.icon} required={!selling && field.passenger === "adult"}><input id={`cg-${side}-${field.passenger}`} type="number" min="0" step="0.01" disabled={onCall || (selling && sameAsBuying)} value={onCall ? "" : formData.price[key] || ""} onChange={(event) => updatePrice(key, Number(event.target.value) || 0)} placeholder={onCall ? "On Call" : "0.00"} /></Field>{selling && <Toggle small label="On Call" disabled={sameAsBuying} checked={formData.priceOnCall[field.passenger]} onChange={(checked) => setFormData({ ...formData, priceOnCall: { ...formData.priceOnCall, [field.passenger]: checked } })} />}</div>;
                  })}
                </div>
              </div>;
            })}</div>
          </section>
          <section id="cg-additional" className="cg-section cg-additional" aria-labelledby="cg-heading-4" onFocusCapture={() => setActiveStep("additional")}>
            <SectionHeading number={4} title="Additional Information" description="Other details and settings" />
            <div className="cg-grid cg-grid-four">
              <Field id="cg-pnr" label="PNR" icon={PiTicket}><input id="cg-pnr" value={formData.pnr} onChange={(event) => setFormData({ ...formData, pnr: event.target.value })} placeholder="Enter PNR" /></Field>
              <Field id="cg-phone" label="Contact Person Phone" icon={FiPhone}><input id="cg-phone" type="tel" value={formData.contactPersonPhone} onChange={(event) => setFormData({ ...formData, contactPersonPhone: event.target.value })} placeholder="Phone number" /></Field>
              <Field id="cg-email" label="Contact Person Email" icon={FiMail}><input id="cg-email" type="email" value={formData.contactPersonEmail} onChange={(event) => setFormData({ ...formData, contactPersonEmail: event.target.value })} placeholder="Email address" /></Field>
              <Field id="cg-status" label="Internal Status" icon={FiLock}><select id="cg-status" value={formData.internalStatus} onChange={(event) => setFormData({ ...formData, internalStatus: event.target.value })}><option value="Public">Public</option><option value="Private">Private</option></select><FiChevronDown className="cg-select-chevron" aria-hidden="true" /></Field>
            </div>
          </section>
          <div className="cg-form-actions"><button type="button" className="cg-secondary" onClick={() => navigate("/group-ticketing")}><FiX aria-hidden="true" />Cancel</button><button className="cg-primary" type="submit"><PiAirplaneTilt aria-hidden="true" />{saving ? "Saving..." : editMode ? "Update Group" : "Create Group"}</button></div>
        </fieldset>
      </form>}
    </main>
  </div>;
};
export default GroupTicketingForm;
