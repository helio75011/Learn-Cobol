import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { authentifier } from '../middlewares/authentification.js';

export const routesAuth = Router();

routesAuth.post('/connexion', auth.connexion);
routesAuth.get('/moi', authentifier, auth.moi);
