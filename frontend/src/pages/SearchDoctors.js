import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import API from "../api";
import { Helmet } from "react-helmet-async";
import AdminHeader from "../components/AdminHeader";

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
    const handler = setTimeout(() => {
      search();
    }, 500);

    return () => {
      clearTimeout(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, specialization]);

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

  const pageTitle = isAdmin ? "Admin | Doctors Management" : "Book Appointment | HospoZen";
  const pageDesc = isAdmin ? "Manage doctors, view profiles, and edit specializations." : "Find and book an appointment with verified doctors on HospoZen.";

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
        <AdminHeader />
        <div className="pt-24 px-4 sm:px-6 page-gradient">
          <div className="max-w-7xl mx-auto relative">
            <div className="absolute inset-x-0 -top-6 h-20 bg-gradient-to-r from-indigo-100 via-purple-100 to-blue-100 blur-xl opacity-70 rounded-full pointer-events-none"></div>
            <div className="animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
              <div className="relative mb-10 text-center">
                <h2 className="inline-block px-8 py-3 text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10 pb-4">
                  {isAdmin ? 'Doctors Management' : 'Book Appointment'}
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
                            className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold shadow-lg transition-all duration-300 hover:scale-105"
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
        <div className="mb-10 text-center animate-fade-in">
          <h2 className="inline-block px-8 py-3 text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10">
            Find Your Perfect Doctor
            <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
          </h2>
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
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                {list.map((d, index) => (
                  <div key={d._id} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl overflow-hidden hover:scale-105 hover:shadow-2xl transition-all duration-500 animate-zoom-in opacity-0 flex flex-col h-full" style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}>
                    <div className="relative h-64 flex-shrink-0">
                      {photoOf(d) ? (
                        <img
                          src={photoOf(d)}
                          alt="Doctor"
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center hover:scale-110 transition-transform duration-700">
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
                    <div className="p-6 flex flex-col flex-grow animate-fade-in" style={{ animationDelay: `${index * 0.1 + 0.5}s`, animationFillMode: 'forwards' }}>
                      <div className="flex-grow">
                        <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1">{`Dr. ${d.user?.name || ''}`}</h3>
                        {(() => { const avg = Number(d?.averageRating || 0) || 0; if (avg === 0) return <div className="mb-2 min-h-[1.5rem]"></div>; const s = Math.round(avg); return (
                          <div className="mb-2 flex items-center gap-2 min-h-[1.5rem]">
                            <div className="flex items-center gap-1">
                              {[1,2,3,4,5].map((n) => (
                                <svg key={n} className={`w-4 h-4 ${s>=n ? 'text-amber-500' : 'text-slate-300'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                              ))}
                            </div>
                            <span className="text-sm font-medium text-slate-700">{avg.toFixed(1)}</span>
                          </div>
                        ); })()}
                        <p className="text-sm text-indigo-600 font-bold mb-2 line-clamp-2 min-h-[2.5rem]">{Array.isArray(d.specializations) ? d.specializations.join(", ") : (typeof d.specializations === "string" ? d.specializations : "")}</p>
                        {typeof d.consultationFees === 'number' && (
                          <div className="text-sm text-slate-600 font-bold mb-4">Consultation Fee: <span className="text-green-600">₹{d.consultationFees}</span></div>
                        )}
                      </div>
                      <div className="mt-auto pt-4 border-t border-slate-100">
                        <Link to={`/doctor/${d.user._id}`} className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                          View Profile
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
