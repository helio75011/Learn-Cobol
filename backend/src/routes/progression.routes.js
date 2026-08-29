import { Router } from 'express';
import * as progression from '../controllers/progression.controller.js';
import { authentifier } from '../middlewares/authentification.js';

export const routesProgression = Router();

// Toute la progression est nominative : authentification obligatoire.
routesProgression.use(authentifier);

routesProgression.get('/', progression.resume);
routesProgression.delete('/', progression.toutReinitialiser);
routesProgression.get('/:uniteId', progression.parUnite);
routesProgression.delete('/:uniteId', progression.reinitialiserUnite);
routesProgression.put('/:uniteId/lecons/:leconId', progression.enregistrerLecon);
