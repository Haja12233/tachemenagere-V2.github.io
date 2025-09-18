// index.js (mis à jour avec les nouvelles fonctionnalités)
document.addEventListener('DOMContentLoaded', function() {
    // Configuration et variables globales
    const initialUsers = ['Anniva', 'Tina'];
    let initialLocales = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'];
    let defaultUser = null, defaultUserExpiry = null;
    const requiredCells = ['a1', 'a2', 'a3', 'c2', 'c3', 'd1'];
    let activeMenu = null;
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz7NrE1iwl4vthz2Sxx3DIOoRXrSkq8nolvjefXo-w-KdBaP948MGa19hRanVgR5EQK/exec';
    // Variables pour le suivi des tâches
    let taskHistory = []; // Pour Google Sheets
    let currentTaskIndex = 0;
    let selectedLocale = null;
    let startTime = null;
    // Nouvelles variables pour la gestion du temps
    let taskStartTime = null;
    let taskPauseTime = null;
    let taskEndTime = null;
    let isTaskPaused = false;
    let previousTaskEndTime = null; // Pour stocker l'heure de fin de la tâche précédente
    // --- NOUVEAU : Stockage pour les résultats à afficher dans le tableau ---
    let displayedTaskResults = [];

    // --- NOUVEAU : Fonction pour afficher la date courante ---
    function updateCurrentDate() {
        const dateElement = document.getElementById('current-date-display');
        if (dateElement) {
            const now = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            // Utiliser la locale française pour le formatage
            dateElement.textContent = now.toLocaleDateString('fr-FR', options);
        }
    }

    // Fonctions de gestion des données
    function saveResults() {
        const results = {};
        // Ajout de toutes les cellules nécessaires à la sauvegarde (seulement les utilisées)
        const cellsToSave = ['a1', 'a2', 'a3', 'a4', 'b4', 'c2', 'c3', 'c4', 'd1', 'd4'];
        cellsToSave.forEach(id => {
            const cell = document.getElementById(id);
            if (!cell) return;
            const contentSpan = cell.querySelector('.cell-content');
            const contentButton = cell.querySelector('button:not(.choice-button)');
            let currentValue = '', color = '';
            if (id === 'c2') {
                const locationList = cell.querySelector('.location-list');
                const contentSpanC2 = cell.querySelector('.cell-content');
                if (locationList) {
                    const locationsWithColor = Array.from(locationList.querySelectorAll('.location-item')).map(item => {
                        let c = 'none';
                        if(item.classList.contains('text-green')) c = 'green';
                        if(item.classList.contains('text-red')) c = 'red';
                        return { text: item.textContent.trim(), color: c };
                    });
                    currentValue = JSON.stringify(locationsWithColor);
                } else if (contentSpanC2) {
                    currentValue = contentSpanC2.textContent.trim();
                } else {
                    currentValue = '';
                }
            } else if (contentSpan) {
                currentValue = contentSpan.textContent.trim();
                if (cell.classList.contains('text-green')) color = 'green';
                else if (cell.classList.contains('text-red')) color = 'red';
            } else if (contentButton) {
                currentValue = contentButton.textContent.trim();
            }
            const initialText = cell.getAttribute('data-initial-text');
            if (currentValue && currentValue !== initialText) {
                results[id] = { value: currentValue, color: color };
            }
        });
        localStorage.setItem('taskResults', JSON.stringify(results));
    }
    function loadResults() {
        const savedResults = localStorage.getItem('taskResults');
        if (savedResults) {
            const results = JSON.parse(savedResults);
            for (const id in results) {
                const cell = document.getElementById(id);
                if (!cell) continue;
                if (id === 'c2') {
                    const value = results[id].value;
                    try {
                        const locationsWithColor = JSON.parse(value);
                        if (Array.isArray(locationsWithColor)) {
                            showC2LocationList();
                            const container = cell.querySelector('.location-list');
                            container.innerHTML = '';
                            locationsWithColor.forEach(loc => {
                                const locationItem = document.createElement('div');
                                locationItem.className = 'location-item';
                                locationItem.textContent = loc.text;
                                if (loc.color === 'green') {
                                    locationItem.classList.add('text-green');
                                    locationItem.dataset.colorState = '1';
                                } else if (loc.color === 'red') {
                                    locationItem.classList.add('text-red');
                                    locationItem.dataset.colorState = '2';
                                } else {
                                    locationItem.dataset.colorState = '0';
                                }
                                container.appendChild(locationItem);
                            });
                            updateC2BackgroundColor();
                        } else {
                            const contentSpan = document.createElement('span');
                            contentSpan.className = 'cell-content';
                            contentSpan.textContent = value;
                            cell.innerHTML = '';
                            cell.appendChild(contentSpan);
                            cell.classList.remove('text-green', 'text-red');
                            if (results[id].color === 'green') cell.classList.add('text-green');
                            else if (results[id].color === 'red') cell.classList.add('text-red');
                        }
                    } catch (e) {
                        const contentSpan = document.createElement('span');
                        contentSpan.className = 'cell-content';
                        contentSpan.textContent = value;
                        cell.innerHTML = '';
                        cell.appendChild(contentSpan);
                    }
                } else {
                    const contentSpan = cell.querySelector('.cell-content');
                    const contentButton = cell.querySelector('button');
                    if (contentSpan) {
                        contentSpan.textContent = results[id].value;
                        contentSpan.classList.remove('placeholder');
                        if (results[id].color === 'green') cell.classList.add('text-green');
                        else if (results[id].color === 'red') cell.classList.add('text-red');
                    } else if (contentButton) {
                        contentButton.textContent = results[id].value;
                    }
                }
            }
        }
    }
    // Fonctions utilitaires
    function createDropdownItem(text) {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        const span = document.createElement('span');
        span.className = 'dropdown-item-content';
        span.textContent = text;
        item.appendChild(span);
        return item;
    }
    function showNotification(message, isCompletion = false) {
        const notification = document.getElementById('notification-banner');
        notification.textContent = message;
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            if (isCompletion) resetAll(); // Cela va réinitialiser tout, y compris le tableau
        }, 2000);
    }
    function updateResults() {
        saveResults();
    }
    // --- MODIFIE : Fonctions de gestion de l'historique (suppression de displayTaskHistory et displayCurrentResults) ---
    function saveTaskHistory() {
        // Sauvegarde dans localStorage si nécessaire pour persistance, mais pas d'affichage
        localStorage.setItem('taskHistory', JSON.stringify(taskHistory));
        localStorage.setItem('currentTaskIndex', currentTaskIndex.toString());
        // Sauvegarder aussi les résultats à afficher
        localStorage.setItem('displayedTaskResults', JSON.stringify(displayedTaskResults));
    }
    function loadTaskHistory() {
         // Charger depuis localStorage
        const savedHistory = localStorage.getItem('taskHistory');
        const savedIndex = localStorage.getItem('currentTaskIndex');
        const savedDisplayedResults = localStorage.getItem('displayedTaskResults');
        if (savedHistory) {
            taskHistory = JSON.parse(savedHistory);
        }
        if (savedIndex) {
            currentTaskIndex = parseInt(savedIndex);
        }
        if (savedDisplayedResults) {
            displayedTaskResults = JSON.parse(savedDisplayedResults);
            renderTaskResultsTable(); // Afficher le tableau au chargement
        }
    }
    // --- NOUVEAU : Fonction pour vérifier si C2 et C3 sont "complétés" pour la locale actuelle ---
    function isC2AndC3CompletedForCurrentLocale() {
        if (!selectedLocale) return true; // Si aucune locale sélectionnée, considérer comme OK

        const c2Cell = document.getElementById('c2');
        const c3Cell = document.getElementById('c3');

        let isC2Done = false;
        let isC3Done = false;

        if (c2Cell) {
            const c2Content = c2Cell.querySelector('.cell-content');
            const c2LocationList = c2Cell.querySelector('.location-list');
            // C2 est considéré comme fait si la liste est condensée (donc n'existe plus) OU si le contenu est 'R'
            // OU si le dataset.locked est true (signifie qu'on a chargé et peut-être cliqué)
            // OU si selectedLocale est défini et que C2 n'est plus dans son état initial.
            if (!c2LocationList && c2Content) {
                 // La liste a été condensée ou C2 a été défini à 'R'
                 isC2Done = true;
            } else if (c2Content && c2Content.textContent.trim() === 'R') {
                 // Cas spécifique où C2 est directement 'R'
                 isC2Done = true;
            } else if (c2Cell.dataset.locked === "true") {
                 // La cellule a été chargée et potentiellement modifiée
                 isC2Done = true;
            }
            // Sinon, si c2LocationList existe, C2 n'est pas encore terminé
        } else {
            isC2Done = true; // Si la cellule n'existe pas, considérer comme OK (théoriquement impossible ici)
        }

        if (c3Cell) {
            const c3Content = c3Cell.querySelector('.cell-content');
            // C3 est considéré comme fait si le contenu est 'X'
            if (c3Content && c3Content.textContent.trim() === 'X') {
                isC3Done = true;
            }
        } else {
             isC3Done = true; // Si la cellule n'existe pas, considérer comme OK (théoriquement impossible ici)
        }

        return isC2Done && isC3Done;
    }

    // --- NOUVEAU : Fonction pour ajouter un résultat au tableau d'affichage ---
    function addToDisplayedResults(taskData) {
        // Récupérer les valeurs des cellules actuelles au moment de la finalisation
        const pavillon = taskData.locale || '';
        const debut = taskData.startTimeFormatted || ''; // Utiliser le format hh:mm
        const fin = taskData.endTimeFormatted || ''; // Utiliser le format hh:mm
        const utilisateur = taskData.user || '';

        // --- NOUVEAU : Vérifier les doublons de pavillon ---
        const isDuplicate = displayedTaskResults.some(result => result.pavillon === pavillon);
        if (isDuplicate) {
            alert(`Le pavillon ${pavillon} a déjà été enregistré. Veuillez choisir un pavillon différent.`);
            return; // Ne pas ajouter si c'est un doublon
        }

        // Récupérer les valeurs des cellules optionnelles AU MOMENT DE L'AJOUT
        const getCellValue = (id) => {
            const cell = document.getElementById(id);
            if (!cell) return '';
            const contentSpan = cell.querySelector('.cell-content');
            const contentButton = cell.querySelector('button');
            if (contentSpan) {
                return contentSpan.textContent.trim();
            } else if (contentButton) {
                return contentButton.textContent.trim();
            }
            return '';
        };
        const a4 = getCellValue('a4');
        // const b1 = getCellValue('b1'); // Non utilisé
        // const b2 = getCellValue('b2'); // Non utilisé
        // const b3 = getCellValue('b3'); // Non utilisé
        const b4 = getCellValue('b4');
        // const c1 = getCellValue('c1'); // Non utilisé
        const c2Raw = getCellValue('c2');
        let c2 = '';
        // Extraire le nombre de 'R' si c'est un format condensé (ex: '2R')
        if (c2Raw.includes('R')) {
            c2 = c2Raw;
        } else {
            // Si c'est une liste, compter les R rouges
             const c2Cell = document.getElementById('c2');
             const locationList = c2Cell.querySelector('.location-list');
             if (locationList) {
                 const redCount = Array.from(locationList.querySelectorAll('.location-item.text-red')).length;
                 if (redCount > 0) {
                     c2 = `${redCount}R`;
                 } else {
                     c2 = 'xR'; // ou un autre indicateur pour "ok"
                 }
             } else {
                 c2 = c2Raw;
             }
        }
        // --- MODIFIE : Capturer la valeur 'X' et la couleur de la cellule C3 ---
        const c3Cell = document.getElementById('c3');
        const c3ContentSpan = c3Cell.querySelector('.cell-content');
        let c3Value = '';
        let c3ColorClass = ''; // Pour stocker la classe de couleur
        if (c3ContentSpan && c3ContentSpan.textContent.trim() === 'X') {
            c3Value = 'X';
            // Déterminer la couleur basée sur les classes de la cellule
            if (c3Cell.classList.contains('text-green')) {
                c3ColorClass = 'text-green';
            } else if (c3Cell.classList.contains('text-red')) {
                c3ColorClass = 'text-red';
            }
            // Si X est présent mais aucune couleur spécifique n'est définie, c3ColorClass restera vide
        } else {
            // Si C3 n'a pas été cliqué ou a une autre valeur
            c3Value = c3ContentSpan ? c3ContentSpan.textContent.trim() : '';
        }
        const c4 = getCellValue('c4');
        // const d2 = getCellValue('d2'); // Non utilisé
        // const d3 = getCellValue('d3'); // Non utilisé
        const d4 = getCellValue('d4');
        // Créer un objet pour la ligne du tableau
        const tableRowData = {
            pavillon, debut, fin, utilisateur,
            a4,
            // b1, b2, b3, // Non utilisé
            b4,
            // c1, // Non utilisé
            c2,
            c3: { value: c3Value, colorClass: c3ColorClass }, // Stocker un objet avec valeur et couleur
            c4,
            // d2, d3, // Non utilisé
            d4
        };
        // Ajouter à la liste des résultats affichés
        displayedTaskResults.push(tableRowData);
        // Sauvegarder et afficher
        saveTaskHistory(); // Met à jour displayedTaskResults dans localStorage
        renderTaskResultsTable(); // --- CLÉ : Afficher/mettre à jour le tableau ---
    }
    // --- NOUVEAU : Fonction pour afficher/mettre à jour le tableau HTML ---
    function renderTaskResultsTable() {
        const container = document.getElementById('task-results-table-container');
        if (!container) return;
        if (displayedTaskResults.length === 0) {
            container.innerHTML = '<p style="margin-top: 15px; text-align: center;">Aucun résultat à afficher pour le moment.</p>';
            return;
        }
        let tableHTML = `
        <table id="task-results-table" style="width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 15px;">
            <thead>
                <tr style="background-color: #e9ecef;">
                    <th style="border: 1px solid #ddd; padding: 4px;">Pavillon</th>
                    <th style="border: 1px solid #ddd; padding: 4px;">Début</th>
                    <th style="border: 1px solid #ddd; padding: 4px;">Fin</th>
                    <th style="border: 1px solid #ddd; padding: 4px;">Utilisateur</th>
                    <th style="border: 1px solid #ddd; padding: 4px;">A4</th>
                    <!-- <th style="border: 1px solid #ddd; padding: 4px;">B1</th> --> <!-- Supprimé -->
                    <!-- <th style="border: 1px solid #ddd; padding: 4px;">B2</th> --> <!-- Supprimé -->
                    <!-- <th style="border: 1px solid #ddd; padding: 4px;">B3</th> --> <!-- Supprimé -->
                    <th style="border: 1px solid #ddd; padding: 4px;">B4</th>
                    <!-- <th style="border: 1px solid #ddd; padding: 4px;">C1</th> --> <!-- Supprimé -->
                    <th style="border: 1px solid #ddd; padding: 4px;">C2</th>
                    <th style="border: 1px solid #ddd; padding: 4px;">C3</th>
                    <th style="border: 1px solid #ddd; padding: 4px;">C4</th>
                    <!-- <th style="border: 1px solid #ddd; padding: 4px;">D2</th> --> <!-- Supprimé -->
                    <!-- <th style="border: 1px solid #ddd; padding: 4px;">D3</th> --> <!-- Supprimé -->
                    <th style="border: 1px solid #ddd; padding: 4px;">D4</th>
                </tr>
            </thead>
            <tbody>
        `;
        displayedTaskResults.forEach((row, index) => {
            tableHTML += `<tr style="border-bottom: 1px solid #ddd;">`;
            tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.pavillon || ''}</td>`;
            tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.debut || ''}</td>`;
            tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.fin || ''}</td>`;
            tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.utilisateur || ''}</td>`;
            tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.a4 || ''}</td>`;
            // tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.b1 || ''}</td>`; <!-- Supprimé -->
            // tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.b2 || ''}</td>`; <!-- Supprimé -->
            // tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.b3 || ''}</td>`; <!-- Supprimé -->
            tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.b4 || ''}</td>`;
            // tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.c1 || ''}</td>`; <!-- Supprimé -->
            tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.c2 || ''}</td>`;
            // --- MODIFIE : Afficher C3 avec la valeur 'X' et appliquer la couleur ---
            let c3Display = '';
            if (typeof row.c3 === 'object' && row.c3.value === 'X') {
                // Appliquer le style en ligne basé sur la classe de couleur capturée
                let c3Style = '';
                if (row.c3.colorClass === 'text-green') {
                    c3Style = 'color: #28a745; font-weight: bold;'; // Vert Bootstrap
                } else if (row.c3.colorClass === 'text-red') {
                    c3Style = 'color: #dc3545; font-weight: bold;'; // Rouge Bootstrap
                }
                c3Display = `<span style="${c3Style}">${row.c3.value}</span>`;
            } else {
                 // Pour la rétrocompatibilité ou d'autres valeurs
                 c3Display = typeof row.c3 === 'object' ? row.c3.value : row.c3 || '';
            }
            tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${c3Display}</td>`;
            tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.c4 || ''}</td>`;
            // tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.d2 || ''}</td>`; <!-- Supprimé -->
            // tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.d3 || ''}</td>`; <!-- Supprimé -->
            tableHTML += `<td style="border: 1px solid #ddd; padding: 4px;">${row.d4 || ''}</td>`;
            tableHTML += `</tr>`;
        });
        tableHTML += `
            </tbody>
        </table>
        `;
        container.innerHTML = tableHTML;
    }
    // Fonctions de gestion des cellules
    function resetAllExceptA1D1A3() {
        // const cellsToReset = ['a2', 'a4', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4', 'd2', 'd3', 'd4']; // Ancien
        const cellsToReset = ['a2', 'a4', 'b4', 'c2', 'c3', 'c4', 'd4']; // Cases utilisées uniquement
        cellsToReset.forEach(id => {
            const cell = document.getElementById(id);
            if (!cell) return;
            if (id === 'c2') {
                showC2Buttons();
                cell.dataset.locked = "false";
            } else {
                const initialText = cell.getAttribute('data-initial-text');
                const contentSpan = cell.querySelector('.cell-content');
                if (contentSpan) {
                    contentSpan.textContent = initialText;
                    contentSpan.classList.add('placeholder');
                    contentSpan.classList.remove('default-user');
                }
            }
            cell.classList.remove('text-green', 'text-red', 'default-user-active');
        });
        localStorage.removeItem('taskResults');
        updateResults();
    }
    function manualRefresh() {
       // const cellsToReset = ['a1', 'a2', 'a4', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4', 'd1', 'd2', 'd3', 'd4']; // Ancien
       const cellsToReset = ['a1', 'a2', 'a4', 'b4', 'c2', 'c3', 'c4', 'd1', 'd4']; // Cases utilisées uniquement
        cellsToReset.forEach(id => {
            const cell = document.getElementById(id);
            if (!cell) return;
            if (id === 'c2') {
                showC2Buttons();
                cell.dataset.locked = "false";
            } else {
                const initialText = cell.getAttribute('data-initial-text');
                const contentSpan = cell.querySelector('.cell-content');
                if (contentSpan) {
                    contentSpan.textContent = initialText;
                    contentSpan.classList.add('placeholder');
                    contentSpan.classList.remove('default-user');
                }
            }
            cell.classList.remove('text-green', 'text-red', 'default-user-active');
        });
        localStorage.removeItem('taskResults');
        defaultUser = null;
        defaultUserExpiry = null;
        localStorage.removeItem('defaultUserD1');
        updateA1Menu();
        updateD1MenuWithDefault();
        showNotification('Toutes les cases ont été réinitialisées ! 🔄');
    }
    function checkCompletion() {
        for (const id of requiredCells) {
            const cell = document.getElementById(id);
            if (!cell) return false;
            if (id === 'c2') {
                const contentSpan = cell.querySelector('.cell-content');
                const locationList = cell.querySelector('.location-list');
                if (!contentSpan && !locationList) return false;
                if (contentSpan && (contentSpan.textContent.trim().includes('R'))) {
                    return true; // Permet de terminer la tâche même si C2 est condensé
                }
                if (locationList) {
                    const locations = Array.from(locationList.querySelectorAll('.location-item')).map(item => item.textContent.trim());
                    if (locations.length > 0) return true;
                }
            } else {
                const initialText = cell.getAttribute('data-initial-text');
                const contentSpan = cell.querySelector('.cell-content');
                const contentButton = cell.querySelector('button');
                let currentValue = contentSpan ? contentSpan.textContent.trim() : (contentButton ? contentButton.textContent.trim() : '');
                if (!currentValue || currentValue === initialText) return false;
            }
        }
        // Ne pas appeler showNotification ici, c'est handleFinTask qui le fait
        // showNotification('Tâche complète ! 🎉', true);
        return true;
    }
    // Fonctions pour la cellule D1 (Utilisateur)
    function saveDefaultUser() {
        if (defaultUser) {
            localStorage.setItem('defaultUserD1', JSON.stringify({
                user: defaultUser,
                expiry: defaultUserExpiry
            }));
        }
    }
    function loadDefaultUser() {
        const defaultUserData = localStorage.getItem('defaultUserD1');
        if (defaultUserData) {
            const userData = JSON.parse(defaultUserData);
            if (userData.expiry > Date.now()) {
                defaultUser = userData.user;
                defaultUserExpiry = userData.expiry;
                const cell = document.getElementById('d1');
                cell.querySelector('.cell-content').textContent = defaultUser;
                cell.querySelector('.cell-content').classList.remove('placeholder');
                cell.querySelector('.cell-content').classList.add('default-user');
                cell.classList.add('default-user-active');
                updateD1MenuWithDefault();
            } else {
                localStorage.removeItem('defaultUserD1');
            }
        }
    }
    function setDefaultUser(name) {
        defaultUser = name;
        defaultUserExpiry = Date.now() + 28800000;
        const cell = document.getElementById('d1');
        cell.querySelector('.cell-content').textContent = defaultUser;
        cell.querySelector('.cell-content').classList.remove('placeholder');
        cell.querySelector('.cell-content').classList.add('default-user');
        cell.classList.add('default-user-active');
        saveDefaultUser();
        updateD1MenuWithDefault();
        showNotification(`Utilisateur "${defaultUser}" défini par défaut pour 8h !`);
    }
    function updateD1MenuWithDefault() {
        const menu = document.querySelector('#d1 .dropdown-menu');
        menu.innerHTML = '';
        if (defaultUser) {
            const defaultItem = createDropdownItem(`★ ${defaultUser} (par défaut)`);
            defaultItem.classList.add('default-user-item');
            menu.appendChild(defaultItem);
        }
        initialUsers.forEach(user => {
            if (user !== defaultUser) {
                menu.appendChild(createDropdownItem(user));
            }
        });
        const addItem = createDropdownItem('+');
        addItem.classList.add('add-item');
        menu.appendChild(addItem);
    }
    // Fonctions pour la cellule A1 (Locale)
    function updateA1Menu() {
        const menu = document.querySelector('#a1 .dropdown-menu');
        menu.innerHTML = '';
        initialLocales.forEach(locale => {
            menu.appendChild(createDropdownItem(locale));
        });
    }
    function showA1Buttons() {
        const a1Cell = document.getElementById('a1');
        let buttonContainer = a1Cell.querySelector('.action-buttons');
        if (!buttonContainer) {
            buttonContainer = document.createElement('div');
            buttonContainer.className = 'action-buttons';
            buttonContainer.innerHTML = `
                <button class="pause-btn" style="display:none;">PAUSE</button>
                <button class="fin-btn" style="display:none;">FIN</button>
            `;
            a1Cell.appendChild(buttonContainer);
            a1Cell.querySelector('.fin-btn').addEventListener('click', handleFinTask);
            a1Cell.querySelector('.pause-btn').addEventListener('click', handlePauseTask);
        }
    }
    // Fonctions pour la cellule C2
    function showC2Buttons() {
        const cell = document.getElementById('c2');
        cell.innerHTML = `<span class="cell-content placeholder-text">Sélectionnez Locale</span>`;
    }
    function showC2LocationList() {
        const c2Cell = document.getElementById('c2');
        c2Cell.innerHTML = `
            <div class="location-container">
                <div class="location-list"></div>
                <div class="list-add-button" id="add-locale-c2">+</div>
            </div>`;
        const addButton = c2Cell.querySelector('#add-locale-c2');
        if (addButton) {
            addButton.addEventListener('click', function(e) {
                e.stopPropagation();
                handleListAdd(c2Cell);
            });
        }
    }
    function loadControlLocationsFromSheet(locale) {
        const c2Cell = document.getElementById('c2');
        c2Cell.innerHTML = `<span class="cell-content">Chargement...</span>`;
        // Appel à Google Sheets pour récupérer les endroits à contrôler
        const url = `${SCRIPT_URL}?locale=${encodeURIComponent(locale)}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.data && data.data.length > 0) {
                    showC2LocationList();
                    const container = c2Cell.querySelector('.location-list');
                    container.innerHTML = '';
                    // Ajouter les endroits récupérés du sheet
                    data.data.forEach(location => {
                        const locationItem = document.createElement('div');
                        locationItem.className = 'location-item';
                        locationItem.textContent = location;
                        locationItem.dataset.colorState = '0';
                        container.appendChild(locationItem);
                    });
                    // Ajouter les endroits par défaut pour P1
                    if (locale === 'P1') {
                        const defaultLocations = ['Chambre', 'Terrasse'];
                        defaultLocations.forEach(location => {
                            if (!data.data.includes(location)) {
                                const locationItem = document.createElement('div');
                                locationItem.className = 'location-item';
                                locationItem.textContent = location;
                                locationItem.dataset.colorState = '0';
                                container.appendChild(locationItem);
                            }
                        });
                    }
                } else {
                    // Si aucune donnée du sheet, utiliser les valeurs par défaut
                    showC2LocationList();
                    const container = c2Cell.querySelector('.location-list');
                    container.innerHTML = '';
                    if (locale === 'P1') {
                        const defaultLocations = ['Chambre', 'Terrasse'];
                        defaultLocations.forEach(location => {
                            const locationItem = document.createElement('div');
                            locationItem.className = 'location-item';
                            locationItem.textContent = location;
                            locationItem.dataset.colorState = '0';
                            container.appendChild(locationItem);
                        });
                    } else {
                        c2Cell.innerHTML = `<span class="cell-content">R</span>`;
                        c2Cell.classList.add('text-green');
                        c2Cell.dataset.hasControl = "false";
                    }
                }
                c2Cell.dataset.locked = "false";
                updateResults();
                checkCompletion();
            })
            .catch(error => {
                console.error('Erreur de connexion à l\'API:', error);
                // En cas d'erreur, utiliser les valeurs par défaut
                showC2LocationList();
                const container = c2Cell.querySelector('.location-list');
                container.innerHTML = '';
                if (locale === 'P1') {
                    const defaultLocations = ['Chambre', 'Terrasse'];
                    defaultLocations.forEach(location => {
                        const locationItem = document.createElement('div');
                        locationItem.className = 'location-item';
                        locationItem.textContent = location;
                        locationItem.dataset.colorState = '0';
                        container.appendChild(locationItem);
                    });
                } else {
                    c2Cell.innerHTML = `<span class="cell-content">R</span>`;
                    c2Cell.classList.add('text-green');
                    c2Cell.dataset.hasControl = "false";
                }
                c2Cell.dataset.locked = "false";
                updateResults();
            });
    }
    // Fonction pour C3 (similaire à C2 mais avec des contrôles différents)
    function loadC3Controls(locale) {
        const c3Cell = document.getElementById('c3');
        // Réinitialiser C3
        c3Cell.innerHTML = `<span class="cell-content">Chargement C3...</span>`;
        c3Cell.classList.remove('text-green', 'text-red');
        // Simuler le chargement depuis une source (vous pouvez adapter selon vos besoins)
        setTimeout(() => {
            if (locale === 'P1') {
                c3Cell.innerHTML = `<span class="cell-content">Contrôle spécial P1</span>`;
            } else {
                c3Cell.innerHTML = `<span class="cell-content">Contrôle standard</span>`;
            }
            updateResults();
        }, 500);
    }
    function condenseC2List() {
        const c2Cell = document.getElementById('c2');
        const locationItems = Array.from(c2Cell.querySelectorAll('.location-item'));
        if (locationItems.length === 0) return;
        const redCount = locationItems.filter(item =>
            item.classList.contains('text-red')
        ).length;
        c2Cell.classList.remove('text-green', 'text-red');
        if (redCount > 0) {
            c2Cell.innerHTML = `<span class="cell-content">${redCount}R</span>`;
            c2Cell.classList.add('text-red');
        } else {
            c2Cell.innerHTML = `<span class="cell-content">xR</span>`;
            c2Cell.classList.add('text-green');
        }
        c2Cell.dataset.locked = "true";
        updateResults();
        checkCompletion();
    }
    function handleListAdd(cell) {
        const newLocation = prompt("Veuillez entrer le nom du nouvel endroit :");
        if (newLocation && newLocation.trim()) {
            let container = cell.querySelector('.location-list');
            if (!container) {
                showC2LocationList();
                container = cell.querySelector('.location-list');
            }
            const newLocationItem = document.createElement('div');
            newLocationItem.className = 'location-item';
            newLocationItem.textContent = newLocation.trim();
            newLocationItem.dataset.colorState = '0';
            container.appendChild(newLocationItem);
            updateResults();
        }
    }
    function handleLocationItemClick(locationItem) {
        let state = parseInt(locationItem.dataset.colorState || '0');
        state = (state + 1) % 3;
        locationItem.dataset.colorState = state;
        locationItem.classList.remove('text-green', 'text-red');
        if (state === 1) {
            locationItem.classList.add('text-green');
        } else if (state === 2) {
            locationItem.classList.add('text-red');
        }
        updateC2BackgroundColor();
        updateResults();
        checkCompletion();
    }
    function updateC2BackgroundColor() {
        const c2Cell = document.getElementById('c2');
        const locationItems = Array.from(c2Cell.querySelectorAll('.location-item'));
        c2Cell.classList.remove('text-green', 'text-red');
        if (locationItems.length > 0) {
            const hasRed = locationItems.some(item => item.classList.contains('text-red'));
            const hasGreen = locationItems.some(item => item.classList.contains('text-green'));
            if (hasRed) {
                c2Cell.classList.add('text-red');
            } else if (hasGreen) {
                c2Cell.classList.add('text-green');
            }
        }
    }
    // Nouvelle fonction pour gérer le clic sur C3
    function handleC3Click(event) {
        const cell = document.getElementById('c3');
        const content = cell.querySelector('.cell-content');
        cell.classList.remove('text-green', 'text-red');
        content.textContent = 'X';
        if (event.detail === 2) {
            cell.classList.add('text-red');
        } else if (event.detail === 1) {
            cell.classList.add('text-green');
        } else {
            content.textContent = 'X';
        }
        content.classList.remove('placeholder');
        updateResults();
        checkCompletion();
    }
    // Fonctions de gestion du temps
    function formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }
    // Nouvelle fonction pour le format hhmm
    function formatTimeHHMM(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}${minutes}`;
    }
    // Nouvelle fonction pour le format hh:mm
    function formatTimeHHMMColon(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    function handleFinTask() {
        if (!selectedLocale) {
            alert('Veuillez d\'abord choisir une locale.');
            return;
        }
        if (taskStartTime) {
            taskEndTime = new Date();
            // Stocker l'heure de fin pour la prochaine tâche
            previousTaskEndTime = taskEndTime;
            // Utiliser le format hh:mm pour les deux lors de la fin explicite
            const formattedStartTime = formatTimeHHMMColon(taskStartTime); // hh:mm
            const formattedEndTime = formatTimeHHMMColon(taskEndTime); // hh:mm
            // Mettre à jour A2 avec l'heure de début au format hh:mm
            const startTimeCell = document.getElementById('a2');
            startTimeCell.querySelector('.cell-content').textContent = formattedStartTime;
            startTimeCell.querySelector('.cell-content').classList.remove('placeholder');
            // Mettre à jour A3 avec l'heure de fin au format hh:mm
            const endTimeCell = document.getElementById('a3');
            endTimeCell.querySelector('.cell-content').textContent = formattedEndTime;
            endTimeCell.querySelector('.cell-content').classList.remove('placeholder');
            const user = document.getElementById('d1').querySelector('.cell-content').textContent;
            // --- MODIFIE : Données pour addToTaskHistory et addToDisplayedResults ---
            const taskData = {
                locale: selectedLocale,
                user: user,
                startTime: formatTime(taskStartTime), // Format complet pour Google Sheets
                endTime: formatTime(taskEndTime), // Format complet pour Google Sheets
                startTimeFormatted: formattedStartTime, // Format hh:mm pour affichage
                endTimeFormatted: formattedEndTime, // Format hh:mm pour affichage
                duration: (taskEndTime - taskStartTime) / 1000
            };
            // Ajouter à l'historique (envoi Google Sheets) et à l'affichage
            addToTaskHistory(taskData); // Cela appellera addToDisplayedResults et renderTaskResultsTable
            sendToGoogleSheet(taskData);
            showNotification(`Tâche pour ${selectedLocale} terminée ! 🎉`, false); // Ne pas réinitialiser tout de suite
            // Optionnel : Réinitialiser automatiquement après un certain temps ?
            // setTimeout(resetAll, 3000); // Réinitialise après 3 secondes

            // Réinitialiser les variables de tâche pour la prochaine
            taskStartTime = null;
            taskEndTime = null;
            selectedLocale = null;
            const a1Cell = document.getElementById('a1');
            const a1Content = a1Cell.querySelector('.cell-content');
            const initialA1Text = a1Cell.getAttribute('data-initial-text');
            a1Content.textContent = initialA1Text;
            a1Content.classList.add('placeholder');
            a1Cell.classList.remove('text-green', 'text-red');

            const finBtn = document.querySelector('.fin-btn');
            const pauseBtn = document.querySelector('.pause-btn');
            if (finBtn) finBtn.style.display = 'none';
            if (pauseBtn) pauseBtn.style.display = 'none';

            // Réinitialiser les cellules liées à la tâche (sauf A1, D1, A3)
            resetAllExceptA1D1A3();

        } else {
            alert('La tâche n\'a pas été démarrée.');
        }
    }
    function handlePauseTask() {
        const pauseBtn = document.querySelector('.pause-btn');
        if (isTaskPaused) {
            taskStartTime = new Date(taskStartTime.getTime() + (new Date() - taskPauseTime));
            isTaskPaused = false;
            pauseBtn.textContent = 'PAUSE';
            showNotification('Tâche relancée ! ▶️');
        } else {
            taskPauseTime = new Date();
            isTaskPaused = true;
            pauseBtn.textContent = 'REPRENDRE';
            showNotification('Tâche en pause ! ⏸️');
        }
    }
    function resetAll() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            const content = cell.querySelector('.cell-content');
            if (content) {
                const initialText = cell.getAttribute('data-initial-text');
                content.textContent = initialText;
                content.classList.add('placeholder');
                cell.classList.remove('text-green', 'text-red', 'default-user-active');
            }
        });
        showC2Buttons();
        selectedLocale = null;
        taskStartTime = null;
        taskPauseTime = null;
        taskEndTime = null;
        previousTaskEndTime = null;
        isTaskPaused = false;
        localStorage.removeItem('taskResults');
        localStorage.removeItem('defaultUserD1');
        const a1Cell = document.getElementById('a1');
        const a1Content = a1Cell.querySelector('.cell-content');
        const initialA1Text = a1Cell.getAttribute('data-initial-text');
        a1Content.textContent = initialA1Text;
        a1Content.classList.add('placeholder');
        a1Cell.classList.remove('text-green', 'text-red');
        // Réinitialiser A2 et A3 avec les textes par défaut
        const startTimeCell = document.getElementById('a2');
        const endTimeCell = document.getElementById('a3');
        if (startTimeCell) {
            const startContent = startTimeCell.querySelector('.cell-content');
            if (startContent) {
                startContent.textContent = 'Début';
                startContent.classList.add('placeholder');
            }
        }
        if (endTimeCell) {
            const endContent = endTimeCell.querySelector('.cell-content');
            if (endContent) {
                endContent.textContent = 'Fin';
                endContent.classList.add('placeholder');
            }
        }
        updateA1Menu();
        updateD1MenuWithDefault();
        const finBtn = document.querySelector('.fin-btn');
        const pauseBtn = document.querySelector('.pause-btn');
        if (finBtn) finBtn.style.display = 'none';
        if (pauseBtn) pauseBtn.style.display = 'none';
        const optionalCells = document.querySelectorAll('.optional-cell');
        optionalCells.forEach(cell => {
            const content = cell.querySelector('.cell-content');
            if (content) {
                const initialText = cell.getAttribute('data-initial-text');
                content.textContent = initialText;
                content.classList.add('placeholder');
            }
            cell.classList.remove('text-green', 'text-red');
        });
        // --- NOUVEAU : Réinitialiser l'affichage du tableau ---
        displayedTaskResults = [];
        localStorage.removeItem('displayedTaskResults');
        renderTaskResultsTable(); // Met à jour l'affichage pour le vider
    }
    // Fonction pour envoyer les données à Google Sheets
    function sendToGoogleSheet(data) {
        const formData = new FormData();
        for (const key in data) {
            formData.append(key, data[key]);
        }
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData,
            mode: 'no-cors'
        })
        .then(response => {
            console.log('Données envoyées à Google Sheets. Réponse:', response);
        })
        .catch(error => {
            console.error('Erreur lors de l\'envoi des données:', error);
        });
    }
    // Fonction pour initialiser les dropdown des cases facultatives avec options fixes
    function initializeOptionalCellMenus() {
        // const optionalCells = ['a4', 'b1', 'b2', 'b3', 'b4', 'c1', 'c4', 'd2', 'd3', 'd4']; // Ancien
        const optionalCells = ['a4', 'b4', 'c4', 'd4']; // Cases optionnelles utilisées uniquement
        const fixedOptions = ['Vide', '1', '2', '3'];
        optionalCells.forEach(cellId => {
            const cell = document.getElementById(cellId);
            const menu = cell.querySelector('.dropdown-menu');
            if (menu) {
                menu.innerHTML = '';
                fixedOptions.forEach(option => {
                    const item = createDropdownItem(option);
                    menu.appendChild(item);
                });
            }
        });
    }
    // --- NOUVEAU : Fonction pour gérer le clic sur les cellules optionnelles ---
    function handleOptionalCellClick(cell) {
        const cellId = cell.id;
        const dropdownMenu = cell.querySelector('.dropdown-menu');
        if (dropdownMenu) {
            if (activeMenu && activeMenu !== dropdownMenu) {
                activeMenu.classList.remove('show');
            }
            dropdownMenu.classList.toggle('show');
            activeMenu = dropdownMenu.classList.contains('show') ? dropdownMenu : null;
        }
    }
    // --- NOUVEAU : Fonction pour gérer la sélection d'un élément dans le menu des cellules optionnelles ---
    function handleOptionalCellItemClick(item) {
        const cell = item.closest('.cell');
        const cellId = cell.id;
        const content = cell.querySelector('.cell-content');
        const selectedText = item.querySelector('.dropdown-item-content').textContent.trim();
        content.textContent = selectedText;
        content.classList.remove('placeholder');
        cell.classList.remove('text-green', 'text-red'); // Retirer les couleurs si nécessaire
        if (selectedText === '1') {
            cell.classList.add('text-green');
        } else if (selectedText === '2' || selectedText === '3') {
            cell.classList.add('text-red');
        }
        item.closest('.dropdown-menu').classList.remove('show');
        activeMenu = null;
        updateResults();
        checkCompletion(); // Vérifier si la tâche est complète après la sélection
    }

    // --- NOUVEAU : Gestionnaire d'événements pour empêcher le changement de pavillon ---
    // Ce gestionnaire doit être placé AVANT les autres gestionnaires de clic sur .grid
    document.querySelector('.grid').addEventListener('click', function(event) {
        // Vérifier si le clic est sur un élément de menu déroulant à l'intérieur de A1
        const itemInA1 = event.target.closest('#a1 .dropdown-item');
        if (itemInA1) {
            // Vérifier si une locale est déjà sélectionnée (donc une tâche est en cours)
            if (selectedLocale) {
                // Vérifier si C2 et C3 sont "terminés" pour la locale actuelle
                if (!isC2AndC3CompletedForCurrentLocale()) {
                    // Empêcher le changement de locale
                    event.stopPropagation(); // Empêche la propagation à d'autres listeners
                    event.preventDefault();  // Empêche l'action par défaut (sélection)
                    alert("Veuillez terminer les contrôles C2 et C3 pour le pavillon actuel avant d'en choisir un nouveau.");
                    return; // Sortir du gestionnaire
                }
                // Si isC2AndC3CompletedForCurrentLocale() est true, le code continue vers les autres gestionnaires
            }
            // Si selectedLocale est null, c'est le premier choix, donc on laisse passer
        }
        // Pour tous les autres clics, le comportement normal s'applique (géré par les listeners suivants)
    }, true); // { capture: true } pour capturer l'événement pendant la phase de capture


    // Gérer les clics sur les cellules (ancien gestionnaire 1)
    document.querySelector('.grid').addEventListener('click', function(event) {
        const cell = event.target.closest('.cell');
        if (!cell || cell.classList.contains('empty-cell') || cell.classList.contains('default-user-active')) return;
        const cellId = cell.id;
        // --- NOUVEAU : Gestion spécifique pour les cellules optionnelles ---
        if (cell.classList.contains('optional-cell')) {
            handleOptionalCellClick(cell);
            return; // Arrêter le traitement ici pour les cellules optionnelles
        }
        const dropdownMenu = cell.querySelector('.dropdown-menu');
        if (activeMenu && activeMenu !== dropdownMenu) {
            activeMenu.classList.remove('show');
        }
        if (dropdownMenu) {
            dropdownMenu.classList.toggle('show');
            activeMenu = dropdownMenu.classList.contains('show') ? dropdownMenu : null;
        } else if (cellId === 'c2') {
            const isLocked = cell.dataset.locked === 'true';
            if (!isLocked) {
                // Do nothing
            } else {
                loadControlLocationsFromSheet(selectedLocale);
                cell.dataset.locked = "false";
                updateResults();
            }
        }
    });
    document.addEventListener('click', function(event) {
        const c2Cell = document.getElementById('c2');
        const c2Content = c2Cell.querySelector('.location-container');
        if (c2Content && !c2Cell.contains(event.target)) {
            condenseC2List();
        }
        if (!event.target.closest('.cell')) {
            const menus = document.querySelectorAll('.dropdown-menu');
            menus.forEach(menu => menu.classList.remove('show'));
            activeMenu = null;
        }
    });
    // Gérer les clics sur les cellules (ancien gestionnaire 2 pour les items de dropdown)
    document.querySelector('.grid').addEventListener('click', function(event) {
        const item = event.target.closest('.dropdown-item');
        if (!item) return;
        const cell = item.closest('.cell');
        const cellId = cell.id;
        const content = cell.querySelector('.cell-content');
        // --- NOUVEAU : Gestion spécifique pour les cellules optionnelles ---
        if (cell.classList.contains('optional-cell')) {
            handleOptionalCellItemClick(item);
            return; // Arrêter le traitement ici
        }
        if (item.classList.contains('add-item')) {
            const newName = prompt("Veuillez entrer le nom du nouvel utilisateur :");
            if (newName && newName.trim()) {
                if (!initialUsers.includes(newName.trim())) {
                    initialUsers.push(newName.trim());
                }
                updateD1MenuWithDefault();
            }
        } else if (cellId === 'd1') {
            const selectedUser = item.querySelector('.dropdown-item-content').textContent.trim();
            if (selectedUser.includes('par défaut')) {
            } else {
                content.textContent = selectedUser;
                content.classList.remove('placeholder', 'default-user');
                cell.classList.remove('default-user-active');
            }
            updateResults();
            checkCompletion();
        } else if (cellId === 'a1') {
            // --- NOUVEAU : Logique pour terminer automatiquement la tâche précédente ---
            // Vérifier s'il y a une tâche en cours (débutée avec une locale précédente)
            // Note: La vérification isC2AndC3CompletedForCurrentLocale est maintenant faite dans le gestionnaire de capture.
            if (selectedLocale && taskStartTime) {
                // --- Simuler la fin de la tâche précédente ---
                const previousLocale = selectedLocale;
                const previousUser = document.getElementById('d1').querySelector('.cell-content').textContent;
                const previousStartTime = taskStartTime;
                // Définir l'heure de fin comme "maintenant"
                const previousEndTime = new Date();
                // Formater les heures pour l'affichage dans le tableau
                const formattedPreviousStartTime = formatTimeHHMMColon(previousStartTime);
                const formattedPreviousEndTime = formatTimeHHMMColon(previousEndTime);

                // --- Ajouter les données de la tâche précédente au tableau ---
                // Créer l'objet taskData comme dans handleFinTask
                const previousTaskData = {
                    locale: previousLocale,
                    user: previousUser,
                    startTime: formatTime(previousStartTime), // Format complet si envoyé à Google Sheets
                    endTime: formatTime(previousEndTime),     // Format complet si envoyé à Google Sheets
                    startTimeFormatted: formattedPreviousStartTime, // Format hh:mm pour affichage
                    endTimeFormatted: formattedPreviousEndTime,     // Format hh:mm pour affichage
                    duration: (previousEndTime - previousStartTime) / 1000 // Durée en secondes
                };

                // Ajouter au tableau d'affichage et sauvegarder
                // --- MODIFIE : Appel à addToDisplayedResults qui gère maintenant les doublons ---
                addToDisplayedResults(previousTaskData); // addToDisplayedResults appelle saveTaskHistory et renderTaskResultsTable
                // Optionnel : Envoyer à Google Sheets
                // sendToGoogleSheet(previousTaskData);

                // --- Réinitialiser les variables de la tâche précédente ---
                // taskStartTime sera réinitialisé plus bas
                // taskEndTime est temporaire, pas besoin de le garder
                // selectedLocale sera mis à jour plus bas
                // previousTaskEndTime est mis à jour ici
                previousTaskEndTime = previousEndTime;

                // --- Réinitialiser les cellules liées à la tâche précédente (sauf A1, D1, A3) ---
                resetAllExceptA1D1A3();

                // Optionnel : Afficher une notification ou un message
                // showNotification(`Tâche pour ${previousLocale} terminée automatiquement !`);
            }
            // --- Fin de la terminaison automatique ---

            // --- Démarrer la nouvelle tâche ---
            const newLocale = item.querySelector('.dropdown-item-content').textContent.trim();

            // 1. Mettre à jour la sélection de la nouvelle locale
            selectedLocale = newLocale;
            content.textContent = selectedLocale;
            content.classList.remove('placeholder');
            updateResults();

            // 2. A2 affiche l'heure de début de la NOUVELLE tâche (format hh:mm)
            taskStartTime = new Date(); // Démarre le chrono pour la nouvelle tâche
            const startTimeCell = document.getElementById('a2');
            startTimeCell.querySelector('.cell-content').textContent = formatTimeHHMMColon(taskStartTime); // Utilise hh:mm
            startTimeCell.querySelector('.cell-content').classList.remove('placeholder');

            // 3. A3 affiche l'heure de fin de la TÂCHE PRÉCÉDENTE (format hh:mm), si disponible
            // (Cette logique est maintenant gérée par la terminaison automatique ci-dessus)
            // Si aucune tâche précédente, A3 reste comme il est (ex: "Fin" placeholder)
            // Si une tâche précédente a été terminée automatiquement, previousTaskEndTime est défini
            // et l'heure est déjà affichée dans A3 par addToDisplayedResults ou la logique de fin.

            // 4. Afficher les boutons de contrôle
            const finBtn = document.querySelector('.fin-btn');
            const pauseBtn = document.querySelector('.pause-btn');
            if (finBtn) finBtn.style.display = 'block';
            if (pauseBtn) pauseBtn.style.display = 'block';

            // 5. Charger automatiquement les endroits à contrôler depuis le sheet (C2)
            loadControlLocationsFromSheet(selectedLocale);

            // 6. Charger les contrôles pour C3
            loadC3Controls(selectedLocale);
            // --- Fin du démarrage de la nouvelle tâche ---
        } else if (cellId === 'a4' || cellId === 'b4' || cellId === 'c4' || cellId === 'd4') {
            // Ancienne logique pour A4, B4, C4, D4 (si vous voulez garder leur comportement spécifique)
            const selectedText = item.querySelector('.dropdown-item-content').textContent.trim();
            content.textContent = selectedText;
            content.classList.remove('placeholder');
            cell.classList.remove('text-green', 'text-red'); // Retirer les couleurs si nécessaire
            if (selectedText === '1') {
                cell.classList.add('text-green');
            } else if (selectedText === '2' || selectedText === '3') {
                cell.classList.add('text-red');
            }
            updateResults();
            // Vérifier si toutes les cases facultatives ont "Vide" comme valeur par défaut
            checkOptionalCellsDefault();
            checkCompletion(); // Vérifier si la tâche est complète après la sélection
        }
        item.closest('.dropdown-menu').classList.remove('show');
        activeMenu = null;
    });
    // Fonction pour vérifier les cases facultatives
    function checkOptionalCellsDefault() {
        // const optionalCells = ['a4', 'b1', 'b2', 'b3', 'b4', 'c1', 'c4', 'd2', 'd3', 'd4']; // Ancien
        const optionalCells = ['a4', 'b4', 'c4', 'd4']; // Cases optionnelles utilisées uniquement
        let allEmpty = true;
        optionalCells.forEach(cellId => {
            const cell = document.getElementById(cellId);
            const content = cell.querySelector('.cell-content');
            if (content && content.textContent.trim() !== 'Vide') {
                allEmpty = false;
            }
        });
        // Si toutes les cases facultatives sont "Vide", on peut les considérer comme valeurs par défaut
        if (allEmpty) {
            console.log('Toutes les cases facultatives ont la valeur par défaut "Vide"');
        }
    }
    document.querySelector('.grid').addEventListener('click', function(event) {
        const item = event.target.closest('.location-item');
        if (item) {
            handleLocationItemClick(item);
        }
    });
    document.getElementById('refresh-button').addEventListener('click', manualRefresh);
    document.getElementById('c3').addEventListener('click', handleC3Click);
    loadDefaultUser();
    updateA1Menu();
    updateD1MenuWithDefault();
    loadResults();
    loadTaskHistory(); // Charge displayedTaskResults et taskHistory
    showA1Buttons();
    initializeOptionalCellMenus(); // Initialiser les menus des cases facultatives
    // Initialiser les cases facultatives avec "Vide" par défaut
    // const optionalCells = ['a4', 'b1', 'b2', 'b3', 'b4', 'c1', 'c4', 'd2', 'd3', 'd4']; // Ancien
    const optionalCells = ['a4', 'b4', 'c4', 'd4']; // Cases optionnelles utilisées uniquement
    optionalCells.forEach(cellId => {
        const cell = document.getElementById(cellId);
        const content = cell.querySelector('.cell-content');
        if (content && content.classList.contains('placeholder')) {
            content.textContent = 'Vide';
            content.classList.remove('placeholder');
        }
    });
    // --- NOUVEAU : Afficher le tableau au chargement initial ---
    renderTaskResultsTable();
    // --- NOUVEAU : Afficher la date au chargement initial ---
    updateCurrentDate();
});
