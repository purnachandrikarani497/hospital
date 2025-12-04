import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import API from "../api";

const SPECIALTIES = [
  "General Physician",
  "Dermatologist",
  "Gynecologist",
  "Pediatrician",
  "Orthopedic Surgeon",
  "Cardiologist",
  "Neurologist",
  "Gastroenterologist",
  "ENT Specialist",
  "Dentist",
  "Psychiatrist",
  "Diabetologist",
  "Endocrinologist",
  "Pulmonologist",
  "Nephrologist",
  "Urologist",
  "Ophthalmologist",
  "Oncologist",
  "Rheumatologist",
  "Physiotherapist",
];

export default function SearchDoctors() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const [ratingById, setRatingById] = useState({});
  const [specialization, setSpecialization] = useState("");
  const [error, setError] = useState("");
  const CARD_FALLBACK = "";

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

  const search = async () => {
    setError("");
    try {
      const { data } = await API.get("/doctors", { params: { q, specialization } });
      let items = Array.isArray(data) ? data : [];

      if (q && String(q).trim().length > 0) {
        const norm = String(q).trim().toLowerCase();
        items = items.filter((d) => {
          const name = String(d.user?.name || "").toLowerCase();
          const clinic = String(d.clinic?.name || "").toLowerCase();
          const specs = (d.specializations || []).map((s) => String(s).toLowerCase());
          return name.includes(norm) || clinic.includes(norm) || specs.some((s) => s.includes(norm));
        });
      }

      if (specialization) {
        const norm = specialization.trim().toLowerCase();
        const hasMatches = items.some((d) => (d.specializations || []).some((s) => String(s).toLowerCase().includes(norm)));
        if (!hasMatches) {
          const all = await API.get("/doctors");
          const arr = Array.isArray(all.data) ? all.data : [];
          items = arr.filter((d) => (d.specializations || []).some((s) => String(s).toLowerCase().includes(norm)));
        } else {
          items = items.filter((d) => (d.specializations || []).some((s) => String(s).toLowerCase().includes(norm)));
        }
      }

      setList(items);
      try {
        const ids = items.map((d) => String(d?.user?._id || '')).filter(Boolean);
        if (ids.length) {
          const pairs = await Promise.all(ids.map(async (did) => {
            try {
              const res = await API.get(`/doctors/${did}/rating`);
              const avg = Number(res?.data?.average || 0) || 0;
              const rounded = Math.round(avg);
              const count = Number(res?.data?.count || 0) || 0;
              return [did, { avg: rounded, count }];
            } catch (_) {
              return [did, { avg: 0, count: 0 }];
            }
          }));
          setRatingById(Object.fromEntries(pairs));
        } else {
          setRatingById({});
        }
      } catch (_) {
        setRatingById({});
      }
    } catch (e) {
      setList([]);
      setError(e.response?.data?.message || e.message || "Network Error");
    }
  };

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialization]);

  useEffect(() => {
    const t = setTimeout(() => { search(); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    const iv = setInterval(() => { search(); }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, specialization]);

  useEffect(() => {
    const cleanup = [];
    const initSocket = () => {
      const origin = String(API.defaults.baseURL || "").replace(/\/(api)?$/, "");
      const w = window;
      const onReady = () => {
        try {
          const socket = w.io ? w.io(origin, { transports: ["websocket", "polling"] }) : null;
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
        s.onload = onReady;
        document.body.appendChild(s);
        cleanup.push(() => { try { document.body.removeChild(s); } catch(_) {} });
      } else {
        onReady();
      }
    };
    initSocket();
    return () => { cleanup.forEach((fn) => fn()); };
  }, []);

  const linkClass = (active) =>
    active
      ? "relative px-4 py-2 text-blue-700 font-bold bg-blue-50 rounded-xl border-2 border-blue-200 shadow-sm"
      : "relative px-4 py-2 text-gray-600 hover:text-blue-600 font-medium rounded-xl hover:bg-blue-50/50 transition-all duration-300 hover:scale-105";

  const [mobileOpen, setMobileOpen] = useState(false);

  if (isAdmin) {
    return (
      <div className="min-h-screen">
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-xl border-b border-blue-200/50">
          <div className="max-w-7xl mx-auto px-6 relative">
            <div className="flex items-center justify-between h-16">
              {/* Enhanced Logo Section */}
              <Link to="/admin/dashboard" className="flex items-center gap-4 group hover:scale-105 transition-all duration-300">
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
                      <Link to="/admin/doctors" className={linkClass(p.startsWith("/admin/doctors") && !p.startsWith("/admin/doctors/pending"))}>
                        <span className="relative z-10">Doctors List</span>
                        {(p.startsWith("/admin/doctors") && !p.startsWith("/admin/doctors/pending")) && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                      </Link>
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

                {/* Logout Button */}
                <button
                  onClick={() => { localStorage.removeItem("token"); nav("/admin/login"); }}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 border-2 border-white/20"
                >
                  Logout
                </button>
              </div>
            </div>

            {/* Enhanced Mobile Menu */}
            {mobileOpen && (
              <div className="lg:hidden bg-white/98 backdrop-blur-md border-t border-blue-200/50 py-6">
                <nav className="flex flex-col space-y-4 px-6">
                  {[
                    { path: '/admin/dashboard', label: 'Dashboard' },
                    { path: '/admin/appointments', label: 'Appointments' },
                    { path: '/admin/add-doctor', label: 'Add Doctor' },
                    { path: '/admin/doctors', label: 'Doctors List' }
                  ].map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                        window.location.pathname === item.path
                          ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border-2 border-blue-200 shadow-sm'
                          : 'text-gray-700 hover:bg-blue-50/50 hover:text-blue-600 hover:scale-105'
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                {/* Mobile Logout Button */}
                <div className="flex flex-col space-y-3 px-6 mt-6 pt-6 border-t border-blue-200/50">
                  <button
                    onClick={() => { localStorage.removeItem("token"); nav("/admin/login"); setMobileOpen(false); }}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-xl text-center border-2 border-white/20"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>
        <div className="pt-16 px-6 page-gradient">
          <div className="max-w-7xl mx-auto">
            <div className="animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Doctors Management</h2>
              </div>
              {error && <div className="mb-6 text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in shadow-lg">{error}</div>}
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
                      {(() => { const did = String(d.user?._id || ''); const info = ratingById[did]; const s = info?.avg || 0; const c = info?.count || 0; if (!s || !c) return null; return (
                        <div className="mb-2 flex items-center gap-1">
                          {[1,2,3,4,5].map((n) => (
                            <svg key={n} className={`w-5 h-5 ${s>=n ? 'text-amber-500' : 'text-slate-300'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                          ))}
                          <span className="text-sm text-slate-600">({c})</span>
                        </div>
                      ); })()}
                      <p className="text-sm text-indigo-600 font-medium mb-2">{Array.isArray(d.specializations) ? d.specializations.join(", ") : (typeof d.specializations === "string" ? d.specializations : "")}</p>
                      {typeof d.consultationFees === 'number' && (
                        <div className="text-sm text-slate-600 font-semibold mb-3">Fee: <span className="text-green-600">₹{d.consultationFees}</span></div>
                      )}
                      <Link to={`/admin/doctors/${d.user._id}`} className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        View Profile
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto pt-8 px-4 animate-fade-in">
        <h2 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent animate-slide-in-right">Find Your Perfect Doctor</h2>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl p-6 mb-8 animate-slide-in-left opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
          <div className="grid sm:grid-cols-3 gap-4 items-start">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Specialty</label>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 hover:scale-105"
              >
                <option value="">All Specialties</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Search Doctors</label>
              <div className="flex gap-3">
                <input
                  className="flex-1 p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 hover:scale-105"
                  placeholder="Search by name, clinic, or specialization..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
                />
                <button onClick={search} className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">Search</button>
                <button
                  onClick={() => { setQ(''); setSpecialization(''); search(); }}
                  className="px-6 py-3 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-50 font-semibold transition-all duration-300 hover:scale-105"
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
                    {(() => { const did = String(d.user?._id || ''); const info = ratingById[did]; const s = info?.avg || 0; const c = info?.count || 0; if (!s || !c) return null; return (
                      <div className="mb-2 flex items-center gap-1">
                        {[1,2,3,4,5].map((n) => (
                          <svg key={n} className={`w-5 h-5 ${s>=n ? 'text-amber-500' : 'text-slate-300'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                        ))}
                        <span className="text-sm text-slate-600">({c})</span>
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
          </main>
        </div>
      </div>
    </div>
  );
}
