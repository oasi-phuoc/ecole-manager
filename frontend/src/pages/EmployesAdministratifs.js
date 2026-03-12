import React from 'react';
import Professeurs from './Professeurs';

export default function EmployesAdministratifs() {
  return (
    <Professeurs
      apiBase="/employes-administratifs"
      titre="Employés"
      nomEntite="employé administratif"
      hidePreferences={true}
      hidePeriodesSemaine={true}
      hidePreferencesLieu={true}
      hideRemarque={true}
      singleColumnForm={true}
    />
  );
}

