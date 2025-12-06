/**
 * User menu component
 * Shows user info and logout option in header
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/use-auth.js";
import { LogOut, ChevronDown, User } from "lucide-react";

export function UserMenu() {
  const navigate = useNavigate();
  const { user, company, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate("/login");
  };

  if (!user || !company) {
    return null;
  }

  const companyInitial = company.legalName.charAt(0).toUpperCase();

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.5rem 0.75rem",
          paddingRight: "1rem",
          backgroundColor: isOpen ? "#f0fdfa" : "transparent",
          border: "1px solid",
          borderColor: isOpen ? "#14b8a6" : "#e5e5e5",
          borderRadius: "0.5rem",
          cursor: "pointer",
          transition: "all 0.2s ease",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = "#f0fdfa";
            e.currentTarget.style.borderColor = "#99f6e4";
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.borderColor = "#e5e5e5";
          }
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: "2rem",
            height: "2rem",
            backgroundColor: "#14b8a6",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: "0.875rem",
            fontWeight: 600,
            flexShrink: 0,
            border: "2px solid #ffffff",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          {companyInitial}
        </div>

        {/* User info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "0.125rem",
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#134e4a",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "12rem",
            }}
          >
            {company.legalName}
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              color: "#0d9488",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "12rem",
            }}
          >
            {user.email}
          </span>
        </div>

        {/* Chevron icon */}
        <ChevronDown
          style={{
            width: "1rem",
            height: "1rem",
            color: "#0d9488",
            transition: "transform 0.2s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 0.5rem)",
            width: "16rem",
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            border: "1px solid #e5e5e5",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          {/* User info section */}
          <div
            style={{
              padding: "1rem",
              borderBottom: "1px solid #e5e5e5",
              backgroundColor: "#f9fafb",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              <div
                style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  backgroundColor: "#14b8a6",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: "1rem",
                  fontWeight: 600,
                  flexShrink: 0,
                  border: "2px solid #ffffff",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                }}
              >
                {companyInitial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "#134e4a",
                    margin: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {company.legalName}
                </p>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#0d9488",
                    margin: "0.25rem 0 0 0",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user.email}
                </p>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem",
                backgroundColor: "#ffffff",
                borderRadius: "0.5rem",
                border: "1px solid #e5e5e5",
              }}
            >
              <User style={{ width: "0.875rem", height: "0.875rem", color: "#14b8a6" }} />
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#0f766e",
                  fontWeight: 500,
                }}
              >
                Account active
              </span>
            </div>
          </div>

          {/* Menu items */}
          <div style={{ padding: "0.5rem" }}>
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#dc2626",
                backgroundColor: "transparent",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#fef2f2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <LogOut style={{ width: "1rem", height: "1rem", flexShrink: 0 }} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
