import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import API from "../api";

export default function Prescription() {
  const { id } = useParams();
  const location = useLocation();
  const nav = useNavigate();
  const [appt, setAppt] = useState(null);
  const [profile, setProfile] = useState(null);
  const [edit, setEdit] = useState(false);
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [tests, setTests] = useState("");
  const [observations, setObservations] = useState("");
  const [medicines, setMedicines] = useState("");
  const [dosage, setDosage] = useState("");
  const [duration, setDuration] = useState("");
  const [route, setRoute] = useState("");
  const [food, setFood] = useState("");
  const [notes, setNotes] = useState("");
  const [advice, setAdvice] = useState("");
  const [medRows, setMedRows] = useState([
    { name: "", morning: false, afternoon: false, night: false, food: "", days: "" }
  ]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await API.get(`/appointments/${id}`);
        setAppt(data);
        const docId = String(data?.doctor?._id || data?.doctor || "");
        if (docId) {
          try {
            const profs = await API.get(`/doctors?user=${docId}`);
            const first = Array.isArray(profs?.data) ? profs.data[0] : null;
            setProfile(first || null);
          } catch (_) {}
        }
      } catch (e) {
        alert(e.response?.data?.message || e.message);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("print") === "1") {
      const t = setTimeout(() => { try { window.print(); } catch(_) {} }, 300);
      return () => clearTimeout(t);
    }
  }, [location.search]);

  useEffect(() => {
    const onMsg = (e) => {
      try {
        const ok = e && e.origin === window.location.origin;
        const typ = e && (e.data?.type || e.data);
        if (!ok) return;
        if (typ === 'PRINT') {
          setTimeout(() => { try { window.print(); } catch(_) {} }, 0);
        } else if (typ === 'DOWNLOAD') {
          downloadPdfDirect();
        }
      } catch(_) {}
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const isEmbed = useMemo(() => {
    try { return new URLSearchParams(location.search).get('embed') === '1'; } catch(_) { return false; }
  }, [location.search]);

  const clinicName = useMemo(() => String(profile?.clinic?.name || "").trim(), [profile]);
  const clinicCity = useMemo(() => String(profile?.clinic?.city || "").trim(), [profile]);
  const doctorName = useMemo(() => `Dr. ${appt?.doctor?.name || ''}`, [appt]);
  const patientName = useMemo(() => {
    if (appt?.beneficiaryType === 'family' && appt?.beneficiaryName) {
      return String(appt.beneficiaryName).trim();
    }
    return String(appt?.patient?.name || "").trim();
  }, [appt]);
  const when = useMemo(() => `${appt?.date || ''} ${appt?.startTime || ''}-${appt?.endTime || ''}`, [appt]);
  const doctorQuals = useMemo(() => (Array.isArray(profile?.qualifications) ? profile.qualifications.join(', ') : ''), [profile]);
  const doctorSpecs = useMemo(() => (Array.isArray(profile?.specializations) ? profile.specializations.join(', ') : ''), [profile]);
  const patientAge = useMemo(() => {
    try {
      if (appt?.patient?.birthday) {
        const birthDate = new Date(appt.patient.birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        if (age >= 0) return String(age);
      }
      const pid = String(appt?.patient?._id || appt?.patient || '');
      const val = localStorage.getItem(`userAgeById_${pid}`) || '';
      return String(val || '').trim();
    } catch(_) { return ''; }
  }, [appt]);
  const patientGender = useMemo(() => {
    try {
      if (appt?.patient?.gender) {
        return String(appt.patient.gender).trim();
      }
      const pid = String(appt?.patient?._id || appt?.patient || '');
      const val = localStorage.getItem(`userGenderById_${pid}`) || '';
      return String(val || '').trim();
    } catch(_) { return ''; }
  }, [appt]);
  const apptType = useMemo(() => String(appt?.type || '').trim(), [appt]);
  const symptomsText = useMemo(() => {
    const s1 = String(appt?.patientSymptoms || '').trim();
    const s2 = String(appt?.patientSummary || '').trim();
    return s1 || s2 || '';
  }, [appt]);

  const parsed = useMemo(() => {
    const src = String(appt?.prescriptionText || '').split(/\n+/).map((l) => l.trim());
    const getVal = (label) => {
      const row = src.find((x) => x.toLowerCase().startsWith(label.toLowerCase()));
      if (!row) return '';
      const parts = row.split(':');
      return String(parts.slice(1).join(':') || '').trim();
    };
    const obj = {
      complaint: getVal('Complaint'),
      medicines: getVal('Medicines'),
      dosage: getVal('Dosage'),
      duration: getVal('Duration'),
      tests: getVal('Investigations Suggested') || getVal('Tests'),
      observations: getVal('Observations'),
      diagnosis: getVal('Diagnosis'),
      route: getVal('Measure') || getVal('Route'),
      food: getVal('Instructions') || getVal('Before/After food') || getVal('Food'),
      advice: getVal('Lifestyle advice') || getVal('Advice'),
      notes: getVal('Remarks') || getVal('Notes'),
      medListText: getVal('Medicines List')
    };
    try {
      const segs = String(obj.medListText || '').split(';').map((s) => s.trim()).filter(Boolean);
      obj.medListRows = segs.map((seg) => {
        const tokens = seg.split('|').map((t) => t.trim()).filter(Boolean);
        const r = { name: '', morning: false, afternoon: false, night: false, food: '', days: '' };
        tokens.forEach((t, i) => {
          if (i === 0) { r.name = t; return; }
          const low = t.toLowerCase();
          if (low.includes('morning')) r.morning = true;
          if (low.includes('afternoon')) r.afternoon = true;
          if (low.includes('night')) r.night = true;
          const mDays = t.match(/^(\d+)\s*days?$/i);
          if (mDays) { r.days = mDays[1]; return; }
          if (low.includes('before') || low.includes('after')) r.food = t;
        });
        return r;
      });
    } catch(_) {}
    return obj;
  }, [appt]);

  const followUpDate = useMemo(() => {
    try {
      const d = new Date(appt?.date || '');
      if (Number.isNaN(d.getTime())) return '';
      d.setDate(d.getDate() + 5);
      return d.toISOString().slice(0, 10);
    } catch(_) { return ''; }
  }, [appt]);

  useEffect(() => {
    setSymptoms(parsed.complaint || symptomsText || '');
    setDiagnosis(parsed.diagnosis || '');
    setTests(parsed.tests || '');
    setObservations(parsed.observations || '');
    setMedicines(parsed.medicines || '');
    setDosage(parsed.dosage || '');
    setDuration(parsed.duration || '');
    setRoute(parsed.route || '');
    setFood(parsed.food || '');
    setAdvice(parsed.advice || '');
    setNotes(parsed.notes || '');
  }, [appt, symptomsText, parsed]);

  useEffect(() => {
    try {
      const hasDefault = Array.isArray(medRows) && medRows.length === 1 && !medRows[0].name && !medRows[0].morning && !medRows[0].afternoon && !medRows[0].night && !medRows[0].food && !medRows[0].days;
      const rows = Array.isArray(parsed.medListRows) ? parsed.medListRows : [];
      if (hasDefault && rows.length) setMedRows(rows);
    } catch(_) {}
  }, [parsed, edit]);

  const isDoctorUser = useMemo(() => {
    try {
      const uid = localStorage.getItem('userId') || '';
      const did = String(appt?.doctor?._id || appt?.doctor || '');
      return !!uid && uid === did;
    } catch(_) { return false; }
  }, [appt]);

  // If patient tries to view unshared prescription
  if (appt && !isDoctorUser && !appt.isPrescriptionShared) {
     // Check if user is patient
     const user = JSON.parse(localStorage.getItem('user') || '{}');
     if (user.role === 'patient') {
        return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11 3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Prescription Not Available</h2>
              <p className="text-slate-600 mb-6">The doctor has not shared the prescription yet. Please check back later or contact the clinic.</p>
              <button onClick={() => nav(-1)} className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Go Back</button>
            </div>
          </div>
        );
     }
  }

  const pdfRef = useRef(null);

  const downloadPdfDirect = async () => {
    try {
      const loadScript = (src) => new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src; s.async = true;
        s.onload = () => resolve();
        s.onerror = (e) => reject(e);
        document.body.appendChild(s);
      });
      const container = pdfRef.current && pdfRef.current.parentElement;
      if (!pdfRef.current || !container) { alert('Preparing PDF failed'); return; }
      const prev = container.style.display;
      container.style.display = 'block';
      await new Promise((r) => setTimeout(r, 50));
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      const canvas = await window.html2canvas(pdfRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) { throw new Error('PDF engine not available'); }
      const doc = new jsPDF('p', 'mm', 'a4');
      const pdfW = doc.internal.pageSize.getWidth();
      const pdfH = pdfW * canvas.height / canvas.width;
      doc.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      const fname = `${(patientName || 'Prescription').replace(/[^a-z0-9_\- ]/gi, '')}-${String(appt?.date || '').replace(/[^0-9\-]/g, '') || ''}.pdf`;
      doc.save(fname);
      container.style.display = prev || 'none';
    } catch (e) {
      try { const params = new URLSearchParams(location.search); if (params.get('print') !== '1') window.print(); } catch(_) {}
      alert('Failed to download PDF');
    }
  };

  return (
    <>
    <div className={`screen-only bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative ${isEmbed ? 'pt-0' : 'pt-4'}`}>
      {!isEmbed && <div className="absolute inset-x-0 -top-6 h-20 bg-gradient-to-r from-indigo-100 via-purple-100 to-blue-100 blur-xl opacity-70 rounded-full pointer-events-none"></div>}
      <div className={`${isEmbed ? 'w-full' : 'max-w-4xl mx-auto px-4'}`}>
        {!isEmbed && (
          <div className="relative mb-10 text-center">
            <h2 className="inline-block px-8 py-3 text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10">
              Prescription
              <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
            </h2>
            <button onClick={() => nav(-1)} className="absolute right-0 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all duration-300">Back</button>
          </div>
        )}
        <div className={`bg-white/90 backdrop-blur-sm shadow-2xl p-6 ${isEmbed ? 'rounded-none border-none' : 'rounded-2xl border border-white/30'}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h3 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{clinicName || 'Clinic/Hospital'}</h3>
            <div className="text-right">
              <div className="text-slate-900 font-semibold">{doctorName}</div>
            </div>
          </div>
          {appt ? (
            <div className="mt-4">
              <div className="flex items-start">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{clinicName || 'Clinic/Hospital'}</div>
                  <div className="text-slate-700 text-sm">{clinicCity}</div>
                </div>
              </div>
              <div className="my-3 border-t border-blue-200/50" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm text-slate-700">
                <div>Patient: <span className="text-slate-900">{patientName || '--'}</span></div>
                <div>Date: <span className="text-slate-900">{when}</span></div>
              </div>

          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-slate-900 font-semibold">Doctor Details</div>
              <div className="text-sm text-slate-700">Name: <span className="text-slate-900">{doctorName || '--'}</span></div>
              {doctorQuals && (<div className="text-sm text-slate-700">Qualification: <span className="text-slate-900">{doctorQuals}</span></div>)}
              <div className="text-sm text-slate-700">Specialization: <span className="text-slate-900">{doctorSpecs || '--'}</span></div>
              
            </div>
            <div className="space-y-2">
              <div className="text-slate-900 font-semibold">Patient Details</div>
              <div className="text-sm text-slate-700">Name: <span className="text-slate-900">{patientName || '--'}</span></div>
              <div className="text-sm text-slate-700">Age: <span className="text-slate-900">{patientAge || '--'}</span></div>
              <div className="text-sm text-slate-700">Consultation Date: <span className="text-slate-900">{when || '--'}</span></div>
              <div className="text-sm text-slate-700">Appointment Type: <span className="text-slate-900">{apptType ? (apptType === 'online' ? 'Online' : 'Offline') : '--'}</span></div>
            </div>
          </div>

        <div className="mt-6">
          <div className="text-slate-900 font-semibold">Complaint</div>
          {edit ? (
            <textarea rows={3} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className="w-full border border-blue-200 rounded-xl p-3 text-sm mt-2 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300 break-words overflow-x-hidden resize-y" placeholder="Enter complaint" />
          ) : (
            <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap break-words border border-blue-200 rounded-xl p-3 bg-blue-50/50">{parsed.complaint || symptomsText}</div>
          )}
        </div>

        <div className="mt-6">
          <div className="text-slate-900 font-semibold">Observations</div>
          {edit ? (
            <textarea rows={3} value={observations} onChange={(e) => setObservations(e.target.value)} className="w-full border border-blue-200 rounded-xl p-3 text-sm mt-2 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300 break-words overflow-x-hidden resize-y" placeholder="Enter observations" />
          ) : (
            <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap break-words border border-blue-200 rounded-xl p-3 bg-blue-50/50">{parsed.observations}</div>
          )}
        </div>

        <div className="mt-6">
          <div className="text-slate-900 font-semibold">Investigations Suggested</div>
          {edit ? (
            <textarea rows={2} value={tests} onChange={(e) => setTests(e.target.value)} className="w-full border border-blue-200 rounded-xl p-3 text-sm mt-2 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300 break-words overflow-x-hidden resize-y" placeholder="e.g., CBC, LFT" />
          ) : (
            <div className="mt-2 text-sm text-slate-800 break-words border border-blue-200 rounded-xl p-3 bg-blue-50/50">{parsed.tests}</div>
          )}
        </div>

        <div className="mt-6">
          <div className="text-slate-900 font-semibold">Diagnosis</div>
          {edit ? (
            <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm mt-2 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300 break-words" placeholder="Enter diagnosis" />
          ) : (
            <div className="mt-2 text-sm text-slate-800 break-words border border-blue-200 rounded-xl p-3 bg-blue-50/50">{parsed.diagnosis}</div>
          )}
        </div>

        <div className="mt-6">
          <div className="text-slate-900 font-semibold">Medicines</div>
          <div className="mt-2 hidden sm:block overflow-x-auto">
            <table className="min-w-full text-left rounded-xl overflow-hidden border border-blue-200">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-3 py-2 border-b border-blue-200">Medicine</th>
                  <th className="px-3 py-2 border-b border-blue-200">Morning</th>
                  <th className="px-3 py-2 border-b border-blue-200">Afternoon</th>
                  <th className="px-3 py-2 border-b border-blue-200">Night</th>
                  <th className="px-3 py-2 border-b border-blue-200">Food</th>
                  <th className="px-3 py-2 border-b border-blue-200">Days</th>
                </tr>
              </thead>
              <tbody>
                {medRows.map((m, idx) => (
                  <tr key={idx} className="odd:bg-white even:bg-blue-50/30">
                    <td className="px-3 py-2 border-b border-blue-200">
                      <input
                        value={m.name}
                        onChange={(e) => {
                          const next = [...medRows];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setMedRows(next);
                        }}
                        readOnly={!edit}
                        placeholder="Medicine name"
                        className="w-full border border-blue-200 rounded-xl px-2 py-1 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </td>
                    <td className="px-3 py-2 border-b border-blue-200 text-center">
                      <input type="checkbox" checked={!!m.morning} onChange={(e) => {
                        const next = [...medRows];
                        next[idx] = { ...next[idx], morning: e.target.checked };
                        setMedRows(next);
                      }} disabled={!edit} />
                    </td>
                    <td className="px-3 py-2 border-b border-blue-200 text-center">
                      <input type="checkbox" checked={!!m.afternoon} onChange={(e) => {
                        const next = [...medRows];
                        next[idx] = { ...next[idx], afternoon: e.target.checked };
                        setMedRows(next);
                      }} disabled={!edit} />
                    </td>
                    <td className="px-3 py-2 border-b border-blue-200 text-center">
                      <input type="checkbox" checked={!!m.night} onChange={(e) => {
                        const next = [...medRows];
                        next[idx] = { ...next[idx], night: e.target.checked };
                        setMedRows(next);
                      }} disabled={!edit} />
                    </td>
                    <td className="px-3 py-2 border-b border-blue-200">
                      <input
                        value={m.food}
                        onChange={(e) => {
                          const next = [...medRows];
                          next[idx] = { ...next[idx], food: e.target.value };
                          setMedRows(next);
                        }}
                        readOnly={!edit}
                        placeholder="Before/After"
                        className="w-full border border-blue-200 rounded-xl px-2 py-1 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </td>
                    <td className="px-3 py-2 border-b border-blue-200">
                      <input
                        value={m.days}
                        onChange={(e) => {
                          const next = [...medRows];
                          next[idx] = { ...next[idx], days: e.target.value };
                          setMedRows(next);
                        }}
                        readOnly={!edit}
                        className="w-full border border-blue-200 rounded-xl px-2 py-1 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 sm:hidden space-y-3">
            {medRows.map((m, idx) => (
              <div key={idx} className="border border-blue-200 rounded-xl bg-white/90 p-3">
                <label className="text-xs text-slate-600">Medicine</label>
                <input
                  value={m.name}
                  onChange={(e) => {
                    const next = [...medRows];
                    next[idx] = { ...next[idx], name: e.target.value };
                    setMedRows(next);
                  }}
                  readOnly={!edit}
                  placeholder="Medicine name"
                  className="mt-1 w-full border border-blue-200 rounded-xl px-2 py-1 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!m.morning} onChange={(e) => { const next = [...medRows]; next[idx] = { ...next[idx], morning: e.target.checked }; setMedRows(next); }} disabled={!edit} /><span>Morning</span></label>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!m.afternoon} onChange={(e) => { const next = [...medRows]; next[idx] = { ...next[idx], afternoon: e.target.checked }; setMedRows(next); }} disabled={!edit} /><span>Afternoon</span></label>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!m.night} onChange={(e) => { const next = [...medRows]; next[idx] = { ...next[idx], night: e.target.checked }; setMedRows(next); }} disabled={!edit} /><span>Night</span></label>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-600">Food</label>
                    <input
                      value={m.food}
                      onChange={(e) => { const next = [...medRows]; next[idx] = { ...next[idx], food: e.target.value }; setMedRows(next); }}
                      readOnly={!edit}
                      placeholder="Before/After"
                      className="mt-1 w-full border border-blue-200 rounded-xl px-2 py-1 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Days</label>
                    <input
                      value={m.days}
                      onChange={(e) => { const next = [...medRows]; next[idx] = { ...next[idx], days: e.target.value }; setMedRows(next); }}
                      readOnly={!edit}
                      className="mt-1 w-full border border-blue-200 rounded-xl px-2 py-1 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {edit && (
            <button
              type="button"
              onClick={() => setMedRows((prev) => prev.concat({ name: "", morning: false, afternoon: false, night: false, food: "", days: "" }))}
              className="mt-2 px-3 py-2 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              Add Medicine
            </button>
          )}
        </div>

        {(edit || parsed.advice) && (
          <div className="mt-6">
            <div className="text-slate-900 font-semibold">Advice / Instructions</div>
            {edit ? (
              <textarea rows={2} value={advice} onChange={(e) => setAdvice(e.target.value)} className="w-full border border-blue-200 rounded-xl p-3 text-sm mt-2 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300 break-words overflow-x-hidden resize-y" placeholder="Advice / Instructions" />
            ) : (
              <div className="mt-2 text-sm text-slate-800 break-words border border-blue-200 rounded-xl p-3 bg-blue-50/50">{parsed.advice}</div>
            )}
          </div>
        )}

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-slate-900 font-semibold">Next follow-up date</div>
            <div className="mt-2 text-sm text-slate-800 border border-blue-200 rounded-xl p-3 bg-blue-50/50">
              <div><span className="text-slate-900">{followUpDate}</span></div>
            </div>
          </div>
          <div className="flex items-center justify-end">
            <div className="text-right">
              <div className="text-slate-700 text-sm">Digital signature</div>
              <div className="text-slate-900 font-semibold">{doctorName}</div>
            </div>
          </div>
        </div>
        
        
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-2">
          {isDoctorUser && (
            <button onClick={() => setEdit((v) => !v)} className="w-full sm:w-auto px-3 py-2 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 text-center">{edit ? 'Cancel Edit' : 'Edit'}</button>
          )}
          {edit && isDoctorUser && (
            <button
              onClick={async () => {
                const parts = [
                  symptoms ? `Complaint: ${symptoms}` : '',
                  observations ? `Observations: ${observations}` : '',
                  diagnosis ? `Diagnosis: ${diagnosis}` : '',
                  tests ? `Investigations Suggested: ${tests}` : '',
                  medicines ? `Medicines: ${medicines}` : '',
                  dosage ? `Dosage: ${dosage}` : '',
                  duration ? `Duration: ${duration}` : '',
                  route ? `Measure: ${route}` : '',
                  food ? `Instructions: ${food}` : '',
                  advice ? `Lifestyle advice: ${advice}` : '',
                  notes ? `Remarks: ${notes}` : '',
                  (Array.isArray(medRows) && medRows.length) ? `Medicines List: ${medRows.map((m) => {
                    const items = [];
                    if (m.name) items.push(m.name);
                    const times = [m.morning ? 'Morning' : '', m.afternoon ? 'Afternoon' : '', m.night ? 'Night' : ''].filter(Boolean).join(', ');
                    if (times) items.push(times);
                    if (m.food) items.push(m.food);
                    if (m.days) items.push(`${m.days} days`);
                    return items.join(' | ');
                  }).filter(Boolean).join('; ')}` : ''
                ].filter(Boolean);
                const text = parts.join('\n');
                try {
                  await API.post(`/appointments/${id}/prescription`, { text, notify: false, isPrescriptionShared: false });
                  setAppt((prev) => (prev ? ({ ...(prev || {}), prescriptionText: text, isPrescriptionShared: false }) : prev));
                  alert('Updated');
                } catch (e) {
                  alert(e.response?.data?.message || e.message || 'Failed to update');
                }
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-center"
            >
              Save
            </button>
          )}
          {!isEmbed && (
            <>
              <button type="button"
                onClick={() => {
                  try {
                    if (window.opener && !window.opener.closed) { window.close(); return; }
                  } catch (_) {}
                  try {
                    nav(-1);
                    setTimeout(() => {
                      try {
                        const path = String(window.location.pathname || '');
                        if (path.includes('/prescription/')) nav('/appointments');
                      } catch (_) { nav('/appointments'); }
                    }, 150);
                  } catch (_) {
                    nav('/appointments');
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 text-center"
              >
                Close
              </button>
              <button type="button" onClick={downloadPdfDirect} className="w-full sm:w-auto px-4 py-2 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 text-center">Download PDF</button>
              {isDoctorUser && (
                <button
                  onClick={async () => {
                    const key = String(id);
                    const viewUrl = `${window.location.origin}/prescription/${id}`;
                    const parts = [
                      symptoms ? `Complaint: ${symptoms}` : '',
                      observations ? `Observations: ${observations}` : '',
                      diagnosis ? `Diagnosis: ${diagnosis}` : '',
                      tests ? `Investigations Suggested: ${tests}` : '',
                      medicines ? `Medicines: ${medicines}` : '',
                      dosage ? `Dosage: ${dosage}` : '',
                      duration ? `Duration: ${duration}` : '',
                      route ? `Measure: ${route}` : '',
                      food ? `Instructions: ${food}` : '',
                      advice ? `Lifestyle advice: ${advice}` : '',
                      notes ? `Remarks: ${notes}` : '',
                      (Array.isArray(medRows) && medRows.length) ? `Medicines List: ${medRows.map((m) => {
                        const items = [];
                        if (m.name) items.push(m.name);
                        const times = [m.morning ? 'Morning' : '', m.afternoon ? 'Afternoon' : '', m.night ? 'Night' : ''].filter(Boolean).join(', ');
                        if (times) items.push(times);
                        if (m.food) items.push(m.food);
                        if (m.days) items.push(`${m.days} days`);
                        return items.join(' | ');
                      }).filter(Boolean).join('; ')}` : ''
                    ].filter(Boolean);
                    const text = parts.join('\n');
                    try {
                        const prev = JSON.parse(localStorage.getItem(`wr_${key}_prevpres`) || '[]');
                        const label = `Prescription ${when}`;
                        const item = { name: label, url: viewUrl, by: "doctor" };
                        const next = Array.isArray(prev) ? [...prev, item] : [item];
                        localStorage.setItem(`wr_${key}_prevpres`, JSON.stringify(next));
                        try { const chan = new BroadcastChannel('prescriptions'); chan.postMessage({ id: key, item }); chan.close(); } catch (_) {}
                      } catch (_) {}
                      try { await API.post(`/appointments/${id}/prescription`, { text, notify: true, isPrescriptionShared: true }); } catch (_) {}
                      try {
                        if (navigator.share) {
                          await navigator.share({ title: 'Prescription', url: viewUrl });
                        } else {
                          await navigator.clipboard.writeText(viewUrl);
                        }
                      } catch (_) {}
                      alert('Sent to Prescriptions')
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-center"
                  >
                    Share
                  </button>
              )}
            </>
          )}
        </div>
              </div>
          ) : (
            <p className="text-slate-600 mt-3">Loading...</p>
          )}
        </div>
      </div>
    </div>
    <div className="print-only">
      <div className="presc-a4" ref={pdfRef}>
        <div className="presc-header">
          <div className="presc-logo">
            <Logo size={48} />
          </div>
          <div className="presc-title">
            <div className="presc-doc-name">{doctorName || 'Dr. Doctor Name'}</div>
            <div className="presc-qual">{doctorSpecs || 'Specializations'}</div>
          </div>
          <div className="presc-hospital-box">
            <div className="presc-hospital">{clinicName || 'Hospital'}</div>
            <div className="presc-slogan">{clinicCity || ''}</div>
          </div>
        </div>
        <div className="presc-details">
          <div className="presc-row">
            <div className="presc-line presc-half"><span>Patient Name:</span><span>{patientName || ''}</span></div>
            <div className="presc-line presc-half"><span>Date:</span><span>{appt?.date || ''}</span></div>
          </div>
          <div className="presc-line"><span>Address:</span><span>{String(profile?.clinic?.address || '').trim()}</span></div>
          <div className="presc-row">
            <div className="presc-line presc-half"><span>Age:</span><span>{patientAge || '--'}</span></div>
            <div className="presc-line presc-half"><span>Diagnosis:</span><span>{parsed.diagnosis || ''}</span></div>
          </div>
        </div>
        <div className="presc-rx">Medicine</div>
        <table className="presc-table">
          <colgroup>
            <col style={{ width: '16.66%' }} />
            <col style={{ width: '16.66%' }} />
            <col style={{ width: '16.66%' }} />
            <col style={{ width: '16.66%' }} />
            <col style={{ width: '16.66%' }} />
            <col style={{ width: '16.66%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Morning</th>
              <th>Afternoon</th>
              <th>Night</th>
              <th>Food</th>
              <th>Days</th>
            </tr>
          </thead>
          <tbody>
            {medRows.map((m, i) => (
              <tr key={i}>
                <td>{m.name}</td>
                <td>{m.morning ? '✓' : ''}</td>
                <td>{m.afternoon ? '✓' : ''}</td>
                <td>{m.night ? '✓' : ''}</td>
                <td>{m.food}</td>
                <td>{m.days}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {parsed.advice && (
          <div className="presc-notes">
            <div className="presc-line"><span>Advice:</span><span>{parsed.advice}</span></div>
          </div>
        )}
        <div className="presc-sign-row">
          <div className="presc-sign-name">{doctorName || ''}</div>
          <div className="presc-sign-line">Signature</div>
        </div>
        <div className="presc-footer">
          <div className="presc-footer-item">
            <svg className="presc-footer-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22s7-8 7-13a7 7 0 10-14 0c0 5 7 13 7 13z" stroke="#334155" strokeWidth="2"/>
              <circle cx="12" cy="9" r="3" stroke="#334155" strokeWidth="2"/>
            </svg>
            <span>{String(profile?.clinic?.address || '').trim() || ''}</span>
          </div>
          <div className="presc-footer-item">
            <svg className="presc-footer-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 5a3 3 0 013-3h2a2 2 0 012 2v3a2 2 0 01-2 2l-1 .5a12 12 0 008.5 8.5l.5-1a2 2 0 012-2h3a2 2 0 012 2v2a3 3 0 01-3 3C7.82 24 0 16.18 0 6a3 3 0 012-1z" stroke="#334155" strokeWidth="2"/>
            </svg>
            <span>{String(appt?.doctor?.phone || '').trim() || ''}</span>
          </div>
          <div className="presc-footer-item">
            <svg className="presc-footer-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="#334155" strokeWidth="2"/>
              <path d="M3 8l9 6 9-6" stroke="#334155" strokeWidth="2"/>
            </svg>
            <span>{String(appt?.doctor?.email || '').trim() || ''}</span>
          </div>
        </div>
        <div className="presc-wave" />
        <div className="presc-wave-left" />
      </div>
    </div>
    </>
  );
}
