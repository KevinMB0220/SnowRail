/**
 * User menu component
 * Shows user info and logout option in header
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/use-auth.js";
import { LogOut, ChevronDown, User, Wallet, X } from "lucide-react";
import { CoreWalletButton } from "../core-wallet-button.js";
import { useCoreWallet } from "../../hooks/use-core-wallet.js";
import { motion, AnimatePresence } from "framer-motion";

export function UserMenu() {
  const navigate = useNavigate();
  const { user, company, logout } = useAuth();
  const { isConnected, account, disconnectWallet } = useCoreWallet();
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
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all duration-200 ${
          isOpen 
            ? 'bg-white/10 border-electric-blue/50 text-white' 
            : 'bg-transparent border-white/10 text-gray-300 hover:bg-white/5 hover:border-white/20 hover:text-white'
        }`}
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-electric-blue to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-electric-blue/20">
          {companyInitial}
        </div>

        {/* User info */}
        <div className="flex flex-col items-start min-w-0">
          <span className="text-sm font-semibold text-white truncate max-w-[12rem]">
            {company.legalName}
          </span>
          <span className="text-xs text-gray-400 truncate max-w-[12rem]">
            {user.email}
          </span>
        </div>

        {/* Chevron icon */}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+0.5rem)] w-72 bg-navy-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 glass-panel"
          >
            {/* User info section */}
            <div className="p-4 border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-electric-blue to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-electric-blue/20">
                  {companyInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {company.legalName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-2 rounded-lg bg-navy-800/50 border border-white/5 mb-3">
                <User className="w-3.5 h-3.5 text-electric-blue" />
                <span className="text-xs font-medium text-gray-300">
                  Account active
                </span>
              </div>
              
              <div className="flex items-center gap-2 p-2 rounded-lg bg-navy-800/50 border border-white/5">
                <Wallet className="w-3.5 h-3.5 text-electric-blue" />
                <div className="flex-1">
                  <CoreWalletButton variant="text" showDisconnect={true} />
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="p-2">
              {/* Disconnect wallet button - only show when connected */}
              {isConnected && account && (
                <button
                  onClick={disconnectWallet}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 transition-colors mb-2"
                >
                  <X className="w-4 h-4" />
                  <span>Disconnect Wallet</span>
                </button>
              )}
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
