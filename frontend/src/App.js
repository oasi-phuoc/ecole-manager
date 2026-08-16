import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { fetchSessionUser, clearSessionUser } from './utils/session';
import Layout from './components/Layout';
import MfaGate from './components/MfaGate';
import Login from './pages/Login';
import ActiverMfa from './pages/ActiverMfa';
import Dashboard from './pages/Dashboard';
import Eleves from './pages/Eleves';
import EmployesAdministratifs from './pages/EmployesAdministratifs';
import Professeurs from './pages/Professeurs';
import Classes from './pages/Classes';
import Branches from './pages/Branches';
import EmploiDuTemps from './pages/EmploiDuTemps';
import Presences from './pages/Presences';
import Notes from './pages/Notes';
import Bulletins from './pages/Bulletins';
import Calendrier from './pages/Calendrier';
import Parametres from './pages/Parametres';
import Comptabilite from './pages/Comptabilite';
import TCF from './pages/TCF';
import DocumentsAdministratifs from './pages/DocumentsAdministratifs';
import ClasseInventaire from './pages/ClasseInventaire';
import Enclassement from './pages/Enclassement';
import SortieScolaire from './pages/SortieScolaire';
import ControleQualiteHub from './pages/ControleQualiteHub';
import SondageRepondre from './pages/SondageRepondre';

const PrivateRoute = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await fetchSessionUser();
        if (active) setOk(true);
      } catch {
        clearSessionUser();
        if (active) setOk(false);
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (checking) return null;
  return ok ? children : <Navigate to="/login" replace />;
};

function App() {
  useEffect(() => { document.title = 'Oasis'; }, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/repondre/:token" element={<SondageRepondre />} />
        <Route path="/login" element={<Login />} />
        <Route path="/activer-mfa" element={<PrivateRoute><ActiverMfa /></PrivateRoute>} />
        <Route element={<PrivateRoute><MfaGate><Layout /></MfaGate></PrivateRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/eleves" element={<Eleves />} />
          <Route path="/employes-administratifs" element={<EmployesAdministratifs />} />
          <Route path="/professeurs" element={<Professeurs />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/emploi-du-temps" element={<EmploiDuTemps />} />
          <Route path="/presences" element={<Presences />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/bulletins" element={<Bulletins />} />
          <Route path="/tcf" element={<TCF />} />
          <Route path="/calendrier" element={<Calendrier />} />
          <Route path="/parametres" element={<Parametres />} />
          <Route path="/comptabilite" element={<Comptabilite />} />
          <Route path="/documents-administratifs" element={<DocumentsAdministratifs />} />
          <Route path="/classes/:classeId/inventaire" element={<ClasseInventaire />} />
          <Route path="/enclassement" element={<Enclassement />} />
          <Route path="/controle-qualite" element={<ControleQualiteHub />} />
          <Route path="/visite-classes" element={<Navigate to="/controle-qualite?tab=visites" replace />} />
          <Route path="/sondage" element={<Navigate to="/controle-qualite?tab=sondage" replace />} />
          <Route path="/statistiques" element={<Navigate to="/controle-qualite?tab=statistiques" replace />} />
          <Route path="/sorties-scolaires" element={<SortieScolaire />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;