import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { HelmetProvider, Helmet } from "react-helmet-async";
import Logo from "./components/Logo";
import NotificationManager from "./components/NotificationManager";
import API from "./api";
import { useState, useEffect, Suspense, lazy } from "react";
import SupportModal from "./components/SupportModal";


const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const DoctorLogin = lazy(() => import("./pages/DoctorLogin"));
const Register = lazy(() => import("./pages/Register"));
const DoctorDetails = lazy(() => import("./pages/DoctorDetails"));
const Payment = lazy(() => import("./pages/Payment"));
const DoctorDashboard = lazy(() => import("./pages/DoctorDashboard"));
const DoctorToday = lazy(() => import("./pages/DoctorToday"));
const DoctorProfile = lazy(() => import("./pages/DoctorProfile"));
const Prescription = lazy(() => import("./pages/Prescription"));
const AdminPendingDoctors = lazy(() => import("./pages/AdminPendingDoctors"));
const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminAppointments = lazy(() => import("./pages/AdminAppointments"));
const AdminAddDoctor = lazy(() => import("./pages/AdminAddDoctor"));
const AdminEditDoctor = lazy(() => import("./pages/AdminEditDoctor"));
const AdminSpecializations = lazy(() => import("./pages/AdminSpecializations"));
const AdminSupport = lazy(() => import("./pages/AdminSupport"));
const SearchDoctors = lazy(() => import("./pages/SearchDoctors"));
const Profile = lazy(() => import("./pages/Profile"));
const Appointments = lazy(() => import("./pages/Appointments"));
const AppointmentDetails = lazy(() => import("./pages/AppointmentDetails"));
const FollowUpDetails = lazy(() => import("./pages/FollowUpDetails"));
const DoctorAppointmentDocuments = lazy(() => import("./pages/DoctorAppointmentDocuments"));

function RequireRole({ role, children }) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  if (!token) return <Navigate to="/login" replace />;
  if (role && userRole !== role) return <Navigate to="/" replace />;
  return children;
}


