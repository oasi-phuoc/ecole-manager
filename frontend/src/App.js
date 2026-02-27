import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Eleves from './pages/Eleves';
import Professeurs from './pages/Professeurs';
import Classes from './pages/Classes';
import Branches from './pages/Branches';
import EmploiDuTemps from './pages/EmploiDuTemps';
import Presences from './pages/Presences';
import Notes from './pages/Notes';
import Calendrier from './pages/Calendrier';
import Parametres from './pages/Parametres';
import Comptabilite from './pages/Comptabilite';
import Statistiques from './pages/Statistiques';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/eleves" element={<PrivateRoute><Eleves /></PrivateRoute>} />
        <Route path="/professeurs" element={<PrivateRoute><Professeurs /></PrivateRoute>} />
        <Route path="/classes" element={<PrivateRoute><Classes /></PrivateRoute>} />
        <Route path="/branches" element={<PrivateRoute><Branches /></PrivateRoute>} />
        <Route path="/emploi-du-temps" element={<PrivateRoute><EmploiDuTemps /></PrivateRoute>} />
        <Route path="/presences" element={<PrivateRoute><Presences /></PrivateRoute>} />
        <Route path="/notes" element={<PrivateRoute><Notes /></PrivateRoute>} />
        <Route path="/calendrier" element={<PrivateRoute><Calendrier /></PrivateRoute>} />
        <Route path="/parametres" element={<PrivateRoute><Parametres /></PrivateRoute>} />
        <Route path="/comptabilite" element={<PrivateRoute><Comptabilite /></PrivateRoute>} />
        <Route path="/statistiques" element={<PrivateRoute><Statistiques /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;