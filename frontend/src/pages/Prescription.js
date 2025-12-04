import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
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
  const [medicines, setMedicines] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [route, setRoute] = useState("");
  const [food, setFood] = useState("");
  const [notes, setNotes] = useState("");
  const [advice, setAdvice] = useState("");

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
  const patientName = useMemo(() => String(appt?.patient?.name || "").trim(), [appt]);
  const when = useMemo(() => `${appt?.date || ''} ${appt?.startTime || ''}-${appt?.endTime || ''}`, [appt]);
  const doctorQuals = useMemo(() => (Array.isArray(profile?.qualifications) ? profile.qualifications.join(', ') : ''), [profile]);
  const doctorSpecs = useMemo(() => (Array.isArray(profile?.specializations) ? profile.specializations.join(', ') : ''), [profile]);
  const patientAge = useMemo(() => {
    try {
      const pid = String(appt?.patient?._id || appt?.patient || '');
      const val = localStorage.getItem(`userAgeById_${pid}`) || '';
      return String(val || '').trim();
    } catch(_) { return ''; }
  }, [appt]);
  const patientGender = useMemo(() => {
    try {
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
      medicines: getVal('Medicines'),
      dosage: getVal('Dosage'),
      frequency: getVal('Frequency'),
      duration: getVal('Duration'),
      tests: getVal('Tests'),
      diagnosis: getVal('Diagnosis'),
      route: getVal('Route'),
      food: getVal('Before/After food') || getVal('Food'),
      advice: getVal('Lifestyle advice') || getVal('Advice'),
      notes: getVal('Notes'),
    };
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
    setSymptoms(symptomsText || '');
    setDiagnosis(parsed.diagnosis || '');
    setTests(parsed.tests || '');
    setMedicines(parsed.medicines || '');
    setDosage(parsed.dosage || '');
    setFrequency(parsed.frequency || '');
    setDuration(parsed.duration || '');
    setRoute(parsed.route || '');
    setFood(parsed.food || '');
    setAdvice(parsed.advice || '');
    setNotes(parsed.notes || '');
  }, [appt, symptomsText, parsed]);

  const isDoctorUser = useMemo(() => {
    try {
      const uid = localStorage.getItem('userId') || '';
      const did = String(appt?.doctor?._id || appt?.doctor || '');
      return !!uid && uid === did;
    } catch(_) { return false; }
  }, [appt]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-4xl mx-auto pt-8 px-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{clinicName || 'Clinic/Hospital'}</h2>
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
              <div className="flex items-center justify-between text-sm text-slate-700">
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
              <div className="text-sm text-slate-700">Gender: <span className="text-slate-900">{patientGender || '--'}</span></div>
              <div className="text-sm text-slate-700">Consultation Date: <span className="text-slate-900">{when || '--'}</span></div>
              <div className="text-sm text-slate-700">Appointment Type: <span className="text-slate-900">{apptType ? (apptType === 'online' ? 'Online' : 'Offline') : '--'}</span></div>
            </div>
          </div>

        <div className="mt-6">
          <div className="text-slate-900 font-semibold">Symptoms (Chief Complaints)</div>
          {edit ? (
            <textarea rows={3} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className="w-full border border-blue-200 rounded-xl p-3 text-sm mt-2 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Enter symptoms" />
          ) : (
            <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap border border-blue-200 rounded-xl p-3 bg-blue-50/50">{symptomsText || '--'}</div>
          )}
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-slate-900 font-semibold">Diagnosis</div>
            {edit ? (
              <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm mt-2 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Enter diagnosis" />
            ) : (
              <div className="mt-2 text-sm text-slate-800 border border-blue-200 rounded-xl p-3 bg-blue-50/50">{parsed.diagnosis || '--'}</div>
            )}
          </div>
          <div>
            <div className="text-slate-900 font-semibold">Tests / Investigations</div>
            {edit ? (
              <textarea rows={2} value={tests} onChange={(e) => setTests(e.target.value)} className="w-full border border-blue-200 rounded-xl p-3 text-sm mt-2 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="e.g., CBC, LFT" />
            ) : (
              <div className="mt-2 text-sm text-slate-800 border border-blue-200 rounded-xl p-3 bg-blue-50/50">{parsed.tests || '--'}</div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="text-slate-900 font-semibold">Prescription (Medicines)</div>
          {edit ? (
            <div className="grid md:grid-cols-2 gap-3 mt-2">
              <input value={medicines} onChange={(e) => setMedicines(e.target.value)} className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Medicine name" />
              <input value={dosage} onChange={(e) => setDosage(e.target.value)} className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Dosage" />
              <input value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Frequency" />
              <input value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Duration" />
              <input value={route} onChange={(e) => setRoute(e.target.value)} className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Route" />
              <input value={food} onChange={(e) => setFood(e.target.value)} className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Before/After food" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3 mt-2">
              <div className="text-sm text-slate-800">Medicine Name: <span className="text-slate-900">{parsed.medicines || '--'}</span></div>
              <div className="text-sm text-slate-800">Dosage: <span className="text-slate-900">{parsed.dosage || '--'}</span></div>
              <div className="text-sm text-slate-800">Frequency: <span className="text-slate-900">{parsed.frequency || '--'}</span></div>
              <div className="text-sm text-slate-800">Duration: <span className="text-slate-900">{parsed.duration || '--'}</span></div>
              <div className="text-sm text-slate-800">Route: <span className="text-slate-900">{parsed.route || '--'}</span></div>
              <div className="text-sm text-slate-800">Before/After food: <span className="text-slate-900">{parsed.food || '--'}</span></div>
            </div>
          )}
          {edit ? (
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-blue-200 rounded-xl p-3 text-sm mt-2 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Notes" />
          ) : (
            <div className="mt-2 text-sm text-slate-800">Notes: <span className="text-slate-900">{parsed.notes || '--'}</span></div>
          )}
        </div>

        <div className="mt-6">
          <div className="text-slate-900 font-semibold">Advice / Instructions</div>
          {edit ? (
            <textarea rows={2} value={advice} onChange={(e) => setAdvice(e.target.value)} className="w-full border border-blue-200 rounded-xl p-3 text-sm mt-2 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Advice / Instructions" />
          ) : (
            <div className="mt-2 text-sm text-slate-800 border border-blue-200 rounded-xl p-3 bg-blue-50/50">{parsed.advice || '--'}</div>
          )}
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-slate-900 font-semibold">Follow-up</div>
            <div className="mt-2 text-sm text-slate-800 border border-blue-200 rounded-xl p-3 bg-blue-50/50">
              <div>Follow-up date: <span className="text-slate-900">{followUpDate || '--'}</span></div>
              <div>Review if symptoms worsen</div>
            </div>
          </div>
          <div className="flex items-center justify-end">
            <div className="text-right">
              <div className="text-slate-700 text-sm">Digital signature</div>
              <div className="text-slate-900 font-semibold">{doctorName}</div>
            </div>
          </div>
        </div>
        
        
        <div className="mt-6 flex items-center justify-end gap-2">
          {isDoctorUser && (
            <button onClick={() => setEdit((v) => !v)} className="px-3 py-2 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50">{edit ? 'Cancel Edit' : 'Edit'}</button>
          )}
          {edit && isDoctorUser && (
            <button
              onClick={async () => {
                const parts = [
                  symptoms ? `Symptoms: ${symptoms}` : '',
                  diagnosis ? `Diagnosis: ${diagnosis}` : '',
                  tests ? `Tests: ${tests}` : '',
                  medicines ? `Medicines: ${medicines}` : '',
                  dosage ? `Dosage: ${dosage}` : '',
                  frequency ? `Frequency: ${frequency}` : '',
                  duration ? `Duration: ${duration}` : '',
                  route ? `Route: ${route}` : '',
                  food ? `Before/After food: ${food}` : '',
                  advice ? `Lifestyle advice: ${advice}` : '',
                  notes ? `Notes: ${notes}` : '',
                ].filter(Boolean);
                const text = parts.join('\n');
                try {
                  await API.post(`/appointments/${id}/prescription`, { text });
                  setAppt((prev) => (prev ? ({ ...(prev || {}), prescriptionText: text }) : prev));
                  alert('Updated');
                } catch (e) {
                  alert(e.response?.data?.message || e.message || 'Failed to update');
                }
              }}
              className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white"
            >
              Save
            </button>
          )}
          {!isEmbed && (
            <>
              <button
                onClick={() => {
                  try {
                    if (window.opener) { window.close(); return; }
                    if (window.history.length > 1) { window.history.back(); return; }
                  } catch (_) {}
                  nav('/appointments');
                }}
                className="px-4 py-2 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                Close
              </button>
              <button onClick={() => { try { window.open(`/prescription/${id}?print=1`, '_blank'); } catch(_) {} }} className="px-4 py-2 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50">Download PDF</button>
              {isDoctorUser && (
                <button
                  onClick={async () => {
                    const key = String(id);
                    const viewUrl = `${window.location.origin}/prescription/${id}`;
                    try {
                      const prev = JSON.parse(localStorage.getItem(`wr_${key}_prevpres`) || '[]');
                      const label = `Prescription ${when}`;
                      const item = { name: label, url: viewUrl, by: "doctor" };
                      const next = Array.isArray(prev) ? [...prev, item] : [item];
                      localStorage.setItem(`wr_${key}_prevpres`, JSON.stringify(next));
                      try { const chan = new BroadcastChannel('prescriptions'); chan.postMessage({ id: key, item }); chan.close(); } catch (_) {}
                    } catch (_) {}
                    try { await API.post(`/appointments/${id}/prescription`, { text: appt?.prescriptionText || "" }); } catch (_) {}
                    try {
                      if (navigator.share) {
                        await navigator.share({ title: 'Prescription', url: viewUrl });
                      } else {
                        await navigator.clipboard.writeText(viewUrl);
                      }
                    } catch (_) {}
                    alert('Sent to Prescriptions')
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
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
  );
}
