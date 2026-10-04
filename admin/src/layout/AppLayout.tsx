import { SidebarProvider } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  return (
    <div className="travel-admin min-h-screen">
      <AppSidebar />
      <Backdrop />
      <div className="w-full min-w-0 min-h-screen flex flex-col">
        <AppHeader />
        <div className="workspace-content flex-1 w-full p-4 mx-auto md:p-6">
          <Outlet />
        </div>
        <div className="no-print w-full px-4 pb-4 text-right text-sm text-gray-500 md:px-6 dark:text-gray-400">
          Designed and developed by Stack Works Flow
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
