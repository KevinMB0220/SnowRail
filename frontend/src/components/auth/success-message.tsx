/**
 * Success message component
 * Shows temporary success notifications
 */

import { CheckCircle2 } from "lucide-react";

type SuccessMessageProps = {
  message: string;
  onClose?: () => void;
};

export function SuccessMessage({ message, onClose }: SuccessMessageProps) {
  return (
    <div
      style={{
        padding: "0.75rem",
        backgroundColor: "#f0fdf4",
        border: "1px solid #86efac",
        borderRadius: "0.5rem",
        display: "flex",
        alignItems: "flex-start",
        gap: "0.5rem",
      }}
    >
      <CheckCircle2 style={{ width: "1.25rem", height: "1.25rem", color: "#16a34a", flexShrink: 0, marginTop: "0.125rem" }} />
      <p style={{ fontSize: "0.875rem", color: "#166534", flex: 1 }}>{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#16a34a",
            cursor: "pointer",
            padding: "0.25rem",
            display: "flex",
            alignItems: "center",
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
