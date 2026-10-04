import { useSidebar } from "../context/SidebarContext";

const Backdrop: React.FC = () => {
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  if (!isExpanded && !isMobileOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] bg-gray-900/50"
      onClick={isMobileOpen ? toggleMobileSidebar : toggleSidebar}
    />
  );
};

export default Backdrop;
