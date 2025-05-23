// Minimal placeholder for toast notifications
export function useToast() {
  return {
    toast: ({ title, description }) => {
      alert(`${title ? title + ": " : ""}${description || ""}`);
    }
  };
} 