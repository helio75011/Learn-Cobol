/* Accès aux unités pédagogiques stockées en JSON sous backend/data/<CATEGORIE>/.
   Les fichiers sont le contenu de référence : le service les lit et les met en
   cache, invalidé par la date de modification du fichier. */

import fs from 'node:fs/promises';
import path from 'node:path';
import { DOSSIER_DATA } from '../config/env.js';
import { ErreurHttp } from '../utils/ErreurHttp.js';

const cache = new Map();   // unite_id -> { mtimeMs, chemin, unite }

async function listerFichiers() {
  let categories;
  try {
    categories = await fs.readdir(DOSSIER_DATA, { withFileTypes: true });
  } catch {
    return [];
  }

  const fichiers = [];
  for (const categorie of categories) {
    if (!categorie.isDirectory()) continue;
    const dossier = path.join(DOSSIER_DATA, categorie.name);
    const entrees = await fs.readdir(dossier, { withFileTypes: true });
    for (const entree of entrees) {
      if (!entree.isFile() || !entree.name.endsWith('.json')) continue;
      fichiers.push({
        categorie: categorie.name,
        chemin: path.join(dossier, entree.name),
        id: path.basename(entree.name, '.json')
      });
    }
  }
  return fichiers;
}

async function lireFichier(chemin, id) {
  const stats = await fs.stat(chemin);
  const enCache = cache.get(id);
  if (enCache && enCache.mtimeMs === stats.mtimeMs) return enCache.unite;

  let unite;
  try {
    unite = JSON.parse(await fs.readFile(chemin, 'utf8'));
  } catch (err) {
    throw new ErreurHttp(500, `Unité « ${id} » illisible : ${err.message}`);
  }

  cache.set(id, { mtimeMs: stats.mtimeMs, chemin, unite });
  return unite;
}

/** Métadonnées légères d'une unité — sans la théorie ni les exercices. */
function resumer(unite, categorie) {
  const exercices = (unite.lecons || []).reduce((n, l) => n + (l.exercices?.length || 0), 0);
  return {
    id: unite.id,
    categorie,
    ordre: unite.ordre,
    titre: unite.titre,
    titre_court: unite.titre_court,
    resume: unite.resume,
    schema_version: unite.schema_version,
    niveau: unite.parcours?.niveau,
    prerequis: unite.parcours?.prerequis || [],
    duree_estimee_minutes: unite.parcours?.duree_estimee_minutes || 0,
    xp_total: unite.gamification?.xp_total || 0,
    coeurs_max: unite.gamification?.coeurs_max || 0,
    badge: unite.gamification?.badge || null,
    nombre_lecons: (unite.lecons || []).length,
    nombre_exercices: exercices,
    nombre_cartes: (unite.cartes_revision || []).length
  };
}

/** Toutes les unités, éventuellement filtrées par catégorie, triées par ordre. */
export async function listerUnites(categorie = null) {
  const fichiers = await listerFichiers();
  const cibles = categorie
    ? fichiers.filter(f => f.categorie.toLowerCase() === categorie.toLowerCase())
    : fichiers;

  const unites = [];
  for (const fichier of cibles) {
    const unite = await lireFichier(fichier.chemin, fichier.id);
    unites.push(resumer(unite, fichier.categorie));
  }
  return unites.sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
}

/** Les catégories disponibles et le nombre d'unités de chacune. */
export async function listerCategories() {
  const fichiers = await listerFichiers();
  const compte = new Map();
  for (const f of fichiers) compte.set(f.categorie, (compte.get(f.categorie) || 0) + 1);
  return [...compte.entries()]
    .map(([nom, unites]) => ({ nom, unites }))
    .sort((a, b) => a.nom.localeCompare(b.nom));
}

/** L'unité complète, théorie et exercices compris. Lève une 404 si absente. */
export async function obtenirUnite(uniteId) {
  const fichiers = await listerFichiers();
  const fichier = fichiers.find(f => f.id === uniteId);
  if (!fichier) throw ErreurHttp.introuvable(`Unité « ${uniteId} » introuvable.`);

  const unite = await lireFichier(fichier.chemin, fichier.id);
  return { unite, categorie: fichier.categorie };
}

/** Une leçon précise d'une unité. Lève une 404 si l'une ou l'autre est absente. */
export async function obtenirLecon(uniteId, leconId) {
  const { unite, categorie } = await obtenirUnite(uniteId);
  const lecon = (unite.lecons || []).find(l => l.id === leconId);
  if (!lecon) {
    throw ErreurHttp.introuvable(`Leçon « ${leconId} » introuvable dans l'unité « ${uniteId} ».`);
  }
  return { unite, lecon, categorie };
}

/** Vide le cache (utile en développement après édition manuelle d'un JSON). */
export function viderCache() {
  cache.clear();
}
