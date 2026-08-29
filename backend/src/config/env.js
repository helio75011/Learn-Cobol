/* Chargement et validation des variables d'environnement.
   Le .env vit à la racine du projet : il est partagé avec docker-compose. */

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

const ICI = path.dirname(fileURLToPath(import.meta.url));

export const RACINE_PROJET = path.resolve(ICI, '../../..');
export const DOSSIER_BACKEND = path.resolve(ICI, '../..');
export const DOSSIER_DATA = path.join(DOSSIER_BACKEND, 'data');
export const DOSSIER_FRONTEND = path.join(RACINE_PROJET, 'frontend');

dotenv.config({ path: path.join(RACINE_PROJET, '.env'), quiet: true });

function requis(nom) {
  const valeur = process.env[nom];
  if (!valeur) {
    throw new Error(
      `Variable d'environnement manquante : ${nom}. ` +
      `Vérifie le fichier .env à la racine du projet.`
    );
  }
  return valeur;
}

const uriMongo = process.env.MONGO_URI || (
  'mongodb://' +
  encodeURIComponent(requis('MONGO_UTILISATEUR')) + ':' +
  encodeURIComponent(requis('MONGO_MOT_DE_PASSE')) + '@' +
  'localhost:' + (process.env.MONGO_PORT || '27017') + '/' +
  (process.env.MONGO_BASE || 'learn_cobol') + '?authSource=admin'
);

export const config = {
  port: Number(process.env.PORT || 3000),
  environnement: process.env.NODE_ENV || 'development',
  mongo: {
    uri: uriMongo,
    base: process.env.MONGO_BASE || 'learn_cobol'
  },
  admin: {
    nomUtilisateur: (process.env.ADMIN_NOM_UTILISATEUR || 'admin').toLowerCase(),
    motDePasse: requis('ADMIN_MOT_DE_PASSE')
  },
  jwt: {
    secret: requis('JWT_SECRET'),
    duree: process.env.JWT_DUREE || '7d'
  }
};

export const enProduction = config.environnement === 'production';
