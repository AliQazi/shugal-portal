export const theme = {
  colors: {
    // Primary - Professional Deep Blue (Trust + Authority)
    // primary: "#1e40af", // Blue 800
    primary: "linear-gradient(90deg, #21397C 0%, #2CA3B4 100%)", // Blue 800
    primaryDark: "#1e3a8a", // Blue 900
    primaryLight: "#3b82f6", // Blue 500
    primaryLighter: "#dbeafe", // Blue 100

    // UBL Gradient Colors
    ublGradientStart: "#21397C", // Deep Blue
    ublGradientEnd: "#2CA3B4", // Teal
    ublGradient: "linear-gradient(90deg, #21397C 0%, #2CA3B4 100%)",

    // Secondary - Sophisticated Neutral
    secondary: "#64748b", // Slate 500
    secondaryDark: "#334155", // Slate 700
    secondaryLight: "#f8fafc", // Slate 50

    // Accent - Muted Teal (Professional & Fresh, not loud emerald)
    accent: "#0f766e", // Teal 700
    accentDark: "#115e59", // Teal 800
    accentLight: "#14b8a6", // Teal 500

    // Backgrounds
    background: "#f8fafc", // Clean off-white
    backgroundDark: "#f1f5f9",

    // UI Elements
    card: "#ffffff",
    border: "#e2e8f0",
    borderDark: "#cbd5e1",

    // Sidebar - Professional Dark (Not too black)
    sidebarBg: "#0f172a",
    sidebarText: "#94a3b8",
    sidebarTextLight: "#f1f5f9",
    sidebarHover: "#1e293b",
    sidebarActive: "#1e40af", // Solid professional blue
    sidebarActiveBg: "#1e40af",
    sidebarBorder: "#1e293b",

    // Status Colors (Subtle & Professional)
    danger: "#e11d48", // Rose 600 (softened)
    dangerLight: "#fff1f2",
    success: "#0f766e", // Teal instead of bright emerald
    successLight: "#f0fdfa",
    warning: "#d97706", // Amber 600
    warningLight: "#fefce8",
    info: "#0284c8", // Sky 600
    infoLight: "#f0f9ff",

    // Text Hierarchy
    textPrimary: "#0f172a", // Almost black
    textSecondary: "#334155",
    textTertiary: "#64748b",
    textLight: "#cbd5e1",
  },

  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },

  borderRadius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    full: "9999px",
  },

  shadows: {
    sm: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
    inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
  },

  transitions: {
    default: "all 0.2s ease",
    smooth: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    fast: "all 0.1s ease-in-out",
  },

  breakpoints: {
    mobile: "768px",
    tablet: "1024px",
    desktop: "1280px",
  },

  cards: {
    groups: "text-blue-700 bg-blue-50 border-blue-100",
    bank: "text-teal-700 bg-teal-50 border-teal-100",
    payment: "text-slate-700 bg-slate-50 border-slate-100",
    ledger: "text-blue-700 bg-blue-50 border-blue-100",
    profile: "text-slate-700 bg-slate-50 border-slate-100",
  },
};
