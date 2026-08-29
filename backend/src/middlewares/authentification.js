/* Vérifie le jeton JWT et attache l'utilisateur à la requête. */

import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { Utilisateur } from '../models/utilisateur.model.js';
import { ErreurHttp } from '../utils/ErreurHttp.js';

function extraireJeton(req) {
  const entete = req.get('authorization') || '';
  if (entete.toLowerCase().startsWith('bearer ')) return entete.slice(7).trim();
  return null;
}

export async function authentifier(req, _res, suite) {
  const jeton = extraireJeton(req);
  if (!jeton) return suite(ErreurHttp.nonAuthentifie('Jeton absent (en-tête Authorization: Bearer …).'));

  let charge;
  try {
    charge = jwt.verify(jeton, config.jwt.secret);
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Jeton expiré, reconnecte-toi.'
      : 'Jeton invalide.';
    return suite(ErreurHttp.nonAuthentifie(message));
  }

  const utilisateur = await Utilisateur.findById(charge.sub);
  if (!utilisateur) return suite(ErreurHttp.nonAuthentifie("L'utilisateur du jeton n'existe plus."));

  req.utilisateur = utilisateur;
  suite();
}

/** Restreint une route à certains rôles. Ex. : exigerRole('admin') */
export function exigerRole(...roles) {
  return (req, _res, suite) => {
    if (!req.utilisateur) return suite(ErreurHttp.nonAuthentifie());
    if (!roles.includes(req.utilisateur.role)) {
      return suite(ErreurHttp.interdit('Rôle insuffisant pour cette action.'));
    }
    suite();
  };
}
