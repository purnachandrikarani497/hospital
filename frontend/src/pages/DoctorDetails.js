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
      ) : (
        <header className="navbar animate-fade-in">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-2 text-indigo-700">
                <Logo size={24} />
                <span className="text-lg font-semibold">HospoZen</span>
              </Link>
              <div className="flex items-center gap-6">
                <nav className="flex items-center gap-6">
                  {(() => {
                    const p = location.pathname;
                    const linkCls = (active) => active ? "nav-link text-indigo-700 font-semibold" : "nav-link";
                    return (
                      <>
                        <Link to="/" className={linkCls(p === "/")}>Home</Link>
                        <Link to="/search" className={linkCls(p.startsWith("/search"))}>All Doctors</Link>
                        <Link to="/about" className={linkCls(p.startsWith("/about"))}>About</Link>
                        <Link to="/contact" className={linkCls(p.startsWith("/contact"))}>Contact</Link>
                      </>
                    );
                  })()}
                </nav>
                {token ? (
                  <div className="relative">
                    {photo ? (
                      <img
                        src={photo}
                        alt="User"
                        className="h-9 w-9 rounded-full object-cover border border-slate-300 cursor-pointer"
                        onClick={() => setMenuOpen((v) => !v)}
                      />
                    ) : (
                      <div
                        className="h-9 w-9 rounded-full border border-slate-300 bg-white cursor-pointer"
                        onClick={() => setMenuOpen((v) => !v)}
                      />
                    )}
                    {menuOpen && (
                      <div className="absolute right-0 mt-2 w-44 glass-card shadow-2xl text-sm">
                        <Link to="/profile" className="block px-3 py-2 nav-link">My Profile</Link>
                        <Link to="/appointments" className="block px-3 py-2 nav-link">My Appointments</Link>
                        <Link to="/prescriptions" className="block px-3 py-2 nav-link">Prescriptions</Link>
                        <button
                          onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('userId'); nav('/login'); }}
                          className="block w-full text-left px-3 py-2 nav-link"
                        >
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link to="/register" className="btn-gradient">Create Account</Link>
                )}
              </div>
            </div>
          </div>
        </header>
      )}
      <div className="max-w-7xl mx-auto px-4 mt-8">
      <div className="glass-card p-6 animate-fade-in">
        <div className="grid md:grid-cols-3 gap-6 items-start">
          <div>
            <div className="bg-indigo-50 rounded-xl overflow-hidden border border-indigo-100">
              <div className="relative">
                {String(doctor?.photoBase64 || "").startsWith("data:image") ? (
                  <img
                    src={doctor?.photoBase64}
                    alt="Doctor"
                    className="w-full h-64 object-cover transform hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-64 bg-white" />
                )}
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-semibold">{`Dr. ${name}`}</h2>
              {(() => {
                const uid = doctor?.user?._id;
                const isOnline = typeof doctor?.isOnline === 'boolean' ? !!doctor?.isOnline : (localStorage.getItem(`doctorOnlineById_${uid}`) === '1');
                const isBusy = typeof doctor?.isBusy === 'boolean' ? !!doctor?.isBusy : (localStorage.getItem(`doctorBusyById_${uid}`) === '1');
                return (
                  <span className={`badge ${isBusy ? 'badge-busy' : (isOnline ? 'badge-online' : 'badge-offline')}`}>{isBusy ? 'Busy' : (isOnline ? 'Online' : 'Offline')}</span>
                );
              })()}
            </div>
            <div className="mt-1 text-slate-700">{[specList, experienceYears].filter(Boolean).join(" • ")}</div>
            <div className="mt-4">
              <div className="font-semibold">About</div>
              <p className="text-slate-700 text-sm mt-1">{about}</p>
            </div>
            {fee !== "" && (<div className="mt-4 text-slate-700">Appointment fee: ₹{fee}</div>)}
          </div>
        </div>
      </div>

      {!isAdminRoute && (
      <div className="mt-8">
        <div className="glass-card p-6 animate-fade-in">
          <div className="text-slate-900 font-semibold mb-4">Booking slots</div>
          <div className="flex items-center gap-4 mb-4">
            <select
              value={type}
              onChange={(e) => setType(e.target.value === 'online' ? 'online' : 'offline')}
              className="input-elevated text-sm"
            >
              <option value="offline">Clinic/Hospital Visit</option>
              <option value="online">Online Consultation</option>
            </select>
            {type === 'online' && (
              <select
                value={consultMode}
                onChange={(e) => setConsultMode(e.target.value)}
                className="input-elevated text-sm"
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
                    className={`px-4 py-3 rounded-full border card-hover ${isSel ? "bg-indigo-600 text-white border-indigo-600" : disabledToday ? "bg-white text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white text-slate-900 border-slate-300"}`}
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
                    className={`px-4 py-2 rounded-full border flex items-center gap-2 card-hover ${sel ? "bg-indigo-600 text-white border-indigo-600" : disabled ? "bg-white text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white text-slate-900 border-slate-300"}`}
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
            className="btn-gradient w-full md:w-auto"
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
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {related.map((d) => (
            <div key={d._id} className="glass-card overflow-hidden card-hover">
              <div className="relative">
                {String(d.photoBase64 || "").startsWith("data:image") ? (
                  <img
                    src={d.photoBase64}
                    alt="Doctor"
                    className="w-full h-56 object-cover transform hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-56 bg-gradient-to-br from-slate-100 to-slate-200" />
                )}
                <span className="absolute top-3 left-3 badge badge-online">Available</span>
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
        <div className="max-w-7xl mx-auto px-4 py-12 glass-card">
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
      )}
      </div>
    </>
  );
}
