import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import API from "../api";
import { Helmet } from "react-helmet-async";

const OG_FALLBACK = (process.env.PUBLIC_URL || '') + '/logo512.png';

export default function SearchDoctors() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const [specialization, setSpecialization] = useState("");
  const [specialties, setSpecialties] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const CARD_FALLBACK = "";

  useEffect(() => {
    fetchSpecialties();
  }, []);

  const fetchSpecialties = async () => {
    try {
      const { data } = await API.get("/specializations");
      setSpecialties(data);
    } catch (e) {
      console.error("Failed to fetch specializations", e);
    }
  };

  const getOnlineStatus = (id) => {
    const v = localStorage.getItem(`doctorOnlineById_${id}`);
    return v === "1";
  };
  const getBusyStatus = (id) => {
    const v = localStorage.getItem(`doctorBusyById_${id}`);
    return v === "1";
  };

  const photoOf = (d) => {
    let s = String(d?.photoBase64 || "").trim();
    if (!s) return "";
    if (s.startsWith("data:")) return s;
    if (s.startsWith("http")) return s;
    return `data:image/png;base64,${s}`;
  };

  const handleDeleteDoctor = async (id) => {
    if (!window.confirm("Are you sure you want to delete this doctor? This will cancel all their future appointments and remove their account permanently.")) return;
    try {
      await API.delete(`/admin/doctors/${id}`);
      alert("Doctor deleted successfully");
      search();
    } catch (e) {
      alert(e.response?.data?.message || "Failed to delete doctor");
    }
  };

  const abortRef = useRef(null);
  const search = async () => {
    setError("");
    setLoading(true);
    try {
      if (abortRef.current) { try { abortRef.current.abort(); } catch(_) {} }
      abortRef.current = new AbortController();
      const params = {};
      if (q && q.trim()) params.q = q.trim();
      if (specialization) params.specialization = specialization;
      
      const { data } = await API.get("/doctors", { params, signal: abortRef.current.signal });
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      if (e.message === 'canceled') return;
      setList([]);
      setError(e.response?.data?.message || e.message || "Network Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialization]);

  useEffect(() => {
    const t = setTimeout(() => { search(); }, 250);
    return () => { clearTimeout(t); if (abortRef.current) { try { abortRef.current.abort(); } catch(_) {} } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Removed aggressive 1s polling to prevent unnecessary requests and aborts

  useEffect(() => {
    try {
      const qs = new URLSearchParams(location.search || "");
      const spec = qs.get("specialization") || "";
      if (spec) setSpecialization(spec);
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    const cleanup = [];
    const base = String(API.defaults.baseURL || "");
    const origin = (base.startsWith("/") || !base) ? window.location.origin : base.replace(/\/(api)?$/, "");
    const w = window;
    const onReady = () => {
      try {
        const socket = w.io ? w.io(origin, { transports: ["polling", "websocket"] }) : null;
        if (socket) {
          socket.on('doctor:status', (p) => {
            const did = String(p?.doctorId || "");
            if (!did) return;
            setList((prev) => prev.map((d) => (
              String(d?.user?._id || "") === did ? { ...d, isOnline: !!p.isOnline, isBusy: !!p.isBusy } : d
            )));
          });
          cleanup.push(() => { try { socket.close(); } catch(_) {} });
        }
      } catch (_) {}
    };
    if (!w.io) {
      const s = document.createElement('script');
      s.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
      s.async = true;
      s.defer = true;
      s.onload = onReady;
      document.body.appendChild(s);
      cleanup.push(() => { try { document.body.removeChild(s); } catch(_) {} });
    } else {
      onReady();
    }
    return () => { cleanup.forEach((fn) => fn()); };
  }, []);
  

  const linkClass = (active) =>
    active
      ? "relative px-4 py-2 text-blue-700 font-bold bg-blue-50 rounded-xl border-2 border-blue-200 shadow-sm"
      : "relative px-4 py-2 text-gray-600 hover:text-blue-600 font-medium rounded-xl hover:bg-blue-50/50 transition-all duration-300 hover:scale-105";

  const [mobileOpen, setMobileOpen] = useState(false);

  const pageTitle = specialization ? `Find ${specialization} | HospoZen` : (q ? `Book an appoinment: ${q} | HospoZen` : 'Book an appoinment | HospoZen');
  const pageDesc = specialization ? `Browse and book ${specialization} near you.` : (q ? `Search results for doctors matching "${q}".` : 'Search and book verified doctors by specialization, experience, and ratings.');

  if (isAdmin) {
    return (
      <div className="min-h-screen">
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="description" content={pageDesc} />
          <meta property="og:title" content={pageTitle} />
          <meta property="og:description" content={pageDesc} />
          <meta property="og:image" content={OG_FALLBACK} />
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content={pageTitle} />
          <meta name="twitter:description" content={pageDesc} />
          <meta name="twitter:image" content={OG_FALLBACK} />
        </Helmet>
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-xl border-b border-blue-200/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
            <div className="flex items-center justify-between h-16">
              <Link to="/admin/dashboard" className="flex items-center gap-4 group hover:scale-105 transition-all duration-300">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 border-2 border-white/20">
                  <div className="text-white">
                    <Logo size={20} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent pb-1">
                    HospoZen
                  </span>
                </div>
              </Link>
              <nav className="hidden lg:flex items-center space-x-10">
                {(() => {
                  const p = window.location.pathname;
                  return (
                    <>
                      <Link to="/admin/dashboard" className={linkClass(p === "/admin/dashboard")}>
                        <span className="relative z-10">Dashboard</span>
                        {p === "/admin/dashboard" && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                      </Link>
                      <Link to="/admin/appointments" className={linkClass(p.startsWith("/admin/appointments"))}>
                        <span className="relative z-10">Appointments</span>
                        {p.startsWith("/admin/appointments") && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                      </Link>
                      <Link to="/admin/add-doctor" className={linkClass(p.startsWith("/admin/add-doctor"))}>
                        <span className="relative z-10">Add Doctor</span>
                        {p.startsWith("/admin/add-doctor") && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                      </Link>
                      <Link to="/admin/specializations" className={linkClass(p.startsWith("/admin/specializations"))}>
                        <span className="relative z-10">Specializations</span>
                        {p.startsWith("/admin/specializations") && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                      </Link>
                      <Link to="/admin/doctors" className={linkClass(p.startsWith("/admin/doctors") && !p.startsWith("/admin/doctors/pending"))}>
                        <span className="relative z-10">Doctors List</span>
                        {(p.startsWith("/admin/doctors") && !p.startsWith("/admin/doctors/pending")) && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                      </Link>
                    </>
                  );
                })()}
              </nav>
              <div className="flex items-center space-x-4">
                <button
                  className="lg:hidden p-3 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 border border-gray-200 hover:border-blue-300"
                  onClick={() => setMobileOpen(!mobileOpen)}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => { localStorage.removeItem("token"); nav("/admin/login"); }}
                  className="hidden lg:inline-flex bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 border-2 border-white/20"
                >
                  Logout
                </button>
              </div>
            </div>
            {mobileOpen && (
              <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
                <div className="absolute top-16 left-0 right-0">
                  <div className="mx-3 bg-white/98 backdrop-blur-md rounded-xl shadow-lg border border-blue-200/50 py-2" onClick={(e) => e.stopPropagation()}>
                    <nav className="flex flex-col space-y-2 px-3">
                      {[
                        { path: '/admin/dashboard', label: 'Dashboard' },
                        { path: '/admin/appointments', label: 'Appointments' },
                        { path: '/admin/add-doctor', label: 'Add Doctor' },
                        { path: '/admin/specializations', label: 'Specializations' },
                        { path: '/admin/doctors', label: 'Doctors List' }
                      ].map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`px-3 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                            window.location.pathname === item.path
                              ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200 shadow-sm'
                              : 'text-gray-700 hover:bg-blue-50/50 hover:text-blue-600'
                          }`}
                          onClick={() => setMobileOpen(false)}
                        >
                          {item.label}
                        </Link>
                      ))}
                      <button
                        onClick={() => { localStorage.removeItem('token'); nav('/admin/login'); setMobileOpen(false); }}
                        className="px-3 py-2 rounded-lg text-white text-sm bg-gradient-to-r from-blue-500 to-purple-600"
                      >Logout</button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>
        <div className="pt-4 px-4 sm:px-6 page-gradient">
          <div className="max-w-7xl mx-auto relative">
            <div className="absolute inset-x-0 -top-6 h-20 bg-gradient-to-r from-indigo-100 via-purple-100 to-blue-100 blur-xl opacity-70 rounded-full pointer-events-none"></div>
            <div className="animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
              <div className="relative mb-10 text-center">
                <h2 className="inline-block px-8 py-3 text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10 pb-4">
                  Doctors Management
                  <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
                </h2>
              </div>
              
              <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-white/40 shadow-xl p-3 mb-10 animate-fade-in opacity-0 relative z-20 max-w-4xl mx-auto" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
                <div className="flex flex-col md:flex-row gap-2 items-center">
                  <div className="w-full md:w-1/3 relative">
                    <div className="relative">
                      <select
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className="w-full p-2.5 pr-10 border-2 border-slate-100 rounded-xl bg-slate-50/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 appearance-none outline-none text-slate-700 font-medium cursor-pointer"
                      >
                        <option value="">All Specializations</option>
                        {specialties.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="w-full md:w-2/3 flex flex-col sm:flex-row gap-2 items-center">
                    <div className="w-full relative">
                      <input
                        className="w-full p-2.5 pl-4 border-2 border-slate-100 rounded-xl bg-slate-50/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 outline-none text-slate-700 font-medium"
                        placeholder="Search by name, clinic, or specialization..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
                      />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button onClick={search} className="flex-1 sm:w-24 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 whitespace-nowrap">Search</button>
                      <button
                        onClick={() => { setQ(''); setSpecialization(''); search(); }}
                        className="flex-1 sm:w-24 px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold transition-all duration-300 hover:scale-105 whitespace-nowrap"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {error && <div className="mb-6 text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in shadow-lg">{error}</div>}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                  <p className="text-slate-600 font-medium">Searching for doctors...</p>
                </div>
              ) : list.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border border-white/30 shadow-xl animate-fade-in">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">No Doctors Found</h3>
                  <p className="text-slate-600 text-center max-w-md">We couldn't find any doctors matching your search criteria. Try adjusting your filters or search query.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {list.map((d, index) => (
                    <div key={d._id} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl overflow-hidden hover:scale-105 hover:shadow-2xl transition-all duration-500 animate-zoom-in opacity-0" style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}>
                      <div className="relative">
                        {photoOf(d) ? (
                          <img src={photoOf(d)} alt="Doctor" className="w-full h-64 object-cover hover:scale-110 transition-transform duration-700" />
                        ) : (
                          <div className="w-full h-64 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center hover:scale-110 transition-transform duration-700">
                            <div className="text-6xl text-slate-400">👨‍⚕️</div>
                          </div>
                        )}
                        <div className="absolute top-3 right-3 animate-fade-in" style={{ animationDelay: `${index * 0.1 + 0.3}s`, animationFillMode: 'forwards' }}>
                          {(() => {
                            const online = typeof d.isOnline === 'boolean' ? d.isOnline : null;
                            const busy = typeof d.isBusy === 'boolean' ? d.isBusy : null;
                            if (online === null && busy === null) return null;
                            const cls = busy ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' : (online ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' : 'bg-gradient-to-r from-red-400 to-pink-500 text-white');
                            const txt = busy ? 'Busy' : (online ? 'Online' : 'Offline');
                            return <span className={`inline-block text-xs px-3 py-2 rounded-full font-semibold shadow-lg hover:scale-105 transition-transform duration-300 ${cls}`}>{txt}</span>;
                          })()}
                        </div>
                      </div>
                      <div className="p-6 animate-fade-in" style={{ animationDelay: `${index * 0.1 + 0.5}s`, animationFillMode: 'forwards' }}>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">{`Dr. ${d.user?.name || ''}`}</h3>
                        {(() => { const avg = Number(d?.averageRating || 0) || 0; if (avg === 0) return null; const s = Math.round(avg); return (
                          <div className="mb-2 flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {[1,2,3,4,5].map((n) => (
                                <svg key={n} className={`w-5 h-5 ${s>=n ? 'text-amber-500' : 'text-slate-300'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                              ))}
                            </div>
                            <span className="text-sm font-medium text-slate-700">{avg.toFixed(1)}</span>
                          </div>
                        ); })()}
                        <p className="text-sm text-indigo-600 font-medium mb-2">{Array.isArray(d.specializations) ? d.specializations.join(", ") : (typeof d.specializations === "string" ? d.specializations : "")}</p>
                        {typeof d.consultationFees === 'number' && (
                          <div className="text-sm text-slate-600 font-semibold mb-3">Fee: <span className="text-green-600">₹{d.consultationFees}</span></div>
                        )}
                        <div className="flex flex-col gap-2">
                          <Link to={`/admin/doctors/${d.user._id}`} className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                            View Profile
                          </Link>
                          <button 
                            onClick={() => handleDeleteDoctor(d.user._id)}
                            disabled={d.isOnline !== false}
                            className={`inline-flex items-center justify-center w-full py-3 px-4 rounded-xl font-semibold shadow-lg transition-all duration-300 ${d.isOnline !== false ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white hover:scale-105'}`}
                          >
                            Delete Doctor
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:image" content={OG_FALLBACK} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
        <meta name="twitter:image" content={OG_FALLBACK} />
      </Helmet>
      <div className="max-w-7xl mx-auto pt-8 px-4 animate-fade-in">
          <div className="relative mb-10 text-center">
            <h1 className="inline-block px-8 py-3 text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10">
              Book an appointment
              <div className="absolute -bottom-1 left-0 right-0 h-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
            </h1>
          </div>
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-white/40 shadow-xl p-3 mb-10 animate-fade-in opacity-0 relative z-20 max-w-4xl mx-auto" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
          <div className="flex flex-col md:flex-row gap-2 items-center">
            <div className="w-full md:w-1/3 relative">
              <div className="relative">
                <select
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full p-2.5 pr-10 border-2 border-slate-100 rounded-xl bg-slate-50/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 appearance-none outline-none text-slate-700 font-medium cursor-pointer"
                >
                  <option value="">All Specializations</option>
                  {specialties.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="w-full md:w-2/3 flex flex-col sm:flex-row gap-2 items-center">
              <div className="w-full relative">
                <input
                  className="w-full p-2.5 pl-4 border-2 border-slate-100 rounded-xl bg-slate-50/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 outline-none text-slate-700 font-medium"
                  placeholder="Search by name or specialization..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={search} className="flex-1 sm:w-24 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 whitespace-nowrap">Search</button>
                <button
                  onClick={() => { setQ(''); setSpecialization(''); search(); }}
                  className="flex-1 sm:w-24 px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold transition-all duration-300 hover:scale-105 whitespace-nowrap"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8">
          <main>
            {error && <div className="mb-6 text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in shadow-lg">{error}</div>}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-slate-600 font-medium">Finding the best doctors for you...</p>
              </div>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border border-white/30 shadow-xl animate-fade-in">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No Doctors Found</h3>
                <p className="text-slate-600 text-center max-w-md">We couldn't find any doctors matching your search criteria. Try adjusting your filters or search query.</p>
                <button 
                  onClick={() => { setQ(""); setSpecialization(""); }}
                  className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {list.map((d, index) => (
                  <div key={d._id} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl overflow-hidden hover:scale-105 hover:shadow-2xl transition-all duration-500 animate-zoom-in opacity-0" style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}>
                    <div className="relative">
                      {photoOf(d) ? (
                        <img
                          src={photoOf(d)}
                          alt="Doctor"
                          className="w-full h-64 object-cover hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-64 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center hover:scale-110 transition-transform duration-700">
                          <div className="text-6xl text-slate-400">👨‍⚕️</div>
                        </div>
                      )}
                      <div className="absolute top-3 right-3 animate-fade-in" style={{ animationDelay: `${index * 0.1 + 0.3}s`, animationFillMode: 'forwards' }}>
                        {(() => {
                          const online = d.isOnline !== false;
                          const busy = !!d.isBusy;
                          const cls = busy ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' : (online ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' : 'bg-gradient-to-r from-red-400 to-pink-500 text-white');
                          const txt = busy ? 'Busy' : (online ? 'Online' : 'Offline');
                          return <span className={`inline-block text-xs px-3 py-2 rounded-full font-semibold shadow-lg hover:scale-105 transition-transform duration-300 ${cls}`}>{txt}</span>;
                        })()}
                      </div>
                    </div>
                    <div className="p-6 animate-fade-in" style={{ animationDelay: `${index * 0.1 + 0.5}s`, animationFillMode: 'forwards' }}>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">{`Dr. ${d.user?.name || ''}`}</h3>
                      {d.user?.gender && <div className="text-xs text-slate-500 text-capitalize mb-1">{d.user.gender}</div>}
                      {(() => { const avg = Number(d?.averageRating || 0) || 0; if (avg === 0) return null; const s = Math.round(avg); return (
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map((n) => (
                              <svg key={n} className={`w-5 h-5 ${s>=n ? 'text-amber-500' : 'text-slate-300'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                            ))}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{avg.toFixed(1)}</span>
                        </div>
                      ); })()}
                      <p className="text-sm text-indigo-600 font-medium mb-2">{Array.isArray(d.specializations) ? d.specializations.join(", ") : (typeof d.specializations === "string" ? d.specializations : "")}</p>
                      {typeof d.consultationFees === 'number' && (
                        <div className="text-sm text-slate-600 font-semibold mb-3">Consultation Fee: <span className="text-green-600">₹{d.consultationFees}</span></div>
                      )}
                      <Link to={`/doctor/${d.user._id}`} className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        View Profile
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-12 mb-10 text-center animate-fade-in">
              <h2 className="inline-block px-8 py-3 text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10">
                Find Your Perfect Doctor
                <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
              </h2>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
