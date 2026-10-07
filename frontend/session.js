/* Session — client de l'API Learn-Cobol (backend/src).
   Authentification JWT : le jeton est gardé dans localStorage, la progression
   vit côté serveur (MongoDB) et suit donc le compte, pas le navigateur. */

const Session = (() => {
  const CLE_JETON = 'learn-cobol.jeton';

  let jeton = localStorage.getItem(CLE_JETON) || null;
  let utilisateur = null;
  let totaux = { xp_total: 0, lecons_reussies: 0, unites_commencees: 0, unites_terminees: 0 };
  let progressionUnite = null;   // progression de l'unité affichée
  let enLigne = false;

  /* ---------------- appels HTTP ---------------- */

  async function api(chemin, options = {}) {
    const entetes = { ...(options.entetes || {}) };
    if (jeton) entetes.Authorization = 'Bearer ' + jeton;
    if (options.corps !== undefined) entetes['Content-Type'] = 'application/json';

    const rep = await fetch('/api' + chemin, {
      method: options.methode || 'GET',
      headers: entetes,
      body: options.corps !== undefined ? JSON.stringify(options.corps) : undefined,
      cache: 'no-store'
    });

    let donnees = null;
    try { donnees = await rep.json(); } catch { /* réponse vide */ }

    if (!rep.ok) {
      const err = new Error((donnees && (donnees.message || donnees.erreur)) || 'HTTP ' + rep.status);
      err.statut = rep.status;
      throw err;
    }
    return donnees;
  }

  /* ---------------- cycle de vie ---------------- */

  /** Vérifie le serveur, puis le jeton s'il y en a un. */
  async function demarrer() {
    try {
      await api('/sante');
      enLigne = true;
    } catch {
      enLigne = false;
      utilisateur = null;
      rendreEntete();
      return { enLigne: false, connecte: false };
    }

    if (jeton) {
      try {
        utilisateur = (await api('/auth/moi')).utilisateur;
        await rafraichirTotaux();
      } catch (err) {
        oublierJeton();                       // jeton expiré ou invalide
      }
    }
    rendreEntete();
    return { enLigne: true, connecte: !!utilisateur };
  }

  async function connecter(nomUtilisateur, motDePasse) {
    const rep = await api('/auth/connexion', {
      methode: 'POST',
      corps: { nom_utilisateur: nomUtilisateur, mot_de_passe: motDePasse }
    });
    jeton = rep.jeton;
    localStorage.setItem(CLE_JETON, jeton);
    utilisateur = rep.utilisateur;
    await rafraichirTotaux();
    rendreEntete();
    return utilisateur;
  }

  function oublierJeton() {
    jeton = null;
    utilisateur = null;
    progressionUnite = null;
    totaux = { xp_total: 0, lecons_reussies: 0, unites_commencees: 0, unites_terminees: 0 };
    localStorage.removeItem(CLE_JETON);
  }

  function deconnecter() {
    oublierJeton();
    rendreEntete();
  }

  /* ---------------- progression ---------------- */

  async function rafraichirTotaux() {
    if (!utilisateur) return;
    const rep = await api('/progression');
    totaux = rep.totaux;
  }

  /** Charge la progression de l'unité (le serveur la crée si besoin). */
  async function chargerUnite(uniteId) {
    if (!utilisateur) { progressionUnite = null; return null; }
    try {
      progressionUnite = (await api('/progression/' + encodeURIComponent(uniteId))).progression;
    } catch (err) {
      progressionUnite = null;
      etat('ko', 'Progression illisible : ' + err.message);
    }
    return progressionUnite;
  }

  function etatLecon(leconId) {
    if (!progressionUnite) return null;
    return progressionUnite.lecons.find(l => l.lecon_id === leconId) || null;
  }

  async function enregistrerLecon(uniteId, leconId, resultat) {
    if (!utilisateur) {
      etat('hors-ligne', 'Non connecté — cette partie n’est pas enregistrée.');
      return { ok: false };
    }
    etat('encours', 'Enregistrement…');
    try {
      const rep = await api(
        '/progression/' + encodeURIComponent(uniteId) + '/lecons/' + encodeURIComponent(leconId),
        { methode: 'PUT', corps: resultat }
      );
      progressionUnite = rep.progression;
      await rafraichirTotaux();
      rendreEntete();
      etat('ok', rep.message + ' XP enregistrés sur le compte ' + utilisateur.nom_utilisateur + '.');
      return { ok: true, lecon: rep.lecon, progression: rep.progression };
    } catch (err) {
      etat('ko', 'Échec de l’enregistrement : ' + err.message);
      return { ok: false, erreur: err.message };
    }
  }

  async function reinitialiser(uniteId) {
    await api('/progression/' + encodeURIComponent(uniteId), { methode: 'DELETE' });
    await chargerUnite(uniteId);
    await rafraichirTotaux();
    rendreEntete();
  }

  /* ---------------- affichage de l'entête ---------------- */

  function etat(classe, texte) {
    document.querySelectorAll('.etat-session').forEach(zone => {
      zone.className = 'etat etat-session etat-' + classe;
      zone.textContent = texte;
    });
  }

  function rendreEntete() {
    const $ = (s) => document.querySelector(s);
    const connecte = !!utilisateur;
    const admin = connecte && utilisateur.role === 'admin';

    $('#u-avatar').textContent = admin ? '🛡️' : (connecte ? '🎓' : '👤');
    $('#u-nom').textContent = connecte ? utilisateur.nom_utilisateur : 'Non connecté';
    $('#u-role').textContent = connecte ? utilisateur.role : (enLigne ? 'connexion requise' : 'serveur injoignable');
    $('#u-jeton').textContent = connecte ? utilisateur.role.toUpperCase() : (enLigne ? 'INVITÉ' : 'HORS LIGNE');
    $('#u-jeton').classList.toggle('jeton-admin', admin);
    $('#btn-deconnexion').hidden = !connecte;

    $('#xp-total').textContent = totaux.xp_total;
    $('#lecons-reussies').textContent = totaux.lecons_reussies;

    const bandeau = $('#bandeau');
    bandeau.className = 'bandeau ' + (connecte ? 'bandeau-ok' : 'bandeau-alerte');
    bandeau.textContent = '';
    const gras = document.createElement('b');

    if (connecte) {
      gras.textContent = 'Connecté en tant que ' + utilisateur.nom_utilisateur +
        (admin ? ' — administrateur.' : '.');
      bandeau.append(gras, document.createTextNode(
        ' Tes ' + totaux.xp_total + ' XP et tes ' + totaux.lecons_reussies +
        ' leçon(s) réussie(s) sont enregistrés sur le serveur (MongoDB), ' +
        'sous ton compte : ils te suivent d’un rechargement à l’autre.'));
    } else if (enLigne) {
      gras.textContent = 'Session fermée.';
      bandeau.append(gras, document.createTextNode(
        ' Connecte-toi pour que ta progression soit enregistrée.'));
    } else {
      gras.textContent = 'API injoignable.';
      bandeau.append(gras, document.createTextNode(
        ' Démarre le backend (npm start dans backend/) : sans lui, rien n’est enregistré.'));
    }

    document.querySelectorAll('.reserve-admin').forEach(el => { el.hidden = !admin; });
  }

  return {
    demarrer, connecter, deconnecter, chargerUnite, etatLecon,
    enregistrerLecon, reinitialiser, rendreEntete, etat, api,
    enLigne: () => enLigne,
    connecte: () => !!utilisateur,
    estAdmin: () => !!utilisateur && utilisateur.role === 'admin',
    utilisateur: () => utilisateur,
    totaux: () => totaux,
    progressionUnite: () => progressionUnite
  };
})();
