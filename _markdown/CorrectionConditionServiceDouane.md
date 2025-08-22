# Correction de la condition d'affichage du bouton

## Problème identifié
Le bouton "Tableau des utilisateurs Douane" n'apparaît pas parce que la condition `selectedService === 'Douane'` n'est pas remplie. 

## Cause probable
Le service est probablement stocké en majuscules ("DOUANE") dans la base de données, mais la condition vérifie 'Douane' (avec une majuscule seulement au début).

## Solution proposée
Modifier la condition pour qu'elle soit insensible à la casse en utilisant `toLowerCase()`.

### Modifications nécessaires

#### Dans Chart4All.tsx
**Ligne 262** : Remplacer
```typescript
{selectedService === 'Douane' && (
```
par
```typescript
{selectedService?.toLowerCase() === 'douane' && (
```

#### Dans Chart.tsx
**Condition similaire** : Remplacer
```typescript
{data?.service === 'Douane' && (
```
par
```typescript
{data?.service?.toLowerCase() === 'douane' && (
```

## Justification
- Les données de service proviennent de la base de données et pourraient être en majuscules
- Utiliser `toLowerCase()` garantit que la comparaison fonctionne quelle que soit la casse
- Cela évite les problèmes si le service est stocké comme "DOUANE", "douane", ou "Douane"

## Étapes de validation
1. Vérifier que le bouton apparaît quand le service sélectionné est "Douane" (quelle que soit la casse)
2. Vérifier que le bouton n'apparaît pas pour les autres services
3. Tester avec différentes casse : "DOUANE", "douane", "Douane"

## Impact
- Aucun impact sur les autres fonctionnalités
- Améliore la robustesse de la condition
- Résout le problème d'affichage du bouton