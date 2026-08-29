/* Réinitialise le compte admin sur les valeurs du .env.
   Usage : npm run admin:init */

import { connecterBase, fermerBase } from '../src/config/database.js';
import { assurerAdmin } from '../src/services/admin.service.js';

const messages = {
  cree: 'compte créé',
  mot_de_passe_reinitialise: 'mot de passe réinitialisé',
  existant: 'compte déjà présent'
};

try {
  await connecterBase();
  const { admin, action } = await assurerAdmin({ forcerMotDePasse: true });
  console.log(`[admin] « ${admin.nom_utilisateur} » : ${messages[action]}`);
} catch (err) {
  console.error('[admin] échec :', err.message);
  process.exitCode = 1;
} finally {
  await fermerBase();
}
