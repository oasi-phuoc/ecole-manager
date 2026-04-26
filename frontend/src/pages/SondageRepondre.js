/* eslint-disable */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'https://ecole-manager-backend.onrender.com/api';

export default function SondageRepondre() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [form, setForm] = useState(null);
  const [values, setValues] = useState({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await axios.get(`${API}/sondages/public/${encodeURIComponent(token)}`);
        if (!cancel) {
          setForm(res.data);
          setValues({});
        }
      } catch (e) {
        if (!cancel) setErr(e.response?.data?.message || e.message || 'Erreur de chargement');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [token]);

  const setVal = (qid, v) => setValues((p) => ({ ...p, [qid]: v }));

  const toggleMulti = (qid, opt, checked) => {
    setValues((p) => {
      const cur = Array.isArray(p[qid]) ? [...p[qid]] : [];
      if (checked) {
        if (!cur.includes(opt)) cur.push(opt);
      } else {
        const i = cur.indexOf(opt);
        if (i >= 0) cur.splice(i, 1);
      }
      return { ...p, [qid]: cur };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setErr('');
    try {
      await axios.post(`${API}/sondages/public/${encodeURIComponent(token)}/repondre`, { reponses: values });
      setDone(true);
    } catch (ex) {
      setErr(ex.response?.data?.message || ex.message || 'Envoi impossible');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div style={s.wrap}>
        <div style={s.card}>Chargement du formulaire…</div>
      </div>
    );
  }

  if (err && !form) {
    return (
      <div style={s.wrap}>
        <div style={{ ...s.card, color: '#991b1b' }}>{err}</div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={s.wrap}>
        <div style={s.card}>
          <h1 style={s.h1}>Merci</h1>
          <p style={s.p}>Votre réponse a bien été enregistrée.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <form style={s.card} onSubmit={submit}>
        <h1 style={s.h1}>{form?.titre || 'Formulaire'}</h1>
        {form?.description ? <p style={s.desc}>{form.description}</p> : null}
        {err ? <div style={s.err}>{err}</div> : null}

        {(form?.questions || []).map((q) => (
          <div key={q.id} style={s.q}>
            <label style={s.label}>
              {q.libelle}
              {q.obligatoire ? <span style={s.req}> *</span> : null}
            </label>
            {q.type === 'texte' && (
              <input
                style={s.input}
                value={values[q.id] ?? ''}
                onChange={(e) => setVal(q.id, e.target.value)}
                maxLength={500}
              />
            )}
            {q.type === 'paragraphe' && (
              <textarea
                style={{ ...s.input, minHeight: 100, resize: 'vertical' }}
                value={values[q.id] ?? ''}
                onChange={(e) => setVal(q.id, e.target.value)}
                maxLength={8000}
              />
            )}
            {q.type === 'choix_unique' && (
              <div style={s.opts}>
                {(q.options || []).map((opt) => (
                  <label key={opt} style={s.radio}>
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      checked={values[q.id] === opt}
                      onChange={() => setVal(q.id, opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}
            {q.type === 'choix_multiple' && (
              <div style={s.opts}>
                {(q.options || []).map((opt) => (
                  <label key={opt} style={s.radio}>
                    <input
                      type="checkbox"
                      checked={Array.isArray(values[q.id]) && values[q.id].includes(opt)}
                      onChange={(e) => toggleMulti(q.id, opt, e.target.checked)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        <button type="submit" disabled={sending || !(form?.questions || []).length} style={s.btn}>
          {sending ? 'Envoi…' : 'Envoyer'}
        </button>
      </form>
    </div>
  );
}

const s = {
  wrap: { minHeight: '100vh', background: 'linear-gradient(160deg, #eef2ff 0%, #f8fafc 45%)', padding: '24px 16px', boxSizing: 'border-box', fontFamily: "'Century Gothic', CenturyGothic, 'Trebuchet MS', sans-serif" },
  card: { maxWidth: 640, margin: '0 auto', background: 'white', borderRadius: 16, padding: '28px 24px', boxShadow: '0 12px 40px rgba(99,102,241,0.12)', border: '1px solid #e0e7ff' },
  h1: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' },
  desc: { fontSize: 14, color: '#475569', marginBottom: 20, lineHeight: 1.5, whiteSpace: 'pre-wrap' },
  err: { padding: '10px 12px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, marginBottom: 16, fontSize: 14 },
  q: { marginBottom: 22 },
  label: { display: 'block', fontWeight: 700, fontSize: 14, color: '#334155', marginBottom: 8 },
  req: { color: '#dc2626' },
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit' },
  opts: { display: 'flex', flexDirection: 'column', gap: 8 },
  radio: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#334155', cursor: 'pointer' },
  btn: { marginTop: 8, padding: '12px 24px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' },
  p: { fontSize: 15, color: '#475569', margin: 0 },
};
