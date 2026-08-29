/* Gestion centralisée des 404 et des erreurs. Express 5 transmet ici les
   rejets des handlers asynchrones, aucun wrapper n'est nécessaire. */

import { ErreurHttp } from '../utils/ErreurHttp.js';
import { enProduction } from '../config/env.js';

export function routeInconnue(req, _res, suite) {
  suite(ErreurHttp.introuvable(`Route inconnue : ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars -- Express identifie le middleware d'erreur à ses 4 paramètres
export function gestionnaireErreurs(err, _req, res, _suite) {
  let statut = err.statut || 500;
  let message = err.message || 'Erreur interne du serveur.';
  let details = err.details || null;

  if (err.name === 'ValidationError') {
    statut = 400;
    message = 'Données invalides.';
    details = Object.values(err.errors).map(e => e.message);
  } else if (err.name === 'CastError') {
    statut = 400;
    message = `Identifiant invalide : ${err.value}`;
  } else if (err.code === 11000) {
    statut = 409;
    message = 'Cette ressource existe déjà.';
    details = err.keyValue;
  }

  if (statut >= 500) console.error('[erreur]', err);

  res.status(statut).json({
    succes: false,
    erreur: message,
    ...(details ? { details } : {}),
    ...(enProduction || statut < 500 ? {} : { pile: err.stack })
  });
}
