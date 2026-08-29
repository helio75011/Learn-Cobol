/* Learn-Cobol — client de test du format d'unité (schema_version 2.0).
   But : visualiser et jouer une unité JSON, pas un moteur de jeu définitif. */

const CHEMIN_DEFAUT = '../backend/data/COBOL/1-introduction.json';

const $ = (sel, racine = document) => racine.querySelector(sel);
const creer = (balise, cls, txt) => {
  const n = document.createElement(balise);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
};
const melanger = (tab) => tab.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(p => p[1]);
const normaliser = (s) => String(s).trim().replace(/\s+/g, ' ');

let unite = null;      // unité chargée
let partie = null;     // session de leçon en cours
const leconsFaites = new Set();

/* ------------------------------------------------------------------ */
/* Chargement                                                          */
/* ------------------------------------------------------------------ */

async function init() {
  try {
    const rep = await fetch(CHEMIN_DEFAUT, { cache: 'no-store' });
    if (!rep.ok) throw new Error('HTTP ' + rep.status);
    charger(await rep.json());
  } catch (err) {
    $('#chargeur').hidden = false;
    $('#chargeur-msg').textContent =
      'Chargement automatique impossible (' + err.message + '). ' +
      'Lance un serveur local, ou choisis un fichier JSON ci-dessous.';
  }
}

$('#fichier').addEventListener('change', (ev) => {
  const f = ev.target.files[0];
  if (!f) return;
  const lecteur = new FileReader();
  lecteur.onload = () => {
    try {
      charger(JSON.parse(lecteur.result));
      $('#chargeur').hidden = true;
    } catch (err) {
      $('#chargeur-msg').textContent = 'JSON invalide : ' + err.message;
    }
  };
  lecteur.readAsText(f, 'utf-8');
});

function charger(donnees) {
  unite = donnees;
  document.title = unite.titre + ' — Learn-Cobol';
  rendreAccueil();
  ecran('accueil');
}

function ecran(nom) {
  ['accueil', 'theorie', 'exo', 'bilan', 'cartes']
    .forEach(n => { $('#ecran-' + n).hidden = (n !== nom); });
  window.scrollTo(0, 0);
}

/* ------------------------------------------------------------------ */
/* Accueil                                                             */
/* ------------------------------------------------------------------ */

function rendreAccueil() {
  const exos = unite.lecons.reduce((a, l) => a + l.exercices.length, 0);
  $('#a-categorie').textContent = unite.categorie;
  $('#a-ordre').textContent = unite.ordre;
  $('#a-niveau').textContent = unite.parcours.niveau;
  $('#a-titre').textContent = unite.titre;
  $('#a-resume').textContent = unite.resume;
  $('#a-lecons').textContent = unite.lecons.length;
  $('#a-exos').textContent = exos;
  $('#a-cartes').textContent = unite.cartes_revision.length;
  $('#a-xp').textContent = unite.gamification.xp_total;
  $('#a-duree').textContent = unite.parcours.duree_estimee_minutes;

  const b = unite.gamification.badge;
  const zoneBadge = $('#a-badge');
  zoneBadge.innerHTML = '';
  zoneBadge.append(
    creer('div', null, b.icone + ' ' + b.titre),
    creer('div', 'muet', b.description)
  );

  const ul = $('#a-objectifs');
  ul.innerHTML = '';
  unite.objectifs_pedagogiques.forEach(o => ul.append(creer('li', null, o)));

  const parcours = $('#a-parcours');
  parcours.innerHTML = '';
  unite.lecons.forEach(l => {
    const btn = creer('button', 'lecon' + (leconsFaites.has(l.id) ? ' faite' : ''));
    const bloc = creer('div');
    bloc.append(
      creer('div', null, l.titre),
      creer('div', 'meta', l.duree_estimee_minutes + ' min · ' + l.exercices.length + ' exercices · ' + l.xp + ' XP')
    );
    btn.append(creer('div', 'num', leconsFaites.has(l.id) ? '★' : String(l.ordre)), bloc);
    btn.addEventListener('click', () => ouvrirLecon(l));
    parcours.append(btn);
  });

  majJauges(null);
}

function majJauges(p) {
  $('#jauge-coeurs').hidden = !p;
  $('#jauge-xp').hidden = !p;
  if (!p) return;
  $('#coeurs').textContent = '♥'.repeat(p.coeurs) + '·'.repeat(unite.gamification.coeurs_max - p.coeurs);
  $('#xp').textContent = p.xp;
}

