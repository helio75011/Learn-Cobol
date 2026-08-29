/* Garantit l'existence du compte admin décrit dans le .env.
   Appelé au démarrage : idempotent, il ne touche pas au mot de passe existant. */

import { Utilisateur } from '../models/utilisateur.model.js';
import { config } from '../config/env.js';

export async function assurerAdmin({ forcerMotDePasse = false } = {}) {
  const { nomUtilisateur, motDePasse } = config.admin;

  let admin = await Utilisateur.findOne({ nom_utilisateur: nomUtilisateur });

  if (!admin) {
    admin = await Utilisateur.create({
      nom_utilisateur: nomUtilisateur,
      mot_de_passe: motDePasse,
      role: 'admin'
    });
    return { admin, action: 'cree' };
  }

  if (forcerMotDePasse) {
    admin.mot_de_passe = motDePasse;
    admin.role = 'admin';
    await admin.save();
    return { admin, action: 'mot_de_passe_reinitialise' };
  }

  return { admin, action: 'existant' };
}
