/* Point d'entrée du serveur Learn-Cobol. */

import { config } from './src/config/env.js';
import { connecterBase, fermerBase } from './src/config/database.js';
import { assurerAdmin } from './src/services/admin.service.js';
import { creerApp } from './src/app.js';

async function demarrer() {
  await connecterBase();

  const { admin, action } = await assurerAdmin();
  if (action === 'cree') {
    console.log(`[admin] compte « ${admin.nom_utilisateur} » créé depuis le .env`);
  } else {
    console.log(`[admin] compte « ${admin.nom_utilisateur} » déjà présent`);
  }

  const serveur = creerApp().listen(config.port, () => {
    console.log(`[http] API      → http://localhost:${config.port}/api`);
    console.log(`[http] aperçu   → http://localhost:${config.port}/frontend/`);
    console.log(`[http] env      → ${config.environnement}`);
  });

  const arreter = async (signal) => {
    console.log(`\n[arrêt] signal ${signal} reçu…`);
    serveur.close(async () => {
      await fermerBase();
      console.log('[arrêt] terminé');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => arreter('SIGINT'));
  process.on('SIGTERM', () => arreter('SIGTERM'));
}

demarrer().catch((err) => {
  console.error('[démarrage] échec :', err.message);
  process.exit(1);
});
