import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";

export default function DoctorAppointmentDocuments() {
  const { id } = useParams();
  const nav = useNavigate();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [summary, setSummary] = useState("");
  const [chat, setChat] = useState([]);
  const [files, setFiles] = useState([]);
  const [prevPres, setPrevPres] = useState([]);
  const [filePreview, setFilePreview] = useState(null);
  const [isFullPreview, setIsFullPreview] = useState(false);
  const [chatText, setChatText] = useState("");
  const socketRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      let fetched = null;
      try {
        const { data } = await API.get(`/appointments/${id}`);
        fetched = data;
        setAppt(data);
      } catch (e) {
        if (e.message === 'canceled') return;
        setError(e.response?.data?.message || e.message || "Failed to load appointment");
      }
      try {
        const serverSymptoms = String(fetched?.patientSymptoms || "").trim();
        const serverSummary = String(fetched?.patientSummary || "").trim();
        const wrMsgs = JSON.parse(localStorage.getItem(`wr_${id}_chat`) || "[]");
        const wrF = JSON.parse(localStorage.getItem(`wr_${id}_files`) || "[]");
        const fuF = JSON.parse(localStorage.getItem(`fu_${id}_files`) || "[]");
        const serverF = Array.isArray(fetched?.patientReports) ? fetched.patientReports : [];
        const wrS = String(localStorage.getItem(`wr_${id}_symptoms`) || "");
        const fuS = String(localStorage.getItem(`fu_${id}_symptoms`) || "");
        
        const serverChat = Array.isArray(fetched?.preChat) ? fetched.preChat.map(msg => msg.text) : [];
        const baseMsgs = serverChat.length > 0 ? serverChat : (Array.isArray(wrMsgs) ? wrMsgs : []);
        
        // Smart merge: prioritize server files, then deduplicate others by name
        const merged = [...serverF];
        const seenNames = new Set(serverF.map(f => String(f.name || '').toLowerCase()));
        
        const localSources = [wrF, fuF];
        for (const list of localSources) {
          if (Array.isArray(list)) {
            for (const f of list) {
              const name = String(f.name || '').toLowerCase();
              if (name && !seenNames.has(name)) {
                merged.push(f);
                seenNames.add(name);
              }
            }
          }
        }

        const cleanFiles = merged.filter((x) => {
          const name = String(x?.name || '').toLowerCase();
          const by = String(x?.by || '').toLowerCase();
          if (by === 'doctor') return false;
          if (name.includes('prescription')) return false;
          return true;
        });
        setChat(baseMsgs.map((it) => (typeof it === 'string' ? it : String(it?.text || ''))).filter(Boolean));
        setFiles(cleanFiles);
        setSymptoms(serverSymptoms || wrS || fuS || "");
        setSummary(serverSummary || String(fuS || ""));
      } catch (_) {
        setChat([]); setFiles([]); setSymptoms(""); setSummary("");
      }
      try {
        const prev = JSON.parse(localStorage.getItem(`wr_${id}_prevpres`) || "[]");
        const arr = (Array.isArray(prev) ? prev : []).filter((x) => String(x?.by || '').toLowerCase() === 'doctor' || String(x?.url || '').includes('/prescription/'));
        setPrevPres(arr);
      } catch (_) { setPrevPres([]); }
      setLoading(false);
    };
    load();
  }, [id]);

  useEffect(() => {
    try {
      const base = String(API.defaults.baseURL || "");
    const origin = (base.startsWith("/") || !base) ? window.location.origin : base.replace(/\/(api)?$/, "");
    const w = window;
    const onReady = () => {
      try {
        const socket = w.io ? w.io(origin, { transports: ["polling", "websocket"], auth: { token: localStorage.getItem("token") || "" } }) : null;
          if (socket) {
            socketRef.current = socket;
            socket.on('chat:new', (msg) => {
              try {
                const { apptId, actor, text, kind } = msg || {};
                if (String(apptId || '') !== String(id)) return;
                if (String(actor || '').toLowerCase() === 'doctor') return;
                
                let displayMsg = '';
                if (kind === 'pre') {
                  displayMsg = String(text || '').trim();
                } else if (kind === 'report') {
                  displayMsg = String(text || 'Report uploaded').trim();
                  // Re-fetch appointment to get new reports
                  API.get(`/appointments/${id}`).then(({ data }) => {
                    if (Array.isArray(data?.patientReports)) {
                      setFiles(data.patientReports.filter(x => String(x?.by || '').toLowerCase() !== 'doctor'));
                    }
                  }).catch(() => {});
                } else if (kind === 'details') {
                  API.get(`/appointments/${id}`).then(({ data }) => {
                    setAppt(data);
                    setSymptoms(String(data?.patientSymptoms || "").trim());
                    setSummary(String(data?.patientSummary || "").trim());
                  }).catch(() => {});
                }

                if (displayMsg) {
                  setChat((prev) => {
                    const next = [...prev, displayMsg];
                    try { localStorage.setItem(`wr_${id}_chat`, JSON.stringify(next)); } catch(_) {}
                    return next;
                  });
                }
              } catch (_) {}
            });
          }
        } catch(_) {}
      };
      if (!w.io) {
        const s = document.createElement('script');
        s.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        s.onload = onReady;
        document.body.appendChild(s);
        return () => { try { document.body.removeChild(s); } catch(_) {} try { socketRef.current && socketRef.current.close(); } catch(_) {} };
      } else {
        onReady();
        return () => { try { socketRef.current && socketRef.current.close(); } catch(_) {} };
      }
    } catch(_) { return () => {}; }
  }, []);

  const patientName = appt?.patient?.name || "";
  const patientGender = (() => {
    try {
      const p = appt?.patient || {};
      const pid = String(p._id || appt?.patient || "");
      const gender = p.gender || p.sex || (pid ? localStorage.getItem(`userGenderById_${pid}`) || "" : "");
      return String(gender || "").toLowerCase();
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

  const openFile = (u, name) => {
    try {
      const origin = String(API.defaults.baseURL || '').replace(/\/(api)?$/, '');
      const s0 = String(u || '');
      const s = (/^https?:\/\//.test(s0) || s0.startsWith('data:')) ? s0 : (s0.startsWith('/') ? (origin + s0) : s0);
      setFilePreview({ url: s, name: String(name || '') });
      setIsFullPreview(true);
    } catch (_) {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-4 relative">
      <div className="absolute inset-x-0 -top-6 h-20 bg-gradient-to-r from-indigo-100 via-purple-100 to-blue-100 blur-xl opacity-70 rounded-full pointer-events-none"></div>
      <div className="max-w-4xl mx-auto px-4">
        <div className="relative mb-10 text-center">
          <h2 className="inline-block px-8 py-3 text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10">
            Patient Documents
            <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
          </h2>
          <button onClick={() => nav('/doctor/appointments')} className="absolute right-0 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all duration-300">Back</button>
        </div>
        {loading && <div className="text-slate-600">Loading...</div>}
        {error && !loading && <div className="text-red-600 mb-3 text-sm">{error}</div>}
        {!loading && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="text-slate-900 font-semibold mb-1">Patient name</div>
                <div className="text-sm text-slate-900">{patientName || 'User'}</div>
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

            <div className="mt-4">
              <div className="text-slate-900 font-semibold mb-2">Pre-call chat</div>
              <div className="h-28 overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50">
                {chat.length === 0 ? (
                  <div className="text-slate-600 text-sm">No messages</div>
                ) : (
                  chat.map((m, idx) => (<div key={idx} className="text-sm text-slate-700">{m}</div>))
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Reply to patient"
                  maxLength={50}
                  className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
                <button
                  onClick={() => {
                    const t = String(chatText || '').trim().slice(0, 50);
                    if (!t) return;
                    const next = [...chat, t];
                    setChat(next);
                    try { localStorage.setItem(`wr_${id}_chat`, JSON.stringify(next)); } catch(_) {}
                    try { localStorage.setItem('lastChatApptId', String(id)); } catch(_) {}
                    try { const chan = new BroadcastChannel('chatmsg'); chan.postMessage({ apptId: String(id), actor: 'doctor', text: t }); chan.close(); } catch(_) {}
                    try { socketRef.current && socketRef.current.emit('chat:new', { apptId: String(id), actor: 'doctor', kind: 'pre', text: t }); } catch(_) {}
                    setChatText("");
                  }}
                  className="px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Send
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-slate-900 font-semibold mb-1">Medical reports uploaded</div>
              <div className="space-y-2">
                {files.length === 0 ? (
                  <div className="text-slate-600 text-sm">No reports uploaded</div>
                ) : (
                  files.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between border rounded-md p-2">
                      <div className="text-sm text-slate-700 truncate max-w-[12rem]">{f.name}</div>
                      <button onClick={() => openFile(f.url, f.name)} className="px-2 py-1 rounded-md border border-blue-200 text-blue-700 text-sm">Open</button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {filePreview && (
              <div className="mt-4 border rounded-xl">
                <div className="flex items-center justify-between p-2 border-b">
                  <div className="text-sm text-slate-900 truncate">{filePreview.name || 'Selected report'}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsFullPreview(true)} className="px-2 py-1 rounded-md border border-slate-300 text-xs">Full Screen</button>
                    <button onClick={() => setFilePreview(null)} className="px-2 py-1 rounded-md border border-slate-300 text-xs">Close Preview</button>
                  </div>
                </div>
                <div className="flex items-center justify-center p-2">
                  <img src={String(filePreview.url || '')} alt="" className="max-h-64 w-auto object-contain" />
                </div>
              </div>
            )}

            <div className="mt-4">
              <div className="text-slate-900 font-semibold mb-1">Previous prescriptions</div>
              <div className="space-y-2">
                {prevPres.length === 0 ? (
                  <div className="text-slate-600 text-sm">No previous prescriptions</div>
                ) : (
                  prevPres.map((x, idx) => (
                    <div key={idx} className="flex items-center justify-between border rounded-md p-2">
                      <div className="text-sm text-slate-700 truncate max-w-[12rem]">{x.name || 'Prescription'}</div>
                      <button onClick={() => { const u = String(x.url || ''); if (u.includes('/prescription/')) { const parts = u.split('/prescription/'); const pid = parts[1]; if (pid) nav(`/prescription/${pid}`); } else { setFilePreview({ url: x.url, name: x.name }); setIsFullPreview(true); } }} className="px-2 py-1 rounded-md border border-indigo-600 text-indigo-700 text-sm">Open</button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {isFullPreview && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl border border-slate-200 w-[95vw] max-w-lg h-[70vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="font-semibold text-slate-900">Report Preview</div>
                <button onClick={() => setIsFullPreview(false)} className="px-3 py-1 rounded-md border border-slate-300">Close</button>
              </div>
              <div className="p-4 flex-1 overflow-auto flex items-center justify-center">
                <img src={String(filePreview?.url || '')} alt="" className="max-h-[60vh] w-auto object-contain" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
