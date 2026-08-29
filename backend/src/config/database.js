/* Connexion Mongoose — un seul point d'entrée pour toute l'application. */

import mongoose from 'mongoose';
import { config } from './env.js';

mongoose.set('strictQuery', true);

export async function connecterBase() {
  mongoose.connection.on('connected', () =>
    console.log('[mongo] connecté à la base « ' + config.mongo.base + ' »'));
  mongoose.connection.on('error', (err) =>
    console.error('[mongo] erreur :', err.message));
  mongoose.connection.on('disconnected', () =>
    console.warn('[mongo] déconnecté'));

  await mongoose.connect(config.mongo.uri, {
    dbName: config.mongo.base,
    serverSelectionTimeoutMS: 5000
  });

  return mongoose.connection;
}

export async function fermerBase() {
  await mongoose.connection.close();
}
