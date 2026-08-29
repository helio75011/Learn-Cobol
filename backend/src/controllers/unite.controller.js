/* Exposition du contenu pédagogique (lecture seule, servi depuis les JSON). */

import * as unites from '../services/unite.service.js';

/* GET /api/unites?categorie=COBOL */
export async function lister(req, res) {
  const liste = await unites.listerUnites(req.query.categorie || null);
  res.json({ succes: true, nombre: liste.length, unites: liste });
}

/* GET /api/unites/categories */
export async function categories(_req, res) {
  res.json({ succes: true, categories: await unites.listerCategories() });
}

/* GET /api/unites/:uniteId */
export async function obtenir(req, res) {
  const { unite, categorie } = await unites.obtenirUnite(req.params.uniteId);
  res.json({ succes: true, categorie, unite });
}

/* GET /api/unites/:uniteId/lecons/:leconId */
export async function obtenirLecon(req, res) {
  const { lecon, categorie } = await unites.obtenirLecon(req.params.uniteId, req.params.leconId);
  res.json({ succes: true, categorie, unite_id: req.params.uniteId, lecon });
}

/* GET /api/unites/:uniteId/cartes */
export async function cartes(req, res) {
  const { unite } = await unites.obtenirUnite(req.params.uniteId);
  res.json({
    succes: true,
    unite_id: unite.id,
    nombre: (unite.cartes_revision || []).length,
    cartes: unite.cartes_revision || []
  });
}
