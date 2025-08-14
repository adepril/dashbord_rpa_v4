# Affichage de la liste des robots dans un Tooltip ou une Modale

Suite à la demande de l'utilisateur de déplacer l'affichage de la liste des robots d'un tooltip au survol à un affichage au double-clic sur les barres du graphique, deux solutions principales ont été envisagées :

## Solution 1: Afficher un Tooltip près de la barre double-cliquée

Cette solution consiste à faire apparaître un petit encadré (tooltip) contenant la liste des robots agrégés, positionné à proximité immédiate de la barre sur laquelle l'utilisateur a double-cliqué.

### Fichiers impactés potentiellement :
*   `components/Chart4All.tsx`:
    *   **Gestion de l'état** : Ajout d'un état local (`useState`) pour stocker les données (`date`, `valeur`, `aggregatedRobotNames`) de la barre double-cliquée, ainsi que la position (`x`, `y`) du clic pour le positionnement du tooltip.
    *   **Gestion de l'événement** : Modification du composant `Bar` de Recharts pour inclure un gestionnaire d'événement `onDoubleClick` qui capturera les données de la barre cliquée et l'emplacement du double-clic.
    *   **Fonctionnalité** : Implémentation d'une fonction `handleDoubleClick` qui sera appelée lors du double-clic. Cette fonction mettra à jour l'état contenant les données à afficher dans le tooltip.
    *   **Rendu du Tooltip** : Création d'un nouveau composant React (potentiellement un simple `div` stylisé ou une utilisation plus avancée du `Tooltip` de Recharts avec des coordonnées manuelles) qui sera rendu conditionnellement lorsque l'état des données double-cliquées est défini. Ce composant affichera la liste des `aggregatedRobotNames`. Le positionnement de ce tooltip nécessitera un calcul précis des coordonnées x et y pour qu'il apparaisse à côté de la barre.
    *   **Fermeture** : Ajout d'une logique permettant de fermer ce tooltip, par exemple en détectant un clic en dehors du tooltip ou en ajoutant un bouton de fermeture.

### Avantages :
*   **Contexte visuel** : L'information apparaît de manière très contextuelle, directement liée à la barre sur laquelle l'action a été effectuée.
*   **Moins intrusif** : Le tooltip est généralement moins grand qu'une modale, il obstrue donc moins la vue globale du graphique.

### Inconvénients :
*   **Complexité de positionnement** : La gestion du positionnement du tooltip peut être délicate, surtout si la barre cliquée est située près des bords du graphique, nécessitant des ajustements pour éviter que le tooltip ne sorte de l'écran.
*   **Superposition** : Il peut y avoir des cas où le tooltip masque des éléments importants du graphique ou d'autres tooltips.

## Solution 2: Afficher une Modale centrée sur l'écran

Cette solution propose d'afficher la liste des robots dans une fenêtre pop-up (modale) qui apparaîtrait au centre de l'écran suite au double-clic.

### Fichiers impactés potentiellement :
*   `components/Chart4All.tsx`:
    *   **Gestion de l'état** : Ajout d'un état local (`useState`) pour contrôler l'ouverture et la fermeture de la modale, et pour stocker les `aggregatedRobotNames` de la barre double-cliquée.
    *   **Gestion de l'événement** : Similaire à la solution 1, modification du composant `Bar` pour inclure `onDoubleClick`.
    *   **Fonctionnalité** : Implémentation d'une fonction `handleDoubleClick` qui ouvrira la modale et lui passera les données nécessaires.
    *   **Rendu de la Modale** : Utilisation d'un composant de modale existant (comme `components/ui/dialog.tsx` si notre UI toolkit en fournit un) ou création d'un nouveau composant `Modal` qui gérera l'affichage en surimpression au centre de l'écran.
    *   **Fermeture** : La modale inclura généralement un bouton de fermeture (ex: "X" ou "Fermer") et/ou une gestion du clic en dehors de la modale pour la masquer.
*   `components/ui/dialog.tsx` (si réutilisation ou adaptation) : Ce fichier pourrait être utilisé ou adapté pour le composant de la modale elle-même.

### Avantages :
*   **Simplicité de positionnement** : La gestion du positionnement est beaucoup plus simple, car la modale est généralement centrée sur l'écran et ne nécessite pas de calculs complexes basés sur la position du clic.
*   **Clarté et focus** : La modale est un élément distinct et captivant, assurant que l'utilisateur se concentre sur les informations qu'elle contient.
*   **Réutilisation** : Si un composant de modale existe déjà, il peut être réutilisé, ce qui réduit le temps de développement.

### Inconvénients :
*   **Intrusivité** : La modale peut être perçue comme plus intrusive, car elle couvre une partie significative de l'écran et interrompt le flux de l'utilisateur.
*   **Moins contextuel visuellement** : Bien qu'elle affiche les données pertinentes, la modale n'est pas directement liée visuellement à la barre cliquée comme le serait un tooltip.