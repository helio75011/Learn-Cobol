import { Router } from 'express';
import * as unite from '../controllers/unite.controller.js';

export const routesUnites = Router();

routesUnites.get('/categories', unite.categories);      // avant /:uniteId
routesUnites.get('/', unite.lister);
routesUnites.get('/:uniteId', unite.obtenir);
routesUnites.get('/:uniteId/cartes', unite.cartes);
routesUnites.get('/:uniteId/lecons/:leconId', unite.obtenirLecon);
