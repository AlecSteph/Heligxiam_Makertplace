# Script oral soutenance (12 minutes)

## 0:00 - 1:00 | Introduction

"Nous presentons Heligxiam Marketplace, une plateforme e-commerce en architecture microservices.  
Notre objectif etait double: respecter les contraintes academiques (SQL + NoSQL, microservices, Angular) et converger vers un niveau professionnel defendable."

## 1:00 - 2:30 | Architecture globale

"Le systeme comporte:
- un frontend Angular,
- trois microservices Node/Express: auth, product, cart,
- PostgreSQL pour les donnees transactionnelles,
- MongoDB pour les evenements d'authentification.

Chaque service tourne independamment et expose son health endpoint."

## 2:30 - 4:00 | Service Auth

"Le service Auth gere inscription, connexion, refresh token, logout, profil et changement de mot de passe.
Nous avons implemente:
- JWT + refresh token rotate/revoke,
- stockage SQL des comptes et refresh tokens,
- journalisation NoSQL des evenements d'auth dans MongoDB.

Ce point repond a la contrainte NoSQL avec un cas d'usage concret et justifiable."

## 4:00 - 5:30 | Service Product

"Le service Product gere le catalogue.
Les operations d'ecriture sont protegees par:
- JWT,
- controle de role (vendeur/admin),
- verification ownership sur la boutique cible.

Nous avons aussi formalise le contrat API via OpenAPI."

## 5:30 - 7:00 | Service Cart

"Le service Cart gere les operations panier.
L'acces est protege par auth + ownership (meme utilisateur ou admin).
Nous avons commence le decouplage microservices en appelant Product par HTTP pour les informations critiques produit/stock."

## 7:00 - 8:00 | Securite

"Nos mesures:
- JWT et controle des roles,
- validation stricte des payloads,
- rate limiting,
- headers de securite via Helmet,
- CORS explicite,
- requestId dans les erreurs pour la tracabilite."

## 8:00 - 9:00 | Qualite logicielle et CI

"Nous avons mis en place:
- tests backend (unitaires + integration securite),
- pipeline CI GitHub Actions (install, lint si present, tests, build frontend),
- documentation technique par service."

## 9:00 - 10:00 | SQL vs NoSQL justification

"SQL est utilise pour les transactions et relations fortes (auth, produits, panier).
NoSQL est utilise pour les evenements d'authentification (structure evolutive, volumetrie potentielle, lectures temporelles).  
Ce choix est coherent et defendable techniquement."

## 10:00 - 11:00 | Ce que nous avons corrige par rapport a l'audit

"Nous avons corrige les points majeurs:
- securite authz,
- normalisation partielle des erreurs,
- OpenAPI,
- CI,
- tests backend,
- ajout NoSQL operationnel."

## 11:00 - 12:00 | Limites et roadmap

"Nos limites assumees:
- decouplage cross-domain encore partiel,
- couverture de tests a etendre,
- observabilite avancee (metrics/tracing) a ajouter.

Roadmap:
1) integration tests DB + concurrence,
2) decouplage complet des jointures cross-domain,
3) observabilite enterprise."
