/* Progression — un document par couple (utilisateur, unité).
   Source de vérité des XP et des leçons accomplies : les totaux sont dérivés
   du tableau `lecons`, jamais saisis par le client. */

import mongoose from 'mongoose';

const leconSchema = new mongoose.Schema({
  lecon_id: { type: String, required: true },
  titre: { type: String, default: '' },
  reussie: { type: Boolean, default: false },
  xp_obtenu: { type: Number, default: 0, min: 0 },   // meilleure tentative
  xp_max: { type: Number, default: 0, min: 0 },      // xp déclaré par la leçon
  coeurs_restants: { type: Number, default: 0, min: 0 },
  exercices_reussis: { type: Number, default: 0, min: 0 },
  exercices_total: { type: Number, default: 0, min: 0 },
  tentatives: { type: Number, default: 0, min: 0 },
  premiere_reussite_le: { type: Date, default: null },
  derniere_tentative_le: { type: Date, default: null }
}, { _id: false });

leconSchema.virtual('score').get(function score() {
  return this.xp_max > 0 ? Math.round((this.xp_obtenu / this.xp_max) * 100) : 0;
});

const progressionSchema = new mongoose.Schema({
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
    index: true
  },
  unite_id: { type: String, required: true },
  categorie: { type: String, required: true },
  titre_unite: { type: String, default: '' },
  xp_max_unite: { type: Number, default: 0, min: 0 },
  lecons_total: { type: Number, default: 0, min: 0 },
  lecons: { type: [leconSchema], default: [] },
  commencee_le: { type: Date, default: Date.now },
  terminee_le: { type: Date, default: null }
}, {
  timestamps: { createdAt: 'cree_le', updatedAt: 'modifie_le' },
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/* Une seule progression par unité et par utilisateur. */
progressionSchema.index({ utilisateur: 1, unite_id: 1 }, { unique: true });

progressionSchema.virtual('xp_total').get(function xpTotal() {
  return this.lecons.reduce((somme, l) => somme + l.xp_obtenu, 0);
});

progressionSchema.virtual('lecons_reussies').get(function leconsReussies() {
  return this.lecons.filter(l => l.reussie).length;
});

progressionSchema.virtual('terminee').get(function terminee() {
  return this.lecons_total > 0 && this.lecons_reussies >= this.lecons_total;
});

progressionSchema.virtual('avancement').get(function avancement() {
  return this.lecons_total > 0
    ? Math.round((this.lecons_reussies / this.lecons_total) * 100)
    : 0;
});

/* Tient `terminee_le` à jour à chaque sauvegarde. */
progressionSchema.pre('save', function marquerFin() {
  if (this.terminee && !this.terminee_le) this.terminee_le = new Date();
  if (!this.terminee) this.terminee_le = null;
});

progressionSchema.methods.enPublic = function enPublic() {
  return {
    unite_id: this.unite_id,
    categorie: this.categorie,
    titre_unite: this.titre_unite,
    xp_total: this.xp_total,
    xp_max_unite: this.xp_max_unite,
    lecons_reussies: this.lecons_reussies,
    lecons_total: this.lecons_total,
    avancement: this.avancement,
    terminee: this.terminee,
    commencee_le: this.commencee_le,
    terminee_le: this.terminee_le,
    modifie_le: this.modifie_le,
    lecons: this.lecons.map(l => ({
      lecon_id: l.lecon_id,
      titre: l.titre,
      reussie: l.reussie,
      xp_obtenu: l.xp_obtenu,
      xp_max: l.xp_max,
      score: l.score,
      coeurs_restants: l.coeurs_restants,
      exercices_reussis: l.exercices_reussis,
      exercices_total: l.exercices_total,
      tentatives: l.tentatives,
      premiere_reussite_le: l.premiere_reussite_le,
      derniere_tentative_le: l.derniere_tentative_le
    }))
  };
};

export const Progression = mongoose.model('Progression', progressionSchema);
