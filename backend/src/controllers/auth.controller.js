/* Authentification — un seul compte pour l'instant (l'admin défini dans le .env). */

import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { Utilisateur } from '../models/utilisateur.model.js';
import { ErreurHttp } from '../utils/ErreurHttp.js';

function signerJeton(utilisateur) {
  return jwt.sign(
    { sub: utilisateur._id.toString(), role: utilisateur.role },
    config.jwt.secret,
    { expiresIn: config.jwt.duree }
  );
}

/* POST /api/auth/connexion */
export async function connexion(req, res) {
  const { nom_utilisateur, mot_de_passe } = req.body || {};

  if (!nom_utilisateur || !mot_de_passe) {
    throw ErreurHttp.requeteInvalide('« nom_utilisateur » et « mot_de_passe » sont obligatoires.');
  }

  const utilisateur = await Utilisateur
    .findOne({ nom_utilisateur: String(nom_utilisateur).trim().toLowerCase() })
    .select('+mot_de_passe');

  // Message unique : on ne révèle pas si le compte existe.
  const echec = ErreurHttp.nonAuthentifie('Nom d\'utilisateur ou mot de passe incorrect.');
  if (!utilisateur) throw echec;
  if (!await utilisateur.verifierMotDePasse(String(mot_de_passe))) throw echec;

  utilisateur.derniere_connexion_le = new Date();
  await utilisateur.save({ validateModifiedOnly: true });

  res.json({
    succes: true,
    jeton: signerJeton(utilisateur),
    expire_dans: config.jwt.duree,
    utilisateur: utilisateur.enPublic()
  });
}

/* GET /api/auth/moi */
export async function moi(req, res) {
  res.json({ succes: true, utilisateur: req.utilisateur.enPublic() });
}
