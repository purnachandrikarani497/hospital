import { useEffect, useState } from "react";
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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await API.get(`/appointments/${id}`);
        setAppt(data);
      } catch (e) {
        setError(e.response?.data?.message || e.message || "Failed to load appointment");
      }
      try {
        const wrMsgs = JSON.parse(localStorage.getItem(`wr_${id}_chat`) || "[]");
        const wrF = JSON.parse(localStorage.getItem(`wr_${id}_files`) || "[]");
        const fuF = JSON.parse(localStorage.getItem(`fu_${id}_files`) || "[]");
        const wrS = String(localStorage.getItem(`wr_${id}_symptoms`) || "");
        const fuS = String(localStorage.getItem(`fu_${id}_symptoms`) || "");
        const baseMsgs = Array.isArray(wrMsgs) ? wrMsgs : [];
        const merged = ([]).concat(Array.isArray(wrF) ? wrF : [], Array.isArray(fuF) ? fuF : []);
        const uniq = [];
        const seen = new Set();
        for (const x of Array.isArray(merged) ? merged : []) {
          const key = `${String(x?.url || '')}|${String(x?.name || '')}`;
          if (!key || seen.has(key)) continue;
          seen.add(key);
          uniq.push(x);
        }
        const cleanFiles = uniq.filter((x) => {
          const name = String(x?.name || '').toLowerCase();
          const by = String(x?.by || '').toLowerCase();
          if (by === 'doctor') return false;
          if (name.includes('prescription')) return false;
          return true;
        });
        setChat(baseMsgs.map((it) => (typeof it === 'string' ? it : String(it?.text || ''))).filter(Boolean));
        setFiles(cleanFiles);
        setSymptoms(wrS || fuS || "");
        setSummary(String(fuS || ""));
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
      const s = String(u || '');
      setFilePreview({ url: s, name: String(name || '') });
      setIsFullPreview(true);
    } catch (_) {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-4xl mx-auto pt-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Patient Documents</div>
          <button onClick={() => nav('/doctor/appointments')} className="px-4 py-2 rounded-md border border-slate-300">Back</button>
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
                  className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
                <button
                  onClick={() => {
                    const t = chatText.trim();
                    if (!t) return;
                    const next = [...chat, t];
                    setChat(next);
                    try { localStorage.setItem(`wr_${id}_chat`, JSON.stringify(next)); } catch(_) {}
                    try { localStorage.setItem('lastChatApptId', String(id)); } catch(_) {}
                    try { const chan = new BroadcastChannel('chatmsg'); chan.postMessage({ apptId: String(id), actor: 'doctor', text: t }); chan.close(); } catch(_) {}
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
