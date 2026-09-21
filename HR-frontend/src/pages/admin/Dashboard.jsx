import { useState, useEffect } from "react";
import StatusCard from "../../components/admin/StatusCard";
import GraphPanel from "../../components/admin/GraphPanel";
import AdminTypography from "../../components/admin/AdminTypography";
import AnnouncementsPanel from "../../components/common/AnnouncementsPanel";
import { useAuth } from "../../hooks/useAuth";
import { ADMIN_FEATURE_VISIBILITY } from "../../utils/adminFeatureVisibility";

// === API Configuration ===
//const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY; // Skbabers@gmail.com
//const NEWS_API_URL = `https://newsdata.io/api/1/news?apikey=${NEWS_API_KEY}&country=us&q=immigration&language=en`;

//`https://newsapi.org/v2/top-headlines?country=us&q=immigration&pageSize=5&apiKey=${NEWS_API_KEY}`;

const GITA_API_URL = "http://localhost:5001/api/gita/slok/random";
const GITA_API_KEY = "YOUR_GITA_API_KEY";

// === GreetingHeader (inlined) ===
function GreetingHeader({ name }) {
  const today = new Date();
  const hour = today.getHours();
  let greeting = "Good Morning";
  if (hour >= 12 && hour < 17) greeting = "Good Afternoon";
  else if (hour >= 17) greeting = "Good Evening";

  const firstName = name?.split(" ")[0] || "";

  const dateStr = today.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
      <div className="text-2xl font-bold text-gray-900 mb-2 md:mb-0">
        {greeting}, {firstName}
      </div>
      <div className="text-gray-500 text-lg">{dateStr}</div>
    </div>
  );
}

// === AlertsPanel (inlined) ===
function AlertsPanel({ alerts, onApprove, onReject, onMarkRead, isRootAdmin }) {
  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm min-h-[220px] max-h-80 overflow-y-auto">
      <div className="text-xl font-semibold mb-2">Alerts:</div>
      <ul className="list-disc pl-5 text-gray-800 text-sm space-y-1">
        {alerts && alerts.length > 0 ? (
          alerts.map((alert, idx) => (
            <li key={idx} className="flex items-center justify-between gap-2">
              <span>
                {typeof alert === 'string' ? alert : alert.message}
                {alert.actionType && <span className="block text-xs text-gray-500">{alert.actionType.toUpperCase()} · {alert.resourceType} #{alert.resourceId}</span>}
                {alert.requesterRole && <span className="block text-xs text-gray-500">Requested by: {alert.requesterName} ({alert.requesterRole})</span>}
                {alert.creatorRole && <span className="block text-xs text-gray-500">Added by: {alert.creatorName} ({alert.creatorRole}){alert.technology ? ` · ${alert.technology}` : ''}{alert.experience ? ` · ${alert.experience} yrs` : ''}</span>}
                {alert.resetUserEmail && <span className="block text-xs text-gray-500">User: {alert.resetUserName} · {alert.resetUserEmail}</span>}
                {alert.reason && <span className="block text-xs text-gray-500">Reason: {alert.reason}</span>}
                {alert.requestKind === 'performance_report_replacement' && <span className="block text-xs text-gray-500">{alert.employeeName} · {alert.companyName} · {alert.reviewType} · {alert.reviewYear}</span>}
                {alert.requestKind === 'performance_report_replacement' && alert.requestedAt && <span className="block text-xs text-gray-500">Requested: {new Date(alert.requestedAt).toLocaleString()}</span>}
                {alert.requestKind === 'password_reset' && alert.requestedAt && <span className="block text-xs text-gray-500">Requested: {new Date(alert.requestedAt).toLocaleString()}</span>}
                {alert.deliveryFailed && <span className="block text-xs text-red-600">Email delivery failed. Approve retries delivery with a new secure link.</span>}
              </span>
              {alert.canApprove && onApprove && (!alert.rootOnly || isRootAdmin) && (
                <span className="flex gap-1 shrink-0">
                  <AdminTypography.button
                    variant="primary"
                    className="py-0.5"
                    style={{ minWidth: 60, fontSize: '0.72rem' }}
                    onClick={() => onApprove(alert)}
                  >
                    {alert.deliveryFailed ? 'Retry' : 'Approve'}
                  </AdminTypography.button>
                  {onReject && (
                    <AdminTypography.button
                      className="py-0.5 bg-red-100 text-red-700 hover:bg-red-200"
                      style={{ minWidth: 52, fontSize: '0.72rem' }}
                      onClick={() => onReject(alert)}
                    >
                      Reject
                    </AdminTypography.button>
                  )}
                </span>
              )}
              {alert.notificationId && onMarkRead && <AdminTypography.button className="py-0.5 bg-gray-100 text-gray-700 hover:bg-gray-200" style={{ minWidth: 68, fontSize: '0.72rem' }} onClick={() => onMarkRead(alert)}>Mark read</AdminTypography.button>}
            </li>
          ))
        ) : (
          <li className="text-gray-400">No alerts</li>
        )}
      </ul>
    </div>
  );
}

