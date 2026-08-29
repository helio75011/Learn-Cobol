/* Progression de l'utilisateur : XP et leçons accomplies, persistés dans Mongo.

   Règle : le client annonce un résultat de leçon, le serveur le confronte
   toujours au JSON de l'unité (leçon existante, XP et cœurs plafonnés).
   Seule la meilleure tentative est conservée. */

import { Progression } from '../models/progression.model.js';
import * as unites from '../services/unite.service.js';
import { ErreurHttp } from '../utils/ErreurHttp.js';

const borner = (valeur, min, max) => Math.min(Math.max(Number(valeur) || 0, min), max);

/** Récupère la progression d'une unité, en la créant au besoin. */
async function progressionDe(utilisateurId, uniteId) {
  const { unite, categorie } = await unites.obtenirUnite(uniteId);

  const progression = await Progression.findOneAndUpdate(
    { utilisateur: utilisateurId, unite_id: unite.id },
    {
      $setOnInsert: {
        utilisateur: utilisateurId,
        unite_id: unite.id,
        commencee_le: new Date()
      },
      // resynchronisé à chaque accès : le JSON de l'unité fait foi
      $set: {
        categorie,
        titre_unite: unite.titre,
        xp_max_unite: unite.gamification?.xp_total || 0,
        lecons_total: (unite.lecons || []).length
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { progression, unite };
}

/* GET /api/progression */
export async function resume(req, res) {
  const progressions = await Progression
    .find({ utilisateur: req.utilisateur._id })
    .sort({ categorie: 1, unite_id: 1 });

  const detail = progressions.map(p => p.enPublic());

  res.json({
    succes: true,
    utilisateur: req.utilisateur.enPublic(),
    totaux: {
      xp_total: detail.reduce((n, p) => n + p.xp_total, 0),
      lecons_reussies: detail.reduce((n, p) => n + p.lecons_reussies, 0),
      unites_commencees: detail.length,
      unites_terminees: detail.filter(p => p.terminee).length
    },
    progressions: detail
  });
}

/* GET /api/progression/:uniteId */
export async function parUnite(req, res) {
  const { progression } = await progressionDe(req.utilisateur._id, req.params.uniteId);
  res.json({ succes: true, progression: progression.enPublic() });
}

/* PUT /api/progression/:uniteId/lecons/:leconId
   Corps : { xp_obtenu, coeurs_restants, exercices_reussis, reussie } */
export async function enregistrerLecon(req, res) {
  const { uniteId, leconId } = req.params;
  const corps = req.body || {};

  const { unite, lecon } = await unites.obtenirLecon(uniteId, leconId);
  const { progression } = await progressionDe(req.utilisateur._id, uniteId);

  const xpMax = lecon.xp || 0;
  const exercicesTotal = (lecon.exercices || []).length;
  const coeursMax = unite.gamification?.coeurs_max || 0;

  if (corps.xp_obtenu != null && Number.isNaN(Number(corps.xp_obtenu))) {
    throw ErreurHttp.requeteInvalide('« xp_obtenu » doit être un nombre.');
  }

  const xpObtenu = borner(corps.xp_obtenu, 0, xpMax);
  const coeursRestants = borner(corps.coeurs_restants, 0, coeursMax);
  const exercicesReussis = borner(corps.exercices_reussis, 0, exercicesTotal);
  // Une leçon n'est réussie que si l'utilisateur l'a terminée avec au moins un cœur.
  const reussie = corps.reussie === true && coeursRestants > 0;

  const maintenant = new Date();
  let entree = progression.lecons.find(l => l.lecon_id === lecon.id);
  if (!entree) {
    entree = progression.lecons.create({ lecon_id: lecon.id });
    progression.lecons.push(entree);
    entree = progression.lecons[progression.lecons.length - 1];
  }

  entree.titre = lecon.titre || '';
  entree.xp_max = xpMax;
  entree.exercices_total = exercicesTotal;
  entree.tentatives += 1;
  entree.derniere_tentative_le = maintenant;

  // On ne garde que la meilleure tentative : un échec n'efface pas un succès.
  if (xpObtenu > entree.xp_obtenu) {
    entree.xp_obtenu = xpObtenu;
    entree.coeurs_restants = coeursRestants;
    entree.exercices_reussis = exercicesReussis;
  }
  if (reussie && !entree.reussie) {
    entree.reussie = true;
    entree.premiere_reussite_le = maintenant;
  }

  await progression.save();

  res.json({
    succes: true,
    message: reussie ? 'Leçon validée.' : 'Tentative enregistrée.',
    lecon: progression.enPublic().lecons.find(l => l.lecon_id === lecon.id),
    progression: progression.enPublic()
  });
}

/* DELETE /api/progression/:uniteId */
export async function reinitialiserUnite(req, res) {
  const supprimee = await Progression.findOneAndDelete({
    utilisateur: req.utilisateur._id,
    unite_id: req.params.uniteId
  });

  if (!supprimee) throw ErreurHttp.introuvable(`Aucune progression pour l'unité « ${req.params.uniteId} ».`);
  res.json({ succes: true, message: `Progression de l'unité « ${req.params.uniteId} » réinitialisée.` });
}

/* DELETE /api/progression */
export async function toutReinitialiser(req, res) {
  const { deletedCount } = await Progression.deleteMany({ utilisateur: req.utilisateur._id });
  res.json({ succes: true, message: 'Progression remise à zéro.', unites_supprimees: deletedCount });
}
