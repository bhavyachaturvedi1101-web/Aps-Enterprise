import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * APS AIFloatingLauncher
 * Sleek, modern floating button with "Ask Me" label that directs to the dedicated /ai workspace.
 */
export default function APSAIChatPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pulse, setPulse] = useState(false);

  // Periodic subtle pulse animation
  useEffect(() => {
    const id = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 1400);
    }, 14000);
    return () => clearInterval(id);
  }, []);

  // If already on /ai page, don't show the launcher
  if (location.pathname === '/ai' || location.pathname === '/chatbot') {
    return null;
  }

  return (
    <>
      <button
        id="apsai-chat-launcher"
        onClick={() => navigate('/ai')}
        style={{ ...s.launcher, ...(pulse ? s.launcherPulse : {}) }}
        title="Ask APS AI Assistant"
        aria-label="Ask APS AI Assistant"
      >
        <div style={s.iconWrap}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.25 2 11.5c0 2.3.87 4.4 2.3 6.03L3 21l4.2-1.15A10.45 10.45 0 0 0 12 21c5.52 0 10-4.25 10-9.5S17.52 2 12 2z" />
            <path d="M8 11h.01M12 11h.01M16 11h.01" strokeWidth="3" />
          </svg>
        </div>
        <span style={s.labelText}>Ask Me</span>
        <div style={s.arrowWrap}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </button>

      <style>{`
        @keyframes apsai-pill-pulse {
          0%, 100% { box-shadow: 0 4px 18px rgba(37,99,235,0.4); }
          50% { box-shadow: 0 4px 18px rgba(37,99,235,0.4), 0 0 0 10px rgba(37,99,235,0); }
        }
        #apsai-chat-launcher:hover {
          transform: translateY(-3px) scale(1.04);
          box-shadow: 0 8px 24px rgba(37,99,235,0.5);
          background: linear-gradient(135deg, #1e40af, #3b82f6) !important;
        }
        #apsai-chat-launcher:active {
          transform: translateY(-1px) scale(0.98);
        }
      `}</style>
    </>
  );
}

const s = {
  launcher: {
    position: 'fixed',
    bottom: 26,
    right: 28,
    zIndex: 9999,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px 10px 14px',
    borderRadius: 28,
    background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
    border: '1.5px solid rgba(255,255,255,0.65)',
    color: '#ffffff',
    cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(37,99,235,0.42), 0 2px 6px rgba(0,0,0,0.1)',
    transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    userSelect: 'none'
  },
  launcherPulse: {
    animation: 'apsai-pill-pulse 1.4s ease-out'
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  labelText: {
    fontSize: '0.86rem',
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '0.2px',
    whiteSpace: 'nowrap'
  },
  arrowWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2
  }
};
