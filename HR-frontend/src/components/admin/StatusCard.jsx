import React from "react";

export default function StatusCard({ color, percent, label }) {
    return (
        <div className={`flex flex-col items-center justify-center rounded-full w-28 h-28 shadow-md border-2 border-white bg-gradient-to-b ${color} mb-2`}>
            <div className="text-2xl font-bold text-white">{percent}%</div>
            <div className="text-sm text-white font-semibold mt-1">{label}</div>
        </div>
    );
}
