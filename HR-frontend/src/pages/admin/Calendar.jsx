import React, { useState, useRef, useEffect } from "react";
import AdminTypography from "../../components/admin/AdminTypography";
import { Calendar as BigCalendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import CalendarDatePicker from "../../components/admin/CalendarDatePicker";

export default function AdminCalendar() {
    const localizer = momentLocalizer(moment);

    const EVENT_TYPES = [
        { value: "offshore", label: "Off-shore Holiday", color: "bg-blue-500" },
        { value: "onsite", label: "On-site Holiday", color: "bg-green-500" },
        { value: "reminder", label: "Reminder", color: "bg-yellow-500" },
    ];

    const initialEvents = [
        {
            id: 1,
            title: "Diwali (Off-shore)",
            description: "Major Indian festival",
            start: new Date(moment().add(2, "days").format("YYYY-MM-DD")),
            end: new Date(moment().add(2, "days").format("YYYY-MM-DD")),
            type: "offshore",
            allDay: true,
        },
        {
            id: 2,
            title: "US Independence Day (On-site)",
            description: "US public holiday",
            start: new Date(moment().add(10, "days").format("YYYY-MM-DD")),
            end: new Date(moment().add(10, "days").format("YYYY-MM-DD")),
            type: "onsite",
            allDay: true,
        },
        {
            id: 3,
            title: "Project Deadline Reminder",
            description: "Submit all reports",
            start: new Date(moment().add(5, "days").set({ hour: 15, minute: 0 })),
            end: new Date(moment().add(5, "days").set({ hour: 16, minute: 0 })),
            type: "reminder",
            allDay: false,
        },
    ];

    function getTypeColor(type) {
        const found = EVENT_TYPES.find((t) => t.value === type);
        return found ? found.color : "bg-gray-400";

    }

    function getTypeLabel(type) {
        const found = EVENT_TYPES.find((t) => t.value === type);
        return found ? found.label : type;
    }

    function AddEventModal({ open, onClose, onSave, initialData, date }) {
        const [form, setForm] = useState(
            initialData || {
                title: "",
                description: "",
                date: date ? moment(date).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
                time: "",
                type: "reminder",
            }
        );

        const modalRef = useRef();

        useEffect(() => {
            setForm(
                initialData || {
                    title: "",
                    description: "",
                    date: date ? moment(date).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
                    time: "",
                    type: "reminder",
                }
            );
        }, [initialData, open, date]);

        useEffect(() => {
            function handleKey(e) {
                if (e.key === "Escape") onClose();
            }
            if (open) document.addEventListener("keydown", handleKey);
            return () => document.removeEventListener("keydown", handleKey);
        }, [open, onClose]);

        function handleClickOutside(e) {
            if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
        }

        useEffect(() => {
            if (open) document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [open]);

        function handleChange(e) {
            const { name, value } = e.target;
            setForm((f) => ({ ...f, [name]: value }));
        }

        function handleSubmit(e) {
            e.preventDefault();
            if (!form.title.trim()) return;
            let start, end, allDay;
            if (form.time) {
                start = moment(form.date + "T" + form.time).toDate();
                end = moment(start).add(1, "hour").toDate();
                allDay = false;
            } else {
                start = moment(form.date).toDate();
                end = start;
                allDay = true;
            }
            onSave({
                ...form,
                start,
                end,
                allDay,
            });
        }

        if (!open) return null;
        return (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div ref={modalRef} className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg relative overflow-y-auto max-h-[90vh]">
                    <AdminTypography.button
                        className="absolute top-2 right-2 text-2xl text-gray-400 hover:text-gray-700"
                        aria-label="Close modal"
                        onClick={onClose}
                    >
                        ×
                    </AdminTypography.button>
                    <AdminTypography.h2 className="mb-6 text-gray-900">{initialData ? "Edit Event" : "Add Event/Reminder"}</AdminTypography.h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <AdminTypography.label htmlFor="title">Title</AdminTypography.label>
                            <input
                                id="title"
                                name="title"
                                type="text"
                                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                value={form.title}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <AdminTypography.label htmlFor="description">Description</AdminTypography.label>
                            <textarea
                                id="description"
                                name="description"
                                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                value={form.description}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <AdminTypography.label htmlFor="date">Date</AdminTypography.label>
                                <input
                                    id="date"
                                    name="date"
                                    type="date"
                                    className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                    value={form.date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div>
                                <AdminTypography.label htmlFor="time">Time</AdminTypography.label>
                                <input
                                    id="time"
                                    name="time"
                                    type="time"
                                    className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                    value={form.time}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div>
                            <AdminTypography.label htmlFor="type">Type</AdminTypography.label>
                            <select
                                id="type"
                                name="type"
                                className="border border-gray-300 rounded px-3 py-2 w-full mt-1"
                                value={form.type}
                                onChange={handleChange}
                            >
                                {EVENT_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <AdminTypography.button
                                type="button"
                                className="px-4 py-2 bg-gray-200 rounded"
                                onClick={onClose}
                            >
                                Cancel
                            </AdminTypography.button>
                            <AdminTypography.button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded"
                                aria-label={initialData ? "Save changes" : "Add event"}
                            >
                                Save
                            </AdminTypography.button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }


    // Persist reminders in localStorage
    const [events, setEvents] = useState(() => {
        const stored = localStorage.getItem("calendarEvents");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                return parsed.map(e => ({ ...e, start: new Date(e.start), end: new Date(e.end) }));
            } catch {
                return initialEvents;
            }
        }
        return initialEvents;
    });
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState({ offshore: true, onsite: true, reminder: true });
    const [modalOpen, setModalOpen] = useState(false);
    const [editEvent, setEditEvent] = useState(null);
    // selectedDate is the focused date for the calendar view
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [view, setView] = useState("month");

    // Filtered and searched events
    const filteredEvents = events.filter((e) => {
        const matchesType = filter[e.type];
        const matchesSearch =
            !search ||
            e.title.toLowerCase().includes(search.toLowerCase()) ||
            (e.description && e.description.toLowerCase().includes(search.toLowerCase()));
        return matchesType && matchesSearch;
    });


    function handleSelectSlot(slotInfo) {
        setSelectedDate(slotInfo.start);
        setEditEvent(null);
        setModalOpen(true);
    }


    function handleSelectEvent(event) {
        setEditEvent(event);
        setSelectedDate(event.start);
        setModalOpen(true);
    }

    function handleSave(eventData) {
        let updated;
        if (editEvent) {
            updated = events.map((e) => (e.id === editEvent.id ? { ...eventData, id: editEvent.id } : e));
        } else {
            updated = [
                ...events,
                { ...eventData, id: Date.now() },
            ];
        }
        setEvents(updated);
        localStorage.setItem("calendarEvents", JSON.stringify(updated));
        setModalOpen(false);
        setEditEvent(null);
        setSelectedDate(null);
    }

    function handleDelete(eventId) {
        const updated = events.filter((e) => e.id !== eventId);
        setEvents(updated);
        localStorage.setItem("calendarEvents", JSON.stringify(updated));
    }

    function eventPropGetter(event) {
        // Use yellow text for reminders for contrast
        let colorClass = getTypeColor(event.type);
        let textClass = event.type === "reminder" ? "text-gray-900" : "text-white";
        return {
            className: `${colorClass} ${textClass} border-none rounded shadow-sm cursor-pointer`,
            style: {
                backgroundColor: undefined,
                border: "none",
            },
        };
    }

    function EventComponent({ event }) {
        return (
            <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${getTypeColor(event.type)}`}></span>
                <span className="truncate font-semibold">{event.title}</span>
                <button
                    className="ml-2 text-xs text-red-500 hover:underline"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(event.id);
                    }}
                    title="Delete event"
                >
                    ×
                </button>
            </div>
        );
    }

    function tooltipAccessor(event) {
        return `${event.title}\n${event.description ? event.description + "\n" : ""}${event.allDay ? "All Day" : moment(event.start).format("hh:mm A")}`;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-wrap gap-4 items-center mb-6 justify-between">
                <AdminTypography.label className="text-gray-900">Calendar</AdminTypography.label>
                <div className="flex gap-2 flex-wrap items-center">
                    <input
                        type="text"
                        placeholder="Search events/reminders..."
                        className="px-4 py-2 border border-gray-300 rounded-full min-w-[200px] bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        aria-label="Search events"
                    />
                    <div className="relative">
                        <AdminTypography.button
                            className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 border border-gray-300"
                            onClick={() => setFilter((f) => ({ ...f, open: !f.open }))}
                            aria-haspopup="true"
                            aria-expanded={!!filter.open}
                        >
                            Filter
                        </AdminTypography.button>
                        {filter.open && (
                            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4 space-y-3">
                                {EVENT_TYPES.map((t) => (
                                    <label key={t.value} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={filter[t.value]}
                                            onChange={() => setFilter((f) => ({ ...f, [t.value]: !f[t.value] }))}
                                        />
                                        <span className={`font-medium ${t.color.replace("bg-", "text-")}`}>{t.label}</span>
                                    </label>
                                ))}
                                <div className="flex justify-end">
                                    <AdminTypography.button
                                        type="button"
                                        className="px-3 py-1 bg-blue-600 text-white rounded"
                                        onClick={() => setFilter((f) => ({ ...f, open: false }))}
                                    >
                                        Close
                                    </AdminTypography.button>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Need new table in db for cander. so, for now this option is disable. commented.              
                        <AdminTypography.button
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={() => { setModalOpen(true); setEditEvent(null); setSelectedDate(null); }}
                        aria-label="Add reminder"
                    >
                        + Add Reminder
                    </AdminTypography.button> */}
                </div>
            </div>
            {/* Custom Date Picker */}
            <div className="mb-4 flex flex-wrap gap-2 items-center">
                <CalendarDatePicker
                    selectedDate={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                />
                {/* Event Legend */}
                <div className="flex flex-wrap gap-3 items-center ml-4">
                    {EVENT_TYPES.map((t) => (
                        <span key={t.value} className="flex items-center gap-1 text-sm">
                            <span className={`inline-block w-3 h-3 rounded-full ${t.color} border border-gray-300`}></span>
                            <span>{t.legend} {t.label}</span>
                        </span>
                    ))}
                </div>
            </div>
            <div className="bg-white border rounded-xl shadow-sm p-4">
                <BigCalendar
                    localizer={localizer}
                    events={filteredEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 600 }}
                    views={["month", "week", "day"]}
                    view={view}
                    onView={setView}
                    date={selectedDate}
                    onNavigate={setSelectedDate}
                    selectable
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    eventPropGetter={eventPropGetter}
                    components={{ event: EventComponent, toolbar: () => null }}
                    tooltipAccessor={tooltipAccessor}
                    popup
                />
            </div>
            <AddEventModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditEvent(null); setSelectedDate(null); }}
                onSave={handleSave}
                initialData={editEvent}
                date={selectedDate}
            />
        </div>
    );

}