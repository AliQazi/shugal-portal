import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useEffect, useState } from "react";
import axiosInstance from "../../Api/axios";
import { ArrowTrendingUpIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface User {
  _id: string;
  role: string;
  status: "Active" | "Inactive" | "Pending";
}

export default function AgentStatusChart() {
  const [isDark, setIsDark] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkTheme();
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetchAgentStats();
  }, []);

  const fetchAgentStats = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("admin_token");
      const response = await axiosInstance.get("/auth/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.data.success) {
        const users = response.data.data as User[];
        const agencies = users.filter((user) => user.role === "Agency");
        
        const active = agencies.filter((user) => user.status === "Active").length;
        const inactive = agencies.filter((user) => user.status === "Inactive").length;
        
        setActiveCount(active);
        setInactiveCount(inactive);
      }
    } catch (error) {
      console.error("Error fetching agent stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "donut",
      height: 230,
    },
    colors: ["#10b981", "#ef4444"],
    labels: ["Active Agents", "Inactive Agents"],
    legend: {
      show: false,
      position: "bottom",
      fontFamily: "Outfit, sans-serif",
      labels: {
        colors: isDark ? "#cbd5e1" : "#64748b",
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "16px",
              fontWeight: 600,
              color: isDark ? "#f1f5f9" : "#1e293b",
              offsetY: -10,
            },
            value: {
              show: true,
              fontSize: "24px",
              fontWeight: 700,
              color: isDark ? "#f1f5f9" : "#1e293b",
              offsetY: 10,
              formatter: (val) => {
                return String(val);
              },
            },
            total: {
              show: true,
              label: "Total Agents",
              fontSize: "14px",
              fontWeight: 600,
              color: isDark ? "#94a3b8" : "#64748b",
              formatter: (w) => {
                return String(
                  w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)
                );
              },
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    responsive: [
      {
        breakpoint: 640,
        options: {
          chart: {
            height: 250,
          },
          legend: {
            position: "bottom",
          },
        },
      },
    ],
    tooltip: {
      theme: isDark ? "dark" : "light",
      y: {
        formatter: (val) => {
          return `${val} agents`;
        },
      },
    },
  };

  const series = [activeCount, inactiveCount];

  if (loading) {
    return (
      <div className="agent-status-card rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex justify-center items-center h-[230px]">
          <div className="text-gray-500 dark:text-gray-400">Loading agent statistics...</div>
        </div>
      </div>
    );
  }

  const total = activeCount + inactiveCount;
  const activePercent = total ? Math.round(activeCount / total * 100) : 0;

  return (
    <section className="agent-status-card rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark" aria-labelledby="agent-status-title">
      <div className="agent-status-heading">
        <span><UserGroupIcon /></span>
        <div><h2 id="agent-status-title">Agent Status Overview</h2><p>Distribution of active and inactive agents</p></div>
        <span className="agent-status-period">All agencies</span>
      </div>
      <div className="agent-status-content">
        <div className="agent-status-chart">{total ? <Chart options={options} series={series} type="donut" height={230} width={230} /> : <div className="agent-status-empty">No agency data</div>}</div>
        <div className="agent-status-legend">
          <div><span className="agent-dot active" />Active Agents <strong>{activeCount}</strong><em>{activePercent}%</em></div>
          <div><span className="agent-dot inactive" />Inactive Agents <strong>{inactiveCount}</strong><em>{total ? 100 - activePercent : 0}%</em></div>
        </div>
        <div className="agent-status-highlight"><span><ArrowTrendingUpIcon /></span><div>Active Agents<strong>{activePercent}%</strong><small>{total ? `${activeCount} of ${total} agencies active` : 'No agencies yet'}</small></div></div>
      </div>
    </section>
  );
}
