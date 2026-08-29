/* Erreur applicative portant un code HTTP, interceptée par le middleware d'erreurs. */

export class ErreurHttp extends Error {
  constructor(statut, message, details = null) {
    super(message);
    this.name = 'ErreurHttp';
    this.statut = statut;
    this.details = details;
  }

  static requeteInvalide(message, details) { return new ErreurHttp(400, message, details); }
  static nonAuthentifie(message = 'Authentification requise.') { return new ErreurHttp(401, message); }
  static interdit(message = 'Accès refusé.') { return new ErreurHttp(403, message); }
  static introuvable(message = 'Ressource introuvable.') { return new ErreurHttp(404, message); }
}
