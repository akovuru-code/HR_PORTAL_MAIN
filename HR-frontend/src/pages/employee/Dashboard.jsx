import { useEffect, useState } from "react";
import Confetti from 'react-confetti';
import useWindowSize from 'react-use/lib/useWindowSize';
import EmpTypography from "../../components/emp/EmpTypography";
import AnnouncementsPanel from "../../components/common/AnnouncementsPanel";


// Donut chart for training
function DonutChart({ training }) {
  if (!training || training.length === 0) {
    return <div className="text-gray-500 text-sm">No training data</div>;
  }

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 36 36" className="w-40 h-40">
        <circle
          className="text-gray-200"
          stroke="currentColor"
          strokeWidth="3.8"
          fill="none"
          cx="18"
          cy="18"
          r="15.9155"
        />
        {training.map((t, i) => {
          const prev = training.slice(0, i).reduce((acc, cur) => acc + cur.percent, 0);
          return (
            <circle
              key={t.label}
              stroke={t.color}
              strokeWidth="3.8"
              strokeDasharray={`${t.percent} ${100 - t.percent}`}
              strokeDashoffset={100 - prev}
              strokeLinecap="round"
              fill="none"
              cx="18"
              cy="18"
              r="15.9155"
            />
          );
        })}
      </svg>
      <div className="mt-3 text-sm">
        {training.map((t) => (
          <div key={t.label} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: t.color }}></span>
            <span>{t.label}: {t.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EmployeeDashboard() {
  const [profile, setProfile] = useState({ firstName: "Employee", lastName: "" });
  const [quoteObj, setQuoteObj] = useState({ text: "", author: "" });

  const [training, setTraining] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [activeProjects, setActiveProjects] = useState([]);

  const { width, height } = useWindowSize(); // Already imported
  const [isBirthday, setIsBirthday] = useState(false); // NEW

  // Check if today is user's birthday
  useEffect(() => {
    const stored = localStorage.getItem("user");
    const user = stored ? JSON.parse(stored) : null;
    if (user) {
      const nameParts = user.name?.split(" ") || [];
      setProfile({
        firstName: nameParts[0] || "Employee",
        lastName: nameParts[1] || "",
      });

      if (user.dob) {
        const today = new Date();
        const dob = new Date(user.dob);
        if (
          today.getDate() === dob.getDate() &&
          today.getMonth() === dob.getMonth()
        ) {
          setIsBirthday(true); // 🎉 It's their birthday
        }
      }
    }
  }, []);

  // Fetch user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    const user = stored ? JSON.parse(stored) : null;
    if (user) {
      const nameParts = user.name?.split(" ") || [];
      setProfile({
        firstName: nameParts[0] || "Employee",
        lastName: nameParts[1] || "",
      });
    }
  }, []);

  // Fetch real dashboard data
  useEffect(() => {
    async function fetchDashboard() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("Dashboard API error:", res.status, err);
          return;
        }
        const data = await res.json();
        if (data.actionItems) setActionItems(data.actionItems);
        if (data.activeItems) setActiveProjects(data.activeItems);
        if (data.training) setTraining(data.training);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    }
    fetchDashboard();
  }, []);

  // Fetch quote from backend quotes API

  useEffect(() => {
    async function fetchQuote() {
      try {
        const res = await fetch("/api/quotes");
        if (!res.ok) {
          console.error("Quote fetch non-OK:", res.status);
          return;
        }
        const data = await res.json();
        console.log("Fetched quote:", data);  // debug
        setQuoteObj({
          text: data.text || "",
          author: data.author || "",
        });
      } catch (err) {
        console.error("Quote fetch error:", err);
      }
    }
    fetchQuote();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="p-6">
      {/* Greeting + Date inline */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">
          {getGreeting()}, {profile.firstName}
        </h1>
        <p className="text-gray-500 text-lg">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <AnnouncementsPanel forcedRole="Employee" />

      {/* Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="md:col-span-2 flex flex-col gap-6">

          {/* Confetti on Birthday */}
          {isBirthday && (
            <>
              <Confetti width={width} height={height} />
              <div className="bg-yellow-100 text-yellow-900 text-center py-3 px-6 rounded-md shadow mb-4 text-xl font-semibold">
                🎉 Happy Birthday, {profile.firstName}! Wishing you a wonderful year ahead! 🎂
              </div>
            </>
          )}

          {/* Quote box */}
          <div className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="font-semibold text-lg mb-2">🧠 Quote of the Day</div>
            <div className="relative min-h-[60px]">
              <EmpTypography.h1 variant="secondary" className="text-gray-700">
                “{quoteObj.text}”
              </EmpTypography.h1>
              {quoteObj.author && (
                <EmpTypography.h2 variant="secondary" className="text-gray-500 absolute bottom-0 right-0 italic">
                  — {quoteObj.author}
                </EmpTypography.h2>
              )}
            </div>
          </div>

          {/* Training Progress */}
          <div className="bg-white rounded-xl border p-4">
            <div className="font-semibold text-lg mb-2">Training Progress</div>
            <DonutChart training={training} />
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-xl border p-4"><div className="font-semibold text-lg mb-2">Active Projects</div>
            <ul className="text-base">
              {activeProjects.length > 0 ? (
                activeProjects.map((item) => (
                  <li key={item.id}>
                    {item.type === 'bench' ? <span className="text-gray-500 italic">On Bench</span>
                      : item.type === 'certification' ? <span>📜 {item.name}{item.org ? ` — ${item.org}` : ''}</span>
                        : <span>{item.name}{item.role ? ` (${item.role})` : ''}</span>}
                  </li>
                ))
              ) : (
                <li>No active projects</li>
              )}
            </ul>
          </div>
          <div className="bg-white rounded-xl border p-4 flex-1">

            <div className="font-semibold text-lg mb-2">Action Items</div>
            <ul className="list-disc ml-5 text-base">
              {actionItems.length > 0 ? (
                actionItems.map((item) => <li key={item.id}>{item.message}</li>)
              ) : (
                <li>No action items</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
