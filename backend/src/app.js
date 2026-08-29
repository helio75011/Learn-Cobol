/* Application Express : API sous /api, et service du frontend d'aperçu. */

import express from 'express';
import cors from 'cors';
import { routesApi } from './routes/index.js';
import { routeInconnue, gestionnaireErreurs } from './middlewares/erreurs.js';
import { DOSSIER_FRONTEND, DOSSIER_DATA } from './config/env.js';

export function creerApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // Journal minimal des appels API.
  app.use('/api', (req, _res, suite) => {
    console.log(`[api] ${req.method} ${req.originalUrl}`);
    suite();
  });

  app.use('/api', routesApi);

  // Le frontend d'aperçu, servi par le même serveur (plus besoin de python -m http.server).
  app.use('/frontend', express.static(DOSSIER_FRONTEND));
  // Chemin conservé pour que le fetch relatif de frontend/app.js continue de fonctionner.
  app.use('/backend/data', express.static(DOSSIER_DATA));
  app.get('/', (_req, res) => res.redirect('/frontend/'));

  app.use(routeInconnue);
  app.use(gestionnaireErreurs);

  return app;
}
