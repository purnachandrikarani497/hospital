import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";

export default function FollowUpDetails({ actor = 'patient', backTo = '/appointments' }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fuChat, setFuChat] = useState([]);
  const [fuText, setFuText] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [summary, setSummary] = useState("");
  const [files, setFiles] = useState([]);
  const [filePreview, setFilePreview] = useState(null);
  const [isFullPreview, setIsFullPreview] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      let fetched = null;
      try {
        const { data } = await API.get(`/appointments/${id}`);
        fetched = data || null;
        setAppt(fetched);
      } catch (e) {
        if (e.message === 'canceled') return;
        setError(e.response?.data?.message || e.message || "Failed to load appointment");
      }
      try {
        const serverSymptom = String(fetched?.patientSymptoms || "").trim();
        const serverSummary = String(fetched?.patientSummary || "").trim();
        const s1 = serverSymptom || String(localStorage.getItem(`wr_${id}_symptoms`) || "");
        const s2 = serverSummary || String(localStorage.getItem(`fu_${id}_symptoms`) || "");
        setSymptoms(s1);
        setSummary(s2);
        const fu = JSON.parse(localStorage.getItem(`fu_${id}_chat`) || "[]");
        const fuN = (Array.isArray(fu) ? fu : []).map((it) => (typeof it === 'string' ? it.trim() : String(it?.text || '').trim())).filter(Boolean);
        setFuChat(fuN);
        const wrF = JSON.parse(localStorage.getItem(`wr_${id}_files`) || "[]");
        const fuF = JSON.parse(localStorage.getItem(`fu_${id}_files`) || "[]");
        const serverF = Array.isArray(fetched?.patientReports) ? fetched.patientReports : [];
        const merged = ([]).concat(Array.isArray(wrF) ? wrF : [], Array.isArray(fuF) ? fuF : [], Array.isArray(serverF) ? serverF : []);
        const seen = new Set();
        const uniq = [];
        for (const x of Array.isArray(merged) ? merged : []) {
          const key = `${String(x?.url || '')}|${String(x?.name || '')}`;
          if (!key || seen.has(key)) continue;
          seen.add(key);
          if (typeof x?.url === 'string' && String(x.url).trim() !== '') uniq.push(x);
        }
        setFiles(uniq);
      } catch (_) { setFuChat([]); setFiles([]); }
      setLoading(false);
    };
    load();
  }, [id]);

  useEffect(() => {
    try {
      const base = String(API.defaults.baseURL || "");
      const origin = (base.startsWith("/") || !base) ? window.location.origin : base.replace(/\/(api)?$/, "");
      const w = window;
      const socket = w.io ? w.io(origin, { transports: ["polling", "websocket"], auth: { token: localStorage.getItem('token') || '' } }) : null;
      if (socket) {
        socketRef.current = socket;
        socket.on('chat:new', (payload) => {
          try {
            const { apptId, kind, text, actor: senderActor } = payload || {};
            if (String(apptId) === String(id)) {
              if (kind === 'followup' && text) {
                if (senderActor !== actor) {
                  setFuChat((prev) => {
                    if (prev.includes(text.trim())) return prev;
                    const next = [...prev, text.trim()];
                    try { localStorage.setItem(`fu_${id}_chat`, JSON.stringify(next)); } catch (_) {}
                    return next;
                  });
                }
              } else if (kind === 'details') {
                API.get(`/appointments/${id}`).then(({ data }) => {
                  setAppt(data);
                  setSymptoms(String(data?.patientSymptoms || "").trim());
                  setSummary(String(data?.patientSummary || "").trim());
                }).catch(() => {});
              } else if (kind === 'report') {
                API.get(`/appointments/${id}`).then(({ data }) => {
                  setAppt(data);
                  const serverF = Array.isArray(data?.patientReports) ? data.patientReports : [];
                  setFiles((prev) => {
                    const seen = new Set();
                    const uniq = [];
                    const merged = [...prev, ...serverF];
                    for (const x of merged) {
                      const key = `${String(x?.url || '')}|${String(x?.name || '')}`;
                      if (!key || seen.has(key)) continue;
                      seen.add(key);
                      uniq.push(x);
                    }
                    return uniq;
                  });
                }).catch(() => {});
              }
            }
          } catch (_) {}
        });
      }
      return () => { try { socket && socket.close(); } catch(_) {} };
    } catch(_) { return () => {}; }
  }, [actor, id]);

  const patientName = appt?.patient?.name || "";
  const patientGender = (() => {
    try {
      const p = appt?.patient || {};
      const pid = String(p._id || appt?.patient || "");
      const gender = p.gender || p.sex || (pid ? localStorage.getItem(`userGenderById_${pid}`) || "" : "");
      return gender || "";
    } catch (_) { return ""; }
  })();
  const patientAge = (() => {
    try {
      const p = appt?.patient || {};
      const pid = String(p._id || appt?.patient || "");
      if (p.age !== undefined && p.age !== null && String(p.age).trim() !== "") return String(p.age);
      const locAge = pid ? localStorage.getItem(`userAgeById_${pid}`) || "" : "";
      if (locAge) return String(locAge);
      const dob = p.birthday || p.dob || p.dateOfBirth || p.birthDate || (pid ? localStorage.getItem(`userDobById_${pid}`) || "" : "");
      if (!dob) return "";
      const d = new Date(dob);
      if (Number.isNaN(d.getTime())) return "";
      const t = new Date();
      let age = t.getFullYear() - d.getFullYear();
      const m = t.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--;
      return String(age);
    } catch (_) { return ""; }
  })();

  const absUrl = (u) => {
    try {
      const s = String(u || '');
      if (!s) return s;
      if (/^https?:\/\//.test(s) || s.startsWith('data:')) return s;
      const origin = String(API.defaults.baseURL || '').replace(/\/(api)?$/, '');
      return origin + (s.startsWith('/') ? s : ('/' + s));
    } catch (_) { return String(u || ''); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-4 relative">
      <div className="absolute inset-x-0 -top-6 h-20 bg-gradient-to-r from-indigo-100 via-purple-100 to-blue-100 blur-xl opacity-70 rounded-full pointer-events-none"></div>
      <div className="max-w-3xl mx-auto px-4">
        <div className="relative mb-10 text-center">
          <h2 className="inline-block px-8 py-3 text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10">
            Follow-up
            <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
          </h2>
          <button onClick={() => nav(backTo)} className="absolute right-0 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all duration-300">Back</button>
        </div>
        {loading && <div className="text-slate-600">Loading...</div>}
        {error && !loading && <div className="text-red-600 text-sm mb-2">{error}</div>}
        {!loading && (
          <div className="glass-card rounded-2xl p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-slate-900 font-semibold mb-1">Patient name</div>
                <div className="text-sm text-slate-900">{patientName || 'You'}</div>
              </div>
              <div>
                <div className="text-slate-900 font-semibold mb-1">Age / Gender</div>
                <div className="inline-flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{patientAge || '--'}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">{patientGender || '--'}</span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-slate-900 font-semibold mb-1">Symptoms (reason for visit)</div>
              <div className="text-sm text-slate-800 whitespace-pre-wrap bg-blue-50/50 rounded-xl p-3">{String(symptoms || '').trim() || '--'}</div>
            </div>

            <div className="mt-4">
              <div className="text-slate-900 font-semibold mb-1">Health issue summary</div>
              <div className="text-sm text-slate-800 whitespace-pre-wrap bg-blue-50/50 rounded-xl p-3">{String(summary || '').trim() || '--'}</div>
            </div>

            {null}

            <div className="mt-6">
              <div className="text-slate-900 font-semibold mb-2">Follow-up chat</div>
              <div className="h-28 overflow-y-auto border border-blue-200 rounded-xl p-3 bg-white/70">
                {fuChat.length === 0 ? (
                  <div className="text-slate-500 text-sm">No messages</div>
                ) : (
                  fuChat.map((m, idx) => (<div key={idx} className="text-sm text-slate-800">{m}</div>))
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <input 
                  value={fuText} 
                  onChange={(e) => setFuText(e.target.value)} 
                  placeholder="Type a quick message" 
                  maxLength={50}
                  className="flex-1 border border-blue-200 rounded-xl px-3 py-2 text-sm bg-white/70" 
                />
                <button
                  onClick={() => {
                    const t = String(fuText || '').trim().slice(0, 50);
                    if (!t) return;
                    const next = [...fuChat, t];
                    setFuChat(next);
                    try { localStorage.setItem(`fu_${id}_chat`, JSON.stringify(next)); } catch(_) {}
                    try { localStorage.setItem('lastChatApptId', String(id)); } catch(_) {}
                    try { const chan = new BroadcastChannel('chatmsg'); chan.postMessage({ apptId: String(id), actor, kind: 'followup', text: t }); chan.close(); } catch(_) {}
                    try { socketRef.current && socketRef.current.emit('chat:new', { apptId: String(id), actor, kind: 'followup', text: t }); } catch(_) {}
                    setFuText("");
                  }}
                  className="px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white"
                >Send</button>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-slate-900 font-semibold mb-1">Medical reports uploaded</div>
              <div className="mt-2 space-y-2">
                {files.length === 0 ? (
                  <div className="text-slate-500 text-sm">No reports uploaded</div>
                ) : (
                  files.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between border border-blue-200 rounded-xl p-3 bg-white/70">
                      <div className="flex items-center gap-3">
                        {(String(f.url || '').startsWith('data:image')) && (
                          <img src={absUrl(f.url)} alt={f.name} className="h-10 w-10 object-cover rounded" />
                        )}
                        <div className="text-sm text-slate-800 truncate max-w-[12rem]">{f.name}</div>
                      </div>
                      <button onClick={() => { try { setFilePreview({ url: absUrl(f.url), name: f.name }); setIsFullPreview(true); } catch(_) {} }} className="px-2 py-1 rounded-md border border-blue-200 text-blue-700 text-sm">Open</button>
                    </div>
                  ))
                )}
              </div>
            </div>
            {filePreview && isFullPreview && (
              <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center">
                <button type="button" onClick={() => setIsFullPreview(false)} className="absolute top-4 right-4 px-3 py-1 rounded-md border border-slate-300 bg-white/90">Close</button>
                <img src={absUrl(String(filePreview.url || ''))} alt="" className="w-[98vw] h-[90vh] object-contain shadow-2xl" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
