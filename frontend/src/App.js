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
import AppointmentDetails from "./pages/AppointmentDetails";
import FollowUpDetails from "./pages/FollowUpDetails";
import DoctorAppointmentDocuments from "./pages/DoctorAppointmentDocuments";


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
  const fancyLog = (title, subtitle, theme) => {
    try {
      const t1 = `background:${theme?.bg || '#f3f4f6'}; color:${theme?.fg || '#111827'}; padding:6px 10px; border-radius:12px; font-weight:700;`;
      const t2 = `color:${theme?.fg || '#111827'}; padding:2px 0;`;
      console.log(`%c${title}%c ${subtitle || ''}`, t1, t2);
    } catch(_) {}
  };
  const themes = {
    profile: { bg: 'linear-gradient(90deg,#eef2ff,#e0e7ff)', fg: '#3730a3' },
    appts: { bg: 'linear-gradient(90deg,#fdf4ff,#fae8ff)', fg: '#7e22ce' },
    rx: { bg: 'linear-gradient(90deg,#ecfeff,#cffafe)', fg: '#0e7490' },
    signout: { bg: 'linear-gradient(90deg,#fee2e2,#fecaca)', fg: '#b91c1c' }
  };
  const hideHeader = (() => {
    const p = location.pathname;
    if (p.startsWith('/admin')) return true;
    if (p.startsWith('/prescription')) return true;
    if (p.startsWith('/doctor/dashboard')) return true;
    if (p.startsWith('/doctor/appointments')) return true;
    if (p.startsWith('/doctor/profile')) return true;
    return false;
  })();
  const token = localStorage.getItem('token');
  const uid = localStorage.getItem('userId');
  const photo = uid ? localStorage.getItem(`userPhotoBase64ById_${uid}`) : '';
  const userName = uid ? localStorage.getItem(`userNameById_${uid}`) || '' : '';
  const showAdminLink = false; // Hide admin button as login is unified
  const timeAgo = (ts) => {
    try {
      const d = new Date(ts).getTime();
      const diff = Math.max(0, Date.now() - d);
      const m = Math.floor(diff / 60000);
      if (m < 1) return 'just now';
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h ago`;
      const days = Math.floor(h / 24);
      return `${days}d ago`;
    } catch(_) { return ''; }
  };
  const TypeIcon = ({ type }) => {
    const c = 'w-5 h-5';
    if (type === 'chat') return (
      <svg className={c} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 5a3 3 0 013-3h10a3 3 0 013 3v9a3 3 0 01-3 3H9l-5 4V5z" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
    if (type === 'meet') return (
      <svg className={c} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 7a3 3 0 013-3h8a3 3 0 013 3v10a3 3 0 01-3 3H6a3 3 0 01-3-3V7z" stroke="#7C3AED" strokeWidth="2"/>
        <path d="M21 10l-4 3 4 3V10z" fill="#7C3AED"/>
      </svg>
    );
    if (type === 'appointment') return (
      <svg className={c} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 2v3m10-3v3M3 8h18M5 6h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" stroke="#059669" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2a7 7 0 00-7 7v3l-2 3h18l-2-3V9a7 7 0 00-7-7zm0 20a3 3 0 003-3H9a3 3 0 003 3z" fill="#F59E0B"/>
      </svg>
    );
  };
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
          try {
            const id = String(Date.now()) + String(Math.random());
            const text = 'New message from doctor';
            const apptIdStr = String(apptId || '');
            setNotifs((prev) => [{ id, text, type: 'chat', apptId: apptIdStr }, ...prev].slice(0, 4));
            setTimeout(() => { setNotifs((prev) => prev.filter((n) => n.id !== id)); }, 6000);
          } catch(_) {}
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-xl border-b border-blue-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        <div className="flex items-center justify-between h-16">
          {/* Enhanced Logo Section */}
          <Link to="/" className="flex items-center gap-4 group hover:scale-105 transition-all duration-300">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 border-2 border-white/20">
              <div className="text-white">
                <Logo size={20} />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                HospoZen
              </span>
             
            </div>
          </Link>

          {/* Enhanced Desktop Navigation */}
          <nav className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center space-x-10">
            {(() => {
              const p = location.pathname;
              const linkClass = (active) =>
                active
                  ? "relative px-4 py-2 text-blue-700 font-bold bg-blue-50 rounded-xl border-2 border-blue-200 shadow-sm"
                  : "relative px-4 py-2 text-gray-600 hover:text-blue-600 font-medium rounded-xl hover:bg-blue-50/50 transition-all duration-300 hover:scale-105";

              return (
                <>
                  <Link to="/" className={linkClass(p === "/")}>
                    <span className="relative z-10">Home</span>
                    {p === "/" && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                  </Link>
                  <Link to="/search" className={linkClass(p.startsWith("/search"))}>
                    <span className="relative z-10">Find Doctors</span>
                    {p.startsWith("/search") && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                  </Link>
                  <Link to="/about" className={linkClass(p.startsWith("/about"))}>
                    <span className="relative z-10">About</span>
                    {p.startsWith("/about") && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                  </Link>
                  <Link to="/contact" className={linkClass(p.startsWith("/contact"))}>
                    <span className="relative z-10">Contact</span>
                    {p.startsWith("/contact") && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                  </Link>
                  {showAdminLink && <Link to="/admin/login" className={linkClass(p.startsWith("/admin"))}>
                    <span className="relative z-10">Admin</span>
                    {p.startsWith("/admin") && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                  </Link>}
                </>
              );
            })()}
          </nav>

          {/* Enhanced User Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Enhanced Mobile Menu Button */}
            <button
              className="lg:hidden p-3 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 border border-gray-200 hover:border-blue-300"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Enhanced Authentication Section */}
            {token ? (
              <div className="flex items-center space-x-6">
                {/* Enhanced Notification Bell */}
                <div className="relative">
                  <button
                    onClick={async () => {
                      try {
                        fancyLog('Notifications', 'Panel toggled', { bg: 'linear-gradient(90deg,#dbeafe,#ede9fe)', fg: '#1d4ed8' });
                        setPanelOpen(!panelOpen);
                        if (!panelOpen) {
                          setPanelLoading(true);
                          const { data } = await API.get('/notifications');
                          const items = Array.isArray(data) ? data : [];
                          setPanelItems(items);
                          const unread = items.filter((x) => !x.read).length;
                          setPanelUnread(unread);
                          setBell(unread);
                          setPanelLoading(false);
                        }
                      } catch (_) {
                        setPanelLoading(false);
                      }
                    }}
                    className="inline-flex p-2 sm:p-3 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 border border-gray-200 hover:border-blue-300 relative"
                  >
                    <svg className={`w-6 h-6 ${bell > 0 ? 'animate-bounce' : ''}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22a2 2 0 002-2H10a2 2 0 002 2z" fill="#2563EB"/>
                      <path d="M12 2a7 7 0 00-7 7v3l-2 3h18l-2-3V9a7 7 0 00-7-7z" stroke="#2563EB" strokeWidth="2" fill="none"/>
                    </svg>
                    {bell > 0 && (
                      <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-bold shadow-lg animate-pulse">
                        {bell > 9 ? '9+' : bell}
                      </span>
                    )}
                  </button>

                  {/* Enhanced Notification Panel */}
                  {panelOpen && (
                    <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-16 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-blue-200/50 z-50">
                      <div className="absolute right-3 sm:right-6 -top-2 w-4 h-4 bg-white/95 border border-blue-200/50 rotate-45"></div>
                      <div className="p-4 sm:p-6 border-b border-blue-200/50">
                        <div className="flex items-start sm:items-center justify-between gap-3">
                          <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Notifications</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full font-medium">{panelUnread} new</span>
                            <button
                              onClick={async () => {
                                try {
                                  const ids = panelItems.filter((x) => !x.read).map((x) => x._id || x.id);
                                  await Promise.all(ids.map((id) => API.put(`/notifications/${id}/read`).catch(() => {})));
                                  setPanelItems((prev) => prev.map((x) => ({ ...x, read: true })));
                                  setPanelUnread(0);
                                  setBell(0);
                                } catch(_) {}
                              }}
                              className="text-xs px-2 py-1 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                              Mark all read
                            </button>
                            <button
                              onClick={async () => {
                                try { await API.delete('/notifications'); setPanelItems([]); setPanelUnread(0); setBell(0); } catch(_) {}
                              }}
                              className="text-xs px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Clear all
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="max-h-[65vh] sm:max-h-96 overflow-y-auto">
                        {panelLoading ? (
                          <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                          </div>
                        ) : panelItems.length === 0 ? (
                          <div className="p-12 text-center text-gray-500">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="font-medium">No notifications yet</p>
                          </div>
                        ) : (
                          panelItems.map((n) => (
                            <div key={n._id || n.id} className="p-4 border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-200">
                              <div className="flex items-start justify-between">
                                <button
                                  onClick={async () => {
                                    try {
                                      const id = String(n.apptId || '');
                                      const msg = String(n.message || '').toLowerCase();
                                      if ((msg.includes('follow up') || n.type === 'followup' || n.type === 'chat') && id) {
                                        try { localStorage.setItem('lastChatApptId', id); } catch(_) {}
                                        nav(`/appointments/${id}/followup`);
                                      } else if ((msg.includes('view details') || n.type === 'details') && id) {
                                        nav(`/appointments/${id}/details`);
                                      } else if (n.type === 'meet' && n.apptId) {
                                        const mid = String(n.apptId || '');
                                        if (mid) nav(`/appointments?joinMeet=${mid}`);
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
                                  className="flex-1 text-left"
                                >
                                  <div className="flex items-start gap-3">
                                    <TypeIcon type={n.type} />
                                    <div className="flex-1">
                                      <p className="text-sm text-gray-900 font-medium">{n.message}</p>
                                      <p className="text-xs text-gray-500 mt-1">{timeAgo(n.createdAt)}</p>
                                    </div>
                                  </div>
                                </button>
                                {!n.read && <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced User Profile */}
                {photo ? (
                  <img
                    src={photo}
                    alt="Profile"
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl object-cover border-3 border-white cursor-pointer hover:border-blue-300 transition-all duration-300 shadow-lg hover:shadow-xl"
                    onClick={() => setOpen(!open)}
                  />
                ) : (
                  <button
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-2xl flex items-center justify-center font-bold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl border-2 border-white"
                    onClick={() => setOpen(!open)}
                  >
                    {(userName || '').charAt(0).toUpperCase() || 'U'}
                  </button>
                )}

                {/* Enhanced User Dropdown */}
                {open && (
                  <div className="absolute right-0 top-16 w-80 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-blue-200/60 z-50 overflow-hidden">
                    <div className="relative h-24 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                      <div className="absolute inset-0 bg-white/10 mix-blend-overlay"></div>
                      <div className="absolute right-6 -top-2 w-4 h-4 bg-white/95 border border-blue-200/60 rotate-45"></div>
                      <div className="absolute left-6 -bottom-8 w-28 h-28 rounded-2xl shadow-xl border-4 border-white/70 overflow-hidden">
                        {photo ? (
                          <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold">
                            {(userName || '').charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="pt-10 px-6 pb-4 border-b border-blue-200/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-extrabold bg-gradient-to-r from-slate-900 to-indigo-700 bg-clip-text text-transparent">{userName || 'User'}</div>
                          <div className="inline-flex items-center text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 mt-2">Patient Account</div>
                        </div>
                        <button
                          onClick={() => setOpen(false)}
                          className="text-slate-500 hover:text-slate-900 transition"
                        >
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    </div>
                    <div className="p-2">
                      <Link
                        to="/profile"
                        className="group flex items-center justify-between px-6 py-3 rounded-2xl mx-2 hover:bg-blue-50 transition-all"
                        onClick={() => { fancyLog('My Profile', 'Manage account & details', themes.profile); setOpen(false); }}
                      >
                        <div className="flex items-center">
                          <div>
                            <div className="font-semibold text-slate-900">My Profile</div>
                            <div className="relative mt-1">
                              <span className="text-xs text-slate-500">Manage account & details</span>
                              <span className="block h-0.5 w-10 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full group-hover:w-16 transition-all duration-300"></span>
                            </div>
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </Link>
                      <Link
                        to="/appointments"
                        className="group flex items-center justify-between px-6 py-3 rounded-2xl mx-2 hover:bg-blue-50 transition-all"
                        onClick={() => { fancyLog('My Appointments', 'View, join, and manage', themes.appts); setOpen(false); }}
                      >
                        <div className="flex items-center">
                          <div>
                            <div className="font-semibold text-slate-900">My Appointments</div>
                            <div className="relative mt-1">
                              <span className="text-xs text-slate-500">View, join, and manage</span>
                              <span className="block h-0.5 w-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full group-hover:w-16 transition-all duration-300"></span>
                            </div>
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </Link>
                      <Link
                        to="/appointments?view=prescriptions"
                        className="group flex items-center justify-between px-6 py-3 rounded-2xl mx-2 hover:bg-blue-50 transition-all"
                        onClick={() => { fancyLog('Prescriptions', 'Access and share Rx', themes.rx); setOpen(false); }}
                      >
                        <div className="flex items-center">
                          <div>
                            <div className="font-semibold text-slate-900">Prescriptions</div>
                            <div className="relative mt-1">
                              <span className="text-xs text-slate-500">Access and share Rx</span>
                              <span className="block h-0.5 w-10 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full group-hover:w-16 transition-all duration-300"></span>
                            </div>
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 transition" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </Link>
                      <div className="px-6 py-3">
                        <div className="h-px bg-gradient-to-r from-transparent via-blue-200/60 to-transparent"></div>
                      </div>
                      <button
                        onClick={() => {
                          fancyLog('Sign Out', 'Securely end session', themes.signout);
                          localStorage.removeItem('token');
                          localStorage.removeItem('userId');
                          nav('/login');
                          setOpen(false);
                        }}
                        className="group flex items-center justify-between w-full px-6 py-3 rounded-2xl mx-2 hover:bg-red-50 transition-all text-red-600"
                      >
                        <div>
                          <div className="font-semibold">Sign Out</div>
                          <div className="relative mt-1">
                            <span className="text-xs text-red-500">Securely end session</span>
                            <span className="block h-0.5 w-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-full group-hover:w-16 transition-all duration-300"></span>
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-red-400 group-hover:text-red-600 transition" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center space-x-4">
                <Link
                  to="/login"
                  className="bg-white text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-blue-50 hover:text-blue-600 border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 border-2 border-white/20"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-white/98 backdrop-blur-md border-t border-blue-200/50 py-6">
            <nav className="flex flex-col space-y-4 px-6">
              {[
                { path: '/', label: 'Home' },
                { path: '/search', label: 'Find Doctors' },
                { path: '/about', label: 'About' },
                { path: '/contact', label: 'Contact' }
              ].map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    location.pathname === item.path
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border-2 border-blue-200 shadow-sm'
                      : 'text-gray-700 hover:bg-blue-50/50 hover:text-blue-600 hover:scale-105'
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Mobile Auth Buttons */}
            {!token && (
              <div className="flex flex-col space-y-3 px-6 mt-6 pt-6 border-t border-blue-200/50">
                <Link
                  to="/login"
                  className="bg-white text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-blue-50 hover:text-blue-600 border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 shadow-lg text-center"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-xl text-center border-2 border-white/20"
                  onClick={() => setMobileOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
      {token && notifs.length > 0 && (
        <div className="fixed right-4 top-20 z-[60] space-y-2">
          {notifs.map((n) => (
            <button
              key={n.id}
              onClick={async () => {
                try {
                  const id = String(n.apptId || '');
                  const msg = String(n.text || n.message || '').toLowerCase();
                  if ((msg.includes('follow up') || n.type === 'followup' || n.type === 'chat') && id) {
                    try { localStorage.setItem('lastChatApptId', id); } catch(_) {}
                    nav(`/appointments/${id}/followup`);
                  } else if ((msg.includes('view details') || n.type === 'details') && id) {
                    nav(`/appointments/${id}/details`);
                  } else if (n.type === 'meet' && id) {
                    nav(`/appointments?joinMeet=${id}`);
                  } else if (n.link) {
                    nav(n.link);
                  } else {
                    nav('/appointments');
                  }
                  try { if (n._id || n.idDb) await API.put(`/notifications/${n._id || n.idDb}/read`); } catch(_) {}
                } catch(_) {}
              }}
              className="block w-80 text-left px-4 py-3 rounded-xl shadow-lg border border-blue-200 bg-white/95 hover:bg-blue-50 transition"
            >
              <div className="flex items-start gap-3">
                <TypeIcon type={n.type} />
                <div className="flex-1">
                  <div className="text-sm text-slate-900 font-semibold">{n.text || n.message || 'Notification'}</div>
                  {n.apptId && <div className="text-xs text-slate-500 mt-1">Appt #{n.apptId}</div>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

function App() {
return (
<BrowserRouter>
<Header />


      <div className="pt-16 px-4 sm:px-6 page-gradient">
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
      <Route path="/doctor/appointments/:id/documents" element={<DoctorAppointmentDocuments />} />
      <Route path="/doctor/appointments/:id/followup" element={<FollowUpDetails actor="doctor" backTo="/doctor/appointments" />} />
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
      <Route path="/appointments/:id/details" element={<AppointmentDetails />} />
      <Route path="/appointments/:id/followup" element={<FollowUpDetails />} />
</Routes>
</div>
</BrowserRouter>
);
}
export default App;
