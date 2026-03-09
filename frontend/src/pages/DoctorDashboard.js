import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import NotificationManager from "../components/NotificationManager";
import API from "../api";

export default function DoctorDashboard() {
  const nav = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [latestToday, setLatestToday] = useState([]);
  const sortedToday = useMemo(() => {
    const arr = (latestToday || []).filter((a) => String(a.status).toUpperCase() !== "CANCELLED");
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
    return [...arr].sort((x, y) => {
      const sX = String(x.status).toUpperCase();
      const sY = String(y.status).toUpperCase();
      if (sX === "COMPLETED" && sY !== "COMPLETED") return 1;
      if (sX !== "COMPLETED" && sY === "COMPLETED") return -1;
      return toTS(y) - toTS(x); // Latest (latest time) first
    });
  }, [latestToday]);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(() => {
    const uid = localStorage.getItem("userId") || "";
    const byId = uid ? localStorage.getItem(`doctorOnlineById_${uid}`) : null;
    if (byId !== null) return byId === "1";
    const v = localStorage.getItem("doctorOnline");
    return v === null ? true : v === "1";
  });
  const [busy, setBusy] = useState(false);
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
      <svg className={c} viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    );
    if (type === 'meet') return (
      <svg className={c} viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11"/><rect x="2" y="6" width="14" height="12" rx="3"/>
      </svg>
    );
    if (type === 'appointment') return (
      <svg className={c} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    );
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
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

  const loadData = async () => {
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
      if (e.message === 'canceled') return;
      setList([]);
      setError(e.response?.data?.message || e.message || "Failed to load dashboard");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
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
      try { localStorage.setItem(`joinedByDoctor_${id}`, '1'); localStorage.setItem(`everJoinedDoctor_${id}`, '1'); } catch(_) {}
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
      const meetName = `meet_${id}`;
      try {
        meetWinRef.current = window.open(url, meetName);
        meetMonitorRef.current = setInterval(async () => {
          try {
            const end = new Date(a.date);
            const [eh, em] = String(a.endTime || a.startTime || '00:00').split(':').map((x) => Number(x));
            end.setHours(eh, em, 0, 0);
            const now = Date.now();
          const expired = now >= end.getTime();
          if (expired) {
            const pjEver = localStorage.getItem(`everJoinedPatient_${id}`) === '1';
            const djEver = localStorage.getItem(`everJoinedDoctor_${id}`) === '1';
            const both = pjEver && djEver;
            try { localStorage.setItem(`joinedByDoctor_${id}`, '0'); } catch(_) {}
            try {
              if (both) {
                await API.put(`/appointments/${id}/complete`);
                socketRef.current && socketRef.current.emit('meet:update', { apptId: id, actor: 'doctor', event: 'complete' });
                try { loadData(); } catch(_) {}
              } else {
                socketRef.current && socketRef.current.emit('meet:update', { apptId: id, actor: 'doctor', event: 'exit' });
              }
            } catch(_) {}
            try {
              const uid = localStorage.getItem('userId') || '';
              if (uid) {
                localStorage.setItem(`doctorBusyById_${uid}`, '0');
                API.put('/doctors/me/status', { isOnline: true, isBusy: false }).catch(() => {});
              }
            } catch(_) {}
            setBusy(false);
            setOnline(true);
            try { const chan = new BroadcastChannel('doctorStatus'); const uid2 = localStorage.getItem('userId') || ''; chan.postMessage({ uid: uid2, online: true, busy: false }); chan.close(); } catch(_) {}
            try { 
              if (meetWinRef.current && !meetWinRef.current.closed) meetWinRef.current.close(); 
              const w2 = window.open('', meetName);
              if (w2 && !w2.closed) w2.close();
            } catch(_) {}
            meetWinRef.current = null;
            if (meetMonitorRef.current) { clearInterval(meetMonitorRef.current); meetMonitorRef.current = null; }
            return;
          }
          } catch(_) {}
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
        const uid = localStorage.getItem('userId') || '';
        if (uid) {
          localStorage.setItem(`doctorBusyById_${uid}`, '0');
          API.put('/doctors/me/status', { isOnline: true, isBusy: false }).catch(() => {});
        }
      } catch(_) {}
      setBusy(false);
      setOnline(true);
      try { const chan = new BroadcastChannel('doctorStatus'); const uid2 = localStorage.getItem('userId') || ''; chan.postMessage({ uid: uid2, online: true, busy: false }); chan.close(); } catch(_) {}
      try {
        if (meetMonitorRef.current) { clearInterval(meetMonitorRef.current); meetMonitorRef.current = null; }
        const meetName = `meet_${id}`;
        if (meetWinRef.current && !meetWinRef.current.closed) { meetWinRef.current.close(); }
        try {
          const w2 = window.open('', meetName);
          if (w2 && !w2.closed) w2.close();
        } catch(_) {}
        meetWinRef.current = null;
      } catch(_) {}
    } catch(_) {}
  };

  useEffect(() => {
    const uid = localStorage.getItem("userId") || "";
    const cleanup = [];
    const initSocket = () => {
      const base = String(API.defaults.baseURL || "");
      const origin = (base.startsWith("/") || !base) ? window.location.origin : base.replace(/\/(api)?$/, "");
      const w = window;
      const onReady = () => {
        try {
          const socket = w.io ? w.io(origin, { transports: ["polling", "websocket"], auth: { token: localStorage.getItem("token") || "" } }) : null;
          if (socket) {
            socketRef.current = socket;
            socket.on("appointment:new", (a) => {
              try {
                const did = String(a?.doctor?._id || a?.doctor || "");
                if (did !== String(uid)) return;
                const key = String(a._id || a.id || "");
                const seen = new Set([...(list || []), ...(latestToday || [])].map((x) => String(x._id || x.id || "")));
                if (seen.has(key)) return;
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
                  try { localStorage.setItem(`joinedByDoctor_${id}`, '1'); localStorage.setItem(`everJoinedDoctor_${id}`, '1'); } catch(_) {}
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
            const internalChan = new BroadcastChannel('chatmsg_internal');
            internalChan.onmessage = (e) => {
              try {
                const { apptId, kind, text } = e.data || {};
                const id = String(apptId || '');
                if (!id) return;
                const t = String(text || '').trim();
                if (!t) return;
                if (kind === 'pre') {
                  if (chatAppt && String(chatAppt._id || chatAppt.id) === id) setChatAppt((prev) => ({ ...(prev || {}) }));
                } else if (kind === 'followup') {
                  if (followAppt && String(followAppt._id || followAppt.id) === id) setFuChat((prev) => prev.concat(t));
                }
                try { localStorage.setItem('lastChatApptId', id); } catch(_) {}
              } catch (_) {}
            };
            cleanup.push(() => { try { internalChan.close(); } catch(_) {} });
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
        const items = Array.isArray(todayRes.data) ? todayRes.data : [];
        const doctorItems = items.filter((x) => String(x.doctor?._id || x.doctor || "") === String(uid));
        
        // Update latestToday if items changed
        setLatestToday((prev) => {
          let changed = false;
          const next = doctorItems.map(item => {
            const id = String(item._id || item.id);
            const old = prev.find(p => String(p._id || p.id) === id);
            if (!old || old.status !== item.status) {
              changed = true;
              return item;
            }
            return old;
          });
          if (next.length !== prev.length) changed = true;
          return changed ? next : prev;
        });

        // Update list if any status changed
        setList((prev) => {
          let changed = false;
          const next = prev.map(old => {
            const id = String(old._id || old.id);
            const match = doctorItems.find(item => String(item._id || item.id) === id);
            if (match && match.status !== old.status) {
              changed = true;
              return { ...old, status: match.status };
            }
            return old;
          });
          
          // Also add new items from doctorItems that aren't in list
          const existingIds = new Set(prev.map(x => String(x._id || x.id)));
          const newItems = doctorItems.filter(item => !existingIds.has(String(item._id || item.id)));
          if (newItems.length > 0) {
            changed = true;
            return [...newItems, ...next];
          }
          
          return changed ? next : prev;
        });
      } catch (_) {}
    }, 10000);

    return () => { cleanup.forEach((fn) => fn()); clearInterval(poll); };
  }, [list, latestToday]);

  useEffect(() => {
    const onHospozenNotif = (e) => {
      try {
        setBellCount((c) => c + 1);
        if (panelOpen && e.detail) {
          const p = e.detail;
          const item = { 
            _id: p._id || p.id || String(Date.now()), 
            id: p._id || p.id || String(Date.now()), 
            message: p.message || '', 
            link: p.link || '', 
            type: p.type || 'general', 
            kind: p.kind, 
            createdAt: new Date().toISOString(), 
            read: false, 
            apptId: p.apptId 
          };
          setPanelItems((prev) => {
            const exists = prev.some((x) => String(x._id || x.id) === String(item._id || item.id));
            if (exists) return prev;
            return [item, ...prev].slice(0, 100);
          });
          setPanelUnread((c) => c + 1);
        }
      } catch(_) {}
    };
    window.addEventListener('hospozen_notif', onHospozenNotif);
    return () => window.removeEventListener('hospozen_notif', onHospozenNotif);
  }, [panelOpen]);

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
    if (!a) return false;
    const s = String(a.status || '').toUpperCase();
    if (s !== 'COMPLETED') return false;
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
    const filtered = (list || []).filter((a) => String(a.status).toUpperCase() !== "CANCELLED");
    filtered.forEach((a) => {
      if (a.patient?._id) patients.add(a.patient._id);
      if (a.paymentStatus === "PAID" || a.status === "COMPLETED") earnings += Number(a.fee || 0);
    });
    return { appointments: filtered.length, patients: patients.size, earnings };
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

  useEffect(() => {
    try {
      const now = Date.now();
      const src = ([]).concat(Array.isArray(list) ? list : [], Array.isArray(latestToday) ? latestToday : []);
      const hasActive = src.some((a) => {
        if (String(a.type).toLowerCase() !== 'online') return false;
        const s = String(a.status || '').toUpperCase();
        if (s === 'CANCELLED' || s === 'COMPLETED') return false;
        const start = new Date(a.date);
        const [sh, sm] = String(a.startTime || '00:00').split(':').map((x) => Number(x));
        start.setHours(sh, sm, 0, 0);
        const end = new Date(a.date);
        const [eh, em] = String(a.endTime || a.startTime || '00:00').split(':').map((x) => Number(x));
        end.setHours(eh, em, 0, 0);
        return now >= start.getTime() && now < end.getTime();
      });
      const inMeeting = src.some((a) => {
        const id = String(a._id || a.id || '');
        if (!id) return false;
        return localStorage.getItem(`joinedByDoctor_${id}`) === '1';
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
  }, [list, latestToday]);

  const completed = useMemo(() => {
    const arr = (list || []).filter((a) => String(a.status).toUpperCase() === "COMPLETED");
    arr.sort((x, y) => apptStartTs(y) - apptStartTs(x));
    return arr.slice(0, 6);
  }, [list]);

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4 page-gradient relative">
      <div className="absolute inset-x-0 -top-6 h-20 bg-gradient-to-r from-indigo-100 via-purple-100 to-blue-100 blur-xl opacity-70 rounded-full pointer-events-none"></div>
      
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
              <div className="relative">
                <button
                  onClick={async () => {
                    try {
                      window.dispatchEvent(new CustomEvent('close_notif_popups'));
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
                  <svg className={`w-6 h-6 ${bellCount > 0 ? 'animate-bounce' : ''}`} viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {bellCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-bold shadow-lg animate-pulse">
                      {bellCount > 9 ? '9+' : bellCount}
                    </span>
                  )}
                </button>

                <NotificationManager actor="doctor" />

                {panelOpen && (
                  <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-14 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-blue-200/50 z-50">
                    <div className="absolute right-3 sm:right-4 -top-2 w-4 h-4 bg-white/95 border border-blue-200/50 rotate-45"></div>
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
                                    const id = String(n.apptId || '');
                                    const msg = String(n.message || '').toLowerCase();
                                    const hasFu = (() => { try { const arr = JSON.parse(localStorage.getItem(`fu_${id}_chat`) || '[]'); return Array.isArray(arr) && arr.length > 0; } catch(_) { return false; } })();
                                    if ((msg.includes('view details') || n.type === 'details') && id) {
                                      nav(`/doctor/appointments/${id}/documents`);
                                    } else if ((id && (n.kind === 'followup' || hasFu || msg.includes('follow up') || msg.includes('follow-up') || msg.includes('followup') || n.type === 'followup'))) {
                                      try { localStorage.setItem('lastChatApptId', id); } catch(_) {}
                                      nav(`/doctor/appointments/${id}/followup`);
                                    } else if ((n.type === 'chat' || msg.includes('new message')) && id) {
                                      nav(`/doctor/appointments/${id}/documents`);
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
              </div>
              <button
                className="lg:hidden p-3 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 border border-gray-200 hover:border-blue-300"
                onClick={() => setMobileOpen(!mobileOpen)}
                title="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
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
          <div className="relative mb-10 text-center">
            <h2 className="inline-block px-8 py-3 text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10">
              Doctor Dashboard
              <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
            </h2>
          </div>

          <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-4 mb-6">
            <div 
              onClick={() => nav("/doctor/appointments")}
              className="relative flex-1 min-w-[160px] bg-white/85 backdrop-blur-sm border border-white/30 rounded-2xl p-4 shadow-2xl transition-transform duration-300 hover:scale-105 hover:bg-indigo-50 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-100/50 flex items-center justify-center shadow-sm">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Earnings</div>
                  <div className="text-2xl font-bold text-slate-900">₹{stats.earnings}</div>
                </div>
              </div>
            </div>
            <div 
              onClick={() => nav("/doctor/appointments")}
              className="relative flex-1 min-w-[160px] bg-white/85 backdrop-blur-sm border border-white/30 rounded-2xl p-4 shadow-2xl transition-transform duration-300 hover:scale-105 hover:bg-blue-50 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100/50 flex items-center justify-center shadow-sm">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="m9 16 2 2 4-4"/>
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Appointments</div>
                  <div className="text-2xl font-bold text-slate-900">{stats.appointments}</div>
                </div>
              </div>
            </div>
            <div 
              onClick={() => nav("/doctor/appointments")}
              className="relative flex-1 min-w-[160px] bg-white/85 backdrop-blur-sm border border-white/30 rounded-2xl p-4 shadow-2xl transition-transform duration-300 hover:scale-105 hover:bg-cyan-50 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-100/50 flex items-center justify-center shadow-sm">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0891B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Patients</div>
                  <div className="text-2xl font-bold text-slate-900">{stats.patients}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Appointments */}
          <div className="max-w-5xl mx-auto bg-white/85 backdrop-blur-sm border border-white/30 rounded-2xl p-6 mb-6 shadow-lg">
            <div className="flex items-center gap-2 text-slate-700 mb-4 border-b border-slate-100 pb-2">
              <div className="h-10 w-10 rounded-xl bg-indigo-100/50 flex items-center justify-center shadow-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>
                </svg>
              </div>
              <span className="font-bold text-lg text-slate-800">Today's Appointments</span>
            </div>
            {loading && <div className="text-slate-600 animate-pulse">Loading...</div>}
            {error && !loading && <div className="text-red-600 mb-3 text-sm bg-red-50 p-2 rounded-md border border-red-100">{error}</div>}
            <div className="max-h-80 overflow-y-auto custom-scrollbar pr-2">
              <div className="space-y-3">
                {sortedToday.length === 0 && !loading ? (
                  <div className="text-slate-500 italic py-4 text-center">No appointments scheduled for today</div>
                ) : (
                  sortedToday.map((a) => (
                    <div key={a._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-100 bg-slate-50/30 rounded-xl px-4 py-3 hover:bg-white hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                          {a.patient?.name ? a.patient.name.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{a.patient?.name || 'Patient'}{a.patient?.gender ? ` (${a.patient.gender.charAt(0).toUpperCase() + a.patient.gender.slice(1)})` : ""}</div>
                          <div className="text-[10px] text-slate-500">{(() => {
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
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                              {a.startTime}
                            </span>
                            <span>•</span>
                            <span className={`px-1.5 py-0.5 rounded-full ${a.type === 'online' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {a.type === 'online' ? 'Online' : 'Clinic'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto sm:justify-end">
                        {(() => {
                          const s = String(a.status).toUpperCase();
                          const showPay = s === 'CONFIRMED' || s === 'PENDING';
                          return showPay ? (
                            <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${String(a.paymentStatus).toUpperCase() === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {String(a.paymentStatus).toUpperCase() === 'PAID' ? 'Paid' : 'Payment Pending'}
                            </span>
                          ) : null;
                        })()}
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
                              return <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-medium">Time Expired</span>;
                            }
                            if (now < windowStart) {
                              return <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">Starts Soon</span>;
                            }
                            const id = String(a._id || a.id || '');
                            const joinedDoc = id ? localStorage.getItem(`joinedByDoctor_${id}`) === '1' : false;
                            const leftDoc = id ? localStorage.getItem(`leftDoctor_${id}`) === '1' : false;
                            if (joinedDoc) {
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold animate-pulse">In Meeting</span>
                                  <button onClick={() => leaveMeetFor(id)} className="px-4 py-1.5 rounded-lg border-2 border-red-500 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors">Leave</button>
                                </div>
                              );
                            }
                            if (leftDoc) {
                              return (
                                <button onClick={() => openMeetFor(id)} className="px-4 py-1.5 rounded-lg border-2 border-indigo-600 text-indigo-700 hover:bg-indigo-50 text-xs font-bold transition-colors">Rejoin Meeting</button>
                              );
                            }
                            return (
                              <div className="flex items-center gap-2">
                                <button onClick={() => openMeetFor(id)} className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold shadow-md transition-all active:scale-95">Join Meeting</button>
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
                                  className="px-4 py-1.5 rounded-lg border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 text-xs font-bold transition-colors"
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
                            className="px-4 py-1.5 rounded-lg border-2 border-green-600 text-green-700 hover:bg-green-50 text-xs font-bold transition-colors"
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
          </div>

          {/* Hospital / Clinic Details */}
          <div className="max-w-5xl mx-auto bg-white/85 backdrop-blur-sm border border-white/30 rounded-2xl p-6 mb-6 shadow-lg">
            <div className="flex items-center gap-2 text-slate-700 mb-4 border-b border-slate-100 pb-2">
              <div className="h-10 w-10 rounded-xl bg-cyan-100/50 flex items-center justify-center shadow-sm">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0891B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M9 22V12h6v10"/><path d="M2 9h20"/><path d="M10 4h4"/>
                </svg>
              </div>
              <span className="font-bold text-lg text-slate-800">Hospital / Clinic Details</span>
            </div>
            <div className="grid gap-6 md:grid-cols-2 text-sm">
              <div className="flex items-center gap-3 bg-white/50 p-3 rounded-xl border border-slate-100 shadow-sm transition-all hover:bg-indigo-50/50">
                <div className="h-10 w-10 rounded-xl bg-indigo-100/50 flex items-center justify-center shadow-sm">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18"/><path d="M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3"/><path d="M19 21V10"/><path d="M5 21V10"/>
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Hospital Name</div>
                  <div className="text-slate-900 font-bold text-base">{String(profile?.clinic?.name || '').trim() || '--'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/50 p-3 rounded-xl border border-slate-100 shadow-sm transition-all hover:bg-blue-50/50">
                <div className="h-10 w-10 rounded-xl bg-blue-100/50 flex items-center justify-center shadow-sm">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">City / Location</div>
                  <div className="text-slate-900 font-bold text-base">{String(profile?.clinic?.city || '').trim() || '--'}</div>
                </div>
              </div>
              <div className="md:col-span-2 flex items-start gap-3 bg-white/50 p-4 rounded-xl border border-slate-100 shadow-sm transition-all hover:bg-cyan-50/50">
                <div className="h-10 w-10 rounded-xl bg-cyan-100/50 flex items-center justify-center shadow-sm mt-0.5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Full Address</div>
                  <div className="text-slate-900 font-bold text-base leading-relaxed">
                    {String(profile?.clinic?.address || '').trim() || '--'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white/85 backdrop-blur-sm border border-white/30 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-2 text-slate-700 mb-4 border-b border-slate-100 pb-2">
                <div className="h-10 w-10 rounded-xl bg-indigo-100/50 flex items-center justify-center shadow-sm">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <span className="font-bold text-slate-800">Upcoming Appointments</span>
              </div>
              {upcoming.length === 0 ? (
                <div className="text-slate-500 italic py-4 text-center text-sm">No upcoming appointments</div>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((a) => (
                    <div key={a._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/70 backdrop-blur-sm border border-slate-100 rounded-lg px-3 py-2 hover:shadow-sm transition-all">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm">{a.patient?.name || 'Patient'}{a.patient?.gender ? ` (${a.patient.gender.charAt(0).toUpperCase() + a.patient.gender.slice(1)})` : ""}</div>
                        <div className="text-[10px] text-slate-500">{(() => {
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
                        <div className="text-[10px] text-slate-500">{a.date} • {a.startTime} • {a.type === 'online' ? 'Online' : 'Clinic'}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end mt-1 sm:mt-0">
                        {String(a.status).toUpperCase() !== 'CANCELLED' && (
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${String(a.paymentStatus).toUpperCase() === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {String(a.paymentStatus).toUpperCase() === 'PAID' ? 'Paid' : 'Pending'}
                          </span>
                        )}
                        {String(a.status).toUpperCase() === 'PENDING' && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => accept(a._id || a.id)} className="h-5 w-5 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center text-[10px]" title="Accept">✓</button>
                            <button onClick={() => reject(a._id || a.id)} className="h-5 w-5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center text-[10px]" title="Reject">✕</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white/85 backdrop-blur-sm border border-white/30 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-2 text-slate-700 mb-4 border-b border-slate-100 pb-2">
                <div className="h-10 w-10 rounded-xl bg-green-100/50 flex items-center justify-center shadow-sm">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <span className="font-bold text-slate-800">Completed Consultations</span>
              </div>
              {completed.length === 0 ? (
                <div className="text-slate-500 italic py-4 text-center text-sm">No completed consultations</div>
              ) : (
                <div className="max-h-80 overflow-y-auto custom-scrollbar pr-2">
                  <div className="space-y-2">
                    {completed.map((a) => (
                      <div key={a._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/70 backdrop-blur-sm border border-slate-100 rounded-lg px-3 py-2 hover:shadow-sm transition-all">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm">{a.patient?.name || 'Patient'}{a.patient?.gender ? ` (${a.patient.gender.charAt(0).toUpperCase() + a.patient.gender.slice(1)})` : ""}</div>
                          <div className="text-[10px] text-slate-500">{(() => {
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
                          <div className="text-[10px] text-slate-500">{a.date} • {a.startTime} • {a.type === 'online' ? 'Online' : 'Clinic'}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end mt-1 sm:mt-0">
                          {a.prescriptionText ? (
                            <button onClick={() => nav(`/prescription/${a._id || a.id}`)} className="px-2 py-0.5 rounded-md border border-indigo-600 text-indigo-700 text-[10px] font-bold hover:bg-indigo-50">Prescription</button>
                          ) : (
                            <span className="text-[10px] text-slate-400">No prescription</span>
                          )}
                          {canFollowUp(a) && (
                            <button
                              onClick={() => { const id = String(a._id || a.id || ''); if (id) { try { localStorage.setItem('lastChatApptId', id); } catch(_) {} nav(`/doctor/appointments/${id}/followup`); } }}
                              className="px-2 py-0.5 rounded-md border border-green-600 text-green-700 text-[10px] font-bold hover:bg-green-50"
                            >
                              Follow-up
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* All Appointments */}
          <div id="all-appointments" className="max-w-5xl mx-auto bg-white/85 backdrop-blur-sm border border-white/30 rounded-2xl p-6 mb-12 shadow-lg">
            <div className="flex items-center gap-2 text-slate-700 mb-4 border-b border-slate-100 pb-2">
              <div className="h-10 w-10 rounded-xl bg-slate-100/50 flex items-center justify-center shadow-sm">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <span className="font-bold text-lg text-slate-800">History & All Appointments</span>
            </div>
            {loading && <div className="text-slate-600 animate-pulse">Loading...</div>}
            {error && !loading && <div className="text-red-600 mb-3 text-sm">{error}</div>}
            <div className="max-h-96 overflow-y-auto custom-scrollbar pr-2">
              <div className="space-y-2">
                {(list || []).length === 0 && !loading ? (
                  <div className="text-slate-500 italic py-4 text-center">No appointment history found</div>
                ) : (
                  (list || []).slice().sort((x, y) => apptStartTs(y) - apptStartTs(x)).map((a) => (
                    <div key={a._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-100 rounded-xl px-4 py-2.5 hover:bg-slate-50/50 transition-colors">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm">{a.patient?.name || 'Patient'}{a.patient?.gender ? ` (${a.patient.gender.charAt(0).toUpperCase() + a.patient.gender.slice(1)})` : ""}</div>
                        <div className="text-[10px] text-slate-500">{(() => {
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
                        <div className="text-[11px] text-slate-500 font-medium">{a.date} • {a.startTime} • {a.type === 'online' ? 'Online' : 'Clinic'}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto sm:justify-end">
                        {(() => {
                          const s = String(a.status).toUpperCase();
                          const cls = s === 'PENDING' ? 'bg-amber-100 text-amber-700' : s === 'CONFIRMED' ? 'bg-yellow-100 text-yellow-700' : s === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
                          const txt = s === 'PENDING' ? 'Pending' : s === 'CONFIRMED' ? 'Confirmed' : s === 'COMPLETED' ? 'Completed' : 'Cancelled';
                          return <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-full ${cls}`}>{txt}</span>;
                        })()}
                        {(() => {
                          const s = String(a.status).toUpperCase();
                          const showPay = s !== 'CANCELLED' && s !== 'COMPLETED';
                          return showPay ? (
                            <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-full ${String(a.paymentStatus).toUpperCase() === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{String(a.paymentStatus).toUpperCase() === 'PAID' ? 'Paid' : 'Pending'}</span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  ))
                )}
              </div>
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
                  <input 
                    id="chatInputDoc" 
                    placeholder="Reply to patient" 
                    maxLength={50}
                    className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm" 
                  />
                  <button
                    onClick={() => {
                      try {
                        const id = String(chatAppt._id || chatAppt.id);
                        const input = document.getElementById('chatInputDoc');
                        const val = String(input?.value || '').trim().slice(0, 50);
                        if (!val) return;
                        const msgs = JSON.parse(localStorage.getItem(`wr_${id}_chat`) || '[]');
                        const next = [...(Array.isArray(msgs) ? msgs : []), val];
                        localStorage.setItem(`wr_${id}_chat`, JSON.stringify(next));
                        if (input) input.value = '';
                        try {
                          const chan = new BroadcastChannel('chatmsg');
                          chan.postMessage({ apptId: id, actor: 'doctor', text: val });
                          chan.close();
                        } catch(_) {}
                        try { socketRef.current && socketRef.current.emit('chat:new', { apptId: id, actor: 'doctor', kind: 'pre', text: val }); } catch(_) {}
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