/* ------------------------------------------------------------------ */
/* Théorie                                                             */
/* ------------------------------------------------------------------ */

function ouvrirLecon(lecon) {
  partie = {
    lecon,
    ordre: lecon.exercices.slice(),
    idx: 0,
    xp: 0,
    coeurs: unite.gamification.coeurs_max,
    reponse: null,
    valide: false
  };
  $('#t-surtitre').textContent =
    'Leçon ' + lecon.ordre + ' / ' + unite.lecons.length + ' · ' + lecon.duree_estimee_minutes + ' min';
  $('#t-titre').textContent = lecon.titre;
  const cible = $('#t-blocs');
  cible.innerHTML = '';
  lecon.theorie.forEach(bloc => cible.append(rendreBloc(bloc)));
  majJauges(partie);
  ecran('theorie');
}

function rendreBloc(bloc) {
  const carte = creer('div', 'carte bloc');
  if (bloc.titre) carte.append(creer('h3', null, bloc.titre));

  switch (bloc.type) {
    case 'paragraphe':
      carte.append(creer('p', null, bloc.texte));
      break;

    case 'liste': {
      const ul = creer('ul');
      bloc.elements.forEach(e => ul.append(creer('li', null, e)));
      carte.append(ul);
      break;
    }

    case 'tableau': {
      const enveloppe = creer('div', 'table-scroll');
      const t = creer('table');
      const thead = creer('thead');
      const trh = creer('tr');
      bloc.colonnes.forEach(c => trh.append(creer('th', null, c)));
      thead.append(trh);
      const tbody = creer('tbody');
      bloc.lignes.forEach(ligne => {
        const tr = creer('tr');
        ligne.forEach(c => tr.append(creer('td', null, c)));
        tbody.append(tr);
      });
      t.append(thead, tbody);
      enveloppe.append(t);
      carte.append(enveloppe);
      break;
    }

    case 'definitions':
      bloc.elements.forEach(e => {
        const d = creer('div', 'def');
        d.append(creer('b', null, e.terme), creer('span', null, ' — ' + e.definition));
        if (e.exemples && e.exemples.length) {
          d.append(creer('div', 'ex', 'ex. ' + e.exemples.join(' · ')));
        }
        carte.append(d);
      });
      break;

    case 'divisions': {
      const ol = creer('ol');
      bloc.elements.slice().sort((a, b) => a.ordre - b.ordre).forEach(e => {
        const li = creer('li');
        li.append(creer('b', null, e.nom), creer('span', null, ' — ' + e.role));
        ol.append(li);
      });
      carte.append(ol);
      break;
    }

    case 'note':
      carte.className = 'carte bloc note';
      carte.append(creer('p', null, bloc.texte));
      break;

    default:
      carte.append(creer('pre', null, JSON.stringify(bloc, null, 2)));
  }
  return carte;
}

function retourAccueil() {
  partie = null;
  rendreAccueil();
  ecran('accueil');
}

$('#btn-commencer').addEventListener('click', () => rendreExercice());
$('#btn-quitter-theorie').addEventListener('click', retourAccueil);
$('#btn-abandon').addEventListener('click', retourAccueil);

/* ------------------------------------------------------------------ */
/* Exercices                                                           */
/* ------------------------------------------------------------------ */

function rendreExercice() {
  const p = partie;
  const exo = p.ordre[p.idx];
  p.reponse = null;
  p.valide = false;

  $('#jauge').style.width = (p.idx / p.ordre.length * 100) + '%';
  $('#e-surtitre').textContent = p.lecon.titre + ' · ' + (p.idx + 1) + '/' + p.ordre.length +
    ' · ' + exo.type + ' · difficulté ' + exo.difficulte + ' · ' + exo.xp + ' XP';
  $('#e-consigne').textContent = exo.consigne;
  $('#e-retour').hidden = true;
  $('#btn-valider').hidden = false;
  $('#btn-valider').disabled = true;
  $('#btn-suite').hidden = true;

  const zone = $('#e-zone');
  zone.innerHTML = '';
  (BATISSEURS[exo.type] || batirInconnu)(exo, zone);

  majJauges(p);
  ecran('exo');
}

const activerValidation = (ok) => { $('#btn-valider').disabled = !ok; };

const BATISSEURS = {

  qcm(exo, zone) {
    const multiple = exo.reponse.length > 1;
    const choix = new Set();
    const conteneur = creer('div', 'options');
    if (multiple) conteneur.append(creer('p', 'muet', 'Plusieurs bonnes réponses.'));
    exo.options.forEach(o => {
      const b = creer('button', 'option', o.texte);
      b.dataset.id = o.id;
      b.addEventListener('click', () => {
        if (partie.valide) return;
        if (multiple) {
          if (choix.has(o.id)) choix.delete(o.id); else choix.add(o.id);
        } else {
          choix.clear();
          choix.add(o.id);
        }
        conteneur.querySelectorAll('.option')
          .forEach(x => x.classList.toggle('choisie', choix.has(x.dataset.id)));
        partie.reponse = [...choix];
        activerValidation(choix.size > 0);
      });
      conteneur.append(b);
    });
    zone.append(conteneur);
  },

  vrai_faux(exo, zone) {
    const conteneur = creer('div', 'options duo');
    [['Vrai', true], ['Faux', false]].forEach(paire => {
      const b = creer('button', 'option', paire[0]);
      b.dataset.id = String(paire[1]);
      b.addEventListener('click', () => {
        if (partie.valide) return;
        partie.reponse = paire[1];
        conteneur.querySelectorAll('.option')
          .forEach(x => x.classList.toggle('choisie', x.dataset.id === String(paire[1])));
        activerValidation(true);
      });
      conteneur.append(b);
    });
    zone.append(conteneur);
  },

  association(exo, zone) {
    const droites = melanger(exo.paires.map(p => p.droite));
    const conteneur = creer('div', 'paires');
    const selects = [];
    exo.paires.forEach(paire => {
      const ligne = creer('div', 'paire');
      ligne.append(creer('span', null, paire.gauche));
      const sel = creer('select');
      const vide = creer('option', null, '— choisir —');
      vide.value = '';
      sel.append(vide);
      droites.forEach(d => {
        const opt = creer('option', null, d);
        opt.value = d;
        sel.append(opt);
      });
      sel.addEventListener('change', () => {
        partie.reponse = selects.map(s => s.value);
        activerValidation(selects.every(s => s.value !== ''));
      });
      selects.push(sel);
      ligne.append(sel);
      conteneur.append(ligne);
    });
    zone.append(conteneur);
  },

  remise_en_ordre(exo, zone) {
    const cible = creer('div', 'ordre-cible');
    const reserve = creer('div', 'reserve');
    const choisis = [];

    const rafraichir = () => {
      cible.innerHTML = '';
      choisis.forEach((id, rang) => {
        const source = exo.elements.find(e => e.id === id);
        const j = creer('button', 'jeton', (rang + 1) + '. ' + source.texte);
        j.addEventListener('click', () => {
          if (partie.valide) return;
          choisis.splice(rang, 1);
          rafraichir();
        });
        cible.append(j);
      });
      reserve.querySelectorAll('.jeton').forEach(j => { j.disabled = choisis.includes(j.dataset.id); });
      partie.reponse = choisis.slice();
      activerValidation(choisis.length === exo.elements.length);
    };

    melanger(exo.elements.slice()).forEach(e => {
      const j = creer('button', 'jeton', e.texte);
      j.dataset.id = e.id;
      j.addEventListener('click', () => {
        if (partie.valide) return;
        choisis.push(e.id);
        rafraichir();
      });
      reserve.append(j);
    });

    zone.append(cible, reserve);
    rafraichir();
  },

  texte_a_trous(exo, zone) {
    const ligne = creer('p', 'texte-trous');
    const champs = [];
    exo.texte.split(/(\{\{\d+\}\})/g).forEach(m => {
      if (/^\{\{\d+\}\}$/.test(m)) {
        const inp = creer('input', 'trou');
        inp.type = 'text';
        inp.size = 12;
        inp.addEventListener('input', () => {
          partie.reponse = champs.map(c => c.value);
          activerValidation(champs.every(c => c.value.trim() !== ''));
        });
        champs.push(inp);
        ligne.append(inp);
      } else if (m) {
        ligne.append(document.createTextNode(m));
      }
    });
    zone.append(ligne);
  },

  saisie_libre(exo, zone) {
    const inp = creer('input');
    inp.type = 'text';
    inp.size = 32;
    inp.addEventListener('input', () => {
      partie.reponse = inp.value;
      activerValidation(inp.value.trim() !== '');
    });
    inp.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && !$('#btn-valider').disabled) valider();
    });
    zone.append(inp);
    setTimeout(() => inp.focus(), 30);
  }
};

function batirInconnu(exo, zone) {
  zone.append(creer('p', 'muet', "Type d'exercice non géré par cet aperçu : " + exo.type));
  zone.append(creer('pre', null, JSON.stringify(exo, null, 2)));
  activerValidation(true);
}

/* --- correction --- */

function corriger(exo, rep) {
  switch (exo.type) {
    case 'qcm':
      return (rep || []).slice().sort().join('|') === exo.reponse.slice().sort().join('|');
    case 'vrai_faux':
      return rep === exo.reponse;
    case 'association':
      return exo.paires.every((p, i) => normaliser(rep[i]) === normaliser(p.droite));
    case 'remise_en_ordre':
      return (rep || []).join('|') === exo.reponse.join('|');
    case 'texte_a_trous':
      return exo.reponses.every((variantes, i) =>
        variantes.some(v => normaliser(v).toLowerCase() === normaliser(rep[i] || '').toLowerCase()));
    case 'saisie_libre':
      return exo.reponses_acceptees.some(v => exo.insensible_casse
        ? normaliser(v).toLowerCase() === normaliser(rep || '').toLowerCase()
        : normaliser(v) === normaliser(rep || ''));
    default:
      return true;
  }
}

function solution(exo) {
  switch (exo.type) {
    case 'qcm':
      return exo.reponse.map(id => (exo.options.find(o => o.id === id) || {}).texte).join(' + ');
    case 'vrai_faux':
      return exo.reponse ? 'Vrai' : 'Faux';
    case 'association':
      return exo.paires.map(p => p.gauche + ' → ' + p.droite).join(' · ');
    case 'remise_en_ordre':
      return exo.reponse.map(id => (exo.elements.find(e => e.id === id) || {}).texte).join(' → ');
    case 'texte_a_trous':
      return exo.reponses.map(v => v[0]).join(' / ');
    case 'saisie_libre':
      return exo.reponses_acceptees[0];
    default:
      return '';
  }
}

function valider() {
  const p = partie;
  const exo = p.ordre[p.idx];
  const juste = corriger(exo, p.reponse);
  p.valide = true;

  if (juste) p.xp += exo.xp; else p.coeurs -= 1;

  if (exo.type === 'qcm' || exo.type === 'vrai_faux') {
    const bonnes = exo.type === 'qcm' ? exo.reponse.map(String) : [String(exo.reponse)];
    $('#e-zone').querySelectorAll('.option').forEach(b => {
      b.disabled = true;
      if (bonnes.includes(b.dataset.id)) b.classList.add('juste');
      else if (b.classList.contains('choisie')) b.classList.add('fausse');
    });
  }
  $('#e-zone').querySelectorAll('select, input, .jeton').forEach(x => { x.disabled = true; });

  const retour = $('#e-retour');
  retour.className = 'retour ' + (juste ? 'ok' : 'ko');
  retour.hidden = false;
  $('#e-verdict').textContent = juste ? 'Correct ! +' + exo.xp + ' XP' : 'Raté — un cœur perdu';
  $('#e-explication').textContent = exo.explication + (juste ? '' : '   Réponse attendue : ' + solution(exo));

  $('#btn-valider').hidden = true;
  $('#btn-suite').hidden = false;
  majJauges(p);
}

$('#btn-valider').addEventListener('click', valider);
$('#btn-suite').addEventListener('click', () => {
  const p = partie;
  if (p.coeurs <= 0) { bilan(false); return; }
  p.idx += 1;
  if (p.idx >= p.ordre.length) { bilan(true); return; }
  rendreExercice();
});

/* ------------------------------------------------------------------ */
/* Bilan                                                               */
/* ------------------------------------------------------------------ */

function bilan(reussi) {
  const p = partie;
  if (reussi) leconsFaites.add(p.lecon.id);
  $('#b-icone').textContent = reussi ? '🏆' : '💔';
  $('#b-titre').textContent = reussi ? 'Leçon terminée !' : 'Plus de cœurs…';
  $('#b-detail').textContent = reussi
    ? p.xp + ' XP sur ' + p.lecon.xp + ' · ' + p.coeurs + ' cœur(s) restant(s)'
    : 'Tu as tenu ' + (p.idx + 1) + ' exercice(s) sur ' + p.ordre.length + '. Reprends la leçon.';
  ecran('bilan');
}

$('#btn-rejouer').addEventListener('click', () => ouvrirLecon(partie.lecon));
$('#btn-accueil').addEventListener('click', retourAccueil);

/* ------------------------------------------------------------------ */
/* Cartes de révision                                                  */
/* ------------------------------------------------------------------ */

let idxCarte = 0;
let faceVerso = false;

