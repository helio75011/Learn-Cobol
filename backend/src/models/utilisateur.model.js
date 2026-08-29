/* Utilisateur — pour l'instant un compte admin unique, défini dans le .env.
   Le schéma prévoit déjà le rôle « apprenant » pour l'ouverture future des comptes. */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const TOURS_BCRYPT = 12;

const utilisateurSchema = new mongoose.Schema({
  nom_utilisateur: {
    type: String,
    required: [true, "Le nom d'utilisateur est obligatoire."],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 40
  },
  mot_de_passe: {
    type: String,
    required: [true, 'Le mot de passe est obligatoire.'],
    select: false          // jamais renvoyé par défaut
  },
  role: {
    type: String,
    enum: ['admin', 'apprenant'],
    default: 'apprenant'
  },
  derniere_connexion_le: { type: Date, default: null }
}, {
  timestamps: { createdAt: 'cree_le', updatedAt: 'modifie_le' },
  versionKey: false
});

/* Hachage transparent : on assigne un mot de passe en clair, il est stocké haché. */
/* Hook asynchrone : Mongoose se fie à la promesse, pas à un callback `next`. */
utilisateurSchema.pre('save', async function hacherMotDePasse() {
  if (!this.isModified('mot_de_passe')) return;
  this.mot_de_passe = await bcrypt.hash(this.mot_de_passe, TOURS_BCRYPT);
});

utilisateurSchema.methods.verifierMotDePasse = function verifierMotDePasse(candidat) {
  return bcrypt.compare(candidat, this.mot_de_passe);
};

utilisateurSchema.methods.enPublic = function enPublic() {
  return {
    id: this._id.toString(),
    nom_utilisateur: this.nom_utilisateur,
    role: this.role,
    cree_le: this.cree_le,
    derniere_connexion_le: this.derniere_connexion_le
  };
};

export const Utilisateur = mongoose.model('Utilisateur', utilisateurSchema);
