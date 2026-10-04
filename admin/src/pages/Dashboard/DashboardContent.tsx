import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRightIcon, BanknotesIcon, BuildingLibraryIcon, BuildingOffice2Icon,
  ChevronDownIcon, CircleStackIcon, ClipboardDocumentIcon, Cog6ToothIcon,
  DocumentTextIcon, MapPinIcon, PaperAirplaneIcon, PhoneIcon, Squares2X2Icon,
  TagIcon, TicketIcon, UserGroupIcon,
} from '@heroicons/react/24/outline';
import axiosInstance from '../../Api/axios';
import AgentStatusChart from '../../components/charts/AgentStatusChart';
import allGroupsImage from '../../../../frontend/src/assets/images/allgroupsbgg.jpg';
import uaeImage from '../../../../frontend/src/assets/images/uaebg.jpg';
import ksaImage from '../../../../frontend/src/assets/images/ksabg.jpg';
import bahrainImage from '../../../../frontend/src/assets/images/bahrainbg.webp';
import muscatImage from '../../../../frontend/src/assets/images/muscatbg.jpg';
import ticketsImage from '../../../../frontend/src/assets/images/makkah.webp';
import packagesImage from '../../../../frontend/src/assets/images/ummrahbg.png';
import ukImage from '../../../../frontend/src/assets/images/ukgroup.jpg';
import overviewBanner from '../../assets/images/dashboard-overview-banner.png';
import './dashboard.css';

type Icon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const shortcuts: { title: string; path: string; icon: Icon }[] = [
  { title: 'Add Sector', path: '/sector', icon: MapPinIcon },
  { title: 'Add Airline', path: '/airline', icon: PaperAirplaneIcon },
  { title: 'Add Group', path: '/group-ticketing/create', icon: UserGroupIcon },
  { title: 'All Bookings', path: '/all-bookings', icon: TicketIcon },
  { title: 'Special Offers', path: '/special-offers', icon: TagIcon },
  { title: 'Manage Sectors', path: '/manage-sectors', icon: Cog6ToothIcon },
  { title: 'Agencies', path: '/registered-agencies', icon: BuildingOffice2Icon },
  { title: 'Add Bank', path: '/add-bank', icon: BuildingLibraryIcon },
  { title: 'Group Ticketing', path: '/group-ticketing', icon: TicketIcon },
  { title: 'Accounts', path: '/view-accounts', icon: BanknotesIcon },
  { title: 'API Groups', path: '/api-groups', icon: CircleStackIcon },
  { title: 'Team Contacts', path: '/team-contacts', icon: PhoneIcon },
];

const categories = [
  { title: 'All Groups', category: 'all', image: allGroupsImage, description: 'Browse all available group bookings.' },
  { title: 'UAE', category: 'uae', image: uaeImage, description: 'Explore UAE group bookings.' },
  { title: 'KSA', category: 'ksa', image: ksaImage, description: 'Explore KSA group bookings.' },
  { title: 'Bahrain', category: 'bahrain', image: bahrainImage, description: 'Explore Bahrain group bookings.' },
  { title: 'Muscat', category: 'muscat', image: muscatImage, description: 'Explore Muscat group bookings.' },
  { title: 'Umrah Tickets', category: 'umrah-tickets', image: ticketsImage, description: 'Explore Umrah ticket bookings.' },
  { title: 'Umrah Packages', category: 'umrah-packages', image: packagesImage, description: 'Explore Umrah package bookings.' },
  { title: 'UK', category: 'uk', image: ukImage, description: 'Explore UK group bookings.' },
];

interface BookingStats {
  totalBookings: number;
  byStatus: { _id: string; count: number; revenue: number }[];
}

interface Agency { role: string; status: string }

interface Props {
  groupCount: number;
  sectors: string[];
  copied: boolean;
  onCopy: () => void;
  onApplyMargin: () => void;
}

const number = (value: number | null) => value === null ? '—' : value.toLocaleString('en-PK');

