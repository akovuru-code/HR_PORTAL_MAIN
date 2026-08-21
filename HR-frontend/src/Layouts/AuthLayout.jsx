import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 shadow-md rounded-xl">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;