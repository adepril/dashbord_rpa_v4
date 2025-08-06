# Plan de Modification - Logique de date dans initializeReportingData — Implémenté (aligné au code du 2025-08-06)

## Contexte
~Modifier la logique de calcul de la date dans `initializeReportingData` pour que si la date du jour est le 1er jour du mois, alors `currentDate` soit positionnée au mois précédent.~

La logique du 1er jour du mois est désormais en place et utilisée par `initializeReportingData` pour caler l’affichage et les requêtes sur le mois clos.

## Résultat implémenté

La logique appliquée:
- Si la date du jour est le 1er d’un mois, on décale `currentDate` vers le dernier jour du mois précédent via `new Date(y, m, 0)`
- Les 4 mois N, N-1, N-2, N-3 sont ensuite calculés à partir de cette `currentDate`
- Les labels FR correspondants sont générés et exposés dans `cachedReportingData.monthLabels`

Références: [`utils/dataStore.ts`](utils/dataStore.ts:1)

## Explication de la logique (rappel)
1. Vérifier le 1er du mois avec `currentDate.getDate() === 1`
2. Si vrai, utiliser `new Date(année, mois, 0)` pour obtenir le dernier jour du mois précédent
3. Calculer année/mois à partir de cette date et dériver N à N-3

## Exemples de fonctionnement

### Cas 1 : Date actuelle = 01/08/2025
- Bascule → utilise 31/07/2025 comme `currentDate`
- Mois calculés: juillet 2025, juin 2025, mai 2025, avril 2025

### Cas 2 : Date actuelle = 15/08/2025
- Pas de bascule → conserve 15/08/2025
- Mois calculés: août 2025, juillet 2025, juin 2025, mai 2025

## Statut

Implémenté. La logique du 1er du mois est effective dans `initializeReportingData` et documentée dans [`_markdown/ChargementDesDonnees.md`](\_markdown/ChargementDesDonnees.md).

## Points de vérification (réalisés)

1. Logique de date: bascule effective le 1er du mois
2. Calcul des mois: N, N-1, N-2, N-3 corrects dans les deux scénarios
3. Compatibilité: structure de cache et UI conformes

## Prochaines étapes

Aucune action requise. Document conservé pour référence.