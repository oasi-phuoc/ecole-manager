import React from 'react';
import { useSearchParams } from 'react-router-dom';
import VisiteClasses from './VisiteClasses';
import Sondage from './Sondage';
import Statistiques from './Statistiques';

/** Regroupe sous /controle-qualite : visites, feedback, sondage, statistiques. */
export default function ControleQualiteHub() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  if (tab === 'sondage') return <Sondage />;
  if (tab === 'statistiques') return <Statistiques />;
  return <VisiteClasses />;
}
