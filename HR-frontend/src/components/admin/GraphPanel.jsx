import React from "react";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function GraphPanel({ growth, percent, data, labels, onReloadReport, reloading }) {
    const chartData = {
        labels: labels?.length ? labels : ["01", "02", "03", "04", "05", "06", "07"],
        datasets: [
            {
                label: "Last 7 days",
                data: data.last7days || [],
                borderColor: "#2563eb",
                backgroundColor: "#2563eb22",
                tension: 0.4,
            },
            {
                label: "Last Week",
                data: data.lastWeek || [],
                borderColor: "#a3a3a3",
                backgroundColor: "#a3a3a322",
                borderDash: [5, 5],
                tension: 0.4,
            },
        ],
    };
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: "bottom" },
            title: { display: false },
        },
        scales: {
            y: { beginAtZero: true, grid: { color: "#e5e7eb" } },
            x: { grid: { color: "#e5e7eb" } },
        },
    };
    return (
        <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-col items-start w-full">
            <div className="flex items-center justify-between w-full mb-2">
                <div>
                    <div className="text-xs text-gray-500">Company Growth</div>
                    <div className="text-2xl font-bold text-gray-900">{growth}</div>
                    <div className={`text-sm font-semibold ${percent >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {percent >= 0 ? "↑" : "↓"} {Math.abs(percent)}% vs last week
                    </div>
                </div>
                <button
                    className={`px-3 py-1 rounded text-xs font-medium border transition-all duration-200 ${reloading
                        ? "bg-blue-200 text-blue-700 cursor-wait"
                        : "bg-gray-100 hover:bg-blue-100 active:scale-95"
                        }`}
                    onClick={onReloadReport}
                    disabled={reloading}
                >
                    {reloading ? (
                        <>
                            ⏳ Reloading...
                        </>
                    ) : (
                        " Reload Report"
                    )}
                </button>
            </div>
            <div className="w-full h-64">
                <Line data={chartData} options={chartOptions} />
            </div>
            <div className="text-xs text-gray-400 mt-2">Employee growth trend for last 7 days</div>
        </div>
    );
}
