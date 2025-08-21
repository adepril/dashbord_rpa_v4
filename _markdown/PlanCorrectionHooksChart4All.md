# Plan de correction de l'erreur des hooks dans Chart4All.tsx

## Problème identifié
L'erreur "React has detected a change in the order of Hooks" est causée par le fait que `useRef` (ligne 216) est défini après des conditions qui peuvent provoquer un return early (lignes 136-142 et 206-212).

## Solution
Déplacer tous les hooks au début du composant, avant toute condition ou return statement.

## Changements nécessaires

### 1. Déplacer tous les hooks au début du composant

**Actuellement :**
- Les hooks useState sont aux lignes 70-76
- useCallback est à la ligne 78
- useEffect sont aux lignes 91 et 111
- useRef est à la ligne 216 (après les conditions)

**À déplacer :**
Tous les hooks doivent être regroupés juste après la ligne 60 (début du composant).

### 2. Réorganisation du code

#### Nouvelle structure :
```typescript
export default function Chart(...) {
  // 1. Tous les hooks d'abord
  const [robots, setRobots] = useState<Robot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRobotListTooltip, setShowRobotListTooltip] = useState(false);
  const [robotDataForTooltip, setRobotDataForTooltip] = useState<...>(null);
  const [tooltipPosition, setTooltipPosition] = useState<...>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleBarClick = useCallback((data: any, index: number, event: React.MouseEvent) => {
    // ... logique existante
  }, []);

  useEffect(() => {
    // ... logique existante du carrousel
  }, []);

  useEffect(() => {
    // ... logique existante du défilement
  }, [robots, isPaused]);

  useEffect(() => {
    // ... logique existante du click outside
  }, [showRobotListTooltip, setShowRobotListTooltip, setRobotDataForTooltip, setTooltipPosition]);

  // 2. Les conditions de return viennent après
  if (!data1 || !data1['NB UNITES DEPUIS DEBUT DU MOIS']) {
    return <div>...</div>;
  }

  // 3. Le reste de la logique
  const currentDate = new Date();
  // ... reste du code

  // 4. Vérification finale
  if (chartData.every(item => item.valeur === 0)) {
    return <div>...</div>;
  }

  // 5. Rendu final
  return (...);
}
```

### 3. Lignes spécifiques à déplacer

- **Lignes 70-76** : Déplacer les useState au début
- **Ligne 78** : Déplacer useCallback au début  
- **Lignes 91-128** : Déplacer les useEffect au début
- **Ligne 216** : Déplacer useRef au début avec les autres hooks

### 4. Aucune logique fonctionnelle ne change
Cette modification est purement structurelle - aucune logique métier n'est modifiée.

## Étapes d'implémentation

1. **Copier tous les hooks** vers le début du composant (lignes 61-80)
2. **Déplacer les conditions de return** après les hooks (lignes 81+)
3. **Conserver l'ordre exact** des hooks pour éviter d'autres problèmes
4. **Tester** en cliquant sur les boutons N, N-1, N-2, N-3

## Vérification
Après modification, l'erreur des hooks devrait disparaître et les boutons de changement de mois devraient fonctionner correctement.