/* Assemblage des routes de l'API sous /api. */

import { Router } from 'express';
import mongoose from 'mongoose';
import { routesAuth } from './auth.routes.js';
import { routesUnites } from './unite.routes.js';
import { routesProgression } from './progression.routes.js';

export const routesApi = Router();

routesApi.get('/sante', (_req, res) => {
  const etats = ['déconnecté', 'connecté', 'connexion…', 'déconnexion…'];
  res.json({
    succes: true,
    service: 'learn-cobol-api',
    mongo: etats[mongoose.connection.readyState] || 'inconnu',
    horodatage: new Date().toISOString()
  });
});

routesApi.use('/auth', routesAuth);
routesApi.use('/unites', routesUnites);
routesApi.use('/progression', routesProgression);
