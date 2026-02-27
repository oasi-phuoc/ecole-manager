import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

export default function Statistiques() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => { chargerStats(); }, []);

  const chargerStats = async () => {
    try {
      const res = await axios.get(API + '/statistiques', { headers });
      setStats(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <div style={styles.loading}>⏳ Chargement des statistiques...</div>;
  if (!stats) return <div style={styles.loading}>❌ Erreur de chargement</div>;

  const tauxPresence = stats.presences_aujourd.total > 0
    ? Math.round((stats.presences_aujourd.presents / stats.presences_aujourd.total) * 100)
    : null;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.btnRetour} onClick={() => navigate('/dashboard')}>← Retour</button>
        <h2 style={styles.titre}>📊 Statistiques</h2>
        <button style={styles.btnRefresh} onClick={chargerStats}>🔄 Actualiser</button>
      </div>

      {/* Chiffres clés */}
      <div style={styles.sectionTitre}>🏫 Chiffres clés</div>
      <div style={styles.statsGrid}>
        {[
          { icon: '👨‍🎓', label: 'Élèves actifs', valeur: stats.nb_eleves, couleur: '#1a73e8' },
          { icon: '👨‍🏫', label: 'Professeurs', valeur: stats.nb_profs, couleur: '#34a853' },
          { icon: '🏫', label: 'Classes', valeur: stats.nb_classes, couleur: '#fbbc04' },
          { icon: '📚', label: 'Branches', valeur: stats.nb_branches, couleur: '#9c27b0' },
        ].map((s, i) => (
          <div key={i} style={{ ...styles.statCard, borderTop: '4px solid ' + s.couleur }}>
            <div style={styles.statIcon}>{s.icon}</div>
            <div style={styles.statValeur}>{s.valeur}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.row}>
        {/* Présences aujourd'hui */}
        <div style={styles.col}>
          <div style={styles.sectionTitre}>✅ Présences aujourd'hui</div>
          <div style={styles.card}>
            {stats.presences_aujourd.total == 0 ? (
              <div style={styles.vide}>Aucune présence saisie aujourd'hui</div>
            ) : (
              <>
                <div style={styles.presenceGrid}>
                  {[
                    { label: 'Présents', val: stats.presences_aujourd.presents, color: '#34a853', bg: '#e8f5e9' },
                    { label: 'Absents', val: stats.presences_aujourd.absents, color: '#ea4335', bg: '#ffebee' },
                    { label: 'Retards', val: stats.presences_aujourd.retards, color: '#fbbc04', bg: '#fff8e1' },
                  ].map((p, i) => (
                    <div key={i} style={{ ...styles.presenceCard, background: p.bg }}>
                      <div style={{ ...styles.presenceVal, color: p.color }}>{p.val}</div>
                      <div style={styles.presenceLabel}>{p.label}</div>
                    </div>
                  ))}
                </div>
                {tauxPresence !== null && (
                  <div style={styles.tauxContainer}>
                    <div style={styles.tauxLabel}>Taux de présence</div>
                    <div style={styles.barreContainer}>
                      <div style={{ ...styles.barre, width: tauxPresence + '%', background: tauxPresence >= 80 ? '#34a853' : tauxPresence >= 60 ? '#fbbc04' : '#ea4335' }} />
                    </div>
                    <div style={{ ...styles.tauxPct, color: tauxPresence >= 80 ? '#34a853' : tauxPresence >= 60 ? '#fbbc04' : '#ea4335' }}>{tauxPresence}%</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Paiements */}
        <div style={styles.col}>
          <div style={styles.sectionTitre}>💰 Paiements</div>
          <div style={styles.card}>
            {[
              { label: 'Encaissé', val: parseFloat(stats.paiements.encaisse).toFixed(2) + ' CHF', color: '#34a853', bg: '#e8f5e9' },
              { label: 'En attente', val: parseFloat(stats.paiements.en_attente).toFixed(2) + ' CHF', color: '#fbbc04', bg: '#fff8e1' },
              { label: 'En retard', val: parseFloat(stats.paiements.en_retard).toFixed(2) + ' CHF', color: '#ea4335', bg: '#ffebee' },
            ].map((p, i) => (
              <div key={i} style={{ ...styles.paiementRow, background: p.bg }}>
                <span style={styles.paiementLabel}>{p.label}</span>
                <span style={{ ...styles.paiementVal, color: p.color }}>{p.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.row}>
        {/* Élèves par classe */}
        <div style={styles.col}>
          <div style={styles.sectionTitre}>👨‍🎓 Élèves par classe</div>
          <div style={styles.card}>
            {stats.eleves_par_classe.length === 0 ? (
              <div style={styles.vide}>Aucune classe</div>
            ) : stats.eleves_par_classe.map((c, i) => (
              <div key={i} style={styles.classeRow}>
                <span style={styles.classeNom}>🏫 {c.classe}</span>
                <div style={styles.classeBarreContainer}>
                  <div style={{ ...styles.classeBarre, width: Math.min((c.nb / 50) * 100, 100) + '%' }} />
                </div>
                <span style={styles.classeNb}>{c.nb} élève(s)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Moyennes par classe */}
        <div style={styles.col}>
          <div style={styles.sectionTitre}>📝 Moyennes par classe</div>
          <div style={styles.card}>
            {stats.moyennes_par_classe.length === 0 ? (
              <div style={styles.vide}>Aucune note saisie</div>
            ) : stats.moyennes_par_classe.map((c, i) => {
              const moy = parseFloat(c.moyenne);
              const color = moy >= 4 ? '#34a853' : moy >= 3.5 ? '#fbbc04' : '#ea4335';
              return (
                <div key={i} style={styles.classeRow}>
                  <span style={styles.classeNom}>🏫 {c.classe}</span>
                  <div style={styles.classeBarreContainer}>
                    <div style={{ ...styles.classeBarre, width: (moy / 6 * 100) + '%', background: color }} />
                  </div>
                  <span style={{ ...styles.classeNb, color, fontWeight: '700' }}>{moy.toFixed(1)}/6</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Prochains événements */}
      {stats.prochains_evenements.length > 0 && (
        <>
          <div style={styles.sectionTitre}>📆 Prochains événements</div>
          <div style={styles.card}>
            {stats.prochains_evenements.map((ev, i) => (
              <div key={i} style={{ ...styles.eventRow, borderLeft: '4px solid ' + ev.couleur }}>
                <div style={styles.eventDate}>{new Date(ev.date_debut).toLocaleDateString('fr-CH')}</div>
                <div style={styles.eventTitre}>{ev.titre}</div>
                <div style={{ ...styles.eventType, color: ev.couleur }}>{ev.type}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '20px', background: '#f0f2f5', minHeight: '100vh' },
  loading: { padding: '40px', textAlign: 'center', fontSize: '18px' },
  header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' },
  btnRetour: { padding: '8px 16px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer' },
  titre: { fontSize: '24px', fontWeight: '700', flex: 1 },
  btnRefresh: { padding: '10px 20px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  sectionTitre: { fontSize: '16px', fontWeight: '700', color: '#555', marginBottom: '12px', marginTop: '20px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '10px' },
  statCard: { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' },
  statIcon: { fontSize: '28px', marginBottom: '8px' },
  statValeur: { fontSize: '32px', fontWeight: '700', color: '#333' },
  statLabel: { fontSize: '13px', color: '#888', marginTop: '4px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '10px' },
  col: { },
  card: { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  vide: { color: '#888', textAlign: 'center', padding: '20px', fontSize: '14px' },
  presenceGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' },
  presenceCard: { padding: '15px', borderRadius: '10px', textAlign: 'center' },
  presenceVal: { fontSize: '28px', fontWeight: '700' },
  presenceLabel: { fontSize: '12px', color: '#666', marginTop: '4px' },
  tauxContainer: { display: 'flex', alignItems: 'center', gap: '10px' },
  tauxLabel: { fontSize: '13px', color: '#555', whiteSpace: 'nowrap' },
  barreContainer: { flex: 1, height: '10px', background: '#f0f0f0', borderRadius: '5px', overflow: 'hidden' },
  barre: { height: '100%', borderRadius: '5px', transition: 'width 0.5s' },
  tauxPct: { fontSize: '14px', fontWeight: '700', minWidth: '40px' },
  paiementRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '8px', marginBottom: '8px' },
  paiementLabel: { fontSize: '14px', fontWeight: '600', color: '#555' },
  paiementVal: { fontSize: '16px', fontWeight: '700' },
  classeRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  classeNom: { fontSize: '14px', minWidth: '80px' },
  classeBarreContainer: { flex: 1, height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' },
  classeBarre: { height: '100%', background: '#1a73e8', borderRadius: '4px', transition: 'width 0.5s' },
  classeNb: { fontSize: '13px', color: '#888', minWidth: '80px', textAlign: 'right' },
  eventRow: { display: 'flex', alignItems: 'center', gap: '15px', padding: '10px 15px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '8px' },
  eventDate: { fontSize: '13px', color: '#888', minWidth: '80px' },
  eventTitre: { fontSize: '14px', fontWeight: '600', flex: 1 },
  eventType: { fontSize: '12px', fontWeight: '600' },
};