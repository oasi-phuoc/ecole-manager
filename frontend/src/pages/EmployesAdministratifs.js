import React from 'react';
import Professeurs from './Professeurs';

export default function EmployesAdministratifs() {
  return (
    <Professeurs
      apiBase="/employes-administratifs"
      titre="Gestion des employés"
      nomEntite="employé"
      hidePreferences={true}
      hidePeriodesSemaine={true}
      hidePreferencesLieu={true}
      hideRemarque={true}
      excludeSessionUser={true}
      searchPlaceholder="Rechercher un employé..."
      showRoleToggle={true}
    />
  );
}

