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
        const files = JSON.parse(localStorage.getItem(`wr_${id}_files`) || "[]");
        const server = Array.isArray(data?.patientReports) ? data.patientReports : [];
        const merged = [...(Array.isArray(files) ? files : []), ...server];
        const seen = new Set();
        const arr = [];
        for (const x of merged) {
          const key = `${String(x?.url || '')}|${String(x?.name || '')}`;
          if (!key || seen.has(key)) continue;
          seen.add(key);
          if (typeof x?.url === "string" && String(x.url).trim() !== "") arr.push(x);
        }
        setDetPrevFiles(arr);
      } catch (_) { setDetPrevFiles([]); }
        try {
          const msgs = JSON.parse(localStorage.getItem(`wr_${id}_chat`) || "[]");
          setDetChat(Array.isArray(msgs) ? msgs : []);
        } catch(_) { setDetChat([]); }
      } catch (e) {
        setError(e.response?.data?.message || e.message || "Failed to load appointment");
      }
      setLoading(false);
    };
    load();
  }, [id]);

  useEffect(() => {
    const cleanup = [];
    try {
      const origin = String(API.defaults.baseURL || "").replace(/\/(api)?$/, "");
      const w = window;
      const onReady = () => {
        try {
          const socket = w.io ? w.io(origin, { transports: ["websocket", "polling"] }) : null;
          if (socket) {
            socketRef.current = socket;
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
      const s = String(u || "");
      setFilePreview({ url: s, name: String(name || "") });
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
          <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Patient Details</div>
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
                <input value={detText} onChange={(e) => setDetText(e.target.value)} placeholder="Type a quick message" className="flex-1 border border-slate-300 rounded-md px-3 py-2" />
                <button
                  onClick={() => {
                    try {
                      const t = String(detText || '').trim();
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
                  const nextFiles = [...detPrevFiles, ...newItems];
                  setDetPrevFiles(nextFiles);
                  try { localStorage.setItem(`wr_${id}_files`, JSON.stringify(nextFiles)); } catch(_) {}
                  try { socketRef.current && socketRef.current.emit('chat:new', { apptId: id, actor: 'patient', kind: 'report', text: `Report uploaded (${filesSel.length})` }); } catch(_) {}
                  e.target.value = '';
                }}
              />
              <div className="space-y-2">
                {detPrevFiles.length === 0 ? (
                  <div className="text-slate-600 text-sm">No reports uploaded</div>
                ) : (
                  detPrevFiles.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between border rounded-md p-2">
                      <div className="text-sm text-slate-700 truncate max-w-[12rem]">{f.name}</div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openFile(f.url, f.name)} className="px-2 py-1 rounded-md border border-blue-200 text-blue-700 text-sm">Open</button>
                        <button
                          onClick={() => {
                            const nextFiles = detPrevFiles.filter((_, i) => i !== idx);
                            setDetPrevFiles(nextFiles);
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
