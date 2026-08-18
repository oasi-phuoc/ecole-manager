import { compterPreferencesSoutienParProf } from './comptesSoutienPreferences';

const MATIERES = new Map([
  ['10', { id: 10, nom: 'Français', designation_courte: 'FR' }],
  ['20', { id: 20, nom: 'Mathématiques', designation_courte: 'MA' }],
  ['90', { id: 90, nom: 'Soutien', designation_courte: 'SOUTIEN' }],
]);

const slot = (classeId, creneauId, profId, type, matiereId) => ({
  id: `${classeId}-${creneauId}-${profId}-${type || 'n'}`,
  classe_id: classeId,
  creneau_id: creneauId,
  prof_id: profId,
  type_special: type,
  matiere_id: matiereId,
});

describe('compterPreferencesSoutienParProf', () => {
  it('compte le soutien donné (matière du cours jumelé) et le SOUTIEN REÇU', () => {
    // Ana 2 MA soutien + 4 reçu ; Fanny 2 reçu ; Deborah 2 MA soutien + 4 reçu ; Van 6 FR soutien + 2 reçu
    const ANA = 1;
    const FANNY = 2;
    const DEBORAH = 3;
    const VAN = 4;
    const AUTRE = 5;
    const affectations = [
      // 6 cours FR avec Van en soutien
      slot(1, 1, ANA, null, 10), slot(1, 1, VAN, 'soutien', 90),
      slot(1, 2, ANA, null, 10), slot(1, 2, VAN, 'soutien', null),
      slot(2, 1, DEBORAH, null, 10), slot(2, 1, VAN, 'soutien', null),
      slot(2, 2, DEBORAH, null, 10), slot(2, 2, VAN, 'soutien', null),
      slot(3, 1, FANNY, null, 10), slot(3, 1, VAN, 'soutien', null),
      slot(3, 2, FANNY, null, 10), slot(3, 2, VAN, 'soutien', null),
      // 4 cours MA avec Ana / Deborah en soutien
      slot(1, 3, DEBORAH, null, 20), slot(1, 3, ANA, 'soutien', null),
      slot(1, 4, DEBORAH, null, 20), slot(1, 4, ANA, 'soutien', null),
      slot(2, 3, ANA, null, 20), slot(2, 3, DEBORAH, 'soutien', null),
      slot(2, 4, ANA, null, 20), slot(2, 4, DEBORAH, 'soutien', null),
      // 2 cours FR/MA de Van avec un autre prof en soutien
      slot(4, 1, VAN, null, 10), slot(4, 1, AUTRE, 'soutien', null),
      slot(4, 2, VAN, null, 20), slot(4, 2, AUTRE, 'soutien', null),
    ];

    const totaux = compterPreferencesSoutienParProf(affectations, MATIERES);
    expect(totaux[String(ANA)]).toMatchObject({ frS: 0, maS: 2, recu: 4 });
    expect(totaux[String(FANNY)]).toMatchObject({ frS: 0, maS: 0, recu: 2 });
    expect(totaux[String(DEBORAH)]).toMatchObject({ frS: 0, maS: 2, recu: 4 });
    expect(totaux[String(VAN)]).toMatchObject({ frS: 6, maS: 0, recu: 2 });
  });

  it('utilise soutien_matiere_nom si le cours jumelé n’a pas encore de matiere_id dans la liste', () => {
    const affectations = [
      {
        id: 's1',
        classe_id: 1,
        creneau_id: 1,
        prof_id: 8,
        type_special: 'soutien',
        matiere_id: null,
        soutien_matiere_nom: 'Français',
      },
    ];
    const totaux = compterPreferencesSoutienParProf(affectations, MATIERES);
    expect(totaux['8']).toMatchObject({ frS: 1, maS: 0, recu: 0 });
  });
});
