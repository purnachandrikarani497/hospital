import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import API from "../api";

export default function DoctorDashboard() {
  const nav = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [latestToday, setLatestToday] = useState([]);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [bellCount, setBellCount] = useState(0);
  const [chatAppt, setChatAppt] = useState(null);
  const [chatPreview, setChatPreview] = useState(null);
  const [isFullPreview, setIsFullPreview] = useState(false);
  const socketRef = useRef(null);
  const meetWinRef = useRef(null);
  const meetMonitorRef = useRef(null);
  const [followAppt, setFollowAppt] = useState(null);
  const [fuChat, setFuChat] = useState([]);
  const [fuFiles, setFuFiles] = useState([]);
  const [fuText, setFuText] = useState("");
  const [fuPreview, setFuPreview] = useState(null);
  const [fuIsFullPreview, setFuIsFullPreview] = useState(false);
  const [profile, setProfile] = useState(null);
  const [expiredAppt, setExpiredAppt] = useState(null);
  const [muteUntil, setMuteUntil] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelItems, setPanelItems] = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelUnread, setPanelUnread] = useState(0);
  const linkClass = (active) =>
    active
      ? "relative px-4 py-2 text-blue-700 font-bold bg-blue-50 rounded-xl border-2 border-blue-200 shadow-sm"
      : "relative px-4 py-2 text-gray-600 hover:text-blue-600 font-medium rounded-xl hover:bg-blue-50/50 transition-all duration-300 hover:scale-105";
  const [mobileOpen, setMobileOpen] = useState(false);

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
    try {
      const id = String(chatAppt?._id || chatAppt?.id || '');
      if (!id) return;
      const hasSym = String(chatAppt?.patientSymptoms || '').trim() !== '';
      const hasSum = String(chatAppt?.patientSummary || '').trim() !== '';
      if (hasSym && hasSum) return;
      API.get(`/appointments/${id}`).then((res) => {
        const d = res?.data || {};
        setChatAppt((prev) => ({
          ...(prev || {}),
          patientSymptoms: String(d.patientSymptoms || (prev ? prev.patientSymptoms : '') || localStorage.getItem(`wr_${id}_symptoms`) || ''),
          patientSummary: String(d.patientSummary || (prev ? prev.patientSummary : '') || localStorage.getItem(`fu_${id}_symptoms`) || ''),
        }));
      }).catch(() => {
        setChatAppt((prev) => ({
          ...(prev || {}),
          patientSymptoms: String((prev ? prev.patientSymptoms : '') || localStorage.getItem(`wr_${id}_symptoms`) || ''),
          patientSummary: String((prev ? prev.patientSummary : '') || localStorage.getItem(`fu_${id}_symptoms`) || ''),
        }));
      });
    } catch(_) {}
  }, [chatAppt]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        setError("");
        const uid = localStorage.getItem("userId");

        const getFromAdmin = async () => {
          try {
            const all = await API.get("/admin/appointments");
            return (all.data || []).filter((x) => String(x.doctor?._id || x.doctor) === String(uid));
          } catch (e) {
            return [];
          }
        };

        let items = [];
        try {
          const mine = await API.get("/appointments/mine");
          items = mine.data || [];
        } catch (eMine) {
          items = await getFromAdmin();
        }

        if (!items.length) {
          const alt = await getFromAdmin();
          if (alt.length) items = alt;
        }

        const _d0 = new Date();
        const todayStr = `${_d0.getFullYear()}-${String(_d0.getMonth()+1).padStart(2,'0')}-${String(_d0.getDate()).padStart(2,'0')}`;
        let filtered = (items || []).filter((a) => a.date === todayStr);
        try {
          const todayRes = await API.get('/appointments/today');
          const todayList = todayRes.data || [];
          if (Array.isArray(todayList) && todayList.length) {
            filtered = todayList;
          }
        } catch (eToday) {}
        setLatestToday(filtered);

        setList(items);
        try {
          if (uid) {
            const profs = await API.get(`/doctors?user=${uid}`);
            const first = Array.isArray(profs?.data) ? profs.data[0] : null;
            setProfile(first || null);
          }
        } catch (_) {}
      } catch (e) {
        setList([]);
        setError(e.response?.data?.message || e.message || "Failed to load dashboard");
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    try {
      const chan = new BroadcastChannel('doctorStatus');
      const my = localStorage.getItem('userId') || '';
      chan.onmessage = (e) => {
        const { uid, online: on, busy: bz } = e.data || {};
        if (!uid || uid === my) {
          if (typeof on === 'boolean') {
            setOnline(on);
            localStorage.setItem(`doctorOnlineById_${my}`, on ? '1' : '0');
          }
          if (typeof bz === 'boolean') {
            setBusy(bz);
            localStorage.setItem(`doctorBusyById_${my}`, bz ? '1' : '0');
          }
        }
      };
      return () => { try { chan.close(); } catch(_) {} };
    } catch(_) {}
  }, []);

  useEffect(() => {
    const uid = localStorage.getItem("userId") || "";
    const v = localStorage.getItem(`doctorOnlineById_${uid}`) === "1";
    const b = localStorage.getItem(`doctorBusyById_${uid}`) === "1";
    setOnline(v);
    setBusy(b);
    if (uid) {
      API.get('/doctors', { params: { user: uid } }).then((res) => {
        const prof = Array.isArray(res.data) ? res.data[0] : null;
        if (prof && typeof prof.isOnline === 'boolean') setOnline(!!prof.isOnline);
        if (prof && typeof prof.isBusy === 'boolean') setBusy(!!prof.isBusy);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get('/notifications', { params: { unread: 1 } });
        const items = Array.isArray(data) ? data : [];
        const unread = items.filter((x) => !x.read).length;
        setBellCount(unread);
      } catch (_) {}
    })();
    try {
      const chan = new BroadcastChannel('chatmsg');
      const onMsg = (e) => {
        try {
          const { apptId, actor } = e.data || {};
          if (String(actor || '').toLowerCase() !== 'patient') return;
          const id = String(apptId || '');
          if (!id) return;
          setBellCount((c) => c + 1);
          try { localStorage.setItem('lastChatApptId', id); } catch(_) {}
          const a = (list || []).find((x) => String(x._id || x.id) === id) || (latestToday || []).find((x) => String(x._id || x.id) === id);
          addNotif(`New message from ${a?.patient?.name || 'patient'}`, id);
        } catch (_) {}
      };
      chan.onmessage = onMsg;
      return () => { try { chan.close(); } catch(_) {} };
    } catch (_) {}
  }, [list, latestToday]);

  const setStatus = async (status) => {
    const uid = localStorage.getItem("userId") || "";
    if (status === "online") {
      localStorage.setItem(`doctorOnlineById_${uid}`, "1");
      localStorage.setItem(`doctorBusyById_${uid}`, "0");
      setOnline(true);
      setBusy(false);
      try { await API.put('/doctors/me/status', { isOnline: true, isBusy: false }); } catch (_) {}
      try { const chan = new BroadcastChannel('doctorStatus'); chan.postMessage({ uid, online: true, busy: false }); chan.close(); } catch(_) {}
    } else if (status === "offline") {
      localStorage.setItem(`doctorOnlineById_${uid}`, "0");
      localStorage.setItem(`doctorBusyById_${uid}`, "0");
      setOnline(false);
      setBusy(false);
      try { await API.put('/doctors/me/status', { isOnline: false, isBusy: false }); } catch (_) {}
      try { const chan = new BroadcastChannel('doctorStatus'); chan.postMessage({ uid, online: false, busy: false }); chan.close(); } catch(_) {}
    } else {
      localStorage.setItem(`doctorBusyById_${uid}`, "1");
      localStorage.setItem(`doctorOnlineById_${uid}`, "1");
      setOnline(true);
      setBusy(true);
      try { await API.put('/doctors/me/status', { isOnline: true, isBusy: true }); } catch (_) {}
      try { const chan = new BroadcastChannel('doctorStatus'); chan.postMessage({ uid, online: true, busy: true }); chan.close(); } catch(_) {}
    }
  };

  const openMeetFor = async (apptId) => {
    try {
      const id = String(apptId || '');
      if (!id) return;
      const a = (list || []).find((x) => String(x._id || x.id) === id) || (latestToday || []).find((x) => String(x._id || x.id) === id) || null;
      if (!a) { nav('/doctor/appointments?joinMeet=' + encodeURIComponent(id)); return; }
      try {
        const start = new Date(a.date);
        const [sh, sm] = String(a.startTime || '00:00').split(':').map((x) => Number(x));
        start.setHours(sh, sm, 0, 0);
        const end = new Date(a.date);
        const [eh, em] = String(a.endTime || a.startTime || '00:00').split(':').map((x) => Number(x));
        end.setHours(eh, em, 0, 0);
        if (end.getTime() <= start.getTime()) end.setTime(start.getTime() + 30 * 60 * 1000);
        const now = Date.now();
        const windowStart = start.getTime() - 5 * 60 * 1000;
        if (now >= end.getTime()) { alert('Meeting time is over.'); return; }
        if (now < windowStart) { alert('Meeting will be available 5 minutes before start.'); return; }
      } catch (_) {}
      if (!online) { alert('You are offline. Set status to ONLINE to join consultation.'); return; }
      const stored = id ? localStorage.getItem(`meetlink_${id}`) : '';
      let pick = (stored && /^https?:\/\//.test(stored)) ? stored : String(a.meetingLink || '');
      let url = String(pick).replace(/[`'\"]/g, '').trim();
      if (!url || !/^https?:\/\//.test(url)) {
        try {
          const resp = await API.post(`/appointments/${id}/meet-link/generate`);
          url = String(resp?.data?.url || '').trim();
          if (!/^https?:\/\//.test(url)) { alert('Failed to generate meeting link'); return; }
          try { localStorage.setItem(`meetlink_${id}`, url); } catch(_) {}
        } catch (e) {
          alert(e.response?.data?.message || e.message || 'Failed to generate meeting link');
          return;
        }
      } else {
        try { await API.put(`/appointments/${id}/meet-link`, { url }); } catch(_) {}
      }
      try { localStorage.setItem(`joinedByDoctor_${id}`, '1'); } catch(_) {}
      try { socketRef.current && socketRef.current.emit('meet:update', { apptId: id, actor: 'doctor', event: 'join' }); } catch(_) {}
      try {
        const uid = localStorage.getItem('userId') || '';
        if (uid) {
          localStorage.setItem(`doctorBusyById_${uid}`, '1');
          API.put('/doctors/me/status', { isOnline: true, isBusy: true }).catch(() => {});
        }
      } catch(_) {}
      setOnline(true);
      setBusy(true);
      try { const chan = new BroadcastChannel('doctorStatus'); const uid = localStorage.getItem('userId') || ''; chan.postMessage({ uid, online: true, busy: true }); chan.close(); } catch(_) {}
      try {
        meetWinRef.current = window.open(url, '_blank');
        meetMonitorRef.current = setInterval(() => {
          if (!meetWinRef.current || meetWinRef.current.closed) {
            if (meetMonitorRef.current) { clearInterval(meetMonitorRef.current); meetMonitorRef.current = null; }
            try { localStorage.removeItem(`joinedByDoctor_${id}`); } catch(_) {}
            try {
              const uid = localStorage.getItem('userId') || '';
          if (uid) {
            localStorage.setItem(`doctorBusyById_${uid}`, '0');
            API.put('/doctors/me/status', { isOnline: true, isBusy: false }).catch(() => {});
          }
        } catch(_) {}
        setBusy(false);
        try { const chan = new BroadcastChannel('doctorStatus'); const uid2 = localStorage.getItem('userId') || ''; chan.postMessage({ uid: uid2, online: true, busy: false }); chan.close(); } catch(_) {}
      }
        }, 1000);
      } catch(_) {}
    } catch(_) {}
  };
  const leaveMeetFor = (apptId) => {
    try {
      const id = String(apptId || '');
      if (!id) return;
      try { localStorage.setItem(`leftDoctor_${id}`, '1'); } catch(_) {}
      try { localStorage.removeItem(`joinedByDoctor_${id}`); } catch(_) {}
      try {
        const uid = localStorage.getItem('userId') || '';
        if (uid) {
          localStorage.setItem(`doctorBusyById_${uid}`, '0');
          API.put('/doctors/me/status', { isOnline: true, isBusy: false }).catch(() => {});
        }
      } catch(_) {}
      setBusy(false);
      setOnline(true);
      try { socketRef.current && socketRef.current.emit('meet:update', { apptId: id, actor: 'doctor', event: 'exit' }); } catch(_) {}
      try {
        if (meetMonitorRef.current) { clearInterval(meetMonitorRef.current); meetMonitorRef.current = null; }
        if (meetWinRef.current && !meetWinRef.current.closed) { meetWinRef.current.close(); }
        meetWinRef.current = null;
      } catch(_) {}
    } catch(_) {}
  };

  const addNotif = (text, apptId, link) => {
    const id = String(Date.now()) + String(Math.random());
    setNotifs((prev) => [{ id, text, apptId, link }, ...prev].slice(0, 4));
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => { try { osc.stop(); ctx.close(); } catch(_) {} }, 450);
    } catch (_) {}
    setTimeout(() => { setNotifs((prev) => prev.filter((n) => n.id !== id)); }, 6000);
  };

  useEffect(() => {
    const uid = localStorage.getItem("userId") || "";
    const cleanup = [];
    const initSocket = () => {
      const origin = String(API.defaults.baseURL || "").replace(/\/(api)?$/, "");
      const w = window;
      const onReady = () => {
        try {
          const socket = w.io ? w.io(origin, { transports: ["websocket", "polling"], auth: { token: localStorage.getItem("token") || "" } }) : null;
          if (socket) {
            socketRef.current = socket;
            socket.on("appointment:new", (a) => {
              try {
                const did = String(a?.doctor?._id || a?.doctor || "");
                if (did !== String(uid)) return;
                const key = String(a._id || a.id || "");
                const seen = new Set([...(list || []), ...(latestToday || [])].map((x) => String(x._id || x.id || "")));
                if (seen.has(key)) return;
                addNotif(`New appointment booked at ${a.startTime || "--:--"}`, null, "/doctor/dashboard#all-appointments");
                setLatestToday((prev) => [a, ...prev]);
                setList((prev) => [a, ...prev]);
              } catch (_) {}
            });
            socket.on('doctor:status', (msg) => {
              try {
                const uid = localStorage.getItem('userId') || '';
                if (String(msg?.doctorId || '') !== String(uid)) return;
                const on = !!msg?.isOnline;
                const bz = !!msg?.isBusy;
                setOnline(on);
                setBusy(bz);
                try { localStorage.setItem(`doctorOnlineById_${uid}`, on ? '1' : '0'); } catch(_) {}
                try { localStorage.setItem(`doctorBusyById_${uid}`, bz ? '1' : '0'); } catch(_) {}
              } catch(_) {}
            });
            socket.on('meet:update', (msg) => {
              try {
                const { apptId, actor, event } = msg || {};
                const id = String(apptId || '');
                if (!id) return;
                const a = (list || []).find((x) => String(x._id || x.id) === id) || (latestToday || []).find((x) => String(x._id || x.id) === id);
                if (!a) return;
                const start = new Date(a.date);
                const [sh, sm] = String(a.startTime || '00:00').split(':').map((x) => Number(x));
                start.setHours(sh, sm, 0, 0);
                const end = new Date(a.date);
                const [eh, em] = String(a.endTime || a.startTime || '00:00').split(':').map((x) => Number(x));
                end.setHours(eh, em, 0, 0);
                const now = Date.now();
                const active = now >= start.getTime() && now < end.getTime();
                if (event === 'join' && actor === 'patient') {
                  try { localStorage.setItem(`joinedByPatient_${id}`, '1'); } catch(_) {}
                  setList((prev) => prev.map((x) => (String(x._id || x.id) === id ? { ...x, status: active ? 'JOINED' : x.status } : x)));
                } else if (event === 'exit' && actor === 'patient') {
                  try { localStorage.removeItem(`joinedByPatient_${id}`); } catch(_) {}
                  if (active) setList((prev) => prev.map((x) => (String(x._id || x.id) === id ? { ...x, status: 'CONFIRMED' } : x)));
                } else if (event === 'join' && actor === 'doctor') {
                  try { localStorage.setItem(`joinedByDoctor_${id}`, '1'); } catch(_) {}
                  setBusy(true);
                  setOnline(true);
                } else if (event === 'exit' && actor === 'doctor') {
                  try { localStorage.removeItem(`joinedByDoctor_${id}`); } catch(_) {}
                  if (active) {
                    try { localStorage.setItem(`leftDoctor_${id}`, '1'); } catch(_) {}
                  } else {
                    try { localStorage.removeItem(`leftDoctor_${id}`); } catch(_) {}
                  }
                  setBusy(false);
                  setOnline(true);
                } else if (event === 'complete') {
                  setList((prev) => prev.map((x) => (String(x._id || x.id) === id ? { ...x, status: 'COMPLETED' } : x)));
                  try {
                    const uidLoc = localStorage.getItem('userId') || '';
                    if (uidLoc) localStorage.setItem(`doctorBusyById_${uidLoc}`, '0');
                  } catch(_) {}
                  setBusy(false);
                  setOnline(true);
                }
              } catch (_) {}
            });
            socket.on('meet:update', (msg) => {
              try {
                const { apptId, actor, event } = msg || {};
                const id = String(apptId || '');
                if (!id) return;
                const a = (list || []).find((x) => String(x._id || x.id) === id) || (latestToday || []).find((x) => String(x._id || x.id) === id);
                if (!a) return;
                const start = new Date(a.date);
                const [sh, sm] = String(a.startTime || '00:00').split(':').map((x) => Number(x));
                start.setHours(sh, sm, 0, 0);
                const end = new Date(a.date);
                const [eh, em] = String(a.endTime || a.startTime || '00:00').split(':').map((x) => Number(x));
                end.setHours(eh, em, 0, 0);
                const now = Date.now();
                const active = now >= start.getTime() && now < end.getTime();
                if (event === 'join' && actor === 'patient') {
                  try { localStorage.setItem(`joinedByPatient_${id}`, '1'); } catch(_) {}
                  setList((prev) => prev.map((x) => (String(x._id || x.id) === id ? { ...x, status: active ? 'JOINED' : x.status } : x)));
                } else if (event === 'exit' && actor === 'patient') {
                  try { localStorage.removeItem(`joinedByPatient_${id}`); } catch(_) {}
                  if (active) setList((prev) => prev.map((x) => (String(x._id || x.id) === id ? { ...x, status: 'CONFIRMED' } : x)));
                 } else if (event === 'join' && actor === 'doctor') {
                   try { localStorage.setItem(`joinedByDoctor_${id}`, '1'); } catch(_) {}
                   setBusy(true);
                   setOnline(true);
                 } else if (event === 'exit' && actor === 'doctor') {
                   try { localStorage.removeItem(`joinedByDoctor_${id}`); } catch(_) {}
                   setBusy(false);
                   setOnline(true);
                } else if (event === 'complete') {
                  setList((prev) => prev.map((x) => (String(x._id || x.id) === id ? { ...x, status: 'COMPLETED' } : x)));
                  try {
                    const uidLoc = localStorage.getItem('userId') || '';
                    if (uidLoc) localStorage.setItem(`doctorBusyById_${uidLoc}`, '0');
                  } catch(_) {}
                  setBusy(false);
                  setOnline(true);
                }
              } catch (_) {}
            });
            socket.on('chat:new', (msg) => {
              try {
                const { apptId, actor, kind, text } = msg || {};
                if (String(actor || '').toLowerCase() !== 'patient') return;
                const id = String(apptId || '');
                if (!id) return;
                const t = String(text || '').trim();
                if (kind === 'pre' && t) {
                  try {
                    const k = `wr_${id}_chat`;
                    const arr = JSON.parse(localStorage.getItem(k) || '[]');
                    const next = (Array.isArray(arr) ? arr : []).concat(t);
                    localStorage.setItem(k, JSON.stringify(next));
                  } catch(_) {}
                } else if (kind === 'followup' && t) {
                  try {
                    const k = `fu_${id}_chat`;
                    const arr = JSON.parse(localStorage.getItem(k) || '[]');
                    const next = (Array.isArray(arr) ? arr : []).concat(t);
                    localStorage.setItem(k, JSON.stringify(next));
                    if (followAppt && String(followAppt._id || followAppt.id) === id) setFuChat((prev) => prev.concat(t));
                  } catch(_) {}
                }
                setBellCount((c) => c + 1);
                try { localStorage.setItem('lastChatApptId', id); } catch(_) {}
                const a = (list || []).find((x) => String(x._id || x.id) === id) || (latestToday || []).find((x) => String(x._id || x.id) === id);
                addNotif(`New message from ${a?.patient?.name || 'patient'}`, id);
              } catch (_) {}
            });
            socket.on('notify', (p) => {
              try {
                if (Date.now() < muteUntil) return;
                const text = p?.message || '';
                const link = p?.link || '';
                const apptId = p?.apptId ? String(p.apptId) : null;
                if (p?.type === 'chat' && apptId) try { localStorage.setItem('lastChatApptId', apptId); } catch(_) {}
                setBellCount((c) => c + 1);
                addNotif(text, apptId, link);
                if (panelOpen) {
                  const item = { _id: p?.id || String(Date.now()), id: p?.id || String(Date.now()), message: text, link, type: p?.type || 'general', createdAt: new Date().toISOString(), read: false, apptId };
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
        } catch(_) {}
      };
      if (!w.io) {
        const s = document.createElement("script");
        s.src = "https://cdn.socket.io/4.7.2/socket.io.min.js";
        s.onload = onReady;
        document.body.appendChild(s);
        cleanup.push(() => { try { document.body.removeChild(s); } catch(_) {} });
      } else {
        onReady();
      }
    };
    initSocket();

    const poll = setInterval(async () => {
      try {
        const todayRes = await API.get("/appointments/today");
        let items = Array.isArray(todayRes.data) ? todayRes.data : [];
        items = items.filter((x) => String(x.doctor?._id || x.doctor || "") === String(uid));
        const seen = new Set([...(list || []), ...(latestToday || [])].map((x) => String(x._id || x.id || "")));
        for (const a of items) {
          const key = String(a._id || a.id || "");
          if (!seen.has(key)) {
            addNotif(`New appointment booked at ${a.startTime || "--:--"}`, null, "/doctor/dashboard#all-appointments");
            setLatestToday((prev) => [a, ...prev]);
            setList((prev) => [a, ...prev]);
          }
        }
      } catch (_) {}
    }, 10000);

    return () => { cleanup.forEach((fn) => fn()); clearInterval(poll); };
  }, [list, latestToday]);

  const accept = async (id) => {
    if (!id) return;
    try {
      await API.put(`/appointments/${id}/accept`);
      setList((prev) => prev.map((a) => (String(a._id || a.id) === String(id) ? { ...a, status: "CONFIRMED" } : a)));
      const _d1 = new Date();
      const todayStr = `${_d1.getFullYear()}-${String(_d1.getMonth()+1).padStart(2,'0')}-${String(_d1.getDate()).padStart(2,'0')}`;
      setLatestToday((prev) => prev.map((a) => (String(a._id || a.id) === String(id) ? { ...a, status: "CONFIRMED" } : a)).filter((a) => a.date === todayStr));
    } catch (e) {
      alert(e.response?.data?.message || e.message || "Failed to accept");
    }
  };

  const reject = async (id) => {
    if (!id) return;
    try {
      await API.put(`/appointments/${id}/reject`);
      setList((prev) => prev.map((a) => (String(a._id || a.id) === String(id) ? { ...a, status: "CANCELLED" } : a)));
      const _d2 = new Date();
      const todayStr = `${_d2.getFullYear()}-${String(_d2.getMonth()+1).padStart(2,'0')}-${String(_d2.getDate()).padStart(2,'0')}`;
      setLatestToday((prev) => prev.map((a) => (String(a._id || a.id) === String(id) ? { ...a, status: "CANCELLED" } : a)).filter((a) => a.date === todayStr));
    } catch (e) {
      alert(e.response?.data?.message || e.message || "Failed to reject");
    }
  };

  const apptStartTs = (a) => {
    try {
      const d = new Date(a.date);
      const [hh, mm] = String(a.startTime || '00:00').split(':').map((x) => Number(x));
      d.setHours(hh, mm, 0, 0);
      return d.getTime();
    } catch (_) { return 0; }
  };

  const apptEndTs = (a) => {
    try {
      const d = new Date(a.date);
      const [hh, mm] = String(a.endTime || a.startTime || '00:00').split(':').map((x) => Number(x));
      d.setHours(hh, mm, 0, 0);
      return d.getTime();
    } catch (_) { return apptStartTs(a); }
  };

  const canFollowUp = (a) => {
    if (!a || !a.prescriptionText) return false;
    const ts = apptStartTs(a);
    const now = Date.now();
    const diff = now - ts;
    const max = 5 * 24 * 60 * 60 * 1000; // up to 5 days after appointment
    return diff >= 0 && diff <= max;
  };

  const isExpired = (a) => {
    const ts = apptEndTs(a);
    return Date.now() > ts;
  };

  const stats = useMemo(() => {
    const patients = new Set();
    let earnings = 0;
    (list || []).forEach((a) => {
      if (a.patient?._id) patients.add(a.patient._id);
      if (a.paymentStatus === "PAID" || a.status === "COMPLETED") earnings += Number(a.fee || 0);
    });
    return { appointments: list.length, patients: patients.size, earnings };
  }, [list]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    const arr = (list || []).filter((a) => {
      const s = String(a.status).toUpperCase();
      if (!(s === "PENDING" || s === "CONFIRMED")) return false;
      const ts = apptStartTs(a);
      return ts > now;
    });
    arr.sort((x, y) => apptStartTs(x) - apptStartTs(y));
    return arr.slice(0, 6);
  }, [list]);

  useEffect(() => {
    const t = setInterval(() => {
      const _d3 = new Date();
      const todayStr = `${_d3.getFullYear()}-${String(_d3.getMonth()+1).padStart(2,'0')}-${String(_d3.getDate()).padStart(2,'0')}`;
      const src = [...(list || []), ...(latestToday || [])];
      const targetMs = 5 * 60 * 1000;
      const windowMs = 60 * 1000;
      const now = Date.now();
      src.forEach((a) => {
        try {
          const id = String(a._id || a.id || '');
          const key = `warn5m_${id}`;
          if (!id) return;
          if (localStorage.getItem(key) === '1') return;
          if (String(a.type).toLowerCase() !== 'online') return;
          const s = String(a.status || '').toUpperCase();
          if (s === 'CANCELLED' || s === 'COMPLETED') return;
          if (String(a.date || '') !== todayStr) return;
          const startTs = apptStartTs(a);
          if (!startTs) return;
          const diff = startTs - now;
          if (diff <= targetMs && diff > targetMs - windowMs) {
            alert('Your meeting will start in 5 minutes.');
            try { localStorage.setItem(key, '1'); } catch(_) {}
          }
        } catch (_) {}
      });
      try {
        src.forEach((a) => {
          const id = String(a._id || a.id || '');
          if (!id) return;
          const endTs = apptEndTs(a);
          if (now > endTs) {
            try { localStorage.removeItem(`joinedByDoctor_${id}`); } catch(_) {}
          }
        });
      } catch(_) {}
      try {
        const hasActive = src.some((a) => {
          if (String(a.type).toLowerCase() !== 'online') return false;
          const s = String(a.status || '').toUpperCase();
          if (s === 'CANCELLED' || s === 'COMPLETED') return false;
          const startTs = apptStartTs(a);
          const endTs = apptEndTs(a);
          return now >= startTs && now < endTs;
        });
        const inMeeting = src.some((a) => {
          const id = String(a._id || a.id || '');
          return !!id && localStorage.getItem(`joinedByDoctor_${id}`) === '1';
        });
        if (!hasActive && !inMeeting && busy) {
          const uid = localStorage.getItem('userId') || '';
          try { if (uid) localStorage.setItem(`doctorBusyById_${uid}`, '0'); } catch(_) {}
          setBusy(false);
          setOnline(true);
          try { API.put('/doctors/me/status', { isOnline: true, isBusy: false }); } catch(_) {}
          try { const chan = new BroadcastChannel('doctorStatus'); chan.postMessage({ uid, online: true, busy: false }); chan.close(); } catch(_) {}
        }
      } catch(_) {}
    }, 30000);
    return () => clearInterval(t);
  }, [list, latestToday, busy]);

  const completed = useMemo(() => {
    const arr = (list || []).filter((a) => String(a.status).toUpperCase() === "COMPLETED");
    arr.sort((x, y) => apptStartTs(y) - apptStartTs(x));
    return arr.slice(0, 6);
  }, [list]);

  const latest = useMemo(() => {
    const mergedAll = [...(list || []), ...(latestToday || [])];
    const seen = new Set();
    const merged = [];
    for (const a of mergedAll) {
      const k = String(a._id || a.id || (a.date + "_" + String(a.startTime || "")));
      if (!seen.has(k)) { seen.add(k); merged.push(a); }
    }
    const toTS = (a) => {
      const d = new Date(a.date);
      if (Number.isNaN(d.getTime())) return 0;
      const t = String(a.startTime || "00:00");
      const parts = t.split(":");
      const hh = Number(parts[0]) || 0;
      const mm = Number(parts[1]) || 0;
      d.setHours(hh, mm, 0, 0);
      return d.getTime();
    };
    const pending = merged.filter((a) => String(a.status).toUpperCase() === "PENDING");
    const confirmed = merged.filter((a) => String(a.status).toUpperCase() === "CONFIRMED");
    const done = merged.filter((a) => {
      const s = String(a.status).toUpperCase();
      return s === "CANCELLED" || s === "COMPLETED";
    });
    pending.sort((x, y) => toTS(y) - toTS(x));
    confirmed.sort((x, y) => toTS(y) - toTS(x));
    done.sort((x, y) => toTS(y) - toTS(x));
    const ordered = [...pending, ...confirmed, ...done];
    return ordered.slice(0, 4);
  }, [list, latestToday]);

  return (
    <div className="max-w-7xl mx-auto px-4 pt-16 page-gradient">
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-xl border-b border-blue-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/doctor/dashboard" className="flex items-center gap-4 group hover:scale-105 transition-all duration-300">
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
            <nav className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center space-x-10">
              {(() => {
                const p = window.location.pathname;
                return (
                  <>
                    <Link to="/doctor/dashboard" className={linkClass(p === "/doctor/dashboard")}>
                      <span className="relative z-10">Dashboard</span>
                      {p === "/doctor/dashboard" && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                    </Link>
                    <Link to="/doctor/appointments" className={linkClass(p.startsWith("/doctor/appointments"))}>
                      <span className="relative z-10">Appointments</span>
                      {p.startsWith("/doctor/appointments") && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                    </Link>
                    <Link to="/doctor/profile" className={linkClass(p.startsWith("/doctor/profile"))}>
                      <span className="relative z-10">Profile</span>
                      {p.startsWith("/doctor/profile") && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                    </Link>
                  </>
                );
              })()}
            </nav>
            <div className="relative flex items-center gap-2 sm:gap-3">
              {(() => {
                const isOnline = !!online && !busy;
                const isOffline = !online;
                const isBusy = !!online && !!busy;
                const chip = (active, baseCls, activeCls, label, onClick) => (
                  <button
                    onClick={onClick}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-300 ${active ? activeCls : baseCls}`}
                    title={label}
                  >
                    {label}
                  </button>
                );
                return (
                  <div className="hidden md:flex items-center gap-2 mr-2">
                    {chip(isOnline, "bg-green-100 text-green-700 border-green-200 hover:bg-green-200", "bg-green-600 text-white border-green-600 shadow-sm", "Online", () => setStatus("online"))}
                    {chip(isBusy, "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200", "bg-amber-600 text-white border-amber-600 shadow-sm", "Busy", () => setStatus("busy"))}
                    {chip(isOffline, "bg-red-100 text-red-700 border-red-200 hover:bg-red-200", "bg-red-600 text-white border-red-600 shadow-sm", "Offline", () => setStatus("offline"))}
                  </div>
                );
              })()}
              <button
                onClick={async () => {
                  try {
                    setPanelOpen((v) => !v);
                    if (!panelOpen) {
                      setPanelLoading(true);
                      const { data } = await API.get('/notifications');
                      const items = Array.isArray(data) ? data : [];
                      setPanelItems(items);
                      const unread = items.filter((x) => !x.read).length;
                      setPanelUnread(unread);
                      setBellCount(unread);
                      setPanelLoading(false);
                    }
                  } catch (_) { setPanelLoading(false); }
                }}
                className="inline-flex p-2 sm:p-3 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 border border-gray-200 hover:border-blue-300 relative"
                title="Notifications"
              >
                <svg className={`w-6 h-6 ${bellCount > 0 ? 'animate-bounce' : ''}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22a2 2 0 002-2H10a2 2 0 002 2z" fill="#2563EB"/>
                  <path d="M12 2a7 7 0 00-7 7v3l-2 3h18l-2-3V9a7 7 0 00-7-7z" stroke="#2563EB" strokeWidth="2" fill="none"/>
                </svg>
                {bellCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-bold shadow-lg animate-pulse">
                    {bellCount > 9 ? '9+' : bellCount}
                  </span>
                )}
              </button>
              <button
                className="lg:hidden p-3 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 border border-gray-200 hover:border-blue-300"
                onClick={() => setMobileOpen(!mobileOpen)}
                title="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
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
                              setBellCount(0);
                            } catch(_) {}
                          }}
                          className="text-xs px-2 py-1 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          Mark all read
                        </button>
                        <button
                          onClick={async () => {
                            try { await API.delete('/notifications'); setPanelItems([]); setPanelUnread(0); setBellCount(0); } catch(_) {}
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
                                  if (n.type === 'chat' || n.type === 'followup') {
                                    const id = String(n.apptId || '');
                                    if (id) {
                                      try { localStorage.setItem('lastChatApptId', id); } catch(_) {}
                                      nav(`/doctor/appointments/${id}/followup`);
                                    }
                                  } else if (n.type === 'meet' && n.apptId) {
                                    await openMeetFor(n.apptId);
                                  } else if (n.type === 'appointment') {
                                    nav('/doctor/appointments');
                                  } else if (n.link) {
                                    nav(n.link);
                                  }
                                  setPanelOpen(false);
                                  try { await API.put(`/notifications/${n._id || n.id}/read`); } catch(_) {}
                                  setPanelItems((prev) => prev.map((x) => (String(x._id || x.id) === String(n._id || n.id) ? { ...x, read: true } : x)));
                                  setPanelUnread((c) => Math.max(0, c - 1));
                                  setBellCount((c) => Math.max(0, c - 1));
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
              <button
                onClick={() => {
                  try {
                    const uid = localStorage.getItem("userId") || "";
                    if (uid) {
                      localStorage.setItem(`doctorOnlineById_${uid}`, "0");
                      localStorage.setItem(`doctorBusyById_${uid}`, "0");
                    }
                  } catch (_) {}
                  localStorage.removeItem("token");
                  nav("/doctor/login");
                }}
                className="hidden sm:inline-flex bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 border-2 border-white/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute top-16 left-0 right-0">
            <div className="mx-3 bg-white/98 backdrop-blur-md rounded-xl shadow-lg border border-blue-200/50 py-2" onClick={(e) => e.stopPropagation()}>
              <nav className="flex flex-col space-y-2 px-3">
                <Link to="/doctor/dashboard" className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm hover:bg-blue-50">Dashboard</Link>
                <Link to="/doctor/appointments" className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm hover:bg-blue-50">Appointments</Link>
                <Link to="/doctor/profile" className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm hover:bg-blue-50">Profile</Link>
                <button
                  onClick={() => { try { const uid = localStorage.getItem('userId') || ''; if (uid) { localStorage.setItem(`doctorOnlineById_${uid}`, '0'); localStorage.setItem(`doctorBusyById_${uid}`, '0'); } } catch(_) {}; localStorage.removeItem('token'); nav('/doctor/login'); }}
                  className="px-3 py-2 rounded-lg text-white text-sm bg-gradient-to-r from-blue-500 to-purple-600"
                >Logout</button>
              </nav>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-12 gap-6">
        <main className="col-span-12">
          <div className="hidden sm:block fixed right-4 top-4 z-50 space-y-2">
            {notifs.map((n) => (
              <button key={n.id} onClick={async () => {
                try {
                  if ((n.type === 'chat' || n.type === 'followup') && n.apptId) {
                    const id = String(n.apptId);
                    try { localStorage.setItem('lastChatApptId', id); } catch(_) {}
                    nav(`/doctor/appointments/${id}/followup`);
                  } else if (n.type === 'meet' && n.apptId) {
                    await openMeetFor(n.apptId);
                  } else if (n.link) {
                    nav(n.link);
                  } else if (n.type === 'meet' || n.type === 'appointment') {
                    nav('/doctor/appointments');
                  } else if (n.apptId) {
                    nav('/doctor/dashboard#all-appointments');
                  }
                  setNotifs((prev) => prev.filter((x) => x.id !== n.id));
                } catch (_) {}
              }} className="flex items-center gap-2 bg-white shadow-lg border border-amber-200 rounded-lg px-3 py-2 cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2a7 7 0 00-7 7v3l-2 3h18l-2-3V9a7 7 0 00-7-7zm0 20a3 3 0 003-3H9a3 3 0 003 3z" fill="#F59E0B"/>
              </svg>
              <div className="text-sm text-slate-900">{n.text}</div>
              </button>
            ))}
          </div>
          <div className="relative mb-6">
            <div className="absolute inset-x-0 -top-6 h-20 bg-gradient-to-r from-indigo-100 via-purple-100 to-blue-100 blur-xl opacity-70 rounded-full pointer-events-none"></div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Doctor Dashboard</h1>
          </div>

          <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-4 mb-6">
            <div className="relative flex-1 min-w-[160px] bg-white/85 backdrop-blur-sm border border-white/30 rounded-2xl p-4 shadow-2xl transition-transform duration-300 hover:scale-105 hover:bg-indigo-50">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 1C6.477 1 2 5.477 2 11s4.477 10 10 10 10-4.477 10-10S17.523 1 12 1zm1 5v2h2a1 1 0 110 2h-2v2h2a1 1 0 110 2h-2v2a1 1 0 11-2 0v-2H9a1 1 0 110-2h2V10H9a1 1 0 110-2h2V6a1 1 0 112 0z" fill="#4F46E5"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-slate-600">Earnings</div>
                  <div className="text-2xl font-semibold">₹{stats.earnings}</div>
                </div>
              </div>
            </div>
            <div className="relative flex-1 min-w-[160px] bg-white/85 backdrop-blur-sm border border-white/30 rounded-2xl p-4 shadow-2xl transition-transform duration-300 hover:scale-105 hover:bg-indigo-50">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 2a1 1 0 000 2h1v2h8V4h1a1 1 0 100-2H7zM5 8a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2H5zm3 3h8v2H8v-2zm0 4h8v2H8v-2z" fill="#0EA5E9"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-slate-600">Appointments</div>
                  <div className="text-2xl font-semibold">{stats.appointments}</div>
                </div>
              </div>
            </div>
            <div className="relative flex-1 min-w-[160px] bg-white/85 backdrop-blur-sm border border-white/30 rounded-2xl p-4 shadow-2xl transition-transform duration-300 hover:scale-105 hover:bg-indigo-50">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-cyan-50 border border-cyan-100 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 9a7 7 0 0114 0H5z" fill="#06B6D4"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-slate-600">Patients</div>
                  <div className="text-2xl font-semibold">{stats.patients}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-2 text-slate-700 mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 2a1 1 0 000 2h1v2h8V4h1a1 1 0 100-2H7zM5 8a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2H5zm3 3h8v2H8v-2zm0 4h8v2H8v-2z" fill="#4B5563"/>
                </svg>
                <span>Upcoming Appointments</span>
              </div>
              {upcoming.length === 0 ? (
                <div className="text-slate-600">No upcoming appointments</div>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((a) => (
                    <div key={a._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-lg px-3 py-2 hover:shadow-sm">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{a.patient?.name || 'Patient'}</div>
                        <div className="text-xs text-slate-600">{a.date} • {a.startTime} • {a.type === 'online' ? 'Online' : 'Clinic'}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end mt-1 sm:mt-0">
                        {String(a.status).toUpperCase() !== 'CANCELLED' && (
                          <span className={`inline-block text-xs px-2 py-1 rounded ${String(a.paymentStatus).toUpperCase() === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{String(a.paymentStatus).toUpperCase() === 'PAID' ? 'Paid' : 'Pending'}</span>
                        )}
                        {String(a.status).toUpperCase() === 'PENDING' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => accept(a._id || a.id)}
                              className="h-6 w-6 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center"
                              title="Accept"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => reject(a._id || a.id)}
                              className="h-6 w-6 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center"
                              title="Reject"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-2 text-slate-700 mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2a7 7 0 00-7 7v3l-2 3h18l-2-3V9a7 7 0 00-7-7zm0 20a3 3 0 003-3H9a3 3 0 003 3z" fill="#16A34A"/>
                </svg>
                <span>Completed Consultations</span>
              </div>
              {completed.length === 0 ? (
                <div className="text-slate-600">No completed consultations</div>
              ) : (
                <div className="space-y-2">
                  {completed.map((a) => (
                    <div key={a._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-lg px-3 py-2 hover:shadow-sm">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{a.patient?.name || 'Patient'}</div>
                        <div className="text-xs text-slate-600">{a.date} • {a.startTime} • {a.type === 'online' ? 'Online' : 'Clinic'}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end mt-1 sm:mt-0">
                        {a.prescriptionText ? (
                          <button onClick={() => nav(`/prescription/${a._id || a.id}`)} className="px-2 py-1 rounded-md border border-indigo-600 text-indigo-700 text-xs">Prescription</button>
                        ) : (
                          <span className="text-xs text-slate-600">No prescription</span>
                        )}
                        {canFollowUp(a) && (
                          <button
                            onClick={() => { const id = String(a._id || a.id || ''); if (id) { try { localStorage.setItem('lastChatApptId', id); } catch(_) {} nav(`/doctor/appointments/${id}/followup`); } }}
                            className="px-2 py-1 rounded-md border border-green-600 text-green-700 text-xs"
                          >
                            Follow-up
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="max-w-5xl mx-auto bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl p-6 mb-6 shadow-lg">
            <div className="flex items-center gap-2 text-slate-700 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 9a7 7 0 0114 0H5z" fill="#06B6D4"/>
              </svg>
              <span>Hospital / Clinic Details</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 9a7 7 0 0114 0H5z" fill="#4B5563"/>
                </svg>
                <div>Name: <span className="text-slate-900">{String(profile?.clinic?.name || '').trim() || '--'}</span></div>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 3a2 2 0 00-2 2v14l9-4 9 4V5a2 2 0 00-2-2H5z" fill="#0EA5E9"/>
                </svg>
                <div>City: <span className="text-slate-900">{String(profile?.clinic?.city || '').trim() || '--'}</span></div>
              </div>
              <div className="md:col-span-2 flex items-center gap-2 text-slate-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 11h18v10H3V11zm2-8h14v6H5V3z" fill="#06B6D4"/>
                </svg>
                <div>Address: <span className="text-slate-900">{String(profile?.clinic?.address || '').trim() || '--'}</span></div>
              </div>
            </div>
          </div>

          <div id="all-appointments" className="max-w-5xl mx-auto bg-white/85 backdrop-blur-sm border border-white/30 rounded-2xl p-6 mb-6 shadow-lg">
            <div className="flex items-center gap-2 text-slate-700 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 2a1 1 0 000 2h1v2h8V4h1a1 1 0 100-2H7zM5 8a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2H5zm3 3h8v2H8v-2zm0 4h8v2H8v-2z" fill="#4B5563"/>
              </svg>
              <span>All Appointments</span>
            </div>
            {loading && <div className="text-slate-600">Loading...</div>}
            {error && !loading && <div className="text-red-600 mb-3 text-sm">{error}</div>}
            <div className="space-y-2">
              {(list || []).length === 0 && !loading ? (
                <div className="text-slate-600">No appointments</div>
              ) : (
                (list || []).slice().sort((x, y) => apptStartTs(y) - apptStartTs(x)).map((a) => (
                  <div key={a._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-200 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{a.patient?.name || 'Patient'}</div>
                      <div className="text-xs text-slate-600">{a.date} • {a.startTime} • {a.type === 'online' ? 'Online' : 'Clinic'}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end mt-1 sm:mt-0">
                      {(() => {
                        const s = String(a.status).toUpperCase();
                        const cls = s === 'PENDING' ? 'bg-amber-100 text-amber-700' : s === 'CONFIRMED' ? 'bg-indigo-100 text-indigo-700' : s === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
                        const txt = s === 'PENDING' ? 'Pending' : s === 'CONFIRMED' ? 'Confirmed' : s === 'COMPLETED' ? 'Completed' : 'Cancelled';
                        return <span className={`inline-block text-xs px-2 py-1 rounded ${cls}`}>{txt}</span>;
                      })()}
                      {(() => {
                        const s = String(a.status).toUpperCase();
                        const showPay = s !== 'CANCELLED' && s !== 'COMPLETED';
                        return showPay ? (
                          <span className={`inline-block text-xs px-2 py-1 rounded ${String(a.paymentStatus).toUpperCase() === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{String(a.paymentStatus).toUpperCase() === 'PAID' ? 'Paid' : 'Pending'}</span>
                        ) : null;
                      })()}
                      {null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="max-w-5xl mx-auto bg-white/85 backdrop-blur-sm border border-white/30 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-2 text-slate-700 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 2a1 1 0 000 2h1v2h8V4h1a1 1 0 100-2H7zM5 8a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2H5zm3 3h8v2H8v-2zm0 4h8v2H8v-2z" fill="#4B5563"/>
              </svg>
              <span>Latest Bookings</span>
            </div>
            {loading && <div className="text-slate-600">Loading...</div>}
            {error && !loading && <div className="text-red-600 mb-3 text-sm">{error}</div>}
            <div className="space-y-3">
              {latest.length === 0 && !loading ? (
                <div className="text-slate-600">No recent bookings</div>
              ) : (
                latest.map((a) => (
                  <div key={a._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {(() => {
                        const pid = String(a.patient?._id || a.patient || "");
                        let img = String(a.patient?.photoBase64 || localStorage.getItem(`userPhotoBase64ById_${pid}`) || "");
                        let src = img;
                        if (img && !img.startsWith("data:") && !img.startsWith("http")) {
                          src = `data:image/png;base64,${img}`;
                        }
                        const ok = src.startsWith("data:") || src.startsWith("http");
                        return ok ? (
                          <img src={src} alt="User" className="h-8 w-8 rounded-full object-cover border" />
                        ) : (
                          <div className="h-8 w-8 rounded-full border bg-white" />
                        );
                      })()}
                      <div>
                        <div className="font-semibold text-slate-900">{a.patient?.name || "User"}</div>
                        <div className="text-xs text-slate-600">{(() => {
                          const p = a.patient || {};
                          if (p.age !== undefined && p.age !== null && p.age !== "") return `Age: ${p.age}`;
                          const pid = String(p._id || a.patient || "");
                          const locAge = localStorage.getItem(`userAgeById_${pid}`) || "";
                          if (locAge) return `Age: ${locAge}`;
                          const dob = p.birthday || p.dob || p.dateOfBirth || localStorage.getItem(`userDobById_${pid}`) || "";
                          if (!dob) return "";
                          const d = new Date(dob);
                          if (Number.isNaN(d.getTime())) return "";
                          const t = new Date();
                          let age = t.getFullYear() - d.getFullYear();
                          const m = t.getMonth() - d.getMonth();
                          if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--;
                          return `Age: ${age}`;
                        })()}</div>
                        <div className="text-xs text-slate-600">Booking on {new Date(a.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</div>
                      </div>
                    </div>
                    {String(a.status).toUpperCase() === "PENDING" ? (
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end mt-1 sm:mt-0">
                        <button
                          onClick={() => accept(a._id || a.id)}
                          className="h-6 w-6 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center"
                          title="Accept"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => reject(a._id || a.id)}
                          className="h-6 w-6 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center"
                          title="Reject"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      (() => {
                        const s = String(a.status || "").toUpperCase();
                        return (
                          <span
                            className={`inline-block text-xs px-2 py-1 rounded ${s === "CANCELLED" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                          >
                            {s === "CANCELLED" ? "Cancelled" : s === "CONFIRMED" ? "Accepted" : "Completed"}
                          </span>
                      );
                    })()
                  )}
                    {canFollowUp(a) && (
                      <button
                        onClick={() => { const id = String(a._id || a.id || ''); if (id) { try { localStorage.setItem('lastChatApptId', id); } catch(_) {} nav(`/doctor/appointments/${id}/followup`); } }}
                        className="ml-2 px-2 py-1 rounded-md border border-green-600 text-green-700 text-xs"
                      >
                        Follow-up
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="max-w-5xl mx-auto bg-white/85 backdrop-blur-sm border border-white/30 rounded-2xl p-6 mb-6 shadow-lg">
            <div className="flex items-center gap-2 text-slate-700 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 2a1 1 0 000 2h1v2h8V4h1a1 1 0 100-2H7zM5 8a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2H5zm3 3h8v2H8v-2zm0 4h8v2H8v-2z" fill="#4B5563"/>
              </svg>
              <span>Today's Appointments</span>
            </div>
            {loading && <div className="text-slate-600">Loading...</div>}
            {error && !loading && <div className="text-red-600 mb-3 text-sm">{error}</div>}
            <div className="space-y-3">
              {(latestToday || []).length === 0 && !loading ? (
                <div className="text-slate-600">No appointments today</div>
              ) : (
                (latestToday || []).map((a) => (
                  <div key={a._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-200 rounded-lg px-3 py-2">
                    <div>
                      <div className="font-semibold text-slate-900">{a.patient?.name || 'Patient'}</div>
                      <div className="text-xs text-slate-600">Time: {a.startTime} • Type: {a.type === 'online' ? 'Online' : 'Clinic'}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end mt-1 sm:mt-0">
                      {(() => {
                        const s = String(a.status).toUpperCase();
                        const showPay = s !== 'CANCELLED' && s !== 'COMPLETED';
                        return showPay ? (
                          <span className={`inline-block text-xs px-2 py-1 rounded ${String(a.paymentStatus).toUpperCase() === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{String(a.paymentStatus).toUpperCase() === 'PAID' ? 'Paid' : 'Pending'}</span>
                        ) : null;
                      })()}
                      {null}
                      {null}
                      {a.type === 'online' && String(a.status).toUpperCase() === 'CONFIRMED' && (
                        (() => {
                          const start = new Date(a.date);
                          const [sh, sm] = String(a.startTime || '00:00').split(':').map((x) => Number(x));
                          start.setHours(sh, sm, 0, 0);
                          const end = new Date(a.date);
                          const [eh, em] = String(a.endTime || a.startTime || '00:00').split(':').map((x) => Number(x));
                          end.setHours(eh, em, 0, 0);
                          if (end.getTime() <= start.getTime()) end.setTime(start.getTime() + 30 * 60 * 1000);
                          const now = Date.now();
                          const windowStart = start.getTime() - 5 * 60 * 1000;
                          if (now >= end.getTime()) {
                            try { localStorage.removeItem(`leftDoctor_${String(a._id || a.id)}`); } catch(_) {}
                            return (
                              <span className="inline-block text-xs px-2 py-1 rounded bg-red-100 text-red-700">Time Expired</span>
                            );
                          }
                          if (now < windowStart) {
                            return <span className="inline-block text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">Available 5 min before</span>;
                          }
                          const id = String(a._id || a.id || '');
                          const joinedDoc = id ? localStorage.getItem(`joinedByDoctor_${id}`) === '1' : false;
                          const leftDoc = id ? localStorage.getItem(`leftDoctor_${id}`) === '1' : false;
                          if (joinedDoc) {
                            return (
                              <div className="flex items-center gap-2">
                                <span className="inline-block text-xs px-2 py-1 rounded bg-green-100 text-green-700">Joined</span>
                                <button
                                  onClick={() => leaveMeetFor(id)}
                                  className="px-3 py-1 rounded-md border border-red-600 text-red-700"
                                >
                                  Leave
                                </button>
                              </div>
                            );
                          }
                          if (leftDoc) {
                            return (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openMeetFor(id)}
                                  className="px-3 py-1 rounded-md border border-indigo-600 text-indigo-700"
                                >
                                  Rejoin
                                </button>
                              </div>
                            );
                          }
                          return (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openMeetFor(id)}
                                className="px-3 py-1 rounded-md border border-green-600 text-green-700"
                              >
                                Join
                              </button>
                              <button
                                onClick={async () => {
                                  let url = String(localStorage.getItem(`meetlink_${id}`) || a.meetingLink || '').replace(/[`'\"]/g, '').trim();
                                  if (!url || !/^https?:\/\//.test(url)) {
                                    try {
                                      const resp = await API.post(`/appointments/${id}/meet-link/generate`);
                                      url = String(resp?.data?.url || '').trim();
                                      if (!/^https?:\/\//.test(url)) { alert('Failed to generate meeting link'); return; }
                                    } catch (e) {
                                      alert(e.response?.data?.message || e.message || 'Failed to generate meeting link');
                                      return;
                                    }
                                  }
                                  try { localStorage.setItem(`meetlink_${id}`, url); } catch(_) {}
                                  try { await API.put(`/appointments/${id}/meet-link`, { url }); } catch(_) {}
                                  try { const chan = new BroadcastChannel('meetlink'); chan.postMessage({ id, url }); chan.close(); } catch(_) {}
                                  alert('Meeting link set');
                                }}
                                className="px-3 py-1 rounded-md border border-indigo-600 text-indigo-700"
                              >
                                Set Link
                              </button>
                            </div>
                          );
                        })()
                      )}
                      {canFollowUp(a) && (
                        <button
                          onClick={() => { const id = String(a._id || a.id || ''); if (id) { try { localStorage.setItem('lastChatApptId', id); } catch(_) {} nav(`/doctor/appointments/${id}/followup`); } }}
                          className="px-3 py-1 rounded-md border border-green-600 text-green-700"
                        >
                          Follow-up
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
      {null}
      {chatAppt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-slate-200 w-[95vw] max-w-lg h-[70vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold text-slate-900">Patient Details</div>
              <button onClick={() => { setChatAppt(null); setChatPreview(null); setIsFullPreview(false); }} className="px-3 py-1 rounded-md border border-slate-300">Close</button>
            </div>
            <div className="p-4 grid gap-3 overflow-y-auto flex-1">
              <div className="text-slate-700 text-sm">Patient: <span className="text-slate-900">{chatAppt.patient?.name || ''}</span></div>
              <div>
                <div className="text-slate-900 font-semibold mb-1">Symptoms</div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{String(chatAppt.patientSymptoms || '').trim() || '--'}</div>
              </div>
              <div>
                <div className="text-slate-900 font-semibold mb-1">Health issue summary</div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{String(chatAppt.patientSummary || '').trim() || '--'}</div>
              </div>
              <div>
                <div className="text-slate-900 font-semibold mb-2">Pre-call chat</div>
                <div className="h-28 overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50">
                  {(() => {
                    try {
                      const id = String(chatAppt._id || chatAppt.id);
                      const msgs = JSON.parse(localStorage.getItem(`wr_${id}_chat`) || '[]');
                      if (!Array.isArray(msgs) || msgs.length === 0) return <div className="text-slate-600 text-sm">No messages</div>;
                      return msgs.map((m, idx) => (<div key={idx} className="text-sm text-slate-700">{m}</div>));
                    } catch(_) { return <div className="text-slate-600 text-sm">No messages</div>; }
                  })()}
                </div>
                <div className="mt-3">
                  <div className="text-slate-900 font-semibold mb-1">Medical reports uploaded</div>
                  <div className="space-y-2">
                    {(() => {
                      try {
                        const id = String(chatAppt._id || chatAppt.id);
                        const files = JSON.parse(localStorage.getItem(`wr_${id}_files`) || '[]');
                        const prev = JSON.parse(localStorage.getItem(`wr_${id}_prevpres`) || '[]');
                        const base = ([]).concat(Array.isArray(files) ? files : [], Array.isArray(prev) ? prev : []);
                        const arr = base.filter((x) => typeof x?.url === 'string' && String(x.url).trim() !== '');
                        if (arr.length === 0) return <div className="text-slate-600 text-sm">No reports uploaded</div>;
                        return arr.map((f, idx) => (
                          <div key={idx} className="flex items-center justify-between border rounded-md p-2">
                            <div className="text-sm text-slate-700 truncate max-w-[12rem]">{f.name}</div>
                            <button
                              onClick={() => {
                                try {
                                  const u = String(f.url || '');
                                  if (u.startsWith('data:image')) {
                                    setChatPreview(f);
                                    setIsFullPreview(true);
                                  } else {
                                    setFuPreview(f);
                                    setFuIsFullPreview(true);
                                  }
                                } catch(_) {}
                              }}
                              className="px-2 py-1 rounded-md border border-slate-300 text-sm"
                            >Open</button>
                          </div>
                        ));
                      } catch(_) { return <div className="text-slate-600 text-sm">No reports uploaded</div>; }
                    })()}
                  </div>
                  {chatPreview && !isFullPreview && (
                    <div className="mt-3 border rounded-md p-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-slate-900 truncate">{chatPreview.name || 'Selected report'}</div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setIsFullPreview(true)} className="px-2 py-1 rounded-md border border-slate-300 text-xs">Full Screen</button>
                          <button onClick={() => setChatPreview(null)} className="px-2 py-1 rounded-md border border-slate-300 text-xs">Close Preview</button>
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        <img src={String(chatPreview.url || '')} alt="" className="max-h-64 w-auto object-contain cursor-zoom-in" onClick={() => setIsFullPreview(true)} />
                      </div>
                    </div>
                  )}
                  {chatPreview && isFullPreview && (
                    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setIsFullPreview(false)}
                        className="absolute top-4 right-4 px-3 py-1 rounded-md border border-slate-300 bg-white/90"
                      >Close</button>
                      <img
                        src={String(chatPreview.url || '')}
                        alt=""
                        className="max-w-[95vw] max-h-[95vh] w-auto h-auto object-contain shadow-2xl"
                      />
                    </div>
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <input id="chatInputDoc" placeholder="Reply to patient" className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm" />
                  <button
                    onClick={() => {
                      try {
                        const id = String(chatAppt._id || chatAppt.id);
                        const input = document.getElementById('chatInputDoc');
                        const val = String(input?.value || '').trim();
                        if (!val) return;
                        const msgs = JSON.parse(localStorage.getItem(`wr_${id}_chat`) || '[]');
                        const next = [...(Array.isArray(msgs) ? msgs : []), val];
                        localStorage.setItem(`wr_${id}_chat`, JSON.stringify(next));
                        if (input) input.value = '';
                        try {
                          const chan = new BroadcastChannel('chatmsg');
                          chan.postMessage({ apptId: id, actor: 'doctor' });
                          chan.close();
                        } catch(_) {}
                        try { socketRef.current && socketRef.current.emit('chat:new', { apptId: id, actor: 'doctor', kind: 'pre' }); } catch(_) {}
                        try { localStorage.setItem('lastChatApptId', id); } catch(_) {}
                      } catch(_) {}
                    }}
                    className="px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {expiredAppt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-slate-200 w-[95vw] max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold text-slate-900">Time Expired</div>
              <button
                onClick={() => setExpiredAppt(null)}
                className="px-3 py-1 rounded-md border border-slate-300"
              >
                Close
              </button>
            </div>
            <div className="p-4">
              <div className="text-slate-700 text-sm">Appointment time has passed. Joining is disabled. Ask the patient to book again for a new call.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
