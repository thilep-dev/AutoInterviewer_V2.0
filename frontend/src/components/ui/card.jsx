import React from "react";
export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-white rounded-xl shadow p-6 border border-slate-200 ${className}`} {...props}>
      {children}
    </div>
  );
} 