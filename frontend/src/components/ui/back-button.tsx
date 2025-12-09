/**
 * Back Button Component
 * Reusable back button with primary styling (green with white text)
 */

import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type BackButtonProps = {
  onClick?: () => void;
  label?: string;
  iconOnly?: boolean;
};

export function BackButton({ onClick, label = "Back", iconOnly = false }: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="btn btn-primary"
      type="button"
      title={iconOnly ? "Go back" : undefined}
    >
      <ArrowLeft size={18} />
      {!iconOnly && label}
    </button>
  );
}
