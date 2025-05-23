import React from "react";

export function Button({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
} 