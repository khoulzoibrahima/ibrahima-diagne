# Ibrahima Diagne

Site statique pour les archives musicales d'Ibrahima Diagne.

## Déploiement

Le site est déployé avec GitHub Pages via le workflow `.github/workflows/pages.yml`.

URL de test attendue :

```txt
https://khoulzoibrahima.github.io/ibrahima-diagne/
```

Le site peut aussi être déployé sur LWS via FTP avec le workflow `.github/workflows/deploy-lws.yml`.

Secrets GitHub à créer dans `Settings` > `Secrets and variables` > `Actions` :

```txt
LWS_FTP_SERVER
LWS_FTP_USERNAME
LWS_FTP_PASSWORD
```

Le déploiement LWS envoie les fichiers à la racine FTP avec `server-dir: ./`.
