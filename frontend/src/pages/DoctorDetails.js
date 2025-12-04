import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import API from "../api";
import Logo from "../components/Logo";


export default function DoctorDetails() {
  const { id } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [related, setRelated] = useState([]);
  const [type, setType] = useState("offline");
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [allSlots, setAllSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [consultMode, setConsultMode] = useState('video');
  const [myBooked, setMyBooked] = useState([]);
  const [myStars, setMyStars] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = useNavigate();
  const isLoggedIn = !!localStorage.getItem("token");
  const token = localStorage.getItem('token');
  const uid = localStorage.getItem('userId');
  const photo = uid ? localStorage.getItem(`userPhotoBase64ById_${uid}`) : '';
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin/doctors/");

  useEffect(() => {
    API.get(`/doctors`, { params: { user: id } }).then((res) => setDoctor(res.data[0]));
  }, [id]);

  const name = doctor?.user?.name || "";
  const specList = (() => {
    const s = doctor?.specializations;
    if (Array.isArray(s)) return s.join(", ");
    if (typeof s === "string") return s;
    return "";
  })();
  const experienceYears = doctor?.experienceYears ? `${doctor?.experienceYears} Years` : undefined;
  const about = doctor?.about || "";
  const fee = doctor?.consultationFees ?? "";
  const doctorOnline = (() => {
    const uidD = doctor?.user?._id;
    if (typeof doctor?.isOnline === 'boolean') return !!doctor?.isOnline;
    return localStorage.getItem(`doctorOnlineById_${uidD}`) === '1';
  })();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !doctor) return;
    (async () => {
      try {
        const { data } = await API.get('/appointments/mine');
        const did = String(doctor?.user?._id || '');
        const stars = [];
        (data || []).forEach((a) => {
          const aid = String(a._id || a.id || '');
          const dA = String(a.doctor?._id || a.doctor || '');
          if (!aid || dA !== did) return;
          try {
            const s = Number(localStorage.getItem(`rate_${aid}_stars`) || 0) || 0;
            if (s > 0) stars.push(s);
          } catch(_) {}
        });
        if (stars.length) {
          const avg = Math.round(stars.reduce((p, c) => p + c, 0) / stars.length);
          setMyStars(Math.max(1, Math.min(5, avg)));
        } else {
          setMyStars(0);
        }
      } catch(_) {
        setMyStars(0);
      }
    })();
  }, [doctor]);
  useEffect(() => {
    if (!doctor) return;
    const primary = (doctor.specializations && doctor.specializations[0]) || undefined;
    API.get('/doctors', { params: { specialization: primary } })
      .then((res) => {
        const others = (res.data || []).filter((d) => String(d.user?._id) !== String(doctor.user?._id));
        setRelated(others.slice(0, 4));
      })
      .catch(() => setRelated([]));
  }, [doctor]);

  useEffect(() => {
    if (!doctor || !selectedDate) return;
    const day = new Date(selectedDate).getDay();
    const duration = Number(doctor?.slotDurationMins || 15);
    const avails = (doctor?.weeklyAvailability || []).filter((a) => a.day === day);
    const clampRange = (r) => {
      const [fh, fm] = String(r.from || "00:00").split(":").map(Number);
      const [th, tm] = String(r.to || "00:00").split(":").map(Number);
      let start = fh * 60 + fm;
      let end = th * 60 + tm;
      const min = 9 * 60;
      const max = 22 * 60;
      if (start < min) start = min;
      if (end > max) end = max;
      if (end <= start) return null;
      const sH = String(Math.floor(start / 60)).padStart(2, "0");
      const sM = String(start % 60).padStart(2, "0");
      const eH = String(Math.floor(end / 60)).padStart(2, "0");
      const eM = String(end % 60).padStart(2, "0");
      return { from: `${sH}:${sM}`, to: `${eH}:${eM}` };
    };
    const baseRanges = avails.length ? avails : [{ day, from: "09:00", to: "22:00" }];
    const ranges = baseRanges.map(clampRange).filter(Boolean);
    const gen = (from, to) => {
      const [fh, fm] = from.split(":").map(Number);
      const [th, tm] = to.split(":").map(Number);
      const startMin = fh * 60 + fm;
      const endMin = th * 60 + tm;
      const out = [];
      for (let m = startMin; m + duration <= endMin; m += duration) {
        const sH = String(Math.floor(m / 60)).padStart(2, "0");
        const sM = String(m % 60).padStart(2, "0");
        const eMins = m + duration;
        const eH = String(Math.floor(eMins / 60)).padStart(2, "0");
        const eM = String(eMins % 60).padStart(2, "0");
        out.push({ start: `${sH}:${sM}`, end: `${eH}:${eM}` });
      }
      return out;
    };
    const full = ranges.flatMap((r) => gen(r.from, r.to)).filter((s) => {
      try {
        const [hh] = String(s.start || "00:00").split(":").map((x) => Number(x));
        return hh < 13 || hh >= 14;
      } catch(_) { return true; }
    });
    setAllSlots(full);
    const uid = doctor?.user?._id;
    API.get(`/appointments/slots/${uid}`, { params: { date: selectedDate } })
      .then((res) => setSlots(res.data || []))
      .catch(() => setSlots([]));
  }, [doctor, selectedDate]);

  useEffect(() => {
    if (!doctor || !selectedDate) return;
    try { if (!localStorage.getItem('token')) return; } catch(_) {}
    (async () => {
      try {
        const { data } = await API.get('/appointments/mine');
        const did = String(doctor?.user?._id || '');
        const mineSameDay = (data || []).filter((x) => String(x.date) === String(selectedDate) && String(x.status).toUpperCase() !== 'CANCELLED');
        const keys = mineSameDay
          .filter((x) => String(x.doctor?._id || x.doctor || '') === did)
          .map((x) => `${String(x.startTime || '')}-${String(x.endTime || '')}`)
          .filter(Boolean);
        setMyBooked(keys);
      } catch (_) {
        setMyBooked([]);
      }
    })();
  }, [doctor, selectedDate]);

  if (!doctor) return <div className="max-w-7xl mx-auto px-4 mt-8">Loading...</div>;

  return (
    <>
      {isAdminRoute ? (
        <header className="navbar animate-fade-in">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2 text-indigo-700">
                <Logo size={24} />
                <span className="text-lg font-semibold">HospoZen</span>
              </div>
              <nav className="flex items-center gap-6">
                <button
                  onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('userId'); nav('/admin/login'); }}
                  className="btn-gradient"
                >
                  Logout
                </button>
              </nav>
            </div>
          </div>
        </header>
      ) : null}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto pt-8 px-4 animate-fade-in">
      <h2 className="text-4xl font-extrabold mb-2 text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent animate-slide-in-right">Doctor Profile</h2>
      <p className="text-center text-slate-600 mb-8 animate-fade-in" style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}>Compassionate care, seamless booking, and secure consultations.</p>
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-2xl p-6 animate-slide-in-left opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
        <div className="grid md:grid-cols-3 gap-6 items-start">
          <div>
            <div className="rounded-2xl overflow-hidden border border-white/30">
              <div className="relative">
                {String(doctor?.photoBase64 || "").startsWith("data:image") ? (
                  <img
                    src={doctor?.photoBase64}
                    alt="Doctor"
                    className="w-full h-64 object-cover hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-64 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <div className="text-6xl text-slate-400">👨‍⚕️</div>
                  </div>
                )}
                {(() => {
                  const uid = doctor?.user?._id;
                  const online = typeof doctor?.isOnline === 'boolean' ? !!doctor?.isOnline : (localStorage.getItem(`doctorOnlineById_${uid}`) === '1');
                  const busy = typeof doctor?.isBusy === 'boolean' ? !!doctor?.isBusy : (localStorage.getItem(`doctorBusyById_${uid}`) === '1');
                  const cls = busy ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' : (online ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' : 'bg-gradient-to-r from-red-400 to-pink-500 text-white');
                  const txt = busy ? 'Busy' : (online ? 'Online' : 'Offline');
                  return <span className={`absolute top-3 right-3 inline-block text-xs px-3 py-2 rounded-full font-semibold shadow-lg ${cls}`}>{txt}</span>;
                })()}
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-semibold">{`Dr. ${name}`}</h2>
            </div>
            <div className="mt-1 text-slate-700">{[specList, experienceYears].filter(Boolean).join(" • ")}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {specList && <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">{specList}</span>}
              {experienceYears && <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">{experienceYears}</span>}
            </div>
            <div className="mt-4">
              <div className="font-semibold">About</div>
              <p className="text-slate-700 text-sm mt-1">{about}</p>
            </div>
            {fee !== "" && (<div className="mt-4 text-slate-700">Appointment fee: ₹{fee}</div>)}
            {myStars > 0 && (
              <div className="mt-4 flex items-center gap-1 text-amber-500">
                {[1,2,3,4,5].map((n) => (
                  <svg key={n} className={`w-5 h-5 ${myStars>=n ? '' : 'opacity-40'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {!isAdminRoute && (
      <div className="mt-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl p-6 animate-slide-in-left opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
          <div className="text-slate-900 font-semibold mb-4">Booking slots</div>
          <div className="flex items-center gap-4 mb-4">
            <select
              value={type}
              onChange={(e) => setType(e.target.value === 'online' ? 'online' : 'offline')}
              className="w-full max-w-xs p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300"
            >
              <option value="offline">Clinic/Hospital Visit</option>
              <option value="online">Online Consultation</option>
            </select>
            {type === 'online' && (
              <select
                value={consultMode}
                onChange={(e) => setConsultMode(e.target.value)}
                className="w-full max-w-xs p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300"
              >
                <option value="video">Video call</option>
                <option value="audio">Audio call</option>
                <option value="chat">Chat</option>
              </select>
            )}
            <div className="flex items-center gap-3">
              {Array.from({ length: 7 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                const label = d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
                const day = String(d.getDate()).padStart(2, "0");
                const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                const isSel = selectedDate === val;
                const todayVal = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`;
                const isToday = val === todayVal;
                const disabledToday = isToday && !doctorOnline;
                return (
                  <button
                    key={val}
                    onClick={() => { if (!disabledToday) setSelectedDate(val); }}
                    disabled={disabledToday}
                    className={`px-4 py-3 rounded-full border ${isSel ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-600" : disabledToday ? "bg-white text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white text-slate-900 border-slate-300 hover:scale-105 transition"}`}
                  >
                    <div className="text-xs">{label}</div>
                    <div className="text-base">{day}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            {slots.length === 0 && selectedDate && (
              <div className="text-slate-600">No slots available</div>
            )}
            {(() => {
              const tNow = new Date();
              const todayISO = `${tNow.getFullYear()}-${String(tNow.getMonth()+1).padStart(2,'0')}-${String(tNow.getDate()).padStart(2,'0')}`;
              const now = new Date();
              const nowMin = now.getHours() * 60 + now.getMinutes();
              const availKeys = new Set((slots || []).map((x) => `${x.start}-${x.end}`));
              const base = selectedDate === todayISO
                ? allSlots.filter((s) => {
                    const [hh, mm] = String(s.start || "00:00").split(":").map((x) => Number(x));
                    return hh * 60 + mm >= nowMin;
                  })
                : allSlots;
              return base.map((s) => {
                const key = `${s.start}-${s.end}`;
                const sel = selectedSlot && selectedSlot.start === s.start && selectedSlot.end === s.end;
                const isMine = (myBooked || []).includes(key);
                const [sh, sm] = String(s.start || "00:00").split(":").map((x) => Number(x));
                const startMin = sh * 60 + sm;
                const within5 = selectedDate === todayISO && startMin <= (nowMin + 5);
                const disabled = isMine || within5;
                return (
                  <button
                    key={key}
                    onClick={() => { if (!disabled) setSelectedSlot(s); }}
                    disabled={disabled}
                    className={`px-4 py-2 rounded-full border flex items-center gap-2 ${sel ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-600" : disabled ? "bg-white text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white text-slate-900 border-slate-300 hover:scale-105 transition"}`}
                  >
                    <span>{s.start} - {s.end}</span>
                    {isMine && (
                      <span className="badge badge-offline">Booked</span>
                    )}
                    {(!isMine && within5) && (
                      <span className="badge">Unavailable</span>
                    )}
                  </button>
                );
              });
            })()}
          </div>

          <button
            onClick={async () => {
              if (!isLoggedIn) { nav('/login'); return; }
              if (!selectedDate || !selectedSlot) { nav(`/book/${doctor?.user?._id}`); return; }
            const tNow2 = new Date();
            const todayISO = `${tNow2.getFullYear()}-${String(tNow2.getMonth()+1).padStart(2,'0')}-${String(tNow2.getDate()).padStart(2,'0')}`;
            if (selectedDate === todayISO && !doctorOnline) { alert('Doctor is offline today. Please choose a future date.'); return; }
            if (selectedDate === todayISO) {
              try {
                const [sh, sm] = String(selectedSlot.start || '00:00').split(':').map((x) => Number(x));
                const startMin = sh * 60 + sm;
                const now = new Date();
                const nowMin = now.getHours() * 60 + now.getMinutes();
                if (startMin <= nowMin + 5) { alert('This slot is unavailable less than 5 minutes before start. Please choose the next slot.'); return; }
              } catch (_) {}
            }
            try {
              try {
                const mine = await API.get('/appointments/mine');
                const items = mine.data || [];
                const did = String(doctor?.user?._id || '');
                const sameDay = (items || []).filter((x) => String(x.date) === String(selectedDate));
                const nowTs = Date.now();
                const inCall = sameDay.some((x) => {
                  const aid = String(x._id || x.id || '');
                  const sd = new Date(x.date);
                  const [sh, sm] = String(x.startTime || '00:00').split(':').map((n) => Number(n));
                  sd.setHours(sh, sm, 0, 0);
                  const ed = new Date(x.date);
                  const [eh, em] = String(x.endTime || x.startTime || '00:00').split(':').map((n) => Number(n));
                  ed.setHours(eh, em, 0, 0);
                  const active = nowTs >= sd.getTime() && nowTs < ed.getTime();
                  const sameDoc = String(x.doctor?._id || x.doctor || '') === did;
                  const jP = aid ? localStorage.getItem(`joinedByPatient_${aid}`) === '1' : false;
                  const jD1 = aid ? localStorage.getItem(`joinedByDoctor_${aid}`) === '1' : false;
                  const jD2 = aid ? localStorage.getItem(`doctorJoined_${aid}`) === '1' : false;
                  const jD = jD1 || jD2;
                  return sameDoc && active && (jP || jD);
                });
                if (inCall) {
                  alert('You are already in a call with this doctor. Please book a slot for tomorrow.');
                  return;
                }
                const exist = sameDay.find((x) => String(x.doctor?._id || x.doctor || '') === did && String(x.status).toUpperCase() !== 'CANCELLED');
                if (exist) {
                  const s = String(exist.status).toUpperCase();
                  if (s === 'COMPLETED') {
                    alert('Your consultation for today is completed. Please book a slot for tomorrow.');
                    return;
                  }
                  const ok = window.confirm('You already have an appointment with this doctor. Do you want to cancel it?');
                  if (ok) { nav('/appointments'); }
                  return;
                }
              } catch (_) {}
              const { data } = await API.post("/appointments", {
                doctorId: doctor?.user?._id,
                date: selectedDate,
                startTime: selectedSlot.start,
                endTime: selectedSlot.end,
                type,
                consultationMode: typeof consultMode === 'string' ? consultMode : undefined,
                beneficiaryType: "self",
              });
              try { /* meeting link will be set by doctor */ } catch (_) {}
              setSlots((prev) => prev.filter((s) => !(s.start === selectedSlot.start && s.end === selectedSlot.end)));
              if (type === 'online' && (data?._id || data?.id)) {
                nav(`/pay/${String(data._id || data.id)}`);
              } else {
                nav(`/appointments`);
              }
            } catch (err) {
              alert(err.response?.data?.message || err.message);
            }
            }}
            className="inline-flex items-center justify-center w-full md:w-auto py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            {isLoggedIn ? "Book an appointment" : "Login to book"}
          </button>
        </div>
      </div>
      )}

      {!isAdminRoute && (
      <div className="mt-8">
        <h3 className="text-2xl font-semibold text-slate-900 text-center">Related Doctors</h3>
        <p className="text-slate-600 text-center mt-2">Simply browse through our extensive list of trusted doctors.</p>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {related.map((d) => (
            <div key={d._id} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl overflow-hidden hover:scale-105 hover:shadow-2xl transition-all duration-500">
              <div className="relative">
                {String(d.photoBase64 || "").startsWith("data:image") ? (
                  <img
                    src={d.photoBase64}
                    alt="Doctor"
                    className="w-full h-64 object-cover hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-64 bg-gradient-to-br from-slate-100 to-slate-200" />
                )}
                <span className="absolute top-3 left-3 inline-block text-xs px-3 py-2 rounded-full font-semibold shadow-lg bg-gradient-to-r from-green-400 to-emerald-500 text-white">Available</span>
              </div>
              <div className="p-4">
                <div className="text-base font-semibold">{`Dr. ${d.user?.name || ''}`}</div>
                <div className="text-sm text-slate-600">{Array.isArray(d.specializations) ? d.specializations.join(", ") : (typeof d.specializations === "string" ? d.specializations : "")}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {!isAdminRoute && (
      <section className="mt-8 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 py-12 bg-gradient-to-br from-white/90 to-indigo-50 backdrop-blur-sm rounded-2xl border border-white/30 shadow-2xl">
          <div className="grid md:grid-cols-3 gap-8 items-start">
            <div className="animate-slide-in-left">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg border-2 border-white/20">
                  <div className="text-white">
                    <Logo size={20} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">HospoZen</span>
                  <span className="text-xs text-blue-600 font-medium tracking-wider uppercase">Healthcare Platform</span>
                </div>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed">
                Your trusted healthcare companion. Connecting patients with verified medical professionals for seamless healthcare experiences.
              </p>
            </div>
            <div>
              <div className="font-semibold text-slate-900 mb-2 uppercase tracking-wide">Company</div>
              <div className="flex flex-col space-y-2 text-slate-700 text-sm">
                <Link to="/" className="hover:text-indigo-700 block">Home</Link>
                <Link to="/search" className="hover:text-indigo-700 block">Find Doctors</Link>
                <Link to="/about" className="hover:text-indigo-700 block">About us</Link>
                <Link to="/contact" className="hover:text-indigo-700 block">Contact</Link>
              </div>
            </div>
            <div>
              <div className="font-semibold text-slate-900 mb-2 uppercase tracking-wide">Get in touch</div>
              <div className="flex items-center gap-2 text-slate-700 text-sm"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" d="M2 3h5l2 5-3 2a16 16 0 008 8l2-3 5 2v5a2 2 0 01-2 2h-1C9.163 24 0 14.837 0 3V2a2 2 0 012-2h0z"/></svg> +0-000-000-000</div>
              <div className="flex items-center gap-2 text-slate-700 text-sm"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" d="M4 4h16v16H4z"/><path strokeWidth="2" d="M22 6l-10 7L2 6"/></svg> greatstackdev@gmail.com</div>
            </div>
          </div>
          <hr className="my-6 border-slate-200" />
          <div className="text-center text-slate-600 text-sm">© 2024 HospoZen. All rights reserved. | Powered by Innovation</div>
        </div>
      </section>
      )}
      </div>
      </div>
    </>
  );
}
