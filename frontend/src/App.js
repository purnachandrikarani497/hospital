import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import Logo from "./components/Logo";
import API from "./api";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import DoctorLogin from "./pages/DoctorLogin";
import Register from "./pages/Register";
 
import DoctorDetails from "./pages/DoctorDetails";
import Payment from "./pages/Payment";
import DoctorDashboard from "./pages/DoctorDashboard";
import DoctorToday from "./pages/DoctorToday";
import DoctorProfile from "./pages/DoctorProfile";
import Prescription from "./pages/Prescription";
import AdminPendingDoctors from "./pages/AdminPendingDoctors";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAppointments from "./pages/AdminAppointments";
import AdminAddDoctor from "./pages/AdminAddDoctor";
import SearchDoctors from "./pages/SearchDoctors";
import Profile from "./pages/Profile";
import Appointments from "./pages/Appointments";


function Header() {
  const location = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bell, setBell] = useState(() => {
    try { return Number(localStorage.getItem('patientBellCount') || 0) || 0; } catch(_) { return 0; }
  });
  const [notifs, setNotifs] = useState([]);
  const [seenIds, setSeenIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('seenNotifIds') || '[]')); } catch(_) { return new Set(); }
  });
  const [muteUntil, setMuteUntil] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelItems, setPanelItems] = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelUnread, setPanelUnread] = useState(0);
  const hideHeader = location.pathname.startsWith('/admin') || location.pathname.startsWith('/doctor') || location.pathname.startsWith('/prescription');
  const token = localStorage.getItem('token');
  const uid = localStorage.getItem('userId');
  const photo = uid ? localStorage.getItem(`userPhotoBase64ById_${uid}`) : '';
  const userName = uid ? localStorage.getItem(`userNameById_${uid}`) || '' : '';
  const showAdminLink = false; // Hide admin button as login is unified
  useEffect(() => {
    (async () => {
      try {
        if (!token) return;
        const { data } = await API.get('/notifications', { params: { unread: 1 } });
        const items = Array.isArray(data) ? data : [];
        const unread = items.filter((x) => !x.read).length;
        setBell(unread);
        try { localStorage.setItem('patientBellCount', String(unread)); } catch(_) {}
      } catch (_) {}
    })();
    try {
      const chan = new BroadcastChannel('chatmsg');
      const onMsg = (e) => {
        try {
          const { apptId, actor } = e.data || {};
          if (String(actor || '').toLowerCase() !== 'doctor') return;
          setBell((c) => {
            const next = c + 1;
            try { localStorage.setItem('patientBellCount', String(next)); } catch(_) {}
            return next;
          });
          try { localStorage.setItem('lastChatApptId', String(apptId || '')); } catch(_) {}
        } catch(_) {}
      };
      chan.onmessage = onMsg;
      return () => { try { chan.close(); } catch(_) {} };
    } catch(_) {}
  }, [token]);
  useEffect(() => {
    const origin = String(API.defaults.baseURL || '').replace(/\/(api)?$/, '');
    const w = window;
    const cleanup = [];
    const onReady = () => {
      try {
        const socket = w.io ? w.io(origin, { transports: ['websocket','polling'], auth: { token: localStorage.getItem('token') || '' } }) : null;
        if (socket) {
          socket.on('notify', (p) => {
            try {
              if (Date.now() < muteUntil) return;
              const id = String(Date.now()) + String(Math.random());
              const text = p?.message || '';
              const link = p?.link || '';
              const type = p?.type || 'general';
              const apptId = p?.apptId ? String(p.apptId) : '';
              try {
                if (p?.type === 'chat' && p?.apptId) localStorage.setItem('lastChatApptId', String(p.apptId));
              } catch(_) {}
              try {
                const sid = String(p?.id || '');
                if (sid) {
                  setSeenIds((prev) => {
                    const next = new Set(prev);
                    next.add(sid);
                    try { localStorage.setItem('seenNotifIds', JSON.stringify(Array.from(next))); } catch(_) {}
                    return next;
                  });
                }
              } catch(_) {}
              setBell((c) => {
                const next = c + 1;
                try { localStorage.setItem('patientBellCount', String(next)); } catch(_) {}
                return next;
              });
              setNotifs((prev) => [{ id, text, link, type, apptId }, ...prev].slice(0, 4));
              setTimeout(() => { setNotifs((prev) => prev.filter((n) => n.id !== id)); }, 6000);
              if (panelOpen) {
                const item = { _id: p?.id || String(Date.now()), id: p?.id || String(Date.now()), message: text, link, type, createdAt: new Date().toISOString(), read: false, apptId };
                setPanelItems((prev) => {
                  const exists = prev.some((x) => String(x._id || x.id) === String(item._id || item.id));
                  if (exists) return prev;
                  return [item, ...prev].slice(0, 100);
                });
                setPanelUnread((c) => c + 1);
              }
            } catch (_) {}
          });
          cleanup.push(() => { try { socket.close(); } catch(_) {} });
        }
      } catch (_) {}
    };
    if (!token) return () => {};
    if (!w.io) {
      const s = document.createElement('script');
      s.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
      s.onload = onReady;
      document.body.appendChild(s);
      cleanup.push(() => { try { document.body.removeChild(s); } catch(_) {} });
    } else {
      onReady();
    }
    return () => { cleanup.forEach((fn) => fn()); };
  }, [token]);

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        if (!token) return;
        const { data } = await API.get('/notifications', { params: { unread: 1 } });
        const items = Array.isArray(data) ? data : [];
        items.forEach((n) => {
          const sid = String(n._id || n.id || '');
          if (!sid || seenIds.has(sid)) return;
          const id = String(Date.now()) + String(Math.random());
          const text = n.message || '';
          const link = n.link || '';
          const type = n.type || 'general';
          const apptId = n.apptId ? String(n.apptId) : '';
          setNotifs((prev) => [{ id, text, link, type, apptId }, ...prev].slice(0, 4));
          setTimeout(() => { setNotifs((prev) => prev.filter((x) => x.id !== id)); }, 6000);
          setSeenIds((prev) => {
            const next = new Set(prev); next.add(sid);
            try { localStorage.setItem('seenNotifIds', JSON.stringify(Array.from(next))); } catch(_) {}
            return next;
          });
        });
      } catch(_) {}
    }, 15000);
    return () => clearInterval(t);
  }, [token, seenIds]);
  if (hideHeader) return null;
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 animate-slide-in-down shadow-2xl border-b-4 border-white/30">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 via-purple-500/30 via-indigo-600/30 to-blue-600/30 animate-pulse"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>

      {/* Floating particles */}
      <div className="absolute top-2 left-10 w-3 h-3 bg-blue-300 rounded-full animate-bounce opacity-60"></div>
      <div className="absolute top-4 right-20 w-2 h-2 bg-purple-300 rounded-full animate-bounce opacity-50" style={{ animationDelay: '0.5s' }}></div>
      <div className="absolute bottom-2 left-1/3 w-2.5 h-2.5 bg-indigo-300 rounded-full animate-bounce opacity-55" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-3 right-1/4 w-1.5 h-1.5 bg-blue-200 rounded-full animate-bounce opacity-70" style={{ animationDelay: '1.5s' }}></div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="flex items-center justify-between h-12">
          {/* Animated Logo */}
          <Link to="/" className="flex items-center gap-2 group relative">
            <div className="relative">
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-xl group-hover:shadow-yellow-400/50 transition-all duration-500 group-hover:scale-105 group-hover:rotate-6 animate-pulse border border-yellow-300">
                <Logo size={18} />
              </div>
              {/* Logo glow rings */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-lg animate-ping opacity-25 group-hover:opacity-50"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-lg animate-pulse opacity-15 group-hover:opacity-30" style={{ animationDelay: '0.5s' }}></div>
            </div>
            <span className="text-xl font-bold text-white group-hover:text-yellow-200 transition-all duration-300 animate-pulse drop-shadow-lg">
              HospoZen
            </span>
            {/* Text sparkle effect */}
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping opacity-0 group-hover:opacity-100"></div>
            <div className="absolute -bottom-0.5 -left-0.5 w-1 h-1 bg-pink-300 rounded-full animate-ping opacity-0 group-hover:opacity-100" style={{ animationDelay: '0.3s' }}></div>
          </Link>

          <div className="flex items-center gap-4">
            {/* Animated Mobile Menu Button */}
            <button className="md:hidden w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:rotate-12 animate-pulse border border-white/30" onClick={() => setMobileOpen((v) => !v)}>
              <span className="text-white text-lg animate-bounce">☰</span>
            </button>

            {/* Animated Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
              {(() => {
                const p = location.pathname;
                return (
                  <>
                    <Link
                      to="/"
                      className={`relative px-4 py-2 rounded-lg font-semibold text-base transition-all duration-500 transform hover:scale-105 hover:rotate-2 animate-pulse ${
                        p === "/"
                          ? "bg-white text-purple-600 shadow-xl animate-bounce"
                          : "text-white hover:text-yellow-200 hover:bg-white/20 hover:shadow-lg"
                      }`}
                    >
                      <span className="relative z-10">Home</span>
                      {/* Active indicator glow */}
                      {p === "/" && (
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-lg animate-pulse opacity-40"></div>
                      )}
                      {/* Hover particles */}
                      <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping opacity-0 hover:opacity-100"></div>
                      <div className="absolute -bottom-0.5 -left-0.5 w-1 h-1 bg-pink-300 rounded-full animate-ping opacity-0 hover:opacity-100" style={{ animationDelay: '0.3s' }}></div>
                    </Link>

                    <Link
                      to="/search"
                      className={`relative px-4 py-2 rounded-lg font-semibold text-base transition-all duration-500 transform hover:scale-105 hover:-rotate-2 animate-pulse ${
                        p.startsWith("/search")
                          ? "bg-white text-purple-600 shadow-xl animate-bounce"
                          : "text-white hover:text-yellow-200 hover:bg-white/20 hover:shadow-lg"
                      }`}
                      style={{ animationDelay: '0.1s' }}
                    >
                      <span className="relative z-10">All Doctors</span>
                      {p.startsWith("/search") && (
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-lg animate-pulse opacity-40"></div>
                      )}
                      <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping opacity-0 hover:opacity-100"></div>
                      <div className="absolute -bottom-0.5 -left-0.5 w-1 h-1 bg-pink-300 rounded-full animate-ping opacity-0 hover:opacity-100" style={{ animationDelay: '0.3s' }}></div>
                    </Link>

                    <Link
                      to="/about"
                      className={`relative px-4 py-2 rounded-lg font-semibold text-base transition-all duration-500 transform hover:scale-105 hover:rotate-3 animate-pulse ${
                        p.startsWith("/about")
                          ? "bg-white text-purple-600 shadow-xl animate-bounce"
                          : "text-white hover:text-yellow-200 hover:bg-white/20 hover:shadow-lg"
                      }`}
                      style={{ animationDelay: '0.2s' }}
                    >
                      <span className="relative z-10">About</span>
                      {p.startsWith("/about") && (
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-lg animate-pulse opacity-40"></div>
                      )}
                      <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping opacity-0 hover:opacity-100"></div>
                      <div className="absolute -bottom-0.5 -left-0.5 w-1 h-1 bg-pink-300 rounded-full animate-ping opacity-0 hover:opacity-100" style={{ animationDelay: '0.3s' }}></div>
                    </Link>

                    <Link
                      to="/contact"
                      className={`relative px-4 py-2 rounded-lg font-semibold text-base transition-all duration-500 transform hover:scale-105 hover:-rotate-3 animate-pulse ${
                        p.startsWith("/contact")
                          ? "bg-white text-purple-600 shadow-xl animate-bounce"
                          : "text-white hover:text-yellow-200 hover:bg-white/20 hover:shadow-lg"
                      }`}
                      style={{ animationDelay: '0.3s' }}
                    >
                      <span className="relative z-10">Contact</span>
                      {p.startsWith("/contact") && (
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-lg animate-pulse opacity-40"></div>
                      )}
                      <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping opacity-0 hover:opacity-100"></div>
                      <div className="absolute -bottom-0.5 -left-0.5 w-1 h-1 bg-pink-300 rounded-full animate-ping opacity-0 hover:opacity-100" style={{ animationDelay: '0.3s' }}></div>
                    </Link>

                    {showAdminLink && (
                      <Link
                        to="/admin/login"
                        className={`relative px-4 py-2 rounded-lg font-semibold text-base transition-all duration-500 transform hover:scale-105 hover:rotate-6 animate-pulse ${
                          p.startsWith("/admin")
                            ? "bg-white text-purple-600 shadow-xl animate-bounce"
                            : "text-white hover:text-yellow-200 hover:bg-white/20 hover:shadow-lg"
                        }`}
                        style={{ animationDelay: '0.4s' }}
                      >
                        <span className="relative z-10">Admin</span>
                        {p.startsWith("/admin") && (
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-lg animate-pulse opacity-40"></div>
                        )}
                        <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping opacity-0 hover:opacity-100"></div>
                        <div className="absolute -bottom-0.5 -left-0.5 w-1 h-1 bg-pink-300 rounded-full animate-ping opacity-0 hover:opacity-100" style={{ animationDelay: '0.3s' }}></div>
                      </Link>
                    )}
                  </>
                );
              })()}
            </nav>

            {/* Animated Mobile Menu */}
            {mobileOpen && (
              <div className="absolute top-20 left-0 right-0 mx-4 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-6 animate-slide-in-down md:hidden">
                <div className="space-y-4">
                  {[
                    { path: '/', label: 'Home' },
                    { path: '/search', label: 'All Doctors' },
                    { path: '/about', label: 'About' },
                    { path: '/contact', label: 'Contact' }
                  ].map((item, index) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gradient-to-r hover:from-yellow-400 hover:to-pink-400 hover:text-white transition-all duration-300 animate-fade-in hover:scale-105"
                      onClick={() => setMobileOpen(false)}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <span className="text-2xl animate-bounce">⭐</span>
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  ))}
                  {showAdminLink && (
                    <Link
                      to="/admin/login"
                      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gradient-to-r hover:from-yellow-400 hover:to-pink-400 hover:text-white transition-all duration-300 animate-fade-in hover:scale-105"
                      onClick={() => setMobileOpen(false)}
                      style={{ animationDelay: '0.4s' }}
                    >
                      <span className="text-2xl animate-bounce">⚡</span>
                      <span className="font-medium">Admin</span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Animated User Menu */}
          {token ? (
            <div className="flex items-center gap-3">
              {/* Animated Notification Bell */}
              <div className="relative">
                <button
                  onClick={async () => {
                    try {
                      setPanelOpen((v) => !v);
                      if (!panelOpen) {
                        setPanelLoading(true);
                        const { data } = await API.get('/notifications');
                        const items = Array.isArray(data) ? data : [];
                        setPanelItems(items);
                        const unread = items.filter((x) => !x.read).length;
                        setPanelUnread(unread);
                        setBell(unread);
                        try { localStorage.setItem('patientBellCount', String(unread)); } catch(_) {}
                        setPanelLoading(false);
                      }
                    } catch (_) { setPanelLoading(false); }
                  }}
                  className="relative w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xl hover:shadow-yellow-400/50 transition-all duration-500 hover:scale-105 hover:rotate-6 animate-pulse border border-yellow-300"
                >
                  <span className="text-purple-600 text-xl animate-bounce">🔔</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-xl animate-ping opacity-20"></div>
                  {bell > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-ping shadow-lg animate-bounce">
                      {bell > 9 ? '9+' : bell}
                    </span>
                  )}
                </button>

                {/* Notification Panel */}
                {panelOpen && (
                  <div className="absolute right-0 top-14 w-96 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 z-50 animate-slide-in-down">
                    <div className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 text-white px-6 py-4 rounded-t-3xl flex items-center justify-between animate-pulse">
                      <div className="font-bold text-lg animate-bounce">🔔 Notifications</div>
                      <div className="bg-white/20 text-sm px-3 py-1 rounded-full animate-pulse">{panelUnread} New</div>
                    </div>
                    <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                      {panelLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto animate-pulse"></div>
                          <p className="text-purple-600 mt-2 font-medium animate-pulse">Loading...</p>
                        </div>
                      ) : panelItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <span className="text-4xl animate-bounce">📭</span>
                          <p className="mt-2 animate-pulse">No notifications yet</p>
                        </div>
                      ) : (
                        panelItems.map((n, index) => (
                          <div key={n._id || n.id} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 hover:from-yellow-50 hover:to-pink-50 transition-all duration-300 animate-fade-in hover:scale-105 border border-gray-200/50" style={{ animationDelay: `${index * 0.1}s` }}>
                            <div className="flex items-start justify-between">
                              <button
                                onClick={async () => {
                                  try {
                                    if (n.type === 'chat' && n.apptId) localStorage.setItem('lastChatApptId', String(n.apptId));
                                    if (n.type === 'chat' && (!n.link || !n.link.includes('alertChat=1'))) {
                                      const msg = String(n.message || n.text || '').toLowerCase();
                                      const extra = msg.includes('report uploaded') ? '&view=reports' : '';
                                      nav(`/appointments?alertChat=1${extra}`);
                                    } else if (n.type === 'meet' && n.apptId) {
                                      nav(`/appointments?joinMeet=${encodeURIComponent(String(n.apptId))}`);
                                    } else if (n.type === 'appointment') {
                                      nav('/appointments');
                                    } else if (n.link) {
                                      nav(n.link);
                                    }
                                    setPanelOpen(false);
                                    try { await API.put(`/notifications/${n._id || n.id}/read`); } catch(_) {}
                                    setPanelItems((prev) => prev.map((x) => (String(x._id || x.id) === String(n._id || n.id) ? { ...x, read: true } : x)));
                                    setPanelUnread((c) => Math.max(0, c - 1));
                                    setBell((c) => Math.max(0, c - 1));
                                  } catch(_) {}
                                }}
                                className="text-left flex-1"
                              >
                                <p className="text-gray-900 font-medium hover:text-purple-600 transition-colors duration-200">{n.message}</p>
                                <p className="text-xs text-gray-500 mt-1 hover:text-purple-400 transition-colors duration-200">{new Date(n.createdAt).toLocaleString()}</p>
                              </button>
                              {!n.read && (
                                <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-full animate-pulse shadow-lg"></div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Animated User Profile */}
              {photo ? (
                <img
                  src={photo}
                  alt="User"
                  className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-xl hover:shadow-yellow-400/50 transition-all duration-500 hover:scale-105 hover:rotate-6 animate-pulse cursor-pointer"
                  onClick={() => setOpen((v) => !v)}
                />
              ) : (
                <button
                  className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-purple-600 font-bold text-base shadow-xl hover:shadow-yellow-400/50 transition-all duration-500 hover:scale-105 hover:rotate-6 animate-pulse border border-yellow-300"
                  onClick={() => setOpen((v) => !v)}
                  title={userName || 'Profile'}
                >
                  {(userName || '').trim().slice(0,1).toUpperCase() || 'U'}
                </button>
              )}

              {/* User Dropdown Menu */}
              {open && (
                <div className="absolute right-0 top-14 w-64 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 z-50 animate-slide-in-down p-6">
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-2 animate-pulse">
                      {(userName || '').trim().slice(0,1).toUpperCase() || 'U'}
                    </div>
                    <p className="font-semibold text-gray-900 animate-pulse">{userName || 'User'}</p>
                  </div>
                  <div className="space-y-2">
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 w-full p-3 rounded-2xl hover:bg-gradient-to-r hover:from-yellow-400 hover:to-pink-400 hover:text-white transition-all duration-300 animate-fade-in hover:scale-105"
                      onClick={() => setOpen(false)}
                    >
                      <span className="animate-bounce">👤</span>
                      <span>My Profile</span>
                    </Link>
                    <Link
                      to="/appointments"
                      className="flex items-center gap-3 w-full p-3 rounded-2xl hover:bg-gradient-to-r hover:from-yellow-400 hover:to-pink-400 hover:text-white transition-all duration-300 animate-fade-in hover:scale-105"
                      onClick={() => setOpen(false)}
                      style={{ animationDelay: '0.1s' }}
                    >
                      <span className="animate-bounce">📅</span>
                      <span>My Appointments</span>
                    </Link>
                    <Link
                      to="/appointments?view=prescriptions"
                      className="flex items-center gap-3 w-full p-3 rounded-2xl hover:bg-gradient-to-r hover:from-yellow-400 hover:to-pink-400 hover:text-white transition-all duration-300 animate-fade-in hover:scale-105"
                      onClick={() => setOpen(false)}
                      style={{ animationDelay: '0.2s' }}
                    >
                      <span className="animate-bounce">💊</span>
                      <span>Prescriptions</span>
                    </Link>
                    <hr className="my-2 border-gray-200" />
                    <button
                      onClick={() => {
                        localStorage.removeItem('token');
                        localStorage.removeItem('userId');
                        nav('/login');
                        setOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-3 rounded-2xl hover:bg-gradient-to-r hover:from-red-400 hover:to-pink-400 hover:text-white transition-all duration-300 animate-fade-in hover:scale-105"
                      style={{ animationDelay: '0.3s' }}
                    >
                      <span className="animate-bounce">🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 bg-white text-purple-600 rounded-xl font-semibold text-sm hover:bg-yellow-400 hover:text-purple-700 transition-all duration-500 hover:scale-105 hover:rotate-2 animate-pulse shadow-lg hover:shadow-yellow-400/50 border border-yellow-300"
              >
                Sign In ✨
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-pink-500 text-white rounded-xl font-semibold text-sm hover:from-pink-500 hover:to-purple-500 transition-all duration-500 hover:scale-105 hover:-rotate-2 animate-pulse shadow-lg hover:shadow-pink-400/50"
              >
                Sign Up 🚀
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Floating Notification Toasts */}
      <div className="fixed right-6 top-24 z-50 space-y-3">
        {notifs.map((n, index) => (
          <div
            key={n.id}
            className="bg-white/95 backdrop-blur-xl border border-white/30 rounded-2xl p-4 shadow-2xl max-w-sm animate-slide-in-right hover:scale-105 transition-transform duration-300"
            style={{ animationDelay: `${index * 0.2}s` }}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-xl flex items-center justify-center text-white animate-pulse shadow-lg">
                🔔
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-medium hover:text-purple-600 transition-colors duration-200">{n.text}</p>
                <button
                  onClick={() => setNotifs((prev) => prev.filter((x) => x.id !== n.id))}
                  className="text-xs text-gray-500 hover:text-pink-500 mt-1 transition-colors duration-200 animate-pulse"
                >
                  Dismiss ✨
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </header>
  );
}

function App() {
return (
<BrowserRouter>
<Header />


<div className="p-6 page-gradient">
<Routes>
<Route path="/" element={<Home />} />
<Route path="/about" element={<About />} />
<Route path="/contact" element={<Contact />} />
<Route path="/admin/login" element={<Navigate to="/login" />} />
<Route path="/login" element={<Login />} />
<Route path="/doctor/login" element={<Navigate to="/login" />} />
<Route path="/register" element={<Register />} />
<Route path="/search" element={<SearchDoctors />} />
        <Route path="/doctor/:id" element={<DoctorDetails />} />
        <Route path="/admin/doctors/:id" element={<DoctorDetails />} />
        <Route path="/book/:id" element={<Navigate to="/search" />} />
        <Route path="/pay/:id" element={<Payment />} />
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="/doctor/appointments" element={<DoctorToday />} />
        <Route path="/doctor/profile" element={<DoctorProfile />} />
        <Route path="/prescription/:id" element={<Prescription />} />
        <Route path="/admin/doctors/pending" element={<AdminPendingDoctors />} />
        <Route path="/admin" element={<Navigate to="/login" />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/appointments" element={<AdminAppointments />} />
        <Route path="/admin/add-doctor" element={<AdminAddDoctor />} />
        <Route path="/admin/doctors" element={<SearchDoctors />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/appointments" element={<Appointments />} />
</Routes>
</div>
</BrowserRouter>
);
}
export default App;
