import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../api";

export default function Appointments() {
  const nav = useNavigate();
  const location = useLocation();
  const isPrescriptionsView = (() => {
    try {
      const q = new URLSearchParams(location.search);
      return String(q.get('view') || '').toLowerCase() === 'prescriptions';
    } catch (_) { return false; }
  })();
  const [list, setList] = useState([]);
  const [presRefresh, setPresRefresh] = useState(0);
  const presItems = useMemo(() => {
    const items = [];
    (list || []).forEach((a) => {
      try {
        const id = String(a._id || a.id);
        if (!id) return;
        const has = typeof a.prescriptionText === 'string' && String(a.prescriptionText).trim() !== '';
        if (!has) return;
        const name = `Prescription ${a.date || ''} ${a.startTime || ''}`.trim();
        const url = `/prescription/${id}`;
        items.push({
          _id: id,
          doctor: a.doctor?.name ? `Dr. ${a.doctor?.name}` : '',
          date: a.date || '',
          time: a.startTime || '',
          name,
          url,
          docId: String(typeof a.doctor === 'string' ? a.doctor : (a.doctor?._id || a.doctor?.id || ''))
        });
      } catch (_) {}
    });
    return items.sort((x, y) => String(y.date || '').localeCompare(String(x.date || '')));
  }, [list, isPrescriptionsView, presRefresh]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profiles, setProfiles] = useState(new Map());
  const [waitingAppt, setWaitingAppt] = useState(null);
  const [waitChat, setWaitChat] = useState([]);
  const [waitText, setWaitText] = useState("");
  const [waitFiles, setWaitFiles] = useState([]);
  const meetChanRef = useRef(null);
  const meetWinRef = useRef({});
  const meetMonitorRef = useRef({});
  const [followAppt, setFollowAppt] = useState(null);
  const [fuChat, setFuChat] = useState([]);
  const [fuText, setFuText] = useState("");
  const [fuSymptoms, setFuSymptoms] = useState("");
  const [fuFiles, setFuFiles] = useState([]);
  const [rateAppt, setRateAppt] = useState(null);
  const [rateStars, setRateStars] = useState(0);
  const [rateText, setRateText] = useState("");
  const [detailsAppt, setDetailsAppt] = useState(null);
  const [detSymptoms, setDetSymptoms] = useState("");
  const [detSummary, setDetSummary] = useState("");
  const [detPrevFiles, setDetPrevFiles] = useState([]);
  const [bellCount, setBellCount] = useState(0);
  const socketRef = useRef(null);
  const [detChat, setDetChat] = useState([]);
  const [detText, setDetText] = useState("");
  const [detEdit, setDetEdit] = useState(false);
  const [bookDocId, setBookDocId] = useState("");
  const [alertHandled, setAlertHandled] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [isFullPreview, setIsFullPreview] = useState(false);
  const [presOpen, setPresOpen] = useState(false);
  const [presId, setPresId] = useState("");
  const presIframeRef = useRef(null);

  useEffect(() => {
    try {
      const q = new URLSearchParams(location.search);
      const shouldOpen = q.get('alertChat') === '1';
      if (shouldOpen && !alertHandled) {
        const id = localStorage.getItem('lastChatApptId') || '';
        const a = (list || []).find((x) => String(x._id || x.id) === id) || null;
        if (a) {
          let isFollow = false;
          try {
            const msgs = JSON.parse(localStorage.getItem(`fu_${id}_chat`) || '[]');
            isFollow = Array.isArray(msgs) && msgs.length > 0;
          } catch(_) {}
          try {
            if (!isFollow) {
              const s = String(a?.status || '').toUpperCase();
              isFollow = s === 'COMPLETED' && !!a?.prescriptionText && canFollowUp(a);
            }
          } catch(_) {}
          if (isFollow) {
            try { setFollowAppt(a); loadFollowData(id); setFuText(''); } catch(_) { setFollowAppt(a); }
          } else {
            setDetailsAppt(a);
          }
          setAlertHandled(true);
          setTimeout(() => { try { localStorage.setItem('patientBellCount', '0'); } catch(_) {} }, 0);
          try { nav('/appointments', { replace: true }); } catch(_) {}
        }
      }
    } catch(_) {}
  }, [location.search, list, alertHandled, nav]);
  useEffect(() => {
    try {
      const q = new URLSearchParams(location.search);
      const joinId = q.get('joinMeet') || '';
      if (joinId) {
        const a = (list || []).find((x) => String(x._id || x.id) === joinId) || null;
        if (a) {
          const link = meetLinkFor(a);
          const url = String(link).replace(/[`'\"]/g, '').trim();
          if (url && /^https?:\/\//.test(url)) {
            const idX = String(a._id || a.id);
            try { localStorage.setItem(`joinedByPatient_${idX}`, '1'); } catch(_) {}
            const win = window.open(url, meetWindowName(idX));
            try { localStorage.setItem(`openMeeting_${idX}`, '1'); } catch(_) {}
            try { socketRef.current && socketRef.current.emit('meet:update', { apptId: idX, actor: 'patient', event: 'join' }); } catch(_) {}
            if (win) {
              const end = new Date(a.date);
              const [eh, em] = String(a.endTime || a.startTime || '00:00').split(':').map((x) => Number(x));
              end.setHours(eh, em, 0, 0);
              const monitor = setInterval(() => {
                const now = Date.now();
                const expired = now >= end.getTime();
                if (expired || !win || win.closed) {
                  clearInterval(monitor);
                  try { localStorage.setItem(`joinedByPatient_${idX}`, expired ? '0' : '0'); localStorage.setItem(`openMeeting_${idX}`, '0'); } catch(_) {}
                  try { socketRef.current && socketRef.current.emit('meet:update', { apptId: idX, actor: 'patient', event: expired ? 'complete' : 'exit' }); } catch(_) {}
                }
              }, 1000);
            }
          }
        }
        try { nav('/appointments', { replace: true }); } catch(_) {}
      }
    } catch(_) {}
  }, [location.search, list, nav]);
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { nav("/login"); return; }
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await API.get("/appointments/mine");
        const arr = Array.isArray(data) ? data : [];
        setList(arr);
        const ids = Array.from(new Set(arr.map((a) => {
          try {
            return String(typeof a.doctor === 'string' ? a.doctor : (a.doctor?._id || a.doctor?.id || ''));
          } catch(_) { return ''; }
        }).values())).filter(Boolean);
        if (ids.length) {
          const resps = await Promise.all(ids.map((id) => API.get(`/doctors?user=${id}`).catch(() => ({ data: [] }))));
          const map = new Map();
          ids.forEach((id, idx) => {
            const first = Array.isArray(resps[idx]?.data) ? resps[idx].data[0] : null;
            if (first) map.set(String(id), first);
          });
          setProfiles(map);
        } else {
          setProfiles(new Map());
        }
      } catch (e) {
        setError(e.response?.data?.message || e.message || "Failed to load");
      }
      setLoading(false);
    };
    load();
  }, [nav]);

  useEffect(() => {
    try {
      const needed = Array.from(new Set((presItems || []).map((x) => String(x.docId || '')).filter(Boolean))).filter((id) => !profiles.has(id));
      if (!needed.length) return;
      (async () => {
        try {
          const resps = await Promise.all(needed.map((id) => API.get(`/doctors?user=${id}`).catch(() => ({ data: [] }))));
          setProfiles((prev) => {
            const next = new Map(prev);
            needed.forEach((id, idx) => {
              const first = Array.isArray(resps[idx]?.data) ? resps[idx].data[0] : null;
              if (first) next.set(String(id), first);
            });
            return next;
          });
        } catch (_) {}
      })();
    } catch (_) {}
  }, [presItems, profiles]);

  useEffect(() => {
    let chan = null;
    try {
      chan = new BroadcastChannel('prescriptions');
      chan.onmessage = () => { setPresRefresh((n) => n + 1); };
    } catch (_) {}
    return () => { try { chan && chan.close(); } catch(_) {} };
  }, []);

  useEffect(() => {
    try {
      const chan = new BroadcastChannel('chatmsg');
      const onMsg = (e) => {
        try {
          const { apptId, actor, text } = e.data || {};
          if (!apptId) return;
          if (String(actor || '').toLowerCase() !== 'doctor') return;
          setBellCount((c) => {
            const next = c + 1;
            try { localStorage.setItem('patientBellCount', String(next)); } catch(_) {}
            return next;
          });
          try { localStorage.setItem('lastChatApptId', String(apptId)); } catch(_) {}
          try {
            const id = String(apptId);
            const t = String(text || '').trim();
            if (t) {
              const isFollowOpen = !!(followAppt && String(followAppt._id || followAppt.id) === id);
              if (isFollowOpen) {
                const k = `fu_${id}_chat`;
                const arr = JSON.parse(localStorage.getItem(k) || '[]');
                const next = (Array.isArray(arr) ? arr : []).concat(t);
                localStorage.setItem(k, JSON.stringify(next));
                setFuChat((prev) => prev.concat(t));
              } else {
                const k = `wr_${id}_chat`;
                const arr = JSON.parse(localStorage.getItem(k) || '[]');
                const next = (Array.isArray(arr) ? arr : []).concat(t);
                localStorage.setItem(k, JSON.stringify(next));
                if (waitingAppt && String(waitingAppt._id || waitingAppt.id) === id) setWaitChat((prev) => prev.concat(t));
                if (detailsAppt && String(detailsAppt._id || detailsAppt.id) === id) setDetChat((prev) => prev.concat(t));
              }
            }
          } catch (_) {}
        } catch (_) {}
      };
      chan.onmessage = onMsg;
      return () => { try { chan.close(); } catch(_) {} };
    } catch (_) {}
  }, [list]);

  

  useEffect(() => {
    try {
      if (!meetChanRef.current) meetChanRef.current = new BroadcastChannel('meetlink');
      const chan = meetChanRef.current;
      chan.onmessage = (e) => {
        try {
          const { id, url } = e.data || {};
          const apptId = String(id || '');
          const link = String(url || '').replace(/[`'\"]/g, '').trim();
          if (!apptId || !link || !/^https?:\/\//.test(link)) return;
          try { localStorage.setItem(`meetlink_${apptId}`, link); } catch(_) {}
          setList((prev) => prev.map((x) => (String(x._id || x.id) === apptId ? { ...x, meetingLink: link } : x)));
        } catch (_) {}
      };
    } catch (_) {}
    return () => { try { meetChanRef.current && meetChanRef.current.close(); meetChanRef.current = null; } catch(_) {} };
  }, []);

  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const { data } = await API.get("/appointments/mine");
        const arr = Array.isArray(data) ? data : [];
        setList(arr);
      } catch (_) {}
    }, 2000);
    const onFocus = () => {
      API.get("/appointments/mine").then((res) => {
        const arr = Array.isArray(res.data) ? res.data : [];
        setList(arr);
      }).catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      const _d0 = new Date();
      const todayStr = `${_d0.getFullYear()}-${String(_d0.getMonth()+1).padStart(2,'0')}-${String(_d0.getDate()).padStart(2,'0')}`;
      const targetMs = 5 * 60 * 1000;
      const windowMs = 60 * 1000;
      const now = Date.now();
      (list || []).forEach((a) => {
        try {
          const id = String(a._id || a.id || '');
          const key = `warn5m_${id}`;
          if (!id) return;
          if (localStorage.getItem(key) === '1') return;
          if (String(a.type).toLowerCase() !== 'online') return;
          const s = String(a.status || '').toUpperCase();
          if (s === 'CANCELLED' || s === 'COMPLETED') return;
          if (String(a.date || '') !== todayStr) return;
          const d = new Date(a.date);
          const [hh, mm] = String(a.startTime || '00:00').split(':').map((x) => Number(x));
          d.setHours(hh, mm, 0, 0);
          const startTs = d.getTime();
          const diff = startTs - now;
          if (diff <= targetMs && diff > targetMs - windowMs) {
            alert('Your meeting will start in 5 minutes.');
            try { localStorage.setItem(key, '1'); } catch(_) {}
          }
        } catch (_) {}
      });
    }, 30000);
    return () => clearInterval(t);
  }, [list]);

  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const ids = Array.from(new Set((list || []).map((a) => {
          try {
            return String(typeof a.doctor === 'string' ? a.doctor : (a.doctor?._id || a.doctor?.id || ''));
          } catch(_) { return ''; }
        }).values())).filter(Boolean);
        if (!ids.length) return;
        const resps = await Promise.all(ids.map((id) => API.get(`/doctors?user=${id}`).catch(() => ({ data: [] }))));
        const map = new Map();
        ids.forEach((id, idx) => {
          const first = Array.isArray(resps[idx]?.data) ? resps[idx].data[0] : null;
          if (first) map.set(String(id), first);
        });
        setProfiles(map);
      } catch (_) {}
    }, 1000);
    return () => clearInterval(iv);
  }, [list]);

  useEffect(() => {
    const cleanup = [];
    const origin = String(API.defaults.baseURL || "").replace(/\/(api)?$/, "");
    const w = window;
    const onReady = () => {
      try {
        const socket = w.io ? w.io(origin, { transports: ["websocket", "polling"] }) : null;
          if (socket) {
            socketRef.current = socket;
            socket.on('doctor:status', (p) => {
            const did = String(p?.doctorId || "");
            if (!did) return;
            setProfiles((prev) => {
              const next = new Map(prev);
              const cur = next.get(did);
              if (cur) next.set(did, { ...cur, isOnline: !!p.isOnline, isBusy: !!p.isBusy });
              return next;
            });
          });
          socket.on('chat:new', (msg) => {
            try {
              const { apptId, actor, kind, text } = msg || {};
              const id = String(apptId || '');
              if (!id) return;
              if (String(actor || '').toLowerCase() !== 'doctor') return;
              setBellCount((c) => {
                const next = c + 1;
                try { localStorage.setItem('patientBellCount', String(next)); } catch(_) {}
                return next;
              });
              try { localStorage.setItem('lastChatApptId', id); } catch(_) {}
              try {
                const t = String(text || '').trim();
                if (kind === 'pre') {
                  const k = `wr_${id}_chat`;
                  const arr = JSON.parse(localStorage.getItem(k) || '[]');
                  const next = (Array.isArray(arr) ? arr : []).concat(t ? [t] : []);
                  localStorage.setItem(k, JSON.stringify(next));
                  if (waitingAppt && String(waitingAppt._id || waitingAppt.id) === id && t) setWaitChat((prev) => prev.concat(t));
                  if (detailsAppt && String(detailsAppt._id || detailsAppt.id) === id && t) setDetChat((prev) => prev.concat(t));
                } else if (kind === 'followup') {
                  const k = `fu_${id}_chat`;
                  const arr = JSON.parse(localStorage.getItem(k) || '[]');
                  const next = (Array.isArray(arr) ? arr : []).concat(t ? [t] : []);
                  localStorage.setItem(k, JSON.stringify(next));
                  if (followAppt && String(followAppt._id || followAppt.id) === id && t) setFuChat((prev) => prev.concat(t));
                } else if (kind === 'report') {
                  const m = t || 'Report shared by doctor';
                  if (detailsAppt && String(detailsAppt._id || detailsAppt.id) === id) {
                    const k = `wr_${id}_chat`;
                    const arr = JSON.parse(localStorage.getItem(k) || '[]');
                    const next = (Array.isArray(arr) ? arr : []).concat(m);
                    localStorage.setItem(k, JSON.stringify(next));
                    setDetChat((prev) => prev.concat(m));
                  } else {
                    const k = `fu_${id}_chat`;
                    const arr = JSON.parse(localStorage.getItem(k) || '[]');
                    const next = (Array.isArray(arr) ? arr : []).concat(m);
                    localStorage.setItem(k, JSON.stringify(next));
                    if (followAppt && String(followAppt._id || followAppt.id) === id) setFuChat((prev) => prev.concat(m));
                  }
                }
              } catch (_) {}
            } catch (_) {}
          });
          socket.on('meet:update', (msg) => {
            try {
              const { apptId, actor, event } = msg || {};
              const id = String(apptId || '');
              if (!id) return;
              const a = (list || []).find((x) => String(x._id || x.id) === id);
              if (!a) return;
              const d = new Date(a.date);
              const [sh, sm] = String(a.startTime || '00:00').split(':').map((x) => Number(x));
              d.setHours(sh, sm, 0, 0);
              const end = new Date(a.date);
              const [eh, em] = String(a.endTime || a.startTime || '00:00').split(':').map((x) => Number(x));
              end.setHours(eh, em, 0, 0);
              const now = Date.now();
              const active = now >= d.getTime() && now < end.getTime();
              if (event === 'join' && actor === 'doctor') {
                try { localStorage.setItem(`doctorJoined_${id}`, '1'); } catch(_) {}
                try { localStorage.setItem(`everJoinedDoctor_${id}`, '1'); } catch(_) {}
                setProfiles((prev) => {
                  const next = new Map(prev);
                  const did = String(a.doctor?._id || a.doctor || '');
                  const cur = next.get(did);
                  if (cur) next.set(did, { ...cur, isBusy: true, isOnline: true });
                  return next;
                });
              } else if (event === 'exit' && actor === 'doctor') {
                try { localStorage.removeItem(`doctorJoined_${id}`); } catch(_) {}
                setProfiles((prev) => {
                  const next = new Map(prev);
                  const did = String(a.doctor?._id || a.doctor || '');
                  const cur = next.get(did);
                  if (cur) next.set(did, { ...cur, isBusy: false, isOnline: true });
                  return next;
                });
              } else if (event === 'complete') {
                try { localStorage.setItem(`joinedByPatient_${id}`, '0'); } catch(_) {}
                try {
                  const mon = meetMonitorRef.current[id];
                  if (mon) { clearInterval(mon); meetMonitorRef.current[id] = null; }
                } catch(_) {}
                try {
                  const w = meetWinRef.current[id];
                  if (w && !w.closed) w.close();
                  meetWinRef.current[id] = null;
                } catch(_) {}
                setList((prev) => prev.map((x) => (String(x._id || x.id) === id ? { ...x, status: 'COMPLETED' } : x)));
              } else if (event === 'join' && actor === 'patient') {
                try { localStorage.setItem(`joinedByPatient_${id}`, '1'); localStorage.setItem(`everJoinedPatient_${id}`, '1'); } catch(_) {}
                setList((prev) => prev.slice());
              } else if (event === 'exit' && actor === 'patient') {
                try { localStorage.removeItem(`joinedByPatient_${id}`); } catch(_) {}
                if (active) setList((prev) => prev.map((x) => (String(x._id || x.id) === id ? { ...x, status: 'CONFIRMED' } : x)));
                else setList((prev) => prev.slice());
              }
            } catch (_) {}
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

  useEffect(() => {
    const timers = [];
    const now = Date.now();
    (list || []).forEach((a) => {
      if (String(a.status).toUpperCase() !== 'CONFIRMED' || a.type !== 'online') return;
      try {
        const d = new Date(a.date);
        const t = String(a.startTime || '00:00');
        const parts = t.split(":");
        const hh = Number(parts[0]) || 0;
        const mm = Number(parts[1]) || 0;
        d.setHours(hh, mm, 0, 0);
        const alertAt = d.getTime() - 5 * 60 * 1000;
        if (alertAt > now) {
          const key = `alert5min_${a._id}`;
          if (localStorage.getItem(key) === '1') return;
          const tmr = setTimeout(() => {
            alert('Doctor will join in 5 min before appointment');
            localStorage.setItem(key, '1');
          }, alertAt - now);
          timers.push(tmr);
        }
      } catch (_) {}
    });
    return () => { timers.forEach(clearTimeout); };
  }, [list]);

  useEffect(() => {
    if (!waitingAppt) return;
    try {
      const id = String(waitingAppt._id || waitingAppt.id);
      const msgs = JSON.parse(localStorage.getItem(`wr_${id}_chat`) || '[]');
      const normMsgs = (Array.isArray(msgs) ? msgs : []).map((it) => (typeof it === 'string' ? it : String(it?.text || ''))).filter(Boolean);
      setWaitChat(normMsgs);
      const files = JSON.parse(localStorage.getItem(`wr_${id}_files`) || '[]');
      setWaitFiles(Array.isArray(files) ? files : []);
    } catch(_) { setWaitChat([]); }
  }, [waitingAppt]);

  useEffect(() => {
    if (!detailsAppt) return;
    try {
      const id = String(detailsAppt._id || detailsAppt.id);
      try {
        const s = String(detailsAppt.patientSymptoms || localStorage.getItem(`wr_${id}_symptoms`) || '').trim();
        const sum = String(detailsAppt.patientSummary || localStorage.getItem(`fu_${id}_symptoms`) || '').trim();
        setDetSymptoms(s);
        setDetSummary(sum);
      } catch(_) {}
      const doctorFiles = JSON.parse(localStorage.getItem(`wr_${id}_files`) || '[]');
      const seen = new Set();
      const arr = [];
      for (const x of Array.isArray(doctorFiles) ? doctorFiles : []) {
        const key = `${String(x?.url || '')}|${String(x?.name || '')}`;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        arr.push(x);
      }
      setDetPrevFiles(arr);
      const msgs = JSON.parse(localStorage.getItem(`wr_${id}_chat`) || '[]');
      const normMsgs = (Array.isArray(msgs) ? msgs : []).map((it) => (typeof it === 'string' ? it : String(it?.text || ''))).filter(Boolean);
      setDetChat(normMsgs);
    } catch (_) { setDetPrevFiles([]); }
  }, [detailsAppt]);

  useEffect(() => {
    try {
      meetChanRef.current = new BroadcastChannel('meetlink');
      meetChanRef.current.onmessage = (ev) => {
        try {
          const msg = ev?.data || {};
          const id = String(msg.id || '');
          const url = String(msg.url || '');
          if (!id || !url || !/^https?:\/\//.test(url)) return;
          try { localStorage.setItem(`meetlink_${id}`, url); } catch(_) {}
        } catch (_) {}
      };
    } catch (_) {}
    return () => { try { meetChanRef.current && meetChanRef.current.close(); } catch(_) {} };
  }, []);

  const cancel = async (id) => {
    try {
      const apptId = id || "";
      try { localStorage.setItem(`cancelledByMe_${String(apptId)}`, '1'); } catch(_) {}
      await API.put(`/appointments/${String(apptId)}/cancel`);
      setList((prev) => prev.map((x) => (String(x._id) === String(apptId) ? { ...x, status: "CANCELLED" } : x)));
      if (waitingAppt && String(waitingAppt._id) === String(apptId)) setWaitingAppt(null);
    } catch (e) {
      const msg = e.response?.data?.message || e.message || "Cancel failed";
      if (e.response?.status === 404) {
        alert("Appointment not found or already cancelled");
        try {
          const { data } = await API.get("/appointments/mine");
          setList(Array.isArray(data) ? data : []);
        } catch (_) {}
      } else {
        alert(msg);
      }
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

  const isJoinWindow = (a) => {
    try {
      if (a.type !== 'online' || String(a.status).toUpperCase() !== 'CONFIRMED') return false;
      const start = apptStartTs(a);
      const end = apptEndTs(a);
      const now = Date.now();
      const early = start - 5 * 60 * 1000;
      const url = String(meetLinkFor(a) || '').replace(/[`'\"]/g, '').trim();
      if (!url || !/^https?:\/\//.test(url)) return false;
      return now >= early && now < end;
    } catch (_) { return false; }
  };

  const canCancelAppt = (a) => {
    const s = String(a.status).toUpperCase();
    if (s === 'CANCELLED' || s === 'COMPLETED' || s === 'JOINED') return false;
    const now = Date.now();
    if (apptEndTs(a) < now) return false;
    if (isJoinWindow(a)) return false;
    return !!a?._id;
  };

  const canFollowUp = (a) => {
    if (!a) return false;
    const ts = apptStartTs(a);
    const now = Date.now();
    const diff = now - ts;
    const max = 5 * 24 * 60 * 60 * 1000;
    return diff >= 0 && diff <= max;
  };

  const loadFollowData = (id) => {
    const keyBase = `fu_${String(id)}`;
    try {
      const msgs = JSON.parse(localStorage.getItem(`${keyBase}_chat`) || '[]');
      const files = JSON.parse(localStorage.getItem(`${keyBase}_files`) || '[]');
      const symp = String(localStorage.getItem(`${keyBase}_symptoms`) || '');
      setFuChat(Array.isArray(msgs) ? msgs : []);
      setFuFiles(Array.isArray(files) ? files : []);
      setFuSymptoms(symp || "");
    } catch (_) {
      setFuChat([]);
      setFuFiles([]);
      setFuSymptoms("");
    }
  };

  const saveFollowData = (id, msgs, files, symptoms) => {
    const keyBase = `fu_${String(id)}`;
    try {
      localStorage.setItem(`${keyBase}_chat`, JSON.stringify(msgs || []));
      localStorage.setItem(`${keyBase}_files`, JSON.stringify(files || []));
      localStorage.setItem(`${keyBase}_symptoms`, String(symptoms || ''));
    } catch (_) {}
  };

  const openFile = (u, name) => {
    try {
      const s = String(u || '');
      setFilePreview({ url: s, name: String(name || '') });
      setIsFullPreview(true);
    } catch (_) {}
  };

  const meetWindowName = (id) => `patientMeet_${String(id || '')}`;

  const meetLinkFor = (appt) => {
    try {
      const id = String(appt?._id || appt?.id || '');
      const doc = String(appt?.doctor?._id || appt?.doctor || '');
      const existing = String(appt?.meetingLink || '').replace(/[`'\"]/g, '').trim();
      const stored = id ? localStorage.getItem(`meetlink_${id}`) : null;
      const s = stored ? String(stored).replace(/[`'\"]/g, '').trim() : '';
      if (s && /^https?:\/\//.test(s)) return s;
      if (existing && /^https?:\/\//.test(existing)) return existing;
      try {
        const wr = JSON.parse(localStorage.getItem(`wr_${id}_chat`) || '[]');
        const fu = JSON.parse(localStorage.getItem(`fu_${id}_chat`) || '[]');
        const all = ([]).concat(Array.isArray(wr) ? wr : [], Array.isArray(fu) ? fu : []);
        for (let i = all.length - 1; i >= 0; i--) {
          const t = String(all[i]?.text || '').replace(/[`'\"]/g, '').trim();
          if (/^https?:\/\//.test(t)) return t;
        }
      } catch (_) {}
      return '';
    } catch (_) { return ''; }
  };

  return (
    <div className="page-gradient">
      <div className="max-w-7xl mx-auto px-4 pt-12 md:pt-16 animate-fade-in">
      
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-700 via-purple-700 to-indigo-800 bg-clip-text text-transparent mb-4">{isPrescriptionsView ? 'Prescriptions' : 'My appointments'}</h1>
      <div className="glass-card rounded-2xl animate-slide-in-left">
        {loading ? (
          <div className="p-4 text-slate-600">Loading...</div>
        ) : error ? (
          <div className="p-4 text-red-600">{error}</div>
        ) : (isPrescriptionsView ? presItems.length === 0 : list.length === 0) ? (
          <div className="p-4 text-slate-600">{isPrescriptionsView ? 'No prescriptions found' : 'No appointments found'}</div>
        ) : (
          <div className="divide-y">
            {(isPrescriptionsView ? presItems : list).map((a) => (
              <div key={a._id} className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 card-hover">
                <div className="flex items-center gap-3 sm:gap-4">
                  {(() => {
                    try {
                      const docId = isPrescriptionsView ? String(a.docId || '') : String(a.doctor?._id || a.doctor || '');
                      const prof = profiles.get(docId);
                      const src = prof?.photoBase64;
                      if (src && String(src).startsWith('data:image')) {
                        return <img src={src} alt="Doctor" className="h-14 w-14 rounded-md object-cover border" />;
                      }
                    } catch (_) {}
                    return <div className="h-14 w-14 rounded-md border bg-white" />;
                  })()}
                  <div>
                    <div className="font-semibold">
                      {(() => {
                        if (isPrescriptionsView) return a.doctor || '';
                        const docId = String(a.doctor?._id || a.doctor || '');
                        const prof = profiles.get(docId);
                        const busy = !!prof?.isBusy;
                        const online = !!prof?.isOnline;
                        const cls = busy ? 'bg-amber-500' : (online ? 'bg-green-500' : 'bg-red-500');
                        return (
                          <span className="inline-flex items-center gap-2">
                            {a.doctor?.name ? `Dr. ${a.doctor?.name}` : ''}
                            <span className={`h-2 w-2 rounded-full ${cls}`}></span>
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-sm text-slate-700">Date & Time: <span className="text-slate-900">{isPrescriptionsView ? `${a.date} | ${a.time}` : `${a.date} | ${a.startTime}`}</span></div>
                    {!isPrescriptionsView && (() => {
                      try {
                        const docId = String(a.doctor?._id || a.doctor || '');
                        const prof = profiles.get(docId);
                        const addr = [prof?.clinic?.address, prof?.clinic?.city].filter(Boolean).join(', ');
                        if (!addr) return null;
                        return <div className="text-xs text-slate-600">Address: <span className="text-slate-900">{addr}</span></div>;
                      } catch (_) { return null; }
                    })()}
                    {isPrescriptionsView && <div className="text-xs text-slate-600 truncate">{a.name}</div>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto sm:justify-end mt-2 sm:mt-0">
                  {isPrescriptionsView ? (
                    <button onClick={() => { try { const u = String(a.url || ''); if (u) nav(u); } catch(_) {} }} className="border border-indigo-600 text-indigo-700 px-3 py-1 rounded-md">Open</button>
                  ) : String(a.status).toUpperCase() === 'CANCELLED' ? (
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="inline-block text-xs px-2 py-1 rounded bg-red-100 text-red-700">Cancelled</span>
                      {(() => {
                        const byMe = localStorage.getItem(`cancelledByMe_${String(a._id || a.id)}`) === '1';
                        const docId = String(a.doctor?._id || a.doctor || '');
                        const label = byMe ? 'You cancelled this appointment' : 'Doctor cancelled your appointment';
                        return (
                          <>
                            <span className="text-xs text-slate-600">{label}</span>
                            {!byMe && docId && (
                              <button
                                onClick={() => nav(`/doctor/${String(docId)}`)}
                                className="border border-indigo-600 text-indigo-700 px-3 py-1 rounded-md"
                              >
                                Book Next Slot
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : String(a.status).toUpperCase() === 'COMPLETED' ? (
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="inline-block text-xs px-2 py-1 rounded bg-green-100 text-green-700">Consultation Completed</span>
                      {a.prescriptionText && (
                        <button
                          onClick={() => { const id = String(a._id || a.id || ''); if (id) nav(`/prescription/${id}`); }}
                          className="border border-indigo-600 text-indigo-700 px-3 py-1 rounded-md"
                        >
                          View Prescription
                        </button>
                      )}
                      {canFollowUp(a) && (
                        <button
                          onClick={() => { const id = String(a._id || a.id || ''); if (id) { try { localStorage.setItem('lastChatApptId', id); } catch(_) {}; nav(`/appointments/${id}/followup`); } }}
                          className="border border-green-600 text-green-700 px-3 py-1 rounded-md"
                        >
                          Follow-up
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const docId = String(a.doctor?._id || a.doctor || '');
                          if (docId) nav(`/doctor/${docId}`);
                        }}
                        className="border border-slate-300 px-3 py-1 rounded-md"
                      >
                        Book Next Slot
                      </button>
                      {(() => {
                        const key = `rate_${String(a._id || a.id || '')}`;
                        let rated = false;
                        try { rated = Number(localStorage.getItem(`${key}_stars`) || 0) > 0; } catch(_) {}
                        return (
                          <button
                            onClick={() => {
                              if (rated) return;
                              setRateAppt(a);
                              try {
                                const stars = Number(localStorage.getItem(`${key}_stars`) || 0) || 0;
                                const text = String(localStorage.getItem(`${key}_comment`) || '') || '';
                                setRateStars(stars);
                                setRateText(text);
                              } catch(_) { setRateStars(0); setRateText(''); }
                            }}
                            disabled={rated}
                            className={`border px-3 py-1 rounded-md ${rated ? 'border-slate-300 text-slate-400 cursor-not-allowed' : 'border-green-600 text-green-700'}`}
                          >
                            {rated ? 'Rated' : 'Rate Doctor'}
                          </button>
                        );
                      })()}
                    </div>
                  ) : String(a.status).toUpperCase() === 'JOINED' ? (
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="inline-block text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Joined</span>
                      {(() => {
                        const id = String(a._id || a.id || '');
                        return (
                          <button
                            onClick={() => {
                              try { localStorage.setItem(`joinedByPatient_${id}`, '0'); } catch(_) {}
                              try { socketRef.current && socketRef.current.emit('meet:update', { apptId: id, actor: 'patient', event: 'exit' }); } catch(_) {}
                              setList((prev) => prev.map((x) => (String(x._id || x.id) === id ? { ...x, status: 'CONFIRMED' } : x)));
                            }}
                            className="border border-red-600 text-red-700 px-3 py-1 rounded-md"
                          >
                            Leave
                          </button>
                        );
                      })()}
                    </div>
                  ) : (
                    <>
                      {a.type === 'online' && String(a.status).toUpperCase() === 'CONFIRMED' && (
                        (() => {
                          try {
                            const start = new Date(a.date);
                            const [sh, sm] = String(a.startTime || '00:00').split(':').map((x) => Number(x));
                            start.setHours(sh, sm, 0, 0);
                            const end = new Date(a.date);
                            const [eh, em] = String(a.endTime || a.startTime || '00:00').split(':').map((x) => Number(x));
                            end.setHours(eh, em, 0, 0);
                            const now = Date.now();
                            const docId = String(a.doctor?._id || a.doctor || '');
                            if (now >= end.getTime()) {
                              return (
                                <>
                                  <span className="inline-block text-xs px-2 py-1 rounded bg-red-100 text-red-700">Time Expired</span>
                                  {docId && (
                                    <button onClick={() => nav(`/doctor/${String(docId)}`)} className="border border-indigo-600 text-indigo-700 px-3 py-1 rounded-md">Book Next Slot</button>
                                  )}
                                  {a.prescriptionText && (
                                    <button
                                      onClick={() => { const id = String(a._id || a.id || ''); if (id) nav(`/prescription/${id}`); }}
                                      className="border border-indigo-600 text-indigo-700 px-3 py-1 rounded-md"
                                    >
                                      View Prescription
                                    </button>
                                  )}
                                  
                                </>
                              );
                            }
                            const early = start.getTime() - 5 * 60 * 1000;
                            if (now < early) {
                              return <span className="inline-block text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">Available 5 min before</span>;
                            }
                            const link = meetLinkFor(a);
                            const url = String(link).replace(/[`'\"]/g, '').trim();
                            if (!url || !/^https?:\/\//.test(url)) {
                              return <span className="inline-block text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">Waiting for doctor to set meeting link</span>;
                            }
                            return (
                              <>
                            {(() => {
                              const id = String(a._id || a.id || '');
                              const joinedPatient = id ? localStorage.getItem(`joinedByPatient_${id}`) === '1' : false;
                              const joinedDoctor = id ? localStorage.getItem(`doctorJoined_${id}`) === '1' : false;
                              const joined = joinedPatient || joinedDoctor;
                              return joined ? (
                                <span className="inline-block text-xs px-2 py-1 rounded bg-green-100 text-green-700">Joined</span>
                              ) : null;
                            })()}
                                {(() => {
                                  const id = String(a._id || a.id || '');
                                  const jp = id ? localStorage.getItem(`joinedByPatient_${id}`) : null;
                                  const joinedPatient = jp === '1';
                                  const leftPatient = jp === '0';
                                  const joinedDoctor = id ? localStorage.getItem(`doctorJoined_${id}`) === '1' : false;
                                  const joined = joinedPatient || joinedDoctor;
                                  if (joined) {
                                    return <span className="inline-block text-xs px-2 py-1 rounded bg-green-50 text-green-700">You are now connected to the consultation.</span>;
                                  }
                                  if (leftPatient) {
                                    return <span className="inline-block text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">You have left the meeting. You can rejoin anytime until the session ends.</span>;
                                  }
                                  return <span className="inline-block text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">Meeting not started yet. Click Join Meet to enter the consultation.</span>;
                                })()}
                                {(() => {
                                  const id = String(a._id || a.id || '');
                                  const jp = id ? localStorage.getItem(`joinedByPatient_${id}`) : null;
                                  const joinedPatient = jp === '1';
                                  const leftPatient = jp === '0';
                                  const joinedDoctor = id ? localStorage.getItem(`doctorJoined_${id}`) === '1' : false;
                                  const joined = joinedPatient || joinedDoctor;
                                  const openAndMonitor = () => {
                                    try {
                                      const idX = String(a._id || a.id);
                                      localStorage.setItem(`joinedByPatient_${idX}`, '1');
                                      setList((prev) => prev.map((x) => (String(x._id || x.id) === idX ? { ...x, status: 'JOINED' } : x)));
                                    } catch(_) {}
                                    const name = meetWindowName(id);
                                    const win = window.open(url, name);
                                    try { localStorage.setItem(`openMeeting_${String(a._id || a.id)}`, '1'); } catch(_) {}
                                    try { meetWinRef.current[id] = win; } catch(_) {}
                                    try { socketRef.current && socketRef.current.emit('meet:update', { apptId: String(a._id || a.id), actor: 'patient', event: 'join' }); } catch(_) {}
                                    try {
                                      const idX = String(a._id || a.id);
                                      try { localStorage.setItem(`everJoinedPatient_${idX}`, '1'); } catch(_) {}
                                      const monitor = setInterval(() => {
                                        const end = new Date(a.date);
                                        const [eh, em] = String(a.endTime || a.startTime || '00:00').split(':').map((x) => Number(x));
                                        end.setHours(eh, em, 0, 0);
                                        const now = Date.now();
                                        const expired = now >= end.getTime();
                                        if (expired) {
                                          const djEver = localStorage.getItem(`everJoinedDoctor_${idX}`) === '1';
                                          const pjEver = localStorage.getItem(`everJoinedPatient_${idX}`) === '1';
                                          const both = djEver && pjEver;
                                          try {
                                            localStorage.setItem(`joinedByPatient_${idX}`, '0');
                                            localStorage.setItem(`openMeeting_${idX}`, '0');
                                            setList((prev) => prev.map((x) => (String(x._id || x.id) === idX ? { ...x, status: both ? 'COMPLETED' : 'CONFIRMED' } : x)));
                                          } catch(_) {}
                                          try { socketRef.current && socketRef.current.emit('meet:update', { apptId: idX, actor: 'patient', event: both ? 'complete' : 'exit' }); } catch(_) {}
                                          try {
                                            const w = meetWinRef.current[idX];
                                            if (w && !w.closed) w.close();
                                            meetWinRef.current[idX] = null;
                                          } catch(_) {}
                                          clearInterval(monitor);
                                          meetMonitorRef.current[idX] = null;
                                          return;
                                        }
                                        if (!win || win.closed) {
                                          clearInterval(monitor);
                                          meetMonitorRef.current[idX] = null;
                                          try { localStorage.setItem(`joinedByPatient_${idX}`, '0'); localStorage.setItem(`openMeeting_${idX}`, '0'); setList((prev) => prev.map((x) => (String(x._id || x.id) === idX ? { ...x, status: 'CONFIRMED' } : x))); } catch(_) {}
                                          try { socketRef.current && socketRef.current.emit('meet:update', { apptId: idX, actor: 'patient', event: 'exit' }); } catch(_) {}
                                        }
                                      }, 1000);
                                      meetMonitorRef.current[idX] = monitor;
                                    } catch(_) {}
                                  };
                                  if (joined) {
                                    return (
                                      <button
                                        onClick={() => {
                                          try {
                                            const idX = String(a._id || a.id);
                                            localStorage.setItem(`joinedByPatient_${idX}`, '0');
                                            localStorage.setItem(`openMeeting_${idX}`, '0');
                                            setList((prev) => prev.map((x) => (String(x._id || x.id) === idX ? { ...x, status: 'CONFIRMED' } : x)));
                                          } catch(_) {}
                                          try { socketRef.current && socketRef.current.emit('meet:update', { apptId: String(a._id || a.id), actor: 'patient', event: 'exit' }); } catch(_) {}
                                          try {
                                            const idX = String(a._id || a.id);
                                            const mon = meetMonitorRef.current[idX];
                                            if (mon) { clearInterval(mon); meetMonitorRef.current[idX] = null; }
                                            const w = meetWinRef.current[idX];
                                            if (w && !w.closed) { w.close(); }
                                            meetWinRef.current[idX] = null;
                                            try {
                                              const name = meetWindowName(idX);
                                              const w2 = window.open('', name);
                                              if (w2 && !w2.closed) w2.close();
                                            } catch(_) {}
                                          } catch(_) {}
                                        }}
                                        className="border border-red-600 text-red-700 px-3 py-1 rounded-md"
                                      >
                                        Leave
                                      </button>
                                    );
                                  }
                                  if (leftPatient) {
                                    return (
                                      <button onClick={openAndMonitor} className="border border-indigo-600 text-indigo-700 px-3 py-1 rounded-md">Rejoin</button>
                                    );
                                  }
                                  return (
                                    <button onClick={openAndMonitor} className="border border-green-600 text-green-700 px-3 py-1 rounded-md">Join Meet</button>
                                  );
                                })()}
                              </>
                            );
                          } catch (_) { return null; }
                        })()
                      )}
                      {(() => {
                        try {
                          const start = new Date(a.date);
                          const [sh, sm] = String(a.startTime || '00:00').split(':').map((x) => Number(x));
                          start.setHours(sh, sm, 0, 0);
                          const end = new Date(a.date);
                          const [eh, em] = String(a.endTime || a.startTime || '00:00').split(':').map((x) => Number(x));
                          end.setHours(eh, em, 0, 0);
                          const now = Date.now();
                          const expired = now >= end.getTime();
                          const completed = String(a.status).toUpperCase() === 'COMPLETED';
                          if (expired || completed) return null;
                        } catch(_) {}
                        return (
                          <button
                            onClick={() => {
                              const id = String(a._id || a.id);
                              nav(`/appointments/${id}/details`);
                            }}
                            className="border border-slate-600 text-slate-700 px-3 py-1 rounded-md"
                          >
                            View Details
                          </button>
                        );
                      })()}
                      
                      {(() => {
                        try {
                          const start = new Date(a.date);
                          const [sh, sm] = String(a.startTime || '00:00').split(':').map((x) => Number(x));
                          start.setHours(sh, sm, 0, 0);
                          const end = new Date(a.date);
                          const [eh, em] = String(a.endTime || a.startTime || '00:00').split(':').map((x) => Number(x));
                          end.setHours(eh, em, 0, 0);
                          const now = Date.now();
                          const expired = now >= end.getTime();
                          const completed = String(a.status).toUpperCase() === 'COMPLETED';
                          if (expired || completed) return null;
                        } catch(_) {}
                        return (String(a.paymentStatus).toUpperCase() !== 'PAID' ? (
                          <button
                            onClick={() => nav(`/pay/${a._id}`)}
                            className="border border-slate-300 px-3 py-1 rounded-md"
                          >
                            Pay Online
                          </button>
                        ) : (
                          <span className="inline-block text-xs px-2 py-1 rounded bg-green-100 text-green-700">Paid</span>
                        ));
                      })()}
                      {(() => {
                        try {
                          const start = new Date(a.date);
                          const [sh, sm] = String(a.startTime || '00:00').split(':').map((x) => Number(x));
                          start.setHours(sh, sm, 0, 0);
                          const end = new Date(a.date);
                          const [eh, em] = String(a.endTime || a.startTime || '00:00').split(':').map((x) => Number(x));
                          end.setHours(eh, em, 0, 0);
                          const now = Date.now();
                          const expired = now >= end.getTime();
                          const completed = String(a.status).toUpperCase() === 'COMPLETED';
                          if (expired || completed) return null;
                        } catch(_) {}
                        return (canCancelAppt(a) && (
                          <button
                            onClick={() => cancel(a._id || a.id)}
                            disabled={!a?._id}
                            className={`border px-3 py-1 rounded-md ${(!a?._id) ? 'border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-300'}`}
                          >
                            Cancel appointment
                          </button>
                        ));
                      })()}
                      {(() => {
                        try {
                          const start = new Date(a.date);
                          const [sh, sm] = String(a.startTime || '00:00').split(':').map((x) => Number(x));
                          start.setHours(sh, sm, 0, 0);
                          const end = new Date(a.date);
                          const [eh, em] = String(a.endTime || a.startTime || '00:00').split(':').map((x) => Number(x));
                          end.setHours(eh, em, 0, 0);
                          const now = Date.now();
                          const expired = now >= end.getTime();
                          const completed = String(a.status).toUpperCase() === 'COMPLETED';
                          if (expired || completed) return null;
                        } catch(_) {}
                        return (a.prescriptionText && (
                          <>
                            <button
                              onClick={() => nav(`/prescription/${a._id || a.id}`)}
                              className="border border-indigo-600 text-indigo-700 px-3 py-1 rounded-md"
                            >
                              View Prescription
                            </button>
                            <button
                              onClick={() => window.open(`/prescription/${a._id || a.id}?print=1`, '_blank')}
                              className="border border-slate-300 px-3 py-1 rounded-md"
                            >
                              Download PDF
                            </button>
                            <button
                              onClick={async () => {
                                const url = `${window.location.origin}/prescription/${a._id || a.id}`;
                                try { await navigator.clipboard.writeText(url); alert('Link copied for pharmacy'); } catch(_) {}
                              }}
                              className="border border-slate-300 px-3 py-1 rounded-md"
                            >
                              Share to pharmacy
                            </button>
                            <button
                              onClick={async () => {
                                const url = `${window.location.origin}/prescription/${a._id || a.id}`;
                                try { await navigator.clipboard.writeText(url); alert('Link copied for lab tests'); } catch(_) {}
                              }}
                              className="border border-slate-300 px-3 py-1 rounded-md"
                            >
                              Share for lab tests
                            </button>
                            {null}
                          </>
                        ));
                      })()}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      
      {waitingAppt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-slate-200 w-[95vw] max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold text-slate-900">Waiting Room</div>
              <button
                onClick={() => setWaitingAppt(null)}
                className="px-3 py-1 rounded-md border border-slate-300"
              >
                Leave
              </button>
            </div>
            <div className="p-4">
              <div className="text-slate-700 text-sm">Appointment: <span className="text-slate-900">{waitingAppt.date} {waitingAppt.startTime}-{waitingAppt.endTime}</span></div>
              <div className="mt-2 text-indigo-700">Waiting for doctor to join…</div>
              <div className="mt-4">
                <div className="text-slate-900 font-semibold mb-1">Symptoms (reason for visit)</div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{String(waitingAppt.patientSymptoms || localStorage.getItem(`wr_${String(waitingAppt._id || waitingAppt.id)}_symptoms`) || '').trim() || '--'}</div>
              </div>
              <div className="mt-4">
                <div className="text-slate-900 font-semibold mb-2">Pre-call chat</div>
                <div className="h-28 overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50">
                  {waitChat.length === 0 ? (
                    <div className="text-slate-600 text-sm">No messages</div>
                  ) : (
                    waitChat.map((m, idx) => (
                      <div key={idx} className="text-sm text-slate-700">{m}</div>
                    ))
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={waitText}
                    onChange={(e) => setWaitText(e.target.value)}
                    placeholder="Type a quick message"
                    className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => {
                      if (waitText.trim()) {
                        const id = String(waitingAppt._id || waitingAppt.id);
                        const text = waitText.trim();
                        const next = [...waitChat, text];
                        setWaitChat(next);
                        try { localStorage.setItem(`wr_${id}_chat`, JSON.stringify(next)); } catch(_) {}
                        try { localStorage.setItem('lastChatApptId', id); } catch(_) {}
                        try { const chan = new BroadcastChannel('chatmsg'); chan.postMessage({ apptId: id, actor: 'patient', text }); chan.close(); } catch(_) {}
                        try { socketRef.current && socketRef.current.emit('chat:new', { apptId: id, actor: 'patient', kind: 'pre', text }); } catch(_) {}
                        setWaitText("");
                      }
                    }}
                    className="px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Send
                  </button>
                </div>
                <div className="mt-4">
                  <div className="text-slate-900 font-semibold mb-1">Medical reports uploaded</div>
                  <input
                    type="file"
                    multiple
                    onChange={async (e) => {
                    const filesSel = Array.from(e.target.files || []);
                    const newItems = [];
                      for (const f of filesSel) {
                        try {
                          const buf = await f.arrayBuffer();
                          const bytes = new Uint8Array(buf);
                          let binary = '';
                          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                          const b64 = btoa(binary);
                          const mime = f.type || 'application/octet-stream';
                          newItems.push({ name: f.name, url: `data:${mime};base64,${b64}` });
                        } catch (_) {}
                      }
                      const nextFiles = [...waitFiles, ...newItems];
                      setWaitFiles(nextFiles);
                    const id = String(waitingAppt._id || waitingAppt.id);
                    try { localStorage.setItem(`wr_${id}_files`, JSON.stringify(nextFiles)); } catch(_) {}
                    try { socketRef.current && socketRef.current.emit('chat:new', { apptId: id, actor: 'patient', kind: 'report', text: `Report uploaded (${filesSel.length})` }); } catch(_) {}
                    e.target.value = '';
                  }}
                  />
                  <div className="mt-2 space-y-2">
                    {waitFiles.length === 0 ? (
                      <div className="text-slate-600 text-sm">No reports uploaded</div>
                    ) : (
                      waitFiles.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between border rounded-md p-2">
                          <div className="flex items-center gap-3">
                            {(String(f.url || '').startsWith('data:image')) && (
                              <img src={f.url} alt={f.name} className="h-10 w-10 object-cover rounded" />
                            )}
                            <div className="text-sm text-slate-700 truncate max-w-[12rem]">{f.name}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => openFile(f.url, f.name)} className="px-2 py-1 rounded-md border border-slate-300 text-sm">Open</button>
                            <button
                              onClick={() => {
                                const nextFiles = waitFiles.filter((_, i) => i !== idx);
                                setWaitFiles(nextFiles);
                                const id = String(waitingAppt._id || waitingAppt.id);
                                try { localStorage.setItem(`wr_${id}_files`, JSON.stringify(nextFiles)); } catch(_) {}
                              }}
                              className="px-2 py-1 rounded-md border border-red-600 text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {filePreview && !isFullPreview && (
                    <div className="mt-3 border rounded-md p-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-slate-900 truncate">{filePreview.name || 'Selected report'}</div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setIsFullPreview(true)} className="px-2 py-1 rounded-md border border-slate-300 text-xs">Full Screen</button>
                          <button onClick={() => setFilePreview(null)} className="px-2 py-1 rounded-md border border-slate-300 text-xs">Close Preview</button>
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        <img src={String(filePreview.url || '')} alt="" className="max-h-64 w-auto object-contain cursor-zoom-in" onClick={() => setIsFullPreview(true)} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <div className="text-slate-900 font-semibold mb-1">Previous prescriptions</div>
                <div className="space-y-2">
                  {(() => {
                    const did = String(waitingAppt.doctor?._id || waitingAppt.doctor || '');
                    const items = (list || []).filter((x) => String(x.doctor?._id || x.doctor || '') === did && x.prescriptionText);
                    if (items.length === 0) return <div className="text-sm text-slate-600">No previous prescriptions</div>;
                    return items.slice(0,5).map((x) => (
                      <div key={x._id} className="border rounded-md p-2">
                        <div className="text-xs text-slate-600">{x.date} {x.startTime}</div>
                        <div className="text-sm text-slate-700 truncate">{x.prescriptionText}</div>
                        <div className="mt-1">
                          <button onClick={() => window.open(`/prescription/${x._id || x.id}`, '_blank')} className="px-2 py-1 rounded-md border border-indigo-600 text-indigo-700 text-xs">Open</button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => cancel(waitingAppt._id || waitingAppt.id)}
                  className="px-3 py-2 rounded-md border border-red-600 text-red-700"
                >
                  Cancel appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {detailsAppt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]" style={{ overscrollBehavior: 'contain' }} onClick={(e) => { if (e.target === e.currentTarget) { setDetailsAppt(null); setIsFullPreview(false); setFilePreview(null); } }}>
          <div className="relative m-auto bg-white/95 backdrop-blur-md rounded-2xl border border-blue-200/50 shadow-2xl w-[90vw] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 px-6 py-4 border-b border-blue-200/50 flex items-center justify-between bg-white/95 backdrop-blur-md">
              <div className="text-xl font-extrabold bg-gradient-to-r from-blue-700 via-purple-700 to-indigo-800 bg-clip-text text-transparent">Patient Details</div>
              <button onClick={() => { setDetailsAppt(null); setIsFullPreview(false); setFilePreview(null); try { nav('/appointments', { replace: true }); } catch(_) {} }} className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white">Close</button>
            </div>
            <div className="p-6 grid gap-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-slate-900 font-semibold mb-1">Patient name</div>
                  <div className="text-sm text-slate-900">{String(detailsAppt?.patient?.name || 'You')}</div>
                </div>
                <div>
                  <div className="text-slate-900 font-semibold mb-1">Age / Gender</div>
                  <div className="inline-flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{(() => {
                      try {
                        const p = detailsAppt?.patient || {};
                        const pid = String(p._id || localStorage.getItem('userId') || '');
                        let ageStr = '';
                        if (p.age !== undefined && p.age !== null && String(p.age).trim() !== '') {
                          ageStr = String(p.age);
                        } else {
                          const locAge = pid ? localStorage.getItem(`userAgeById_${pid}`) || '' : '';
                          if (locAge) {
                            ageStr = String(locAge);
                          } else {
                            const dob = p.birthday || p.dob || p.dateOfBirth || p.birthDate || (pid ? localStorage.getItem(`userDobById_${pid}`) || '' : '');
                            if (dob) {
                              const d = new Date(dob);
                              if (!Number.isNaN(d.getTime())) {
                                const t = new Date();
                                let age = t.getFullYear() - d.getFullYear();
                                const m = t.getMonth() - d.getMonth();
                                if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--;
                                ageStr = String(age);
                              }
                            }
                          }
                        }
                        return ageStr || '--';
                      } catch(_) { return '--'; }
                    })()}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">{(() => { try { const p = detailsAppt?.patient || {}; const pid = String(p._id || localStorage.getItem('userId') || ''); const gender = p.gender || p.sex || (pid ? localStorage.getItem(`userGenderById_${pid}`) || '' : ''); return gender || '--'; } catch(_) { return '--'; } })()}</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-slate-900 font-semibold mb-1">Symptoms (reason for visit)</div>
                  <button type="button" onClick={() => setDetEdit((v) => !v)} className="text-xs px-2 py-1 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50">{detEdit ? 'View' : 'Edit'}</button>
                </div>
                {detEdit ? (
                  <textarea rows={3} value={detSymptoms} onChange={(e) => setDetSymptoms(e.target.value)} className="w-full border border-blue-200 rounded-xl p-3 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Describe your symptoms" />
                ) : (
                  <div className="text-sm text-slate-800 whitespace-pre-wrap bg-blue-50/50 rounded-xl p-3">{String(detSymptoms || '').trim() || '--'}</div>
                )}
              </div>
              <div>
                <div className="text-slate-900 font-semibold mb-1">Health issue summary</div>
                {detEdit ? (
                  <textarea rows={3} value={detSummary} onChange={(e) => setDetSummary(e.target.value)} className="w-full border border-blue-200 rounded-xl p-3 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Brief summary for doctor" />
                ) : (
                  <div className="text-sm text-slate-800 whitespace-pre-wrap bg-blue-50/50 rounded-xl p-3">{String(detSummary || '').trim() || '--'}</div>
                )}
              </div>
              <div>
                <div className="text-slate-900 font-semibold mb-2">Pre-call chat</div>
                <div className="h-28 overflow-y-auto border border-blue-200 rounded-xl p-3 bg-white/70">
                  {detChat.length === 0 ? (
                    <div className="text-slate-500 text-sm">No messages</div>
                  ) : (
                    detChat.map((m, idx) => (
                      <div key={idx} className="text-sm text-slate-800">{m}</div>
                    ))
                  )}
                </div>
                
              </div>
              <div>
                <div className="text-slate-900 font-semibold mb-1">Medical reports uploaded</div>
                <input
                  type="file"
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    const newItems = [];
                    for (const f of files) {
                      try {
                        const buf = await f.arrayBuffer();
                        const bytes = new Uint8Array(buf);
                        let binary = '';
                        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                        const b64 = btoa(binary);
                        const mime = f.type || 'application/octet-stream';
                        newItems.push({ name: f.name, url: `data:${mime};base64,${b64}` });
                      } catch (_) {}
                    }
                    const nextFiles = [...detPrevFiles, ...newItems];
                    setDetPrevFiles(nextFiles);
                    const id = String(detailsAppt._id || detailsAppt.id);
                    try { localStorage.setItem(`wr_${id}_files`, JSON.stringify(nextFiles)); } catch(_) {}
                    try { socketRef.current && socketRef.current.emit('chat:new', { apptId: id, actor: 'patient', kind: 'report', text: `Report uploaded (${files.length})` }); } catch(_) {}
                    e.target.value = '';
                  }}
                />
                <div className="mt-2 space-y-2">
                  {detPrevFiles.length === 0 ? (
                    <div className="text-slate-500 text-sm">No reports uploaded</div>
                  ) : (
                    detPrevFiles.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between border border-blue-200 rounded-xl p-3 bg-white/70">
                        <div className="flex items-center gap-3">
                          {(String(f.url || '').startsWith('data:image')) && (
                            <img src={f.url} alt={f.name} className="h-10 w-10 object-cover rounded" />
                          )}
                          <div className="text-sm text-slate-800 truncate max-w-[12rem]">{f.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openFile(f.url, f.name)} className="px-2 py-1 rounded-md border border-blue-200 text-blue-700 text-sm">Open</button>
                          <button
                            onClick={() => {
                              const nextFiles = detPrevFiles.filter((_, i) => i !== idx);
                              setDetPrevFiles(nextFiles);
                              const id = String(detailsAppt._id || detailsAppt.id);
                              try { localStorage.setItem(`wr_${id}_files`, JSON.stringify(nextFiles)); } catch(_) {}
                            }}
                            className="px-2 py-1 rounded-md border border-red-600 text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {filePreview && !isFullPreview && (
                  <div className="mt-3 border rounded-md p-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-slate-900 truncate">{filePreview.name || 'Selected report'}</div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setIsFullPreview(true)} className="px-2 py-1 rounded-md border border-slate-300 text-xs">Full Screen</button>
                        <button onClick={() => setFilePreview(null)} className="px-2 py-1 rounded-md border border-slate-300 text-xs">Close Preview</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <img src={String(filePreview.url || '')} alt="" className="max-h-64 w-auto object-contain cursor-zoom-in" onClick={() => setIsFullPreview(true)} />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 items-center bg-white/95 backdrop-blur-md py-3 border-t border-blue-200/50">
                <button
                  onClick={async () => {
                    try {
                      const id = String(detailsAppt._id || detailsAppt.id);
                      await API.put(`/appointments/${id}/patient-details`, {
                        symptoms: detSymptoms,
                        summary: detSummary,
                        date: detailsAppt.date,
                        startTime: detailsAppt.startTime,
                        doctorId: String(detailsAppt.doctor?._id || detailsAppt.doctor || '')
                      });
                      setList((prev) => prev.map((x) => (String(x._id || x.id) === id ? { ...x, patientSymptoms: detSymptoms, patientSummary: detSummary } : x)));
                      try {
                        localStorage.setItem(`wr_${id}_symptoms`, String(detSymptoms || ''));
                        localStorage.setItem(`fu_${id}_symptoms`, String(detSummary || ''));
                      } catch(_) {}
                      setDetailsAppt(null);
                    } catch (e) {
                      try {
                        if (e?.response?.status === 404) {
                          await API.put(`/appointments/patient-details`, {
                            symptoms: detSymptoms,
                            summary: detSummary,
                            date: detailsAppt.date,
                            startTime: detailsAppt.startTime,
                            doctorId: String(detailsAppt.doctor?._id || detailsAppt.doctor || '')
                          });
                          const id = String(detailsAppt._id || detailsAppt.id);
                          setList((prev) => prev.map((x) => (String(x._id || x.id) === id ? { ...x, patientSymptoms: detSymptoms, patientSummary: detSummary } : x)));
                          try {
                            localStorage.setItem(`wr_${id}_symptoms`, String(detSymptoms || ''));
                            localStorage.setItem(`fu_${id}_symptoms`, String(detSummary || ''));
                          } catch(_) {}
                          setDetailsAppt(null);
                          return;
                        }
                      } catch (e2) {
                        alert(e2.response?.data?.message || e2.message || 'Failed to save');
                        return;
                      }
                      alert(e.response?.data?.message || e.message || 'Failed to save');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Submit
                </button>
                <div className="text-xs text-slate-600">Only visible to doctor</div>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-blue-200/50 bg-white/95 backdrop-blur-md">
              <div className="flex gap-2">
                <input
                  value={detText}
                  onChange={(e) => setDetText(e.target.value)}
                  placeholder="Type a quick message"
                  className="flex-1 border border-blue-200 rounded-xl px-3 py-2 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button
                  onClick={() => {
                    if (detText.trim()) {
                      const id = String(detailsAppt._id || detailsAppt.id);
                      const text = detText.trim();
                      const next = [...detChat, text];
                      setDetChat(next);
                      try { localStorage.setItem(`wr_${id}_chat`, JSON.stringify(next)); } catch(_) {}
                      try { localStorage.setItem('lastChatApptId', id); } catch(_) {}
                      try { const chan = new BroadcastChannel('chatmsg'); chan.postMessage({ apptId: id, actor: 'patient', text }); chan.close(); } catch(_) {}
                      try { socketRef.current && socketRef.current.emit('chat:new', { apptId: id, actor: 'patient', kind: 'pre', text }); } catch(_) {}
                      setDetText("");
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {null}
      {filePreview && isFullPreview && (
        <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setIsFullPreview(false)}
            className="absolute top-4 right-4 px-3 py-1 rounded-md border border-slate-300 bg-white/90"
          >Close</button>
          <img
            src={String(filePreview.url || '')}
            alt=""
            className="w-[98vw] h-[98vh] object-contain shadow-2xl"
          />
        </div>
      )}
      {presOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white border border-slate-200 rounded-xl shadow-lg w-[95vw] max-w-6xl h-[85vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b font-semibold">Prescription</div>
            <div className="flex-1">
              <iframe ref={presIframeRef} title="Prescription" src={`/prescription/${presId}?embed=1`} className="w-full h-full" />
            </div>
            <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
              <button type="button" onClick={() => { try { const w = presIframeRef?.current?.contentWindow; if (w) { try { w.postMessage({ type: 'PRINT' }, window.location.origin); } catch(__) { try { w.focus(); w.print(); } catch(___) {} } } else { window.open(`/prescription/${presId}?print=1`, '_blank'); } } catch(_) { try { window.open(`/prescription/${presId}?print=1`, '_blank'); } catch(__) {} } }} className="px-3 py-1 rounded-md border border-slate-300">Download PDF</button>
              <button type="button" onClick={() => setPresOpen(false)} className="px-3 py-1 rounded-md border border-slate-300">Close</button>
            </div>
          </div>
        </div>
      )}
      {null}
      {bookDocId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-slate-200 w-[95vw] max-w-5xl h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold text-slate-900">Book Next Slot</div>
              <button onClick={() => setBookDocId("")} className="px-3 py-1 rounded-md border border-slate-300">Close</button>
            </div>
            <iframe title="Doctor" src={`/doctor/${bookDocId}`} className="w-full h-[calc(85vh-52px)]" />
          </div>
        </div>
      )}
      {rateAppt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]" style={{ overscrollBehavior: 'contain' }}>
          <div className="relative m-auto bg-white/95 backdrop-blur-md rounded-2xl border border-blue-200/50 shadow-2xl w-[95vw] max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-blue-200/50 bg-white/95 backdrop-blur-md">
              <div className="font-semibold text-slate-900">Rate Doctor</div>
              <button
                onClick={() => setRateAppt(null)}
                className="px-3 py-1 rounded-md border border-slate-300"
              >
                Close
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="text-slate-700 text-sm mb-2">Doctor: <span className="text-slate-900">{rateAppt.doctor?.name || ''}</span></div>
              <div className="flex items-center gap-2 mb-3">
                {[1,2,3,4,5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRateStars(n)}
                    className={`h-8 w-8 rounded-full border flex items-center justify-center ${rateStars >= n ? 'bg-yellow-300 border-yellow-400' : 'bg-white border-slate-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={rateText}
                onChange={(e) => setRateText(e.target.value)}
                rows={4}
                className="w-full border border-blue-200 rounded-xl p-3 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Write your feedback"
              />
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => {
                    const key = `rate_${String(rateAppt._id || rateAppt.id)}`;
                    try {
                      const exists = Number(localStorage.getItem(`${key}_stars`) || 0) > 0;
                      if (exists) { alert('You have already rated this appointment.'); setRateAppt(null); return; }
                      if (!rateStars || rateStars < 1) { alert('Please select stars'); return; }
                      API.put(`/appointments/${String(rateAppt._id || rateAppt.id)}/rate`, { stars: rateStars, text: rateText })
                        .then(() => {
                          try {
                            localStorage.setItem(`${key}_stars`, String(rateStars || 0));
                            localStorage.setItem(`${key}_comment`, String(rateText || ''));
                          } catch(_) {}
                          alert('Thanks for your rating');
                          setRateAppt(null);
                        })
                        .catch((e) => {
                          alert(e.response?.data?.message || e.message || 'Failed to submit rating');
                        });
                    } catch(_) {}
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Submit
                </button>
                <div className="text-xs text-slate-600">Your rating helps improve doctor profiles.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
