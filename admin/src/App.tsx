import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import ChangePassword from "./pages/AuthPages/ChangePassword";
import ForgotPassword from "./pages/AuthPages/ForgotPassword";
import ManageUserPasswords from "./pages/AuthPages/ManageUserPasswords";
import NotFound from "./pages/OtherPage/NotFound";
import TeamContactAdminPage from "./pages/TeamContactAdminPage";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import TestEmail from "./pages/TestEmail";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./context/PrivateRoute";
import RegisteredAgencies from "./pages/RegisteredAgencies";
import AgentDetail from "./pages/AgentDetail";
import AddBank from "./pages/AddBank";
import Sector from "./pages/Sector";
import Airline from "./pages/Airline";
import GroupTicketing from "./pages/GroupTicketing";
import GroupTicketingForm from "./pages/GroupTicketingForm";
import ViewPaymentVoucher from "./pages/ViewPaymentVoucher";
import EditPaymentVoucher from "./pages/EditPaymentVoucher";
import ViewAccounts from "./pages/ViewAccounts";
import Ledger from "./pages/Ledger";
import AllBookings from "./pages/AllBookings";
import BookingDetail from "./pages/BookingDetail";
import SpecialOffers from "./pages/SpecialOffers/SpecialOffers";
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import ManageSectors from "./pages/ManageSectors/ManageSectors";
import ApiGroups from "./pages/ApiGroups/ApiGroups";

export default function App() {
  return (
    <>
      <AuthProvider>
        <Router basename="/admin-portal/">
          <ScrollToTop />
          <Routes>
            <Route element={<PrivateRoute />}>
              {/* Dashboard Layout */}
              <Route element={<AppLayout />}>
                <Route index path="/" element={<Home />} />

                {/* Others Page */}
                <Route path="/profile" element={<UserProfiles />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/blank" element={<Blank />} />
                <Route path="/registered-agencies" element={<RegisteredAgencies />} />
                <Route path="/registered-agencies/:id" element={<AgentDetail />} />
                <Route path="/add-bank" element={<AddBank />} />
                <Route path="/sector" element={<Sector />} />
                <Route path="/airline" element={<Airline />} />
                <Route path="/all-bookings" element={<AllBookings />} />
                <Route path="/booking-detail/:id" element={<BookingDetail />} />
                <Route path="/group-ticketing" element={<GroupTicketing />} />
                <Route path="/group-ticketing/create" element={<GroupTicketingForm />} />
                <Route path="/group-ticketing/edit/:id" element={<GroupTicketingForm />} />
                <Route path="/view-payment-voucher" element={<ViewPaymentVoucher />} />
                <Route path="/view-payment-voucher/edit/:id" element={<EditPaymentVoucher />} />
                <Route path="/special-offers" element={<SpecialOffers />} />
                <Route path="/manage-sectors" element={<ManageSectors />} />
                <Route path="/api-groups" element={<ApiGroups />} />
                <Route path="/view-accounts" element={<ViewAccounts />} />
                <Route path="/ledger/:id" element={<Ledger />} />

                {/* Password Management */}
                <Route path="/change-password" element={<ChangePassword />} />
                <Route path="/manage-user-passwords" element={<ManageUserPasswords />} />
                <Route path="/test-email" element={<TestEmail />} />

                {/* Forms */}
                <Route path="/form-elements" element={<FormElements />} />

                {/* Tables */}
                <Route path="/basic-tables" element={<BasicTables />} />

                {/* Ui Elements */}
                <Route path="/team-contacts" element={<TeamContactAdminPage />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/avatars" element={<Avatars />} />
                <Route path="/badge" element={<Badges />} />
                <Route path="/buttons" element={<Buttons />} />
                <Route path="/images" element={<Images />} />
                <Route path="/videos" element={<Videos />} />

                {/* Charts */}
                <Route path="/line-chart" element={<LineChart />} />
                <Route path="/bar-chart" element={<BarChart />} />
              </Route>
            </Route>

            {/* Auth Layout */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Fallback Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{ zIndex: 99999 }}
      />
    </>
  );
}
