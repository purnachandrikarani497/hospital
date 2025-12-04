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
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-xl border-b border-blue-200/50">
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="flex items-center justify-between h-16">
          {/* Enhanced Logo Section */}
          <Link to="/" className="flex items-center gap-4 group hover:scale-105 transition-all duration-300">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 border-2 border-white/20">
              <div className="text-white">
                <Logo size={20} />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                HospoZen
              </span>
             
            </div>
          </Link>

          {/* Enhanced Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-10">
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
          <div className="flex items-center space-x-4">
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
                        setPanelOpen(!panelOpen);
                        if (!panelOpen) {
                          setPanelLoading(true);
                          const { data } = await API.get('/notifications');
                          const items = Array.isArray(data) ? data : [];
                          setPanelItems(items);
                          const unread = items.filter((x) => !x.read).length;
                          setPanelUnread(unread);
                          setBell(unread);
                        }
                      } catch (_) {
                        setPanelLoading(false);
                      }
                    }}
                    className="p-3 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 border border-gray-200 hover:border-blue-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 7V4a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2m0 4h.01" />
                    </svg>
                    {bell > 0 && (
                      <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg animate-pulse">
                        {bell > 9 ? '9+' : bell}
                      </span>
                    )}
                  </button>

                  {/* Enhanced Notification Panel */}
                  {panelOpen && (
                    <div className="absolute right-0 top-16 w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-blue-200/50 z-50">
                      <div className="p-6 border-b border-blue-200/50">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Notifications</h3>
                          <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full font-medium">{panelUnread} new</span>
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
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
                                <div className="flex-1">
                                  <p className="text-sm text-gray-900 font-medium">{n.message}</p>
                                  <p className="text-xs text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                                </div>
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
                    className="w-12 h-12 rounded-2xl object-cover border-3 border-white cursor-pointer hover:border-blue-300 transition-all duration-300 shadow-lg hover:shadow-xl"
                    onClick={() => setOpen(!open)}
                  />
                ) : (
                  <button
                    className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-2xl flex items-center justify-center font-bold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl border-2 border-white"
                    onClick={() => setOpen(!open)}
                  >
                    {(userName || '').charAt(0).toUpperCase() || 'U'}
                  </button>
                )}

                {/* Enhanced User Dropdown */}
                {open && (
                  <div className="absolute right-0 top-16 w-72 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-blue-200/50 z-50">
                    <div className="p-6 border-b border-blue-200/50">
                      <div className="flex items-center space-x-4">
                        {photo ? (
                          <img src={photo} alt="Profile" className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-200" />
                        ) : (
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-2xl flex items-center justify-center font-bold border-2 border-white">
                            {(userName || '').charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-gray-900 text-lg">{userName || 'User'}</p>
                          <p className="text-sm text-blue-600 font-medium">Patient Account</p>
                        </div>
                      </div>
                    </div>
                    <div className="py-3">
                      <Link
                        to="/profile"
                        className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl mx-2"
                        onClick={() => setOpen(false)}
                      >
                        <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium">My Profile</span>
                      </Link>
                      <Link
                        to="/appointments"
                        className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl mx-2"
                        onClick={() => setOpen(false)}
                      >
                        <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v10a2 2 0 002 2h4a2 2 0 002-2V11M9 11h6" />
                        </svg>
                        <span className="font-medium">My Appointments</span>
                      </Link>
                      <Link
                        to="/appointments?view=prescriptions"
                        className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl mx-2"
                        onClick={() => setOpen(false)}
                      >
                        <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        <span className="font-medium">Prescriptions</span>
                      </Link>
                      <hr className="my-3 border-blue-200/50" />
                      <button
                        onClick={() => {
                          localStorage.removeItem('token');
                          localStorage.removeItem('userId');
                          nav('/login');
                          setOpen(false);
                        }}
                        className="flex items-center w-full px-6 py-3 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 rounded-xl mx-2"
                      >
                        <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="font-medium">Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
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
