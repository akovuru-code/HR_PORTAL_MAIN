import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as loginApi } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import loginImg from "../assets/login.png";

const API_URL = "/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [role, setRole] = useState("admin");
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotReason, setForgotReason] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login: setAuthUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    try {
      const res = await loginApi(email, password, role);
      if (res.token) {
        setAuthUser(res.user, res.token);
        localStorage.setItem("user", JSON.stringify(res.user));
        const userRole = (res.user.role || "").toLowerCase();
        if (res.mustChangePassword) {
          setError("Please contact an administrator to reset your password.");
          return;
        }
        if (res.user.accountType === "root_admin" || res.user.accountType === "admin" || userRole === "admin") {
          navigate("/admin/dashboard");
        } else if (userRole === "emp" || userRole === "employee") {
          navigate("/employee/dashboard");
        } else {
          setError("Unknown user role");
        }
      } else {
        setError(res.error || "Login failed");
      }
    } catch {
      setError("Invalid credentials");
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    setLoading(true);

    try {
      if (!forgotEmail && !email) {
        setForgotError("Your email is required.");
        return;
      }
      if (!forgotReason || forgotReason.trim().length < 10) {
        setForgotError("Please provide a reason with at least 10 characters.");
        return;
      }
      const res = await fetch(`${API_URL}/auth/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: (forgotEmail || email).trim(), reason: forgotReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to send request");
      setForgotSuccess(data.message || "If the account is eligible, your password reset request has been submitted.");
      setForgotReason("");
      setForgotEmail("");
    } catch (err) {
      setForgotError(err.message || "Unable to process request");
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="text-3xl font-semibold text-center mb-8 text-[#1a3353]">Welcome Back</h2>
          {error && <div className="text-red-600 mb-2 text-center">{error}</div>}
          <form onSubmit={handleSubmit}>
            <label className="block text-[#1a3353] mb-1">Email Id</label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full mb-4 p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="block text-[#1a3353] mb-1">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
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
            <div className="flex items-center mb-6">
              <input type="checkbox" className="mr-2" id="remember" />
              <label htmlFor="remember" className="text-[#1a3353] text-sm">Remember me on this computer</label>
            </div>
            <button
              type="submit"
              className="w-full bg-[#1a3353] text-white py-3 rounded text-lg font-semibold hover:bg-[#223e6a] transition"
            >
              LOG IN
            </button>
          </form>
          <div className="mt-6 text-center">
            <button type="button" onClick={() => { setShowForgotModal(true); setForgotError(""); setForgotSuccess(""); }} className="text-sm text-[#e76f51] hover:underline">Forgot Password?</button>
          </div>
          {/* Register Link Future Use 
          <div className="mt-4 text-center">
            <span className="text-sm text-gray-600">Don't have an account? </span>
            <Link to="/register" className="text-blue-600 hover:underline text-sm">Register</Link>
          </div>*/}
        </div>
      </div>
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-semibold text-[#1a3353]">Forgot Password</h3>
              <button type="button" onClick={() => setShowForgotModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            {forgotError && <div className="mb-4 text-sm text-red-600">{forgotError}</div>}
            {forgotSuccess && <div className="mb-4 text-sm text-green-600">{forgotSuccess}</div>}
            <form onSubmit={handleForgotSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#1a3353] mb-1">Your Email</label>
                  <input type="email" value={forgotEmail || email} onChange={(e) => setForgotEmail(e.target.value)} className="w-full border rounded px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm text-[#1a3353] mb-1">Reason for Request</label>
                  <textarea value={forgotReason} onChange={(e) => setForgotReason(e.target.value)} placeholder="Explain why you need a password reset..." className="w-full border rounded px-3 py-2 min-h-[110px]" required />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowForgotModal(false)} className="px-4 py-2 rounded bg-gray-200">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-[#1a3353] text-white">
                  {loading ? "Processing..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
