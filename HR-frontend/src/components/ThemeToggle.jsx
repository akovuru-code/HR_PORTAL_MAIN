import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => localStorage.theme === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.theme = isDark ? "dark" : "light";
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="px-3 py-1 bg-gray-300 dark:bg-gray-600 rounded"
    >
      {isDark ? "Light Mode" : "Dark Mode"}
    </button>
  );
}