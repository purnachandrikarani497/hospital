import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../api";
import { Helmet } from "react-helmet-async";

export default function Appointments() {
  const nav = useNavigate();
  const location = useLocation();
  const TW_FALLBACK = (process.env.PUBLIC_URL || '') + '/logo512.png';
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
  const [presModalAppt, setPresModalAppt] = useState(null);

  useEffect(() => {
    if (presModalAppt) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [presModalAppt]);

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
              const monitor = setInterval(async () => {
                const now = Date.now();
                const expired = now >= end.getTime();
                if (expired || !win || win.closed) {
                  clearInterval(monitor);
                  if (expired) {
                    try {
                      const djEver = localStorage.getItem(`everJoinedDoctor_${idX}`) === '1';
                      const pjEver = localStorage.getItem(`everJoinedPatient_${idX}`) === '1';
                      if (djEver && pjEver) {
                        await API.put(`/appointments/${idX}/complete`);
                      }
                    } catch(_) {}
                    try { if (win && !win.closed) win.close(); } catch(_) {}
                  }
                  try { localStorage.setItem(`joinedByPatient_${idX}`, '0'); localStorage.setItem(`openMeeting_${idX}`, '0'); } catch(_) {}
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
    
    let isMounted = true;
    const loadData = async (showLoading = true) => {
      if (showLoading) setLoading(true);
      setError("");
      try {
        const { data } = await API.get("/appointments/mine");
        if (!isMounted) return;
        const arr = Array.isArray(data) ? data : [];
        setList(arr);
        
        const ids = Array.from(new Set(arr.map((a) => {
          try {
            return String(typeof a.doctor === 'string' ? a.doctor : (a.doctor?._id || a.doctor?.id || ''));
          } catch(_) { return ''; }
        }).values())).filter(Boolean);
        
        if (ids.length) {
          const { data: profilesData } = await API.get(`/doctors`, { params: { ids: ids.join(',') } });
          if (!isMounted) return;
          const map = new Map();
          if (Array.isArray(profilesData)) {
            profilesData.forEach(p => {
              const did = String(p.user?._id || p.user || '');
              if (did) map.set(did, p);
            });
          }
          setProfiles(map);
        }
      } catch (e) {
        if (!isMounted) return;
        setError(e.response?.data?.message || e.message || "Failed to load appointments");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    loadData(true);

    const intervalId = setInterval(() => loadData(false), 30000);
    const handleFocus = () => loadData(false);
    window.addEventListener('focus', handleFocus);
    
    return () => { 
      isMounted = false;
      clearInterval(intervalId); 
      window.removeEventListener('focus', handleFocus); 
    };
  }, [nav]);

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

  // Removed aggressive 2s polling
  useEffect(() => {
    return;
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

  // Removed aggressive 1s profile polling
  useEffect(() => {
    return;
  }, [list]);

  useEffect(() => {
    const cleanup = [];
    const base = String(API.defaults.baseURL || "");
    const origin = (base.startsWith("/") || !base) ? window.location.origin : base.replace(/\/(api)?$/, "");
    const w = window;
    const onReady = () => {
      try {
        const socket = w.io ? w.io(origin, { transports: ["polling", "websocket"] }) : null;
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
                } else if (kind === 'details') {
                  if (detailsAppt && String(detailsAppt._id || detailsAppt.id) === id) {
                    API.get(`/appointments/${id}`).then(({ data }) => {
                      setDetailsAppt((prev) => (prev && String(prev._id || prev.id) === id ? { ...prev, ...data } : prev));
                      setDetSymptoms(String(data?.patientSymptoms || "").trim());
                      setDetSummary(String(data?.patientSummary || "").trim());
                    }).catch(() => {});
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
                  const name = meetWindowName(id);
                  const w2 = window.open('', name);
                  if (w2 && !w2.closed) w2.close();
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
      const localFiles = JSON.parse(localStorage.getItem(`wr_${id}_files`) || '[]');
      const serverFiles = Array.isArray(waitingAppt?.patientReports) ? waitingAppt.patientReports : [];
      
      const merged = [...serverFiles];
      const serverNames = new Set(serverFiles.map(f => String(f.name || '').toLowerCase()));
      
      if (Array.isArray(localFiles)) {
        for (const f of localFiles) {
          const name = String(f.name || '').toLowerCase();
          if (!serverNames.has(name)) {
            merged.push(f);
            serverNames.add(name);
          }
        }
      }
      setWaitFiles(merged);
      try { localStorage.setItem(`wr_${id}_files`, JSON.stringify(merged)); } catch(_) {}
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
      const serverFiles = Array.isArray(detailsAppt?.patientReports) ? detailsAppt.patientReports : [];
      
      // Smart merge: if a file exists in serverFiles, ignore it in localStorage (matching by name)
      const merged = [...serverFiles];
      const serverNames = new Set(serverFiles.map(f => String(f.name || '').toLowerCase()));
      
      if (Array.isArray(doctorFiles)) {
        for (const f of doctorFiles) {
          const name = String(f.name || '').toLowerCase();
          if (!serverNames.has(name)) {
            merged.push(f);
            serverNames.add(name); // prevent duplicates within localStorage too
          }
        }
      }

      setDetPrevFiles(merged);
      // Update localStorage to keep it in sync with server truth
      try { localStorage.setItem(`wr_${id}_files`, JSON.stringify(merged)); } catch(_) {}
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

  const savePatientReports = async (apptId, files) => {
    try {
      const a = (list || []).find(x => String(x._id || x.id) === String(apptId));
      if (!a) return;
      await API.put(`/appointments/${apptId}/patient-details`, {
        symptoms: a.patientSymptoms || localStorage.getItem(`wr_${apptId}_symptoms`) || "",
        summary: a.patientSummary || localStorage.getItem(`fu_${apptId}_symptoms`) || "",
        date: a.date,
        startTime: a.startTime,
        doctorId: String(a.doctor?._id || a.doctor || ""),
        reports: files,
      });
      // Update local list to reflect changes
      setList(prev => prev.map(x => String(x._id || x.id) === String(apptId) ? { ...x, patientReports: files } : x));
    } catch (_) {}
  };

  const openFile = (u, name) => {
    try {
      const s = String(u || '');
      setFilePreview({ url: s, name: String(name || '') });
      setIsFullPreview(true);
    } catch (_) {}
  };

  const meetWindowName = (id) => `meet_${String(id || '')}`;

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
    <div className="page-gradient min-h-screen flex flex-col items-start pt-12 md:pt-16 pb-12 px-4">
      <Helmet>
        <title>{isPrescriptionsView ? 'Prescriptions | HospoZen' : 'My Appointments | HospoZen'}</title>
        <meta name="description" content={isPrescriptionsView ? 'View and access your prescriptions, print or share securely.' : 'Manage bookings, join online consultations, pay, and follow up with doctors.'} />
        <meta property="og:title" content={isPrescriptionsView ? 'Prescriptions | HospoZen' : 'My Appointments | HospoZen'} />
        <meta property="og:description" content={isPrescriptionsView ? 'View and access your prescriptions, print or share securely.' : 'Manage bookings, join online consultations, pay, and follow up with doctors.'} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={isPrescriptionsView ? 'Prescriptions | HospoZen' : 'My Appointments | HospoZen'} />
        <meta name="twitter:description" content={isPrescriptionsView ? 'View and access your prescriptions, print or share securely.' : 'Manage bookings, join online consultations, pay, and follow up with doctors.'} />
        <meta name="twitter:image" content={(() => { if (isPrescriptionsView && presItems.length) { const first = presItems[0]; const prof = profiles.get(String(first.docId || '')); const src = prof?.photoBase64; if (src && String(src).startsWith('data:image')) return src; } return TW_FALLBACK; })()} />
        {isPrescriptionsView && presItems.length > 0 && (
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: presItems.map((it, idx) => ({
              "@type": "ListItem",
              position: idx + 1,
              item: {
                "@type": "CreativeWork",
                name: it.name || `Prescription ${it.date || ''} ${it.time || ''}`.trim(),
                url: `${typeof window !== 'undefined' ? window.location.origin : ''}${it.url || ''}`
              }
            }))
          })}</script>
        )}
      </Helmet>

      <div className="w-full animate-fade-in">
        <div className="relative mb-6 text-left">
          <h1 className="inline-block px-2 py-1 text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10">
            {isPrescriptionsView ? 'My Prescriptions' : 'My Appointments'}
          </h1>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/40 overflow-hidden animate-slide-in-up">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-slate-600 font-medium">Loading your records...</p>
            </div>
          ) : error ? (
            <div className="p-10 text-center">
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <p className="text-red-600 font-bold text-lg">{error}</p>
            </div>
          ) : (isPrescriptionsView ? presItems.length === 0 : list.length === 0) ? (
            <div className="p-12 text-left">
              <div className="text-6xl mb-6">📅</div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">
                {isPrescriptionsView ? 'No Prescriptions Yet' : 'No Appointments Found'}
              </h3>
              <p className="text-slate-500 max-w-sm">
                {isPrescriptionsView 
                  ? "Your prescriptions will appear here once your doctor shares them." 
                  : "You haven't booked any appointments yet. Start your healthcare journey today!"}
              </p>
              {!isPrescriptionsView && (
                <button onClick={() => nav('/search')} className="mt-8 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-lg">
                  Book Your First Appointment
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 custom-scrollbar">
              {(isPrescriptionsView ? presItems : list).map((a) => (
                <div key={a._id} className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors duration-300">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      {(() => {
                        try {
                          const docId = isPrescriptionsView ? String(a.docId || '') : String(a.doctor?._id || a.doctor || '');
                          const prof = profiles.get(docId);
                          const src = prof?.photoBase64;
                          if (src && String(src).startsWith('data:image')) {
                            return <img src={src} alt="Doctor" className="h-20 w-20 rounded-2xl object-cover border-2 border-white shadow-md" />;
                          }
                        } catch (_) {}
                        return (
                          <div className="h-20 w-20 rounded-2xl border-2 border-white bg-slate-100 flex items-center justify-center text-3xl shadow-md">
                            👨‍⚕️
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-slate-900">
                          {isPrescriptionsView ? a.doctor : (a.doctor?.name ? `Dr. ${a.doctor?.name}` : 'Unknown Doctor')}
                        </h3>
                        {!isPrescriptionsView && (() => {
                          const docId = String(a.doctor?._id || a.doctor || '');
                          const prof = profiles.get(docId);
                          const busy = !!prof?.isBusy;
                          const online = !!prof?.isOnline;
                          return (
                            <span className={`h-2.5 w-2.5 rounded-full ${busy ? 'bg-amber-500' : (online ? 'bg-green-500' : 'bg-red-500')} shadow-sm`} title={busy ? 'Busy' : (online ? 'Online' : 'Offline')}></span>
                          );
                        })()}
                      </div>
                      <div className="flex flex-col gap-1 text-lg font-medium">
                        <div className="text-indigo-600 text-lg">{profiles.get(isPrescriptionsView ? a.docId : String(a.doctor?._id || a.doctor))?.specializations?.join(', ') || '--'}</div>
                        <div className="text-slate-500 flex items-center gap-2 text-lg">
                          <span>📅 {isPrescriptionsView ? a.date : a.date}</span>
                          <span className="text-slate-300">|</span>
                          <span>🕒 {isPrescriptionsView ? a.time : a.startTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center justify-start sm:justify-end">
                    {isPrescriptionsView ? (
                      <button onClick={() => setPresModalAppt(a)} className="px-6 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors border border-indigo-200">
                        Open Prescription
                      </button>
                    ) : (() => {
                      const isCompleted = a.status === 'COMPLETED';
                      const isCancelled = a.status === 'CANCELLED';
                      const isExpired = !isCompleted && !isCancelled && apptEndTs(a) < Date.now();
                      const id = String(a._id || a.id);
                      const inJoinWindow = isJoinWindow(a);
                      const hasJoined = localStorage.getItem(`joinedByPatient_${id}`) === '1';
                      const hadEverJoined = localStorage.getItem(`everJoinedPatient_${id}`) === '1';
                      const hasRated = Number(localStorage.getItem(`rate_${id}_stars`) || 0) > 0;

                      if (isCompleted) {
                        return (
                          <div className="flex flex-wrap gap-2 items-center justify-end">
                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider">Consultation Completed</span>
                            {a.prescriptionText && (
                              <button onClick={() => setPresModalAppt(a)} className="px-4 py-2 rounded-xl bg-green-50 text-green-700 font-bold hover:bg-green-100 transition-colors border border-green-200">
                                View Prescription
                              </button>
                            )}
                            {canFollowUp(a) && (
                              <button onClick={() => nav(`/appointments/${a._id}/followup`)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-md">
                                Follow-up
                              </button>
                            )}
                            {hasRated ? (
                               <span className="px-4 py-2 rounded-xl bg-slate-100 text-slate-500 font-bold border border-slate-200 cursor-default">Rated</span>
                            ) : (
                               <button onClick={() => setRateAppt(a)} className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition-colors border border-blue-200">
                                 Rate Doctor
                               </button>
                            )}
                          </div>
                        );
                      }

                      if (inJoinWindow) {
                        if (hasJoined) {
                            return <span className="px-4 py-2 rounded-xl bg-green-100 text-green-700 font-bold border border-green-200">Joined</span>;
                        }
                        
                        if (hadEverJoined) {
                            return (
                                <button onClick={() => nav(`/appointments?joinMeet=${id}`)} className="px-6 py-2 rounded-xl bg-yellow-500 text-white font-bold hover:bg-yellow-600 transition-all shadow-lg hover:scale-105">
                                    Rejoin
                                </button>
                            );
                        }

                        return (
                          <button onClick={() => nav(`/appointments?joinMeet=${id}`)} className="px-6 py-2 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-all shadow-lg hover:scale-105">
                            Join
                          </button>
                        );
                      }
                
                      if (isExpired) {
                        return (
                          <div className="flex flex-col items-end gap-2">
                            <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider">Time Expired</span>
                            <button onClick={() => nav(`/doctor/${String(a.doctor?._id || a.doctor)}`)} className="text-indigo-600 text-sm font-bold hover:underline">Book Next Slot</button>
                          </div>
                        );
                      }
                
                      return (
                        <div className="flex gap-2">
                          {canCancelAppt(a) && (
                            <button onClick={() => cancel(a._id)} className="px-4 py-2 rounded-xl border-2 border-red-100 text-red-600 font-bold hover:bg-red-50 transition-colors">
                              Cancel
                            </button>
                          )}
                          <button onClick={() => setDetailsAppt(a)} className="px-4 py-2 rounded-xl border-2 border-slate-100 text-slate-700 font-bold hover:bg-slate-50 transition-colors">
                            Details
                          </button>
                        </div>
                      );
                    })()
                  }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
                  <div className="group relative">
                    <input
                      id="report-upload"
                      type="file"
                      multiple
                      className="hidden"
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
                         await savePatientReports(id, nextFiles);
                         e.target.value = '';
                       }}
                    />
                    <label
                      htmlFor="report-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-400 transition-all cursor-pointer group-hover:scale-[1.01]"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-3 text-slate-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mb-1 text-sm text-slate-700 font-medium">Click to upload reports</p>
                        <p className="text-xs text-slate-500">PDF, PNG, JPG (Multiple allowed)</p>
                      </div>
                    </label>
                  </div>
                  <div className="mt-2 space-y-2">
                    {waitFiles.length === 0 ? (
                      <div className="text-slate-600 text-sm italic px-1">No reports uploaded yet</div>
                    ) : (
                      waitFiles.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between border border-slate-200 rounded-xl p-3 bg-white shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 bg-indigo-50 rounded-lg flex items-center justify-center overflow-hidden">
                              {(String(f.url || '').startsWith('data:image')) ? (
                                <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
                              ) : (
                                <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="text-sm font-medium text-slate-900 truncate max-w-[10rem] md:max-w-[15rem]">{f.name}</div>
                              <div className="text-[10px] text-slate-500 uppercase font-bold">{f.name.split('.').pop()}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => openFile(f.url, f.name)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors" title="Open">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={async () => {
                                const nextFiles = waitFiles.filter((_, i) => i !== idx);
                                setWaitFiles(nextFiles);
                                const id = String(waitingAppt._id || waitingAppt.id);
                                try { localStorage.setItem(`wr_${id}_files`, JSON.stringify(nextFiles)); } catch(_) {}
                                await savePatientReports(id, nextFiles);
                              }}
                              className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                              title="Remove"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
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
                  <div className="text-slate-900 font-semibold mb-1">Age</div>
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
                <div className="group relative">
                  <input
                    id="report-upload-details"
                    type="file"
                    multiple
                    className="hidden"
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
                       await savePatientReports(id, nextFiles);
                       e.target.value = '';
                     }}
                  />
                  <label
                    htmlFor="report-upload-details"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/30 hover:bg-blue-50 hover:border-blue-400 transition-all cursor-pointer group-hover:scale-[1.01]"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-3 text-blue-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mb-1 text-sm text-blue-700 font-medium">Click to upload reports</p>
                      <p className="text-xs text-blue-500">PDF, PNG, JPG (Multiple allowed)</p>
                    </div>
                  </label>
                </div>
                <div className="mt-2 space-y-2">
                  {detPrevFiles.length === 0 ? (
                    <div className="text-slate-500 text-sm italic px-1">No reports uploaded yet</div>
                  ) : (
                    detPrevFiles.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between border border-blue-100 rounded-xl p-3 bg-white/80 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 bg-blue-50 rounded-lg flex items-center justify-center overflow-hidden">
                            {(String(f.url || '').startsWith('data:image')) ? (
                              <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
                            ) : (
                              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate max-w-[10rem] md:max-w-[15rem]">{f.name}</div>
                            <div className="text-[10px] text-blue-500 uppercase font-bold">{f.name.split('.').pop()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openFile(f.url, f.name)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Open">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={async () => {
                              const nextFiles = detPrevFiles.filter((_, i) => i !== idx);
                              setDetPrevFiles(nextFiles);
                              const id = String(detailsAppt._id || detailsAppt.id);
                              try { localStorage.setItem(`wr_${id}_files`, JSON.stringify(nextFiles)); } catch(_) {}
                              await savePatientReports(id, nextFiles);
                            }}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                            title="Remove"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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
                        doctorId: String(detailsAppt.doctor?._id || detailsAppt.doctor || ''),
                        reports: detPrevFiles
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
                            doctorId: String(detailsAppt.doctor?._id || detailsAppt.doctor || ''),
                            reports: detPrevFiles
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

      {presModalAppt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]" style={{ overscrollBehavior: 'contain' }} onClick={(e) => { if (e.target === e.currentTarget) setPresModalAppt(null); }}>
          <div className="relative m-auto bg-white/95 backdrop-blur-md rounded-2xl border border-blue-200/50 shadow-2xl w-[95vw] max-w-5xl h-[90vh] overflow-hidden flex flex-col animate-scale-up">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-blue-200/50 bg-white/95 backdrop-blur-md z-10">
              <div className="flex flex-col">
                <div className="text-xl font-extrabold bg-gradient-to-r from-blue-700 via-purple-700 to-indigo-800 bg-clip-text text-transparent">Prescription</div>
                <div className="text-xs text-slate-500 font-medium">{presModalAppt.doctor?.name ? `Dr. ${presModalAppt.doctor?.name}` : (presModalAppt.doctor || '')} | {presModalAppt.date}</div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    const ifr = document.getElementById('pres-iframe');
                    if (ifr && ifr.contentWindow) {
                      ifr.contentWindow.postMessage('DOWNLOAD', window.location.origin);
                    }
                  }}
                  className="px-4 py-1.5 rounded-xl border-2 border-green-100 text-green-700 font-bold hover:bg-green-50 transition-all duration-300 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PDF
                </button>
                <button 
                  onClick={() => {
                    const ifr = document.getElementById('pres-iframe');
                    if (ifr && ifr.contentWindow) {
                      ifr.contentWindow.postMessage('PRINT', window.location.origin);
                    }
                  }}
                  className="px-4 py-1.5 rounded-xl border-2 border-indigo-100 text-indigo-700 font-bold hover:bg-indigo-50 transition-all duration-300 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
                <button 
                  onClick={() => setPresModalAppt(null)} 
                  className="p-2 rounded-xl border-2 border-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-300"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-50/50 overflow-hidden relative">
              <iframe 
                id="pres-iframe"
                title="Prescription" 
                src={`/prescription/${presModalAppt._id || presModalAppt.id}?embed=1`} 
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