// === ToDoStickyNotes Component ===
function ToDoStickyNotes() {
  const [notes, setNotes] = useState([]);
  const [input, setInput] = useState("");
  const [showModal, setShowModal] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : {};
  };

  useEffect(() => {
    fetch("/api/admin/notes", { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setNotes((data.notes || []).map(n => ({
        id: n.id,
        text: n.text,
        time: new Date(n.createdAt).toLocaleString(),
      }))))
      .catch(() => { });
  }, []);

  const addNote = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    try {
      const res = await fetch("/api/admin/notes", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();
      const n = data.note;
      setNotes(prev => [...prev, { id: n.id, text: n.text, time: new Date(n.createdAt).toLocaleString() }]);
      setInput("");
    } catch {
      // Ignore note API errors; the dashboard remains usable.
    }
  };

  const deleteNote = async (id) => {
    try {
      await fetch(`/api/admin/notes/${id}`, { method: "DELETE", headers: authHeaders() });
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch {
      // Ignore note API errors; the dashboard remains usable.
    }
  };

  // Handle textarea keydown: Shift+Enter for newline, Enter for submit
  const handleInputKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addNote();
    }
  };

  // Sticky note style
  const stickyStyle = {
    fontFamily: '"Comic Sans MS", "Comic Sans", "Chalkboard SE", cursive',
    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
  };

  return (
    <div className="mt-6 bg-white border rounded-xl p-4 shadow-sm" style={{ minHeight: '220px', maxHeight: '320px', display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center justify-between mb-3">
        <AdminTypography.h2 className="text-xl font-semibold">📝 To-Do List:</AdminTypography.h2>
        <button
          className="ml-2 text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 bg-gray-50"
          title="Expand"
          onClick={() => setShowModal(true)}
        >
          <span className="text-lg">⛶</span>
        </button>
      </div>
      {/* Input Field */}
      <div className="mb-4">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Add a task..."
          rows={2}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-[cursive] bg-blue-50 resize-none"
          style={stickyStyle}
        />
        <div className="flex justify-end mt-2">
          <AdminTypography.button
            onClick={addNote}
            variant="primary"
            className="px-4 py-1"
          >
            + Add
          </AdminTypography.button>
        </div>
      </div>
      {/* Notes List - scrollable */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: '140px' }}>
        {notes.length === 0 ? (
          <p className="text-gray-400 text-sm">No tasks added yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-4">
            {notes.map((note, idx) => (
              <li
                key={note.id}
                className={`relative bg-blue-200 px-4 py-3 min-w-[140px] max-w-[180px] rounded-lg font-[cursive] text-gray-900 text-base shadow-lg transition-transform duration-150`}
                style={{ ...stickyStyle, transform: `rotate(${idx % 2 === 0 ? 2 : -3}deg)` }}
              >
                <span className="whitespace-pre-line">{note.text}</span>
                <span className="block text-xs text-gray-500 mt-1">{note.time}</span>
                <button
                  className="absolute top-1 right-2 text-red-500 hover:text-red-700 text-lg"
                  onClick={() => deleteNote(note.id)}
                  aria-label="Delete Note"
                >🗑️</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal for full-screen editing */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl border relative flex flex-col" style={{ minHeight: '60vh' }}>
            <div className="flex items-center justify-between mb-4">
              <AdminTypography.h2 className="text-2xl font-semibold">📝 To-Do List</AdminTypography.h2>
              <button
                className="text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 bg-gray-50"
                onClick={() => setShowModal(false)}
                title="Close"
              >✕</button>
            </div>
            <div className="mb-6">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Add a task... (Shift+Enter for new line)"
                rows={4}
                className="w-full border border-gray-300 rounded px-3 py-2 text-base font-[cursive] bg-blue-50 resize-none"
                style={stickyStyle}
              />
              <div className="flex justify-end mt-2">
                <AdminTypography.button
                  onClick={addNote}
                  variant="primary"
                  className="px-4 py-1"
                >
                  + Add
                </AdminTypography.button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {notes.length === 0 ? (
                <p className="text-gray-400 text-base">No tasks added yet.</p>
              ) : (
                <ul className="flex flex-wrap gap-6">
                  {notes.map((note, idx) => (
                    <li
                      key={note.id}
                      className={`relative bg-blue-200 px-5 py-4 min-w-[180px] max-w-[260px] rounded-lg font-[cursive] text-gray-900 text-lg shadow-lg transition-transform duration-150 mb-2`}
                      style={{ ...stickyStyle, transform: `rotate(${idx % 2 === 0 ? 2 : -3}deg)` }}
                    >
                      <span className="whitespace-pre-line">{note.text}</span>
                      <span className="block text-xs text-gray-500 mt-2">{note.time}</span>
                      <button
                        className="absolute top-2 right-3 text-red-500 hover:text-red-700 text-lg"
                        onClick={() => deleteNote(note.id)}
                        aria-label="Delete Note"
                      >🗑️</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <AdminTypography.button variant="secondary" onClick={() => setShowModal(false)}>
                Close
              </AdminTypography.button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === Main Dashboard ===
export default function Dashboard() {
  const { isRootAdmin, can } = useAuth();
  const canApproveEditRequests = isRootAdmin || can('employee_modification:approve');
  const [session, setSession] = useState({ name: "" });
  const [alerts, setAlerts] = useState([]);
  const [status, setStatus] = useState([]);
  const [reloading, setReloading] = useState(false);
  const [growth, setGrowth] = useState({ growth: 0, percent: 0, data: { last7days: [], lastWeek: [] } });
  //const [news, setNews] = useState({ loading: true, error: null, headline: "" });
  const [news, setNews] = useState({ loading: false, error: null, articles: [] });
  const [gita, setGita] = useState({ loading: true, error: null, quote: "", transl: "" });

  // Real auth session if needed
  const fetchSession = async () => {
    const stored = localStorage.getItem("user");
    const user = stored ? JSON.parse(stored) : null;
    return { name: user?.name || "User" };
  };

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/alerts", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.alerts || [];
    } catch {
      return [];
    }
  };

  const approveEditRequest = async (alert) => {
    try {
      const isActionRequest = alert?.requestKind === 'admin_action';
      const isPasswordReset = alert?.requestKind === 'password_reset';
      const isPerformanceReplacement = alert?.requestKind === 'performance_report_replacement';
      const id = typeof alert === 'object' ? alert.id : alert;
      const token = localStorage.getItem("token");
      const endpoint = isPasswordReset
        ? `/api/admin/password-reset-requests/${id}/approve`
        : isPerformanceReplacement
        ? `/api/performance-reports/admin/replacement-requests/${id}/approve`
        : isActionRequest
        ? `/api/admin-action-requests/${id}/approve`
        : `/api/admin/edit-requests/${id}/approve`;
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setAlerts(prev => prev.filter(a => a.id !== id));
      }
    } catch {
      // silent fail
    }
  };

  const rejectEditRequest = async (alert) => {
    try {
      const isActionRequest = alert?.requestKind === 'admin_action';
      const isPasswordReset = alert?.requestKind === 'password_reset';
      const isPerformanceReplacement = alert?.requestKind === 'performance_report_replacement';
      const id = typeof alert === 'object' ? alert.id : alert;
      const token = localStorage.getItem("token");
      const endpoint = isPasswordReset
        ? `/api/admin/password-reset-requests/${id}/reject`
        : isPerformanceReplacement
        ? `/api/performance-reports/admin/replacement-requests/${id}/reject`
        : isActionRequest
        ? `/api/admin-action-requests/${id}/reject`
        : `/api/admin/edit-requests/${id}/reject`;
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setAlerts(prev => prev.filter(a => a.id !== id));
      }
    } catch {
      // silent fail
    }
  };

  const markAlertRead = async (alert) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/alerts/${alert.notificationId}/read`, {
        method: 'PATCH', headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) setAlerts(current => current.filter(item => item.notificationId !== alert.notificationId));
    } catch {
      // Keep the alert visible so it can be retried.
    }
  };

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/status-summary", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      const data = await res.json();
      return [
        { color: "from-yellow-400 to-yellow-600", percent: data.inProject.percent, label: "On Job" },
        { color: "from-purple-400 to-purple-600", percent: data.inTraining.percent, label: "Training" },
        { color: "from-cyan-400 to-cyan-600", percent: data.onBench.percent, label: "On Bench" },
      ];
    } catch {
      return [];
    }
  };

  const fetchGrowth = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/growth", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return { growth: 0, percent: 0, data: { last7days: [], lastWeek: [] } };
      return await res.json();
    } catch {
      return { growth: 0, percent: 0, data: { last7days: [], lastWeek: [] } };
    }
  };


  const fetchTodayNews = async () => {
    setNews({ loading: true, error: null, articles: [] });

    try {
      const res = await fetch("/api/news");

      if (!res.ok) {
        const errorDetails = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorDetails}`);
      }

      const data = await res.json();

      const articles = Array.isArray(data.articles)
        ? data.articles
        : Array.isArray(data.results)
          ? data.results
          : [];

      setNews({
        loading: false,
        error: articles.length === 0 ? "No news available" : null,
        articles
      });

    } catch (err) {
      console.error("News fetch error:", err);

      setNews({
        loading: false,
        error: err.message || "Failed to fetch news",
        articles: []
      });
    }
  };


  {/*  const fetchGitaNote = async () => {
    setGita({ loading: true, error: null, quote: "", transl: "" });
    try {
      const res = await fetch(GITA_API_URL, {
        headers: {
          Authorization: `Bearer ${GITA_API_KEY} `,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const quote = data.slok || "No quote found.";
      const transl = data.tej?.ht || "";
      setGita({ loading: false, error: null, quote, transl });
    } catch (err) {
      setGita({ loading: false, error: err.message, quote: "", transl: "" });
    }
  };*/}

  const fetchGitaNote = async () => {
    setGita({ loading: true, error: null, quote: "", transl: "" });
    try {
      const res = await fetch(GITA_API_URL);
      if (!res.ok) throw new Error("Failed to fetch Gita slok");
      const data = await res.json();
      setGita({ loading: false, error: null, quote: data.slok, transl: data.translation });
    } catch (err) {
      setGita({ loading: false, error: err.message, quote: "", transl: "" });
    }
  };

  useEffect(() => {
    fetchSession().then(setSession);
    fetchAlerts().then(setAlerts);
    const refreshAlerts = () => fetchAlerts().then(setAlerts);
    const intervalId = window.setInterval(refreshAlerts, 15000);
    window.addEventListener('focus', refreshAlerts);
    fetchTodayNews();
    fetchGitaNote();
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshAlerts);
    };
  }, []);

  useEffect(() => {
    if (!isRootAdmin) {
      setStatus([]);
      setGrowth({ growth: 0, percent: 0, data: { last7days: [], lastWeek: [] } });
      return;
    }
    fetchStatus().then(setStatus);
    if (ADMIN_FEATURE_VISIBILITY.employeeStatusReport) {
      fetchGrowth().then(setGrowth);
    } else {
      setGrowth({ growth: 0, percent: 0, data: { last7days: [], lastWeek: [] } });
    }
  }, [isRootAdmin]);

  return (
    <>
      {/* Greeting Header */}
      <GreetingHeader name={session.name} />

      <AnnouncementsPanel forcedRole="Admin" />

      {/* News + Gita (Left) | Alerts + To-Do Notes (Right)*/}
      <div className="flex gap-6 mb-6 h-[350px]">
        {/* News + Gita Panel */}
        <div className="bg-white border rounded-xl shadow-sm p-6 flex-1 overflow-y-auto">
          <div className="mb-6">
            <AdminTypography.h2 className="font-semibold text-lg mb-2">📢 Today's News :</AdminTypography.h2>
            {/* {news.loading ? (
              <p className="text-gray-400">Loading latest news...</p>
            ) : news.error ? (
              <p className="text-red-500">{news.error}</p>
            ) : (
              <p className="text-gray-800 text-base">{news.headline}</p>
            )} */}

            {news.loading && <p>Loading...</p>}
            {news.error && <p>Error: {news.error}</p>}
            {news.loading && (
              <p className="text-gray-400">
                Loading today's news...
              </p>
            )}

            {news.error && !news.loading && (
              <p className="text-red-500">
                Error: {news.error}
              </p>
            )}

            {!news.loading && !news.error && news.articles.length > 0 && (
              <ul className="space-y-3">
                {news.articles.slice(0, 5).map((article, i) => (
                  <li key={i} className="border-b pb-2">
                    <a
                      href={article.link || article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-800 hover:text-blue-600 font-medium"
                    >
                      {article.title}
                    </a>

                    {article.pubDate && (
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(article.pubDate).toLocaleString()}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {!news.loading && !news.error && news.articles.length === 0 && (
              <p className="text-gray-400">
                No news available today.
              </p>
            )}
          </div>

          <div className="relative pb-12">

            <AdminTypography.h3 className="font-medium text-md mb-2">📖 Gita for the Day :</AdminTypography.h3>

            {/* {gita.loading ? (
              <p className="text-gray-400">Loading Gita quote...</p>
            ) : gita.error ? (
              <p className="text-red-500">{gita.error}</p>
            ) : (
              <>
                <p className="text-gray-700 text-sm mb-2">{gita.quote}</p>
                {gita.transl && <p className="text-gray-600 text-xs">{gita.transl}</p>}
              </>
            )}
           </div> */}
            {gita.loading && <p>Loading...</p>}
            {gita.error && <p>Error: {gita.error}</p>}

            {!gita.loading && !gita.error && (
              <>
                <p><strong>Sloka:</strong> {gita.quote}</p>
                {/* <p><strong>Chapter:</strong> {gita.chapter}</p> */}
                <p><strong>Translation:</strong> {gita.transl}</p>
                {/* <p><strong>Author:</strong> {gita.author}</p> */}
                <div className="absolute bottom-0 right-0">
                  <AdminTypography.button variant="primary" onClick={fetchGitaNote}>Get Another Sloka</AdminTypography.button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Alerts Panel && To-Do Notes */}
        <div className="w-96">
          <AlertsPanel
            alerts={alerts}
            onApprove={isRootAdmin || canApproveEditRequests ? approveEditRequest : undefined}
            onReject={isRootAdmin || canApproveEditRequests ? rejectEditRequest : undefined}
            onMarkRead={markAlertRead}
            isRootAdmin={isRootAdmin}
          />
          <ToDoStickyNotes />
        </div>

      </div>

      {isRootAdmin && (
        <div className="mb-6 flex flex-col gap-2">
          <AdminTypography.label className="mb-1">Status</AdminTypography.label>
          <div className="flex gap-4">
            {status.map((s, i) => (
              <StatusCard key={i} {...s} />
            ))}
          </div>
        </div>
      )}

      {isRootAdmin && ADMIN_FEATURE_VISIBILITY.employeeStatusReport && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-2">
            <AdminTypography.label className="mt-2">
              Complete Report about the Employees Status
            </AdminTypography.label>
            <div className="flex-1">
              <GraphPanel
                growth={growth.growth}
                percent={growth.percent}
                data={growth.data}
                labels={growth.labels}
                onReloadReport={async () => {
                  try {
                    setReloading(true);
                    const updatedGrowth = await fetchGrowth();
                    setGrowth(updatedGrowth);
                  } finally {
                    setReloading(false);
                  }
                }}
                reloading={reloading}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