export default function DashboardContent({ groupCount, sectors, copied, onCopy, onApplyMargin }: Props) {
  const [bookingStats, setBookingStats] = useState<BookingStats | null>(null);
  const [agencies, setAgencies] = useState<Agency[] | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      axiosInstance.get('/bookings/statistics'),
      axiosInstance.get('/auth/users'),
    ]).then(([bookingResult, userResult]) => {
      if (!active) return;
      if (bookingResult.status === 'fulfilled' && bookingResult.value.data.success) {
        setBookingStats(bookingResult.value.data.data);
      }
      if (userResult.status === 'fulfilled' && userResult.value.data.success) {
        setAgencies((userResult.value.data.data as Agency[]).filter(user => user.role === 'Agency'));
      }
    });
    return () => { active = false; };
  }, []);

  const pending = bookingStats?.byStatus.filter(item => ['on hold', 'pending'].includes(item._id)).reduce((sum, item) => sum + item.count, 0) ?? null;
  const revenue = bookingStats?.byStatus.find(item => item._id === 'confirmed')?.revenue ?? (bookingStats ? 0 : null);
  const activeAgencies = agencies?.filter(user => user.status === 'Active').length ?? null;
  const visibleCategories = useMemo(() => categoryFilter === 'all' ? categories : categories.filter(item => item.category === categoryFilter), [categoryFilter]);

  const metrics: { label: string; value: string; detail: string; icon: Icon; tone: string; path: string }[] = [
    { label: 'Total Bookings', value: number(bookingStats?.totalBookings ?? null), detail: 'All booking records', icon: TicketIcon, tone: 'teal', path: '/all-bookings' },
    { label: 'Active Agencies', value: number(activeAgencies), detail: 'Approved and active', icon: UserGroupIcon, tone: 'blue', path: '/registered-agencies' },
    { label: 'Revenue', value: revenue === null ? '—' : `PKR ${number(revenue)}`, detail: 'Confirmed bookings', icon: CircleStackIcon, tone: 'purple', path: '/all-bookings?status=confirmed' },
    { label: 'Sectors', value: number(sectors.length), detail: 'Available routes', icon: MapPinIcon, tone: 'orange', path: '/manage-sectors' },
    { label: 'Pending Requests', value: number(pending), detail: 'Bookings awaiting action', icon: DocumentTextIcon, tone: 'pink', path: '/all-bookings?status=on%20hold' },
  ];

  return (
    <main className="operations-dashboard">
      <section className="operations-hero" aria-labelledby="operations-title" style={{ backgroundImage: `url(${overviewBanner})` }}>
        <div className="operations-hero-copy">
          <span className="operations-eyebrow">Welcome back</span>
          <h1 id="operations-title">Operations Overview</h1>
          <p>Manage your travel inventory, agency network, and bookings.</p>
        </div>
        <div className="operations-breadcrumb">Workspace <span>/</span> Dashboard</div>
      </section>

      <section className="operations-metrics" aria-label="Key metrics">
        {metrics.map(item => (
          <Link to={item.path} className={`operations-metric metric-${item.tone}`} key={item.label}>
            <div className="operations-metric-top"><span className="operations-metric-icon"><item.icon /></span><span>{item.label}</span></div>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </Link>
        ))}
      </section>

      <section className="operations-panel operations-actions" aria-labelledby="actions-title">
        <div className="operations-section-heading">
          <div><span className="operations-heading-icon"><PaperAirplaneIcon /></span><div><h2 id="actions-title">Quick Actions</h2><p>Common tasks to manage your travel business.</p></div></div>
          <div className="operations-action-buttons">
            <button type="button" className="operations-copy" onClick={onCopy} disabled={!groupCount}><ClipboardDocumentIcon />{copied ? 'Copied!' : `Copy Sectors Data (${groupCount})`}</button>
            <button type="button" className="operations-margin" onClick={onApplyMargin}>+ &nbsp; Apply Margin</button>
          </div>
        </div>
        <div className="operations-shortcuts">
          {shortcuts.map(item => <Link key={item.title} to={item.path} className="operations-shortcut"><span><item.icon /></span><b>{item.title}</b><ArrowRightIcon /></Link>)}
        </div>
      </section>

      <section className="operations-panel operations-categories" aria-labelledby="categories-title">
        <div className="operations-section-heading">
          <div><span className="operations-heading-icon"><Squares2X2Icon /></span><div><h2 id="categories-title">Group Categories</h2><p>Browse and manage group bookings by region and type.</p></div></div>
          <label className="operations-category-filter"><Squares2X2Icon /><select aria-label="Filter group categories" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="all">All Groups</option>{categories.slice(1).map(item => <option key={item.category} value={item.category}>{item.title}</option>)}</select><ChevronDownIcon /></label>
        </div>
        <div className="operations-category-grid">
          {visibleCategories.map(item => (
            <article className="operations-category" key={item.category}>
              <div className="operations-category-image"><img src={item.image} alt="" loading="lazy" /><span>{item.title}</span></div>
              <div className="operations-category-body"><div className="operations-category-symbol"><Squares2X2Icon /></div><h3>{item.title}</h3><p>{item.description}</p><div className="operations-category-links"><Link to={item.category === 'all' ? '/api-groups' : `/api-groups?category=${encodeURIComponent(item.category)}`}>View Groups <ArrowRightIcon /></Link>{item.category === 'all' ? <span>All</span> : <Link to="/sector">+ Add Sector</Link>}</div></div>
            </article>
          ))}
        </div>
      </section>

      <AgentStatusChart />
    </main>
  );
}
