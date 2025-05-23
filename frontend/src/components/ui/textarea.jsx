import React from "react";
export function Textarea({ className = '', ...props }) {
  return <textarea {...props} className={`border border-slate-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} />;
} 