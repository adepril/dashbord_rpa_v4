# Analyse du fonctionnement du bouton « Nouvelle Demande »

## Résumé

Le bouton « Nouvelle Demande » est défini dans le composant `Dashboard.tsx`. Il permet d’ouvrir un formulaire modal pour créer une nouvelle demande de robot RPA. Voici le déroulement complet, les fonctions, les données et les fichiers impliqués :

## Déroulement détaillé

### 1. Affichage du bouton
- **Fichier** : `components/Dashboard.tsx`
- **Fonction** : Le bouton est rendu dans le composant `Dashboard` (probablement dans la barre d’outils ou en haut de la page)
- **Action** : Il possède un gestionnaire `onClick={handleOpenForm}`

### 2. Ouverture du formulaire
- **Fichier** : `components/Dashboard.tsx`
- **Fonction** : `handleOpenForm` met à jour l’état local `OpenFormNewOrder` (ou `isFormOpen`) à `true`
- **État utilisé** : `const [OpenFormNewOrder, setIsFormOpen] = useState(false);`
- **Rendu conditionnel** : Le composant `Dashboard` affiche alors le composant `MergedRequestForm` avec les props suivantes :
  ```tsx
  <MergedRequestForm
    onClose={handleCloseForm}
    type="new"
    user={user}          // données utilisateur extraites de localStorage
  />
  ```

### 3. Initialisation de `MergedRequestForm`
- **Fichier** : `components/MergedRequestForm.tsx`
- **Fonction** : Le composant initialise son état `formDataState` avec les valeurs par défaut (définies dans la prop `formData`)
- **Chargement des statuts** : Un `useEffect` appelle `fetchStatuts()` (définie dans `utils/dataFetcher.ts`) pour récupérer la liste des statuts depuis l’API `/api/citations`

### 4. Interaction utilisateur
- **Fichier** : `components/MergedRequestForm.tsx`
- **Fonction** : L’utilisateur remplit les champs (Intitulé, Description, Nb. opérations mensuelles, Temps consommé, etc.)
- **Gestion des changements** : `handleChange` met à jour `formDataState` et calcule le champ `Temps_total`

### 5. Soumission du formulaire
- **Fichier** : `components/MergedRequestForm.tsx`
- **Fonction** : Le bouton **Envoyer** déclenche `handleSubmit`
- **Validation** : `handleSubmit` vérifie les champs obligatoires, puis appelle `submitForm()`

### 6. Envoi de la demande
- **Fichier** : `components/MergedRequestForm.tsx`
- **Fonction** : `submitForm()` envoie une requête `POST` à `/api/contact` avec un corps JSON contenant :
  - `name`, `email`, `subject` (« Nouvelle demande »)
  - `message` formaté avec les valeurs du formulaire
- **Succès** :
  - Affichage d’un toast de succès (`useToast`)
  - Fermeture du modal (`onClose`)
  - Rechargement de la page (`window.location.reload()`)
- **Erreur** : Affichage d’un toast d’erreur

## Fichiers et fonctions clés

| Fichier | Fonction / composant | Rôle |
|---------|----------------------|------|
| `components/Dashboard.tsx` | `handleOpenForm`, `handleCloseForm`, état `OpenFormNewOrder` | Ouvre/ferme le formulaire |
| `components/MergedRequestForm.tsx` | `handleChange`, `handleSubmit`, `submitForm`, `fetchStatuts` | Gestion du formulaire, validation, envoi |
| `utils/dataFetcher.ts` | `fetchStatuts` | Récupère la liste des statuts depuis l’API |
| `app/api/contact/route.ts` | Route API `/api/contact` | Reçoit le POST et envoie le mail (ou stocke la demande) |
| `components/ui/dialog.tsx` | `Dialog`, `DialogContent` | Affiche le formulaire dans une fenêtre modale |
| `hooks/use-toast.ts` | `useToast` | Affiche les notifications toast |

## Remarques supplémentaires

- **Indépendance de dataStore.ts** : Le bouton ne dépend pas directement de `dataStore.ts`; ce fichier gère le cache des agences, robots et reporting mais n’est pas invoqué lors de la création d’une nouvelle demande.
- **Pré-remplissage du validateur** : Le champ *Validateur* est pré‑rempli à partir des données utilisateur (`user.userValidateur` ou `user.userSuperieur`).
- **Logique interne** : La logique de validation et de calcul du *Temps total* est entièrement contenue dans `MergedRequestForm.tsx`.

## Conclusion

En résumé, le bouton « Nouvelle Demande » déclenche l’ouverture d’un modal `MergedRequestForm`, collecte les données, les valide, les envoie via l’API `/api/contact`, puis affiche un toast de succès ou d’erreur et ferme le modal. Les fonctions clés sont `handleOpenForm`, `handleSubmit`, `submitForm` et `fetchStatuts`.