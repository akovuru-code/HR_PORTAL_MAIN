import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register as registerApi } from "../../services/api";
import loginImg from "../../assets/login.png";
import { useAuth } from "../../hooks/useAuth";

export default function AdminRegister() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("admin");
    const [fillingCompany, setFillingCompany] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.role?.toLowerCase() === "admin";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        if (!name || !email || !password) {
            setError("All fields are required.");
            return;
        }
        if (/^\d+$/.test(name.trim())) {
            setError("Username cannot contain only numbers.");
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email.trim())) {
            setError("Please enter a valid email address.");
            return;
        }
        try {
            const res = await registerApi(name, email, password, role, fillingCompany);
            if (res.success) {
                setSuccess(res.message || "Registration successful! You can now log in.");
                setTimeout(() => {
                    navigate("/admin/options");
                }, 1200);
            } else {
                setError(res.error || "Registration failed");
            }
        } catch (err) {
            setError("Registration failed");
        }
    };

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#e9edf4]">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                    <h2 className="text-2xl font-semibold text-red-600 mb-2">
                        Unauthorized
                    </h2>
                    <p className="text-gray-600">
                        This page is available only for administrators.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen flex items-center justify-end bg-[#e9edf4]"
            style={{
                backgroundImage: `url(${loginImg})`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'left center',
                backgroundSize: 'contain',
            }}
        >
            <div className="flex-1 flex items-center justify-end">
                <div className="w-full max-w-md bg-white rounded-xl shadow p-10 m-12">
                    <div className="mb-4 bg-blue-50 border border-blue-200 rounded px-4 py-2 text-blue-900 text-sm">
                        ***Note : For Employee accounts, please create using the provided email and temporary password as temp123***
                    </div>

                    <h2 className="text-3xl font-semibold text-center mb-8 text-[#1a3353]">Create Account</h2>
                    {error && <div className="text-red-600 mb-2 text-center">{error}</div>}
                    {success && <div className="text-green-600 mb-2 text-center">{success}</div>}
                    <form onSubmit={handleSubmit}>
                        <label className="block text-[#1a3353] mb-1">Name</label>
                        <input
                            type="text"
                            placeholder="Your Name"
                            className="w-full mb-4 p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <label className="block text-[#1a3353] mb-1">Email</label>
                        <input
                            type="email"
                            placeholder="Your Email"
                            className="w-full mb-4 p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <label className="block text-[#1a3353] mb-1">Password</label>
                        <input
                            type="password"
                            placeholder="Password123"
                            className="w-full mb-4 p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <div>
                            <label className="block text-[#1a3353] mb-1">Role</label>
                            <select
                                className="w-full mb-4 p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
                                value={role}
                                onChange={e => setRole(e.target.value)}
                            >
                                <option value="admin">Admin</option>
                                <option value="employee">Employee</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[#1a3353] mb-1">Filling Company</label>
                            <select aria-label="present-employer" value={fillingCompany} onChange={e => setFillingCompany(e.target.value)} className="w-full border rounded px-3 py-2">
                                <option value="">Select Company</option>
                                <option>Siritek Inc</option>
                                <option>Gannusoftware</option>
                                <option>Savvyinfosystems</option>
                                <option>Globalinfotech Inc</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-[#1a3353] text-white py-3 rounded text-lg font-semibold hover:bg-[#223e6a] transition mt-2"
                        >
                            Register
                        </button>
                    </form>
                    <div className="mt-6 text-center text-sm text-gray-600">
                        Employee and administrator accounts can be created only by an authenticated administrator.
                    </div>
                </div>
            </div>
        </div>
    );
}