import React from "react";
export function Label({ children, className = '', ...props }) {
  return <label {...props} className={`block font-semibold mb-1 text-slate-700 ${className}`}>{children}</label>;
} 