import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";

export default function AppointmentDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detEdit, setDetEdit] = useState(false);
  const [detSymptoms, setDetSymptoms] = useState("");
  const [detSummary, setDetSummary] = useState("");
  const [detPrevFiles, setDetPrevFiles] = useState([]);
  const [filePreview, setFilePreview] = useState(null);
  const [isFullPreview, setIsFullPreview] = useState(false);
  const [detChat, setDetChat] = useState([]);
  const [detText, setDetText] = useState("");
  const socketRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await API.get(`/appointments/${id}`);
        setAppt(data);
        try {
          const s = String(data?.patientSymptoms || localStorage.getItem(`wr_${id}_symptoms`) || "").trim();
          const sum = String(data?.patientSummary || localStorage.getItem(`fu_${id}_symptoms`) || "").trim();
          setDetSymptoms(s);
          setDetSummary(sum);
        } catch (_) {}
      try {
        const localFiles = JSON.parse(localStorage.getItem(`wr_${id}_files`) || "[]");
        const serverFiles = Array.isArray(data?.patientReports) ? data.patientReports : [];
        
        // Smart merge: prioritize server files, deduplicate by name
        const merged = [...serverFiles];
        const serverNames = new Set(serverFiles.map(f => String(f.name || '').toLowerCase()));
        
        if (Array.isArray(localFiles)) {
          for (const f of localFiles) {
            const name = String(f.name || '').toLowerCase();
            if (name && !serverNames.has(name)) {
              merged.push(f);
              serverNames.add(name);
            }
          }
        }
        setDetPrevFiles(merged);
        try { localStorage.setItem(`wr_${id}_files`, JSON.stringify(merged)); } catch(_) {}
      } catch (_) { setDetPrevFiles([]); }
        try {
          const msgs = JSON.parse(localStorage.getItem(`wr_${id}_chat`) || "[]");
          setDetChat(Array.isArray(msgs) ? msgs : []);
        } catch(_) { setDetChat([]); }
      } catch (e) {
        if (e.message === 'canceled') return;
        setError(e.response?.data?.message || e.message || "Failed to load appointment");
      }
      setLoading(false);
    };
    load();
  }, [id]);

  useEffect(() => {
    const cleanup = [];
    try {
      const base = String(API.defaults.baseURL || "");
      const origin = (base.startsWith("/") || !base) ? window.location.origin : base.replace(/\/(api)?$/, "");
      const w = window;
      const onReady = () => {
        try {
          const socket = w.io ? w.io(origin, { transports: ["polling", "websocket"], auth: { token: localStorage.getItem('token') || '' } }) : null;
          if (socket) {
            socketRef.current = socket;
            socket.on('chat:new', (msg) => {
              try {
                const { apptId, actor, text, kind } = msg || {};
                if (String(apptId || '') !== String(id)) return;
                if (String(actor || '').toLowerCase() === 'patient') return;
                
                if (kind === 'pre') {
                  const t = String(text || '').trim();
                  if (t) {
                    setDetChat((prev) => {
                      const next = [...prev, t];
                      try { localStorage.setItem(`wr_${id}_chat`, JSON.stringify(next)); } catch(_) {}
                      return next;
                    });
                  }
                } else if (kind === 'details') {
                  API.get(`/appointments/${id}`).then(({ data }) => {
                    setAppt(data);
                    setDetSymptoms(String(data?.patientSymptoms || "").trim());
                    setDetSummary(String(data?.patientSummary || "").trim());
                  }).catch(() => {});
                }
              } catch (_) {}
            });
            cleanup.push(() => { try { socket.close(); } catch(_) {} });
          }
        } catch(_) {}
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
    } catch(_) {}
    return () => { cleanup.forEach((fn) => fn()); };
  }, []);

  const submit = async () => {
    try {
      const d = appt || {};
      await API.put(`/appointments/${id}/patient-details`, {
        symptoms: detSymptoms,
        summary: detSummary,
        date: d.date,
        startTime: d.startTime,
        doctorId: String(d.doctor?._id || d.doctor || ""),
        reports: detPrevFiles,
      });
      try {
        localStorage.setItem(`wr_${id}_symptoms`, String(detSymptoms || ""));
        localStorage.setItem(`fu_${id}_symptoms`, String(detSummary || ""));
      } catch (_) {}
      try {
        socketRef.current && socketRef.current.emit('chat:new', { apptId: id, actor: 'patient', kind: 'details', text: 'Details updated' });
      } catch (_) {}
      alert("Updated");
    } catch (e) {
      try {
        if (e?.response?.status === 404) {
          const d = appt || {};
          await API.put(`/appointments/patient-details`, {
            symptoms: detSymptoms,
            summary: detSummary,
            date: d.date,
            startTime: d.startTime,
            doctorId: String(d.doctor?._id || d.doctor || ""),
            reports: detPrevFiles,
          });
          try {
        localStorage.setItem(`wr_${id}_symptoms`, String(detSymptoms || ""));
        localStorage.setItem(`fu_${id}_symptoms`, String(detSummary || ""));
      } catch (_) {}
      try {
        socketRef.current && socketRef.current.emit('chat:new', { apptId: id, actor: 'patient', kind: 'details', text: 'Details updated' });
      } catch (_) {}
      alert("Updated");
          return;
        }
      } catch (e2) {
        alert(e2.response?.data?.message || e2.message || "Failed to save");
        return;
      }
      alert(e.response?.data?.message || e.message || "Failed to save");
    }
  };

  const openFile = (u, name) => {
    try {
      const origin = String(API.defaults.baseURL || '').replace(/\/(api)?$/, '');
      const s0 = String(u || '');
      const s = (/^https?:\/\//.test(s0) || s0.startsWith('data:')) ? s0 : (origin + (s0.startsWith('/') ? s0 : ('/' + s0)));
      setFilePreview({ url: s, name: String(name || '') });
      setIsFullPreview(true);
    } catch (_) {}
  };

  const patientName = appt?.patient?.name || "";
  const patientGender = (() => {
    try {
      const p = appt?.patient || {};
      const pid = String(p._id || localStorage.getItem("userId") || "");
      const gender = p.gender || p.sex || (pid ? localStorage.getItem(`userGenderById_${pid}`) || "" : "");
      return String(gender || "").toLowerCase();
    } catch (_) { return ""; }
  })();
  const patientAge = (() => {
    try {
      const p = appt?.patient || {};
      const pid = String(p._id || localStorage.getItem("userId") || "");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-4xl mx-auto pt-8 px-4">
        <div className="flex items-center justify-between mb-6">
        <div className="relative mb-10 text-center">
          <h1 className="inline-block px-8 py-3 text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10">
            Patient Details
            <div className="absolute -bottom-1 left-0 right-0 h-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
          </h1>
        </div>
          <button onClick={() => nav('/appointments')} className="px-4 py-2 rounded-md border border-slate-300">Back</button>
        </div>
        {loading && <div className="text-slate-600">Loading...</div>}
        {error && !loading && <div className="text-red-600 mb-3 text-sm">{error}</div>}
        {!loading && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl p-6">
            <div className="grid sm:grid-cols-2 gap-4">
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

            <div className="mt-4">
              <div className="text-slate-900 font-semibold mb-1">Health issue summary</div>
              {detEdit ? (
                <textarea rows={3} value={detSummary} onChange={(e) => setDetSummary(e.target.value)} className="w-full border border-blue-200 rounded-xl p-3 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Provide a brief summary" />
              ) : (
                <div className="text-sm text-slate-800 whitespace-pre-wrap bg-blue-50/50 rounded-xl p-3">{String(detSummary || '').trim() || '--'}</div>
              )}
            </div>

            <div className="mt-4">
              <div className="text-slate-900 font-semibold mb-2">Pre-call chat</div>
              <div className="h-28 overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50">
                {detChat.length === 0 ? (
                  <div className="text-slate-600 text-sm">No messages</div>
                ) : (
                  detChat.map((m, idx) => (<div key={idx} className="text-sm text-slate-700">{m}</div>))
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <input 
                  value={detText} 
                  onChange={(e) => setDetText(e.target.value)} 
                  placeholder="Type a quick message" 
                  maxLength={50}
                  className="flex-1 border border-slate-300 rounded-md px-3 py-2" 
                />
                <button
                  onClick={() => {
                    try {
                      const t = String(detText || '').trim().slice(0, 50);
                      if (!t) return;
                      const k = `wr_${id}_chat`;
                      const arr = JSON.parse(localStorage.getItem(k) || '[]');
                      const next = (Array.isArray(arr) ? arr : []).concat(t);
                      localStorage.setItem(k, JSON.stringify(next));
                      setDetChat(next);
                      setDetText('');
                      try { socketRef.current && socketRef.current.emit('chat:new', { apptId: id, actor: 'patient', kind: 'pre', text: t }); } catch(_) {}
                    } catch(_) {}
                  }}
                  className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Send
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-slate-900 font-semibold mb-1">Medical reports uploaded</div>
              <div className="group relative mb-2">
                <input
                  id="report-upload-appt-details"
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
                     try { localStorage.setItem(`wr_${id}_files`, JSON.stringify(nextFiles)); } catch(_) {}
                     try { socketRef.current && socketRef.current.emit('chat:new', { apptId: id, actor: 'patient', kind: 'report', text: `Report uploaded (${files.length})` }); } catch(_) {}
                     try {
                       const d = appt || {};
                       await API.put(`/appointments/${id}/patient-details`, {
                         symptoms: detSymptoms,
                         summary: detSummary,
                         date: d.date,
                         startTime: d.startTime,
                         doctorId: String(d.doctor?._id || d.doctor || ""),
                         reports: nextFiles,
                       });
                     } catch (_) {}
                     e.target.value = '';
                   }}
                />
                <label
                  htmlFor="report-upload-appt-details"
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
              <div className="space-y-2">
                {detPrevFiles.length === 0 ? (
                  <div className="text-slate-600 text-sm italic px-1">No reports uploaded yet</div>
                ) : (
                  detPrevFiles.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between border border-blue-100 rounded-xl p-3 bg-white/80 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 min-w-0">
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
                          <div className="text-sm font-medium text-slate-900 truncate">{f.name}</div>
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
                            try { localStorage.setItem(`wr_${id}_files`, JSON.stringify(nextFiles)); } catch(_) {}
                            try {
                              const d = appt || {};
                              await API.put(`/appointments/${id}/patient-details`, {
                                symptoms: detSymptoms,
                                summary: detSummary,
                                date: d.date,
                                startTime: d.startTime,
                                doctorId: String(d.doctor?._id || d.doctor || ""),
                                reports: nextFiles,
                              });
                            } catch (_) {}
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

            <div className="mt-6 flex items-center gap-3">
              <button onClick={submit} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white">Submit</button>
              <div className="text-xs text-slate-600">Only visible to doctor</div>
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