function Header({ onSupportOpen }) {
  const location = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bell, setBell] = useState(() => {
    try { return Number(localStorage.getItem('patientBellCount') || 0) || 0; } catch(_) { return 0; }
  });
  // Removed notifs, seenIds, muteUntil - handled by NotificationManager
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
  const [photo, setPhoto] = useState(() => {
    try { return uid ? (localStorage.getItem(`userPhotoBase64ById_${uid}`) || '') : ''; } catch(_) { return ''; }
  });
  const [userName, setUserName] = useState(() => {
    try { return uid ? (localStorage.getItem(`userNameById_${uid}`) || '') : ''; } catch(_) { return ''; }
  });
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
        const { data } = await API.get('/auth/me');
        if (data) {
          if (data.name) setUserName(String(data.name));
          if (data.photoBase64) setPhoto(String(data.photoBase64));
        }
      } catch (_) {}
    })();
  }, [token]);
  useEffect(() => {
    try {
      const bc = new BroadcastChannel('profile_update');
      bc.onmessage = (e) => {
        if (e.data?.type === 'UPDATE') {
          if (e.data.name) setUserName(e.data.name);
          if (e.data.photo) setPhoto(e.data.photo);
        }
      };
      return () => bc.close();
    } catch (e) {}
  }, []);
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
  }, [token]);
  useEffect(() => {
    const onNewNotif = () => {
      setBell((c) => {
        const next = c + 1;
        try { localStorage.setItem('patientBellCount', String(next)); } catch(_) {}
        return next;
      });
      if (panelOpen) {
        (async () => {
          try {
            const { data } = await API.get('/notifications');
            setPanelItems(Array.isArray(data) ? data : []);
            setPanelUnread((c) => c + 1);
          } catch(_) {}
        })();
      }
    };
    window.addEventListener('hospozen_notif', onNewNotif);
    return () => window.removeEventListener('hospozen_notif', onNewNotif);
  }, [panelOpen]);
  if (hideHeader) return null;
  return (
    <header className="sticky top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-xl border-b border-blue-200/50">
      <div className="max-w-full px-8 sm:px-12 relative">
        <div className="flex items-center h-16">
          {/* Left Section: Logo */}
          <div className="flex-shrink-0">
            <Link to="/" aria-label="Go to HospoZen Home" className="flex items-center gap-4 group hover:scale-105 transition-all duration-300">
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
          </div>

          {/* Center Section: Desktop Navigation */}
          <div className="flex-1 flex justify-start ml-10">
            <nav className="hidden lg:flex items-center space-x-10">
              {(() => {
                const p = location.pathname;
                const s = location.search;
                const isPres = p.startsWith("/appointments") && s.includes("view=prescriptions");
                const isAppts = p.startsWith("/appointments") && !s.includes("view=prescriptions");

                const linkClass = (active) =>
                  active
                    ? "relative inline-flex items-center justify-center px-4 py-2 text-blue-700 font-bold bg-blue-50 rounded-xl border-2 border-blue-200 shadow-sm"
                    : "relative inline-flex items-center justify-center px-4 py-2 text-gray-600 hover:text-blue-600 font-medium rounded-xl hover:bg-blue-50/50 transition-all duration-300 hover:scale-105";

                return (
                  <>
                    <Link to="/" className={linkClass(p === "/")}>
                      <span className="relative z-10">Home</span>
                      {p === "/" && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                    </Link>
                    <Link to="/search" className={linkClass(p.startsWith("/search"))}>
          <span className="relative z-10 whitespace-nowrap">Book Appointment</span>
          {p.startsWith("/search") && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
        </Link>
                    {token ? (
                      <>
                        <Link to="/appointments" className={linkClass(isAppts)}>
                          <span className="relative z-10 whitespace-nowrap">My Appointments</span>
                          {isAppts && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                        </Link>
                        <Link to="/appointments?view=prescriptions" className={linkClass(isPres)}>
                          <span className="relative z-10">Prescriptions</span>
                          {isPres && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                        </Link>
                        <button
                onClick={onSupportOpen}
                className="px-4 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-sm"
              >
                SUPPORT
              </button>
                      </>
                    ) : (
                      <>
                        <Link to="/about" className={linkClass(p.startsWith("/about"))}>
                          <span className="relative z-10">About</span>
                          {p.startsWith("/about") && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                        </Link>
                        <Link to="/contact" className={linkClass(p.startsWith("/contact"))}>
                          <span className="relative z-10">Contact</span>
                          {p.startsWith("/contact") && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                        </Link>
                      </>
                    )}
                    {showAdminLink && <Link to="/admin/login" className={linkClass(p.startsWith("/admin"))}>
                      <span className="relative z-10">Admin</span>
                      {p.startsWith("/admin") && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                    </Link>}
                  </>
                );
              })()}
            </nav>
          </div>

          {/* Right Section: Contact + User Actions */}
          <div className="flex-shrink-0 flex items-center gap-2 sm:gap-4 ml-auto">
            {/* Contact Info */}
            <div className="hidden lg:flex items-center border-r border-gray-200 pr-4">
              <div className="flex flex-col items-start text-sm font-bold text-gray-800 ml-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-blue-600">HELPLINE:</span>
                  <span>+91 98765 43210</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-blue-600">EMAIL:</span>
                  <span>hospozen@gmail.com</span>
                </div>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-3 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 border border-gray-200 hover:border-blue-300"
              aria-label="Toggle navigation menu"
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
                        window.dispatchEvent(new CustomEvent('close_notif_popups'));
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
                    aria-label="Open notifications panel"
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

                  <NotificationManager actor={localStorage.getItem('userRole') === 'doctor' ? 'doctor' : 'patient'} />

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
                                  if (n.type === 'chat' && id) {
                                    try { localStorage.setItem('lastChatApptId', id); } catch(_) {}
                                    nav(n.kind === 'followup' ? `/appointments/${id}/followup` : `/appointments/${id}/details`);
                                  } else if ((msg.includes('follow up') || n.type === 'followup') && id) {
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
                {photo && photo !== 'null' ? (
                  <img
                    src={photo.startsWith('data:') || photo.startsWith('http') ? photo : `data:image/jpeg;base64,${photo}`}
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
                  <div className="absolute right-0 top-16 w-80 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-blue-200/60 z-50 overflow-hidden animate-fade-in flex flex-col max-h-[calc(100vh-5rem)]">
                    <div className="relative shrink-0 h-24 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                      <div className="absolute inset-0 bg-white/10 mix-blend-overlay"></div>
                      <div className="absolute right-6 -top-2 w-4 h-4 bg-white/95 border border-blue-200/60 rotate-45"></div>
                      <div className="absolute left-6 -bottom-8 w-28 h-28 rounded-2xl shadow-xl border-4 border-white/70 overflow-hidden bg-white">
                        {photo && photo !== 'null' ? (
                          <img
                            src={photo.startsWith('data:') || photo.startsWith('http') ? photo : `data:image/jpeg;base64,${photo}`}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-3xl">
                            {(userName || '').charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 pt-10 px-6 pb-4 border-b border-blue-200/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-extrabold bg-gradient-to-r from-slate-900 to-indigo-700 bg-clip-text text-transparent">{userName || 'User'}</div>
                          <div className="inline-flex items-center text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 mt-2">Patient Account</div>
                        </div>
                        <button
                          onClick={() => setOpen(false)}
                          className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                        >
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    </div>
                    <div className="p-2 space-y-1 overflow-y-auto custom-scrollbar pb-4">
                      <Link
                        to="/profile"
                        className="group flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-indigo-50 transition-all duration-300"
                        onClick={() => { fancyLog('My Profile', 'Manage account & details', themes.profile); setOpen(false); }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">My Profile</div>
                            <div className="text-xs text-slate-500">Manage account & details</div>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </Link>
                      
                      <Link
                        to="/about"
                        className="group flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-purple-50 transition-all duration-300"
                        onClick={() => { fancyLog('About', 'Learn more about HospoZen', themes.appts); setOpen(false); }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">About</div>
                            <div className="text-xs text-slate-500">Learn more about HospoZen</div>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-slate-300 group-hover:text-purple-600 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </Link>

                      <Link
                        to="/contact"
                        className="group flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-teal-50 transition-all duration-300"
                        onClick={() => { fancyLog('Contact', 'Get in touch with us', themes.rx); setOpen(false); }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-all duration-300">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">Contact</div>
                            <div className="text-xs text-slate-500">Get in touch with us</div>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-slate-300 group-hover:text-teal-600 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </Link>

                      <div className="py-2 px-4">
                        <div className="h-px bg-slate-100"></div>
                      </div>

                      <button
                        onClick={() => {
                          fancyLog('Sign Out', 'Securely end session', themes.signout);
                          localStorage.removeItem('token');
                          localStorage.removeItem('userId');
                          nav('/login');
                          setOpen(false);
                        }}
                        className="group flex items-center justify-between w-full px-4 py-3 rounded-2xl hover:bg-red-50 transition-all duration-300 text-red-600"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                          </div>
                          <div>
                            <div className="font-bold">Sign Out</div>
                            <div className="text-xs text-red-500">Securely end session</div>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-red-300 group-hover:text-red-600 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
            <nav className="flex flex-col items-center space-y-4 px-6">
              {(() => {
                const p = location.pathname;
                const s = location.search;
                const isPres = p.startsWith("/appointments") && s.includes("view=prescriptions");
                const isAppts = p.startsWith("/appointments") && !s.includes("view=prescriptions");

                const items = [
                  { path: '/', label: 'Home', active: p === '/' },
                  { path: '/search', label: 'Book Appointment', active: p.startsWith('/search') }
                ];

                if (token) {
                  items.push({ path: '/appointments', label: 'My Appointments', active: isAppts });
                  items.push({ path: '/appointments?view=prescriptions', label: 'Prescriptions', active: isPres });
                } else {
                  items.push({ path: '/about', label: 'About', active: p.startsWith('/about') });
                  items.push({ path: '/contact', label: 'Contact', active: p.startsWith('/contact') });
                }

                return items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`w-full max-w-xs px-6 py-3 rounded-xl font-medium text-center transition-all duration-300 ${
                      item.active
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border-2 border-blue-200 shadow-sm'
                        : 'text-gray-700 hover:bg-blue-50/50 hover:text-blue-600 hover:scale-105'
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                ));
              })()}
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
    </header>
  );
}

function App() {
  const [supportOpen, setSupportOpen] = useState(false);
  const MetaManager = () => {
    const location = useLocation();
    const setMeta = (name, content) => {
      if (!name) return;
      const tag = document.querySelector(`meta[name="${name}"]`) || (() => { const m = document.createElement('meta'); m.setAttribute('name', name); document.head.appendChild(m); return m; })();
      tag.setAttribute('content', content || '');
    };
    const setProp = (prop, content) => {
      if (!prop) return;
      const tag = document.querySelector(`meta[property="${prop}"]`) || (() => { const m = document.createElement('meta'); m.setAttribute('property', prop); document.head.appendChild(m); return m; })();
      tag.setAttribute('content', content || '');
    };
    const setCanonical = (href) => {
      const link = document.getElementById('canonical-link') || (() => { const l = document.createElement('link'); l.setAttribute('rel','canonical'); l.id = 'canonical-link'; document.head.appendChild(l); return l; })();
      link.setAttribute('href', href || '');
    };
    const path = location.pathname;
    const s = location.search;
    const origin = window.location.origin || '';
    const url = origin + path + (location.search || '');
    const metaByPath = () => {
      if (path === '/') return { title: 'HospoZen | Book Doctors Online', desc: 'Find verified doctors and book appointments online with HospoZen.', keys: 'book doctors online,Book an appointment, healthcare appointments, telemedicine' };
      if (path.startsWith('/about')) return { title: 'About HospoZen | Healthcare Platform', desc: 'Learn about HospoZen and our mission to modernize healthcare.', keys: 'about hospozen, healthcare platform, company info' };
      if (path.startsWith('/contact')) return { title: 'Contact HospoZen | Support', desc: 'Get support and contact the HospoZen team.', keys: 'contact hospozen, support, help' };
      if (path.startsWith('/search')) return { title: 'Book an appointment by Specialization | HospoZen', desc: 'Search and filter doctors by specialization, experience, and ratings.', keys: 'Book an appointment, specializations, doctor search, ratings' };
      if (path.startsWith('/doctor/')) return { title: 'Doctor Profile | HospoZen', desc: 'View doctor details, specialization, experience, and book an appointment.', keys: 'doctor profile, book appointment, specialization' };
      if (path.startsWith('/appointments')) {
        const isPres = s.includes('view=prescriptions');
        return {
          title: isPres ? 'Prescriptions | HospoZen' : 'My Appointments | HospoZen',
          desc: isPres ? 'View and access your prescriptions securely.' : 'Manage upcoming and past appointments securely.',
          keys: isPres ? 'prescriptions, healthcare records' : 'appointments, patient dashboard, manage bookings'
        };
      }
      if (path.startsWith('/pay')) return { title: 'Secure Payment | HospoZen', desc: 'Complete your consultation payment securely.', keys: 'payment, secure checkout, consultation' };
      if (path.startsWith('/login')) return { title: 'Login | HospoZen', desc: 'Access your HospoZen account.', keys: 'login, account access' };
      if (path.startsWith('/register')) return { title: 'Create Account | HospoZen', desc: 'Register a new account on HospoZen.', keys: 'register, sign up, create account' };
      if (path.startsWith('/profile')) return { title: 'Profile | HospoZen', desc: 'View and update your profile information.', keys: 'profile, user settings' };
      if (path.startsWith('/admin')) return { title: 'Admin | HospoZen', desc: 'Administration area.', keys: 'admin, dashboard' };
      return { title: 'HospoZen', desc: 'HospoZen — book verified doctors and manage appointments online.', keys: 'hospozen, doctors, appointments' };
    };
    const cfg = metaByPath();
    const ogImage = (process.env.PUBLIC_URL || '') + '/logo512.png';
    const siteName = 'HospoZen';
    const ogType = path.startsWith('/doctor/') ? 'profile' : 'website';
    const noindex = (
      path.startsWith('/admin') ||
      path.startsWith('/prescription') ||
      path.startsWith('/login') ||
      path.startsWith('/register') ||
      path.startsWith('/forgot') ||
      path.startsWith('/doctor/login')
    );
    const robots = noindex ? 'noindex,nofollow' : 'index,follow';
    return (
      <Helmet>
        <title>{cfg.title}</title>
        <meta name="description" content={cfg.desc} />
        <meta name="keywords" content={cfg.keys} />
        <meta name="robots" content={robots} />
        <link rel="canonical" href={origin + path} />
        <meta property="og:title" content={cfg.title} />
        <meta property="og:description" content={cfg.desc} />
        <meta property="og:url" content={url} />
        <meta property="og:site_name" content={siteName} />
        <meta property="og:type" content={ogType} />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={cfg.title} />
        <meta name="twitter:description" content={cfg.desc} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>
    );
  };
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Header onSupportOpen={() => setSupportOpen(true)} />
        <MetaManager />
        <SupportModal isOpen={supportOpen} onClose={() => setSupportOpen(false)} />
        <div className="pt-16 px-4 sm:px-6 page-gradient">
          <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
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
          <Route path="/admin/doctors/:id/edit" element={<RequireRole role="admin"><AdminEditDoctor /></RequireRole>} />
          <Route path="/book/:id" element={<Navigate to="/search" />} />
          <Route path="/pay/:id" element={<Payment />} />
          <Route path="/doctor/dashboard" element={<RequireRole role="doctor"><DoctorDashboard /></RequireRole>} />
          <Route path="/doctor/appointments" element={<RequireRole role="doctor"><DoctorToday /></RequireRole>} />
          <Route path="/doctor/appointments/:id/documents" element={<RequireRole role="doctor"><DoctorAppointmentDocuments /></RequireRole>} />
          <Route path="/doctor/appointments/:id/followup" element={<RequireRole role="doctor"><FollowUpDetails actor="doctor" backTo="/doctor/appointments" /></RequireRole>} />
          <Route path="/doctor/profile" element={<RequireRole role="doctor"><DoctorProfile /></RequireRole>} />
          <Route path="/prescription/:id" element={<Prescription />} />
          <Route path="/admin/doctors/pending" element={<RequireRole role="admin"><AdminPendingDoctors /></RequireRole>} />
          <Route path="/admin" element={<Navigate to="/login" />} />
          <Route path="/admin/dashboard" element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />
          <Route path="/admin/appointments" element={<RequireRole role="admin"><AdminAppointments /></RequireRole>} />
          <Route path="/admin/add-doctor" element={<RequireRole role="admin"><AdminAddDoctor /></RequireRole>} />
          <Route path="/admin/specializations" element={<RequireRole role="admin"><AdminSpecializations /></RequireRole>} />
          <Route path="/admin/support" element={<RequireRole role="admin"><AdminSupport /></RequireRole>} />
          <Route path="/admin/doctors" element={<RequireRole role="admin"><SearchDoctors /></RequireRole>} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/appointments/:id/details" element={<AppointmentDetails />} />
          <Route path="/appointments/:id/followup" element={<FollowUpDetails />} />
            </Routes>
          </Suspense>
        </div>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
