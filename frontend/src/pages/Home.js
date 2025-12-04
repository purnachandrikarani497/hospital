import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { useEffect, useRef, useState, useMemo } from "react";
import API from "../api";

export default function Home() {
  const FALLBACK = "";
  const LOCAL = (process.env.PUBLIC_URL || "") + "/uploads/Screenshot 2025-12-03 145101.png";
  const CARD_FALLBACK = "https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=640&auto=format&fit=crop";
  const [heroSrc, setHeroSrc] = useState(FALLBACK);
  const [list, setList] = useState([]);
  const [error, setError] = useState("");
  const didInit = useRef(false);

  const iconMap = {
    'Cardiology': '❤️',
    'Dermatology': '🧴',
    'Orthopedics': '🦴',
    'Pediatrics': '🧒',
    'Neurology': '🧠',
    'Dental': '🦷',
    'General Physician': '👨‍⚕️',
    'Gynecologist': '👩‍⚕️',
    'ENT Specialist': '👂',
    'Psychiatrist': '🧠',
    'Diabetologist': '🍬',
    'Endocrinologist': '🦋',
    'Pulmonologist': '🫁',
    'Nephrologist': '🫘',
    'Urologist': '🫑',
    'Ophthalmologist': '👁️',
    'Oncologist': '🎗️',
    'Rheumatologist': '💪',
    'Physiotherapist': '🏃‍♂️',
    'Gastroenterologist': '🍽️',
  };

  const colorMap = {
    'Cardiology': "bg-gradient-to-br from-red-100 via-pink-100 to-rose-100 hover:from-red-200 hover:via-pink-200 hover:to-rose-200 text-red-600 shadow-red-200/50",
    'Dermatology': "bg-gradient-to-br from-purple-100 via-violet-100 to-indigo-100 hover:from-purple-200 hover:via-violet-200 hover:to-indigo-200 text-purple-600 shadow-purple-200/50",
    'Orthopedics': "bg-gradient-to-br from-blue-100 via-cyan-100 to-sky-100 hover:from-blue-200 hover:via-cyan-200 hover:to-sky-200 text-blue-600 shadow-blue-200/50",
    'Pediatrics': "bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 hover:from-green-200 hover:via-emerald-200 hover:to-teal-200 text-green-600 shadow-green-200/50",
    'Neurology': "bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-100 hover:from-yellow-200 hover:via-amber-200 hover:to-orange-200 text-yellow-600 shadow-yellow-200/50",
    'Dental': "bg-gradient-to-br from-teal-100 via-cyan-100 to-blue-100 hover:from-teal-200 hover:via-cyan-200 hover:to-blue-200 text-teal-600 shadow-teal-200/50",
    'General Physician': "bg-gradient-to-br from-gray-100 via-slate-100 to-zinc-100 hover:from-gray-200 hover:via-slate-200 hover:to-zinc-200 text-gray-600 shadow-gray-200/50",
    'Gynecologist': "bg-gradient-to-br from-pink-100 via-rose-100 to-fuchsia-100 hover:from-pink-200 hover:via-rose-200 hover:to-fuchsia-200 text-pink-600 shadow-pink-200/50",
    'ENT Specialist': "bg-gradient-to-br from-orange-100 via-amber-100 to-yellow-100 hover:from-orange-200 hover:via-amber-200 hover:to-yellow-200 text-orange-600 shadow-orange-200/50",
    'Psychiatrist': "bg-gradient-to-br from-indigo-100 via-purple-100 to-violet-100 hover:from-indigo-200 hover:via-purple-200 hover:to-violet-200 text-indigo-600 shadow-indigo-200/50",
    'Diabetologist': "bg-gradient-to-br from-lime-100 via-green-100 to-emerald-100 hover:from-lime-200 hover:via-green-200 hover:to-emerald-200 text-lime-600 shadow-lime-200/50",
    'Endocrinologist': "bg-gradient-to-br from-cyan-100 via-sky-100 to-blue-100 hover:from-cyan-200 hover:via-sky-200 hover:to-blue-200 text-cyan-600 shadow-cyan-200/50",
    'Pulmonologist': "bg-gradient-to-br from-slate-100 via-gray-100 to-zinc-100 hover:from-slate-200 hover:via-gray-200 hover:to-zinc-200 text-slate-600 shadow-slate-200/50",
    'Nephrologist': "bg-gradient-to-br from-stone-100 via-neutral-100 to-gray-100 hover:from-stone-200 hover:via-neutral-200 hover:to-gray-200 text-stone-600 shadow-stone-200/50",
    'Urologist': "bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100 hover:from-emerald-200 hover:via-teal-200 hover:to-cyan-200 text-emerald-600 shadow-emerald-200/50",
    'Ophthalmologist': "bg-gradient-to-br from-violet-100 via-purple-100 to-fuchsia-100 hover:from-violet-200 hover:via-purple-200 hover:to-fuchsia-200 text-violet-600 shadow-violet-200/50",
    'Oncologist': "bg-gradient-to-br from-red-100 via-rose-100 to-pink-100 hover:from-red-200 hover:via-rose-200 hover:to-pink-200 text-red-600 shadow-red-200/50",
    'Rheumatologist': "bg-gradient-to-br from-amber-100 via-orange-100 to-red-100 hover:from-amber-200 hover:via-orange-200 hover:to-red-200 text-amber-600 shadow-amber-200/50",
    'Physiotherapist': "bg-gradient-to-br from-sky-100 via-blue-100 to-indigo-100 hover:from-sky-200 hover:via-blue-200 hover:to-indigo-200 text-sky-600 shadow-sky-200/50",
    'Gastroenterologist': "bg-gradient-to-br from-yellow-100 via-lime-100 to-green-100 hover:from-yellow-200 hover:via-lime-200 hover:to-green-200 text-yellow-600 shadow-yellow-200/50",
  };

  const specialties = useMemo(() => {
    // Start with all predefined specialties
    const allSpecs = Object.keys(iconMap).map(spec => ({
      label: spec,
      icon: iconMap[spec],
      color: colorMap[spec] || "bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 hover:from-blue-200 hover:via-indigo-200 hover:to-purple-200 text-blue-600 shadow-blue-200/50"
    }));

    // Add any additional specialties from doctors that aren't in the predefined list
    const uniqueSpecs = new Set();
    list.forEach(doctor => {
      if (doctor.specializations) {
        doctor.specializations.forEach(spec => uniqueSpecs.add(spec));
      }
    });

    uniqueSpecs.forEach(spec => {
      if (!iconMap[spec]) {
        allSpecs.push({
          label: spec,
          icon: '🏥',
          color: "bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 hover:from-blue-200 hover:via-indigo-200 hover:to-purple-200 text-blue-600 shadow-blue-200/50"
        });
      }
    });

    return allSpecs.sort((a, b) => a.label.localeCompare(b.label));
  }, [list]);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const bust = `${LOCAL}?v=${Date.now()}`;
    const img = new Image();
    img.onload = () => setHeroSrc(LOCAL);
    img.onerror = () => setHeroSrc(FALLBACK);
    img.src = bust;
    (async () => {
      try {
        setError("");
        const { data } = await API.get("/doctors");
        setList(Array.isArray(data) ? data : []);
      } catch (e) {
        setList([]);
        setError(e.response?.data?.message || e.message || "Network Error");
      }
    })();
  }, []);

  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const { data } = await API.get('/doctors');
        setList(Array.isArray(data) ? data : []);
      } catch (_) {}
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const cleanup = [];
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
    return () => { cleanup.forEach((fn) => fn()); };
  }, []);
  return (
    <div className="min-h-screen bg-pink-100">

      <section className="relative overflow-hidden py-24">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div>
              <div className="flex items-center gap-4 mb-6 animate-slide-in-down">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg border-2 border-white/20">
                  <div className="text-white">
                    <Logo size={20} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                    HospoZen
                  </span>
                  <span className="text-xs text-blue-600 font-medium tracking-wider uppercase">Healthcare Platform</span>
                </div>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold leading-tight animate-slide-in-left text-gray-900 mb-6">
                Care Beyond Limits
                <br />
                <span className="text-blue-600">Healing Through Innovation</span>
              </h1>

              <p className="text-gray-700 text-lg leading-relaxed animate-fade-in mb-8" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
                Empowering lives through revolutionary healthcare solutions that blend cutting-edge technology with heartfelt compassion.
              </p>

              <div className="animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
                <Link to="/search" className="btn-gradient animate-bounce-in shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                  Book Appointment
                </Link>
              </div>
            </div>
            <div className="relative animate-zoom-fade-in">
              {heroSrc && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-3xl transform rotate-6 opacity-15 group-hover:rotate-3 transition-transform duration-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-3xl transform -rotate-3 opacity-10 group-hover:-rotate-1 transition-transform duration-700"></div>
                  <img src={heroSrc} alt="Hero" className="relative w-full rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-700 border-4 border-white/60 group-hover:border-white/80" />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg animate-pulse">
                    <span className="text-blue-600 text-2xl">🏥</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-sm font-semibold animate-slide-in-down shadow-lg border border-blue-200/50 mb-6">
              <span className="mr-2">🎯</span> Choose Your Specialist
            </div>
            <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent animate-slide-in-up mb-6">Find by Speciality</h2>
            <p className="text-gray-600 text-xl max-w-3xl mx-auto animate-fade-in leading-relaxed" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>Simply browse through our comprehensive range of medical specialties and schedule your appointment with qualified professionals.</p>
          </div>
          <div className="relative overflow-hidden">
            <div className="flex gap-10 animate-scroll-left" style={{ width: `${(specialties.length * 2) * 180}px` }}>
              {/* Duplicate the specialties for seamless infinite scroll */}
              {[...specialties, ...specialties].map((s, i) => (
                <div key={`${s.label}-${i}`} className="text-center flex-shrink-0" style={{ width: '160px' }}>
                  <div className={`relative w-28 h-28 rounded-3xl ${s.color} flex items-center justify-center text-5xl shadow-xl hover:shadow-3xl transition-all duration-700 hover:scale-125 hover:rotate-12 border-2 border-white/60 backdrop-blur-sm cursor-pointer group-hover:border-white/80`}>
                    <span className="transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 drop-shadow-lg">{s.icon}</span>
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"></div>
                  </div>
                  <div className="mt-6 text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-300 tracking-wide">{s.label}</div>
                  <div className="w-0 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mx-auto mt-2 group-hover:w-16 transition-all duration-500"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 animate-slide-in-up">Top Doctors to Book</h2>
            <p className="text-gray-600 mt-4 text-lg animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>Simply browse through our extensive list of trusted doctors.</p>
          </div>
          {error && <div className="text-center text-sm text-red-600 mt-3 bg-red-50 py-2 px-4 rounded-lg border border-red-200">{error}</div>}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {(() => {
              const sorted = (list || []).slice().sort((a, b) => {
                const tb = new Date(b.createdAt || 0).getTime();
                const ta = new Date(a.createdAt || 0).getTime();
                if (tb !== ta) return tb - ta;
                const nb = String(b.user?.name || "");
                const na = String(a.user?.name || "");
                return nb.localeCompare(na);
              });
              return sorted.map((d, i) => (
                <div key={d._id} className="glass-card overflow-hidden card-hover animate-fade-in" style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'forwards' }}>
                  <div className="relative">
                    {String(d.photoBase64 || "").startsWith("data:image") ? (
                      <img src={d.photoBase64} alt="Doctor" className="w-full h-48 object-cover" />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                        <div className="text-4xl text-gray-400">👨‍⚕️</div>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 animate-fade-in" style={{ animationDelay: `${i * 0.1 + 0.2}s`, animationFillMode: 'forwards' }}>
                      {(() => {
                        const online = typeof d.isOnline === 'boolean' ? d.isOnline : null;
                        const busy = typeof d.isBusy === 'boolean' ? d.isBusy : null;
                        if (online === null && busy === null) return null;
                        const cls = busy ? 'badge badge-busy' : (online ? 'badge badge-online' : 'badge badge-offline');
                        const txt = busy ? 'Busy' : (online ? 'Online' : 'Offline');
                        return <span className={cls}>{txt}</span>;
                      })()}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900">{`Dr. ${d.user?.name || ''}`}</h3>
                    <p className="text-gray-600 text-sm mt-1">{Array.isArray(d.specializations) ? d.specializations.join(", ") : (typeof d.specializations === "string" ? d.specializations : "")}</p>
                    <div className="mt-4">
                      <Link to={`/doctor/${d.user._id}`} className="btn-gradient inline-flex items-center justify-center w-full text-sm font-medium">View Profile</Link>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </section>

      <section className="py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent animate-slide-in-up">Why Choose HospoZen</h2>
            <p className="text-gray-600 mt-6 text-xl animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>Experience healthcare innovation at its finest</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                title: "Verified Specialists",
                description: "All our doctors are board-certified with years of experience in their fields.",
                icon: "🏥",
                color: "from-blue-500 to-cyan-500"
              },
              {
                title: "Instant Booking",
                description: "Book appointments in seconds with our streamlined online system.",
                icon: "⚡",
                color: "from-purple-500 to-pink-500"
              },
              {
                title: "Secure & Private",
                description: "Your health data is protected with enterprise-grade security measures.",
                icon: "🔒",
                color: "from-green-500 to-teal-500"
              }
            ].map((feature, i) => (
              <div key={feature.title} className="glass-card p-10 text-center animate-bounce-in group hover:scale-105 transition-all duration-500" style={{ animationDelay: `${i * 0.25}s`, animationFillMode: 'forwards' }}>
                <div className={`mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-4xl mb-6 shadow-lg group-hover:shadow-2xl transition-all duration-300`}>
                  <span className="drop-shadow-lg">{feature.icon}</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed text-lg">{feature.description}</p>
                <div className="mt-6 w-12 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mx-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-pink-200 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 items-start">
            <div className="animate-slide-in-left">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg border-2 border-white/20">
                  <div className="text-white">
                    <Logo size={20} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                    HospoZen
                  </span>
                  <span className="text-xs text-blue-600 font-medium tracking-wider uppercase">Healthcare Platform</span>
                </div>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">
                Your trusted healthcare companion. Connecting patients with verified medical professionals for seamless healthcare experiences.
              </p>
            </div>
            <div className="animate-slide-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
              <div className="font-semibold text-gray-900 mb-4 text-lg">COMPANY</div>
              <div className="space-y-3 text-gray-700 text-sm">
                <Link to="/" className="hover:text-pink-600 transition-colors duration-200 block">Home</Link>
                <Link to="/about" className="hover:text-pink-600 transition-colors duration-200 block">About us</Link>
                <div className="text-gray-600">Services</div>
                <div className="text-gray-600">Privacy policy</div>
              </div>
            </div>
            <div className="animate-slide-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
              <div className="font-semibold text-gray-900 mb-4 text-lg">SERVICES</div>
              <div className="space-y-3 text-gray-700 text-sm">
                <div>Doctor Consultation</div>
                <div>Online Booking</div>
                <div>Health Records</div>
                <div>Emergency Care</div>
              </div>
            </div>
            <div className="animate-slide-in-right" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
              <div className="font-semibold text-gray-900 mb-4 text-lg">GET IN TOUCH</div>
              <div className="space-y-3 text-gray-700 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-pink-600">📞</span>
                  <span>+0-000-000-000</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-pink-600">✉️</span>
                  <span>greatstackdev@gmail.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-pink-600">📍</span>
                  <span>Healthcare Innovation Hub</span>
                </div>
              </div>
            </div>
          </div>
          <hr className="my-8 border-gray-400" />
          <div className="text-center text-gray-700 text-sm animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
            © 2024 HospoZen. All rights reserved. | Powered by Innovation
          </div>
        </div>
      </section>
    </div>
  );
}