function rendreCarte() {
  const c = unite.cartes_revision[idxCarte];
  $('#c-position').textContent = 'Carte ' + (idxCarte + 1) + ' / ' + unite.cartes_revision.length +
    ' · ' + c.concept + ' · difficulté ' + c.difficulte;
  $('#c-face').textContent = faceVerso ? c.verso : c.recto;
  $('#c-carte').classList.toggle('verso', faceVerso);
}

$('#btn-cartes').addEventListener('click', () => {
  idxCarte = 0; faceVerso = false; rendreCarte(); ecran('cartes');
});
$('#c-carte').addEventListener('click', () => { faceVerso = !faceVerso; rendreCarte(); });
$('#c-prec').addEventListener('click', () => {
  idxCarte = (idxCarte - 1 + unite.cartes_revision.length) % unite.cartes_revision.length;
  faceVerso = false; rendreCarte();
});
$('#c-suiv').addEventListener('click', () => {
  idxCarte = (idxCarte + 1) % unite.cartes_revision.length;
  faceVerso = false; rendreCarte();
});
$('#c-retour').addEventListener('click', retourAccueil);

/* ------------------------------------------------------------------ */
/* Contrôle des invariants du JSON                                     */
/* ------------------------------------------------------------------ */

$('#btn-verif').addEventListener('click', () => {
  $('#rapport').hidden = false;
  const liste = $('#rapport-liste');
  liste.innerHTML = '';

  const lignes = [];
  const ajout = (ok, txt) => lignes.push([ok, txt]);

  const xpCalcule = unite.lecons.reduce((a, l) => a + l.exercices.reduce((b, e) => b + e.xp, 0), 0);
  ajout(xpCalcule === unite.gamification.xp_total,
    'xp_total : déclaré ' + unite.gamification.xp_total + ', calculé ' + xpCalcule);

  const dureeCalculee = unite.lecons.reduce((a, l) => a + l.duree_estimee_minutes, 0);
  ajout(dureeCalculee === unite.parcours.duree_estimee_minutes,
    'durée : déclarée ' + unite.parcours.duree_estimee_minutes + ' min, calculée ' + dureeCalculee + ' min');

  unite.lecons.forEach(l => {
    const s = l.exercices.reduce((a, e) => a + e.xp, 0);
    ajout(s === l.xp, 'leçon « ' + l.titre + ' » : xp ' + l.xp + ' vs somme des exercices ' + s);
    ajout(l.duree_estimee_minutes >= 3 && l.duree_estimee_minutes <= 5,
      'leçon « ' + l.titre + ' » : ' + l.duree_estimee_minutes + ' min (format 3-5 min)');
  });

  const registre = new Set(unite.concepts.map(c => c.id));
  const inconnus = new Set();
  const utilises = new Set();
  unite.lecons.forEach(l => l.exercices.forEach(e => (e.concepts || []).forEach(c => {
    utilises.add(c);
    if (!registre.has(c)) inconnus.add(c);
  })));
  unite.cartes_revision.forEach(c => {
    utilises.add(c.concept);
    if (!registre.has(c.concept)) inconnus.add(c.concept);
  });
  ajout(inconnus.size === 0, inconnus.size
    ? 'concepts hors registre : ' + [...inconnus].join(', ')
    : 'tous les concepts référencés existent dans le registre');
  const orphelins = [...registre].filter(c => !utilises.has(c));
  ajout(orphelins.length === 0, orphelins.length
    ? 'concepts jamais utilisés : ' + orphelins.join(', ')
    : 'aucun concept orphelin');

  const idsLecons = new Set(unite.lecons.map(l => l.id));
  const cartesKo = unite.cartes_revision.filter(c => !idsLecons.has(c.lecon_id));
  ajout(cartesKo.length === 0, cartesKo.length
    ? 'cartes avec lecon_id inconnu : ' + cartesKo.map(c => c.id).join(', ')
    : 'toutes les cartes pointent vers une leçon existante');

  const typesVus = new Set();
  unite.lecons.forEach(l => l.exercices.forEach(e => typesVus.add(e.type)));
  const nonGeres = [...typesVus].filter(t => !Object.keys(BATISSEURS).includes(t));
  ajout(nonGeres.length === 0, nonGeres.length
    ? "types non gérés par l'aperçu : " + nonGeres.join(', ')
    : "types d'exercices présents : " + [...typesVus].join(', '));

  lignes.forEach(paire => {
    const li = creer('li');
    li.append(creer('span', paire[0] ? 'ok-txt' : 'ko-txt', paire[0] ? '✔ ' : '✘ '),
              creer('span', null, paire[1]));
    liste.append(li);
  });
});

init();
