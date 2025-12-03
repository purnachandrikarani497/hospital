import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { useEffect, useRef, useState } from "react";
import API from "../api";

export default function Home() {
  const FALLBACK = "https://raw.githubusercontent.com/abhi051002/hms-fullstack/main/frontend/src/readme_images/home1.png";
  const LOCAL = (process.env.PUBLIC_URL || "") + "/doctor3.jpeg";
  const CARD_FALLBACK = "https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=640&auto=format&fit=crop";
  const [heroSrc, setHeroSrc] = useState(FALLBACK);
  const [list, setList] = useState([]);
  const [error, setError] = useState("");
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const bust = `${LOCAL}?v=${Date.now()}`;
    fetch(bust, { method: "HEAD" })
      .then((res) => {
        if (res.ok) setHeroSrc(LOCAL);
        else setHeroSrc(FALLBACK);
      })
      .catch(() => setHeroSrc(FALLBACK));
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
    <div className="min-h-screen bg-white">

      

      <section>
        <div className="max-w-7xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-semibold text-slate-900 text-center">Find by Speciality</h2>
          <p className="text-slate-600 text-center mt-2">Simply browse through specialties and schedule your appointment.</p>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { label: "Cardiology", icon: "❤️" },
              { label: "Dermatology", icon: "🧴" },
              { label: "Orthopedics", icon: "🦴" },
              { label: "Pediatrics", icon: "🧒" },
              { label: "Neurology", icon: "🧠" },
              { label: "Dental", icon: "🦷" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-2xl">
                  <span>{s.icon}</span>
                </div>
                <div className="mt-2 text-sm text-slate-700">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-7xl mx-auto px-4 py-10">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 text-center">Top Doctors to Book</h2>
          <p className="text-slate-600 text-center mt-2">Simply browse through our extensive list of trusted doctors.</p>
          {error && <div className="text-center text-sm text-red-600 mt-3">{error}</div>}
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(() => {
              const sorted = (list || []).slice().sort((a, b) => {
                const tb = new Date(b.createdAt || 0).getTime();
                const ta = new Date(a.createdAt || 0).getTime();
                if (tb !== ta) return tb - ta;
                const nb = String(b.user?.name || "");
                const na = String(a.user?.name || "");
                return nb.localeCompare(na);
              });
              return sorted.map((d) => (
                <div key={d._id} className="bg-indigo-50 rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
                  <div className="relative">
                    {String(d.photoBase64 || "").startsWith("data:image") ? (
                      <img
                        src={d.photoBase64}
                        alt="Doctor"
                        className="w-full h-56 object-cover"
                      />
                    ) : (
                      <div className="w-full h-56 bg-white" />
                    )}
                    <div className="absolute top-2 right-2">
                      {(() => {
                        const online = typeof d.isOnline === 'boolean' ? d.isOnline : null;
                        const busy = typeof d.isBusy === 'boolean' ? d.isBusy : null;
                        if (online === null && busy === null) return null;
                        const cls = busy ? 'bg-amber-100 text-amber-700' : (online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700');
                        const txt = busy ? 'Busy' : (online ? 'Online' : 'Offline');
                        return <span className={`inline-block text-xs px-2 py-1 rounded ${cls}`}>{txt}</span>;
                      })()}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-semibold">{`Dr. ${d.user?.name || ''}`}</h3>
                    <p className="text-sm text-slate-600">{(d.specializations && d.specializations[0]) || ""}</p>
                    <Link to={`/doctor/${d.user._id}`} className="mt-3 inline-block text-indigo-600 hover:text-indigo-800">View Profile</Link>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </section>

      <section>
        <div className="hidden" aria-hidden="true" />
      </section>

      <section>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-3 gap-8 items-start">
            <div>
              <div className="flex items-center gap-2 text-indigo-700 font-semibold text-lg">
                <Logo size={24} />
                <span>HospoZen</span>
              </div>
              <p className="mt-3 text-slate-600 text-sm">
                Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                It has been the industry's standard dummy text ever since the 1500s.
              </p>
            </div>
            <div>
              <div className="font-semibold text-slate-900 mb-2">COMPANY</div>
              <div className="space-y-1 text-slate-700 text-sm">
                <Link to="/" className="hover:text-indigo-700">Home</Link>
                <div>
                  <Link to="/about" className="hover:text-indigo-700">About us</Link>
                </div>
                <div className="text-slate-700">Delivery</div>
                <div className="text-slate-700">Privacy policy</div>
              </div>
            </div>
            <div>
              <div className="font-semibold text-slate-900 mb-2">GET IN TOUCH</div>
              <div className="text-slate-700 text-sm">+0-000-000-000</div>
              <div className="text-slate-700 text-sm">greatstackdev@gmail.com</div>
            </div>
          </div>
          <hr className="my-6 border-slate-200" />
          <div className="text-center text-slate-600 text-sm">Copyright 2024 © GreatStack.dev - All Right Reserved.</div>
        </div>
      </section>
    </div>
  );
}
