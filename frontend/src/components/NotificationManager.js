import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

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

export default function NotificationManager({ actor = 'patient' }) {
  const [notifs, setNotifs] = useState([]);
  const [seenIds, setSeenIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('seenNotifIds') || '[]')); } catch(_) { return new Set(); }
  });
  const token = localStorage.getItem('token');
  const nav = useNavigate();

  useEffect(() => {
    const handleClose = () => setNotifs([]);
    window.addEventListener('close_notif_popups', handleClose);
    return () => window.removeEventListener('close_notif_popups', handleClose);
  }, []);

  useEffect(() => {
    const origin = window.location.origin;
    const w = window;
    const cleanup = [];
    const onReady = () => {
      try {
        const socket = w.io ? w.io(origin, { transports: ['polling', 'websocket'], auth: { token: localStorage.getItem('token') || '' } }) : null;
        if (socket) {
          socket.on('notify', (p) => {
            try {
              const sid = String(p?.id || '');
              
              // Local deduplication check
              if (sid) {
                let alreadySeen = false;
                setSeenIds((prev) => {
                  if (prev.has(sid)) {
                    alreadySeen = true;
                    return prev;
                  }
                  const next = new Set(prev);
                  next.add(sid);
                  try { localStorage.setItem('seenNotifIds', JSON.stringify(Array.from(next))); } catch(_) {}
                  return next;
                });
                if (alreadySeen) return;
              }

              const id = String(Date.now()) + String(Math.random());
              window.dispatchEvent(new CustomEvent('hospozen_notif', { detail: p }));
              setNotifs((prev) => [{
                id,
                text: p?.message || '',
                link: p?.link || '',
                type: p?.type || 'general',
                kind: p?.kind || '',
                apptId: p?.apptId ? String(p.apptId) : ''
              }, ...prev].slice(0, 4));
              setTimeout(() => { setNotifs((prev) => prev.filter((n) => n.id !== id)); }, 30000);
            } catch (_) {}
          });

          socket.on('chat:new', (msg) => {
            try {
              const { apptId, actor: msgActor, kind, text } = msg || {};
              if (actor === 'patient' && String(msgActor || '').toLowerCase() !== 'doctor') return;
              if (actor === 'doctor' && String(msgActor || '').toLowerCase() === 'doctor') return;
              const id = String(apptId || '');
              if (!id) return;
              const t = String(text || '').trim();
              if (t) {
                try {
                  const chan = new BroadcastChannel('chatmsg_internal');
                  chan.postMessage({ apptId: id, actor: msgActor, kind, text: t });
                  chan.close();
                } catch(_) {}
              }
            } catch(_) {}
          });
          cleanup.push(() => { try { socket.close(); } catch(_) {} });
        }
      } catch (_) {}
    };
    if (!token) return () => {};
    if (!w.io) {
      const s = document.createElement('script');
      s.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
      s.async = true; s.defer = true; s.onload = onReady;
      document.body.appendChild(s);
      cleanup.push(() => { try { document.body.removeChild(s); } catch(_) {} });
    } else { onReady(); }
    return () => { cleanup.forEach((fn) => fn()); };
   }, [token]);

   useEffect(() => {
     try {
       const chan = new BroadcastChannel('chatmsg');
       chan.onmessage = (e) => {
         try {
           const { apptId, actor: msgActor, kind, text: msgText } = e.data || {};
           // If we are a patient, we only care about messages from doctors
           // If we are a doctor, we only care about messages from patients
           if (actor === 'patient' && String(msgActor || '').toLowerCase() !== 'doctor') return;
           if (actor === 'doctor' && String(msgActor || '').toLowerCase() === 'doctor') return;
 
           // We no longer show popups here to avoid duplication with 'notify' socket event
         } catch(_) {}
       };
       return () => { try { chan.close(); } catch(_) {} };
     } catch(_) {}
   }, [actor]);

   useEffect(() => {
    const fetchNow = async () => {
      try {
        if (!token) return;
        const { data } = await API.get('/notifications', { params: { unread: 1 } });
        const items = Array.isArray(data) ? data : [];
        let changed = false;
        let nextSeen = new Set(seenIds);
        items.forEach((n) => {
          const sid = String(n._id || n.id || '');
          if (!sid || nextSeen.has(sid)) return;
          changed = true;
          nextSeen.add(sid);
          window.dispatchEvent(new CustomEvent('hospozen_notif', { detail: n }));
          const id = String(Date.now()) + String(Math.random());
          setNotifs((prev) => [{
            id,
            text: n.message || '',
            link: n.link || '',
            type: n.type || 'general',
            kind: n.kind || '',
            apptId: n.apptId ? String(n.apptId) : ''
          }, ...prev].slice(0, 4));
          setTimeout(() => { setNotifs((prev) => prev.filter((x) => x.id !== id)); }, 30000);
        });
        if (changed) {
          setSeenIds(nextSeen);
          try { localStorage.setItem('seenNotifIds', JSON.stringify(Array.from(nextSeen))); } catch(_) {}
        }
      } catch(_) {}
    };
    fetchNow();
    const t = setInterval(fetchNow, 5000);
    return () => clearInterval(t);
  }, [token, seenIds]);

  if (!token || notifs.length === 0) return null;

  return (
    <div className="absolute right-0 top-16 z-[60] space-y-2 pointer-events-none">
      {notifs.map((n, idx) => (
        <div key={n.id} className="relative">
          {idx === 0 && (
            <div className="absolute right-3 sm:right-4 -top-2 w-4 h-4 bg-white/95 border border-blue-200/50 rotate-45 z-[-1]"></div>
          )}
          <button
            onClick={async () => {
            try {
              const id = String(n.apptId || '');
              const msg = String(n.text || '').toLowerCase();
              if (actor === 'doctor') {
                if ((msg.includes('view details') || n.type === 'details') && id) {
                  nav(`/doctor/appointments/${id}/documents`);
                } else if ((id && (n.kind === 'followup' || msg.includes('follow up') || n.type === 'followup'))) {
                  try { localStorage.setItem('lastChatApptId', id); } catch(_) {}
                  nav(`/doctor/appointments/${id}/followup`);
                } else if ((n.type === 'chat' || msg.includes('new message')) && id) {
                  nav(`/doctor/appointments/${id}/documents`);
                } else {
                  nav('/doctor/appointments');
                }
              } else {
                if (n.type === 'chat' && id) {
                  try { localStorage.setItem('lastChatApptId', id); } catch(_) {}
                  nav(n.kind === 'followup' ? `/appointments/${id}/followup` : `/appointments/${id}/details`);
                } else if ((msg.includes('follow up') || n.type === 'followup') && id) {
                  nav(`/appointments/${id}/followup`);
                } else if (n.type === 'meet' && id) {
                  nav(`/appointments?joinMeet=${id}`);
                } else if (n.link) {
                  nav(n.link);
                } else {
                  nav('/appointments');
                }
              }
              setNotifs(prev => prev.filter(x => x.id !== n.id));
            } catch(_) {}
          }}
          className="block w-[85vw] sm:w-80 max-w-sm text-left px-4 py-3 rounded-2xl shadow-2xl border border-blue-200/50 bg-white/95 backdrop-blur-md hover:bg-blue-50 transition pointer-events-auto"
        >
          <div className="flex items-start gap-3">
            <TypeIcon type={n.type} />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-900 font-semibold break-all">
                {n.text && n.text.length > 50 ? n.text.substring(0, 50) + '...' : n.text || 'Notification'}
              </div>
            </div>
          </div>
        </button>
        </div>
      ))}
    </div>
  );
}
