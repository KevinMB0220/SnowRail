/**
 * Back Button Component
 * Reusable back button
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
      className="btn btn-secondary bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-electric-blue/50 transition-colors"
      type="button"
      title={iconOnly ? "Go back" : undefined}
    >
      <ArrowLeft size={18} />
      {!iconOnly && label}
    </button>
  );
}
