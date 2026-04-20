import React from "react";
import { theme } from "../../theme/theme";

export default function TopBar({ title }) {
  return (
    <div
      style={{ background: theme.colors.primary }}
      // text-2xl (Mobile) -> text-3xl (Tablet) -> text-4xl (Desktop)
      // px-4 add kiya taake text edges se na takraye
      className="py-4 px-4 text-2xl md:text-3xl lg:text-4xl text-white text-center font-bold my-4 rounded-lg md:rounded-none"
    >
      {title}
    </div>
  );
}
