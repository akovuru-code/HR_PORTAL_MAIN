/*import React, { useState } from 'react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [securityText, setSecurityText] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ username, password, securityText, rememberMe });
  };

  return (
    <div className="flex min-h-screen bg-[#e9edf5]">
      {/* Left Illustration *//*}
<div className="w-1/2 flex items-center justify-center">
<div className="text-center">
<img src="/illustration.svg" alt="Illustration" className="mx-auto w-80" />
</div>
</div>

{/* Right Form *//*}
<div className="w-1/2 flex items-center justify-center">
  <form
    onSubmit={handleSubmit}
    className="bg-white p-10 rounded shadow-md w-full max-w-md"
  >
    <h2 className="text-2xl font-semibold mb-6">Welcome Back</h2>

    <label className="block mb-2 text-sm font-medium">User Name</label>
    <input
      type="email"
      value={username}
      onChange={(e) => setUsername(e.target.value)}
      className="w-full px-4 py-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
      placeholder="hannah.green@test.com"
      required
    />

    <label className="block mb-2 text-sm font-medium">Password</label>
    <input
      type="password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      className="w-full px-4 py-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
      placeholder="Password123@"
      required
    />

    <label className="block mb-2 text-sm font-medium">Security Text</label>
    <div className="flex items-center gap-4 mb-4">
      <input
        type="text"
        value={securityText}
        onChange={(e) => setSecurityText(e.target.value)}
        className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder="Enter the shown text"
        required
      />
      <img
        src="/captcha.png"
        alt="captcha"
        className="h-10 w-24 border rounded"
      />
    </div>

    <div className="flex items-center mb-4">
      <input
        type="checkbox"
        id="remember"
        checked={rememberMe}
        onChange={(e) => setRememberMe(e.target.checked)}
        className="mr-2"
      />
      <label htmlFor="remember" className="text-sm">
        Remember me on this computer
      </label>
    </div>

    <button
      type="submit"
      className="w-full bg-blue-800 text-white py-2 rounded hover:bg-blue-900 transition"
    >
      LOG IN
    </button>

    <div className="text-center mt-4">
      <a href="#" className="text-sm text-red-500 hover:underline">
        Forgot Password?
      </a>
    </div>
  </form>
</div>
</div>
);
}

*/
