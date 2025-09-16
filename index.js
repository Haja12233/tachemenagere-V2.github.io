document.addEventListener('DOMContentLoaded', function() {
    // Configuration et variables globales
    const initialUsers = ['Anniva', 'Tina'];
    let initialLocales = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'];
    let defaultUser = null, defaultUserExpiry = null;
    const requiredCells = ['a1', 'a2', 'a3', 'c2', 'c3', 'd1'];
    let activeMenu = null;
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz7NrE1iwl4vthz2Sxx3DIOoRXrSkq8nolvjefXo-w-KdBaP948MGa19hRanVgR5EQK/exec';
    // Variables pour le suivi des tâches
    let taskHistory = [];
    let currentTaskIndex = 0;
    let selectedLocale = null;
    let startTime = null;
    // Nouvelles variables pour la gestion du temps
    let taskStartTime = null;
    let taskPauseTime = null;
    let taskEndTime = null;
    let isTaskPaused = false;
    let previousTaskEndTime = null; // Pour stocker l'heure de fin de la tâche précédente
    // Fonctions de gestion des données
    function saveResults() {
        const results = {};
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
            if (isCompletion) resetAll();
        }, 2000);
    }
    function updateResults() {
        saveResults();
    }
    // Fonctions de gestion de l'historique
    function saveTaskHistory() {
        localStorage.setItem('taskHistory', JSON.stringify(taskHistory));
        localStorage.setItem('currentTaskIndex', currentTaskIndex.toString());
    }
    function loadTaskHistory() {
        const savedHistory = localStorage.getItem('taskHistory');
        const savedIndex = localStorage.getItem('currentTaskIndex');
        if (savedHistory) {
            taskHistory = JSON.parse(savedHistory);
        }
        if (savedIndex) {
            currentTaskIndex = parseInt(savedIndex);
        }
    }
    function addToTaskHistory(taskData) {
        taskHistory.push(taskData);
        currentTaskIndex++;
        saveTaskHistory();
        displayTaskHistory();
    }
    function displayTaskHistory() {
        let historyContainer = document.getElementById('task-history');
        if (!historyContainer) {
            historyContainer = document.createElement('div');
            historyContainer.id = 'task-history';
            historyContainer.style.cssText = 'margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;';
            document.querySelector('.container').appendChild(historyContainer);
        }
        let historyHTML = '<h3>Historique des Tâches</h3><table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
        historyHTML += '<tr style="background-color: #e9ecef;"><th>Pavillon</th><th>Début</th><th>Fin</th><th>Utilisateur</th></tr>';
        taskHistory.forEach((task, index) => {
            historyHTML += `<tr style="border-bottom: 1px solid #ddd;">
                <td>${task.locale || ''}</td>
                <td>${task.startTime || ''}</td>
                <td>${task.endTime || ''}</td>
                <td>${task.user || ''}</td>
            </tr>`;
        });
        historyHTML += '</table>';
        historyContainer.innerHTML = historyHTML;
    }
    function displayCurrentResults() {
        let resultsContainer = document.getElementById('current-results');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'current-results';
            resultsContainer.style.cssText = 'margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border: 1px solid #ffeaa7;';
            const container = document.querySelector('.container');
            const historyContainer = document.getElementById('task-history');
            if (historyContainer) {
                container.insertBefore(resultsContainer, historyContainer);
            } else {
                container.appendChild(resultsContainer);
            }
        }
        const cellValues = {};
        const cellIds = ['a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4', 'd1', 'd2', 'd3', 'd4'];
        cellIds.forEach(id => {
            const cell = document.getElementById(id);
            if (!cell) return;
            let value = '';
            let color = '';
            if (id === 'c2') {
                const locationList = cell.querySelector('.location-list');
                const contentSpan = cell.querySelector('.cell-content');
                if (locationList) {
                    const locations = Array.from(locationList.querySelectorAll('.location-item')).map(item => {
                        let colorText = '';
                        if (item.classList.contains('text-green')) colorText = ' (Vert)';
                        else if (item.classList.contains('text-red')) colorText = ' (Rouge)';
                        return item.textContent.trim() + colorText;
                    });
                    value = locations.join(', ');
                } else if (contentSpan) {
                    value = contentSpan.textContent.trim();
                }
            } else {
                const contentSpan = cell.querySelector('.cell-content');
                const contentButton = cell.querySelector('button');
                if (contentSpan) {
                    value = contentSpan.textContent.trim();
                } else if (contentButton) {
                    value = contentButton.textContent.trim();
                }
                if (cell.classList.contains('text-green')) color = ' (Vert)';
                else if (cell.classList.contains('text-red')) color = ' (Rouge)';
            }
            const initialText = cell.getAttribute('data-initial-text') || '';
            if (value && value !== initialText && value !== 'Sélectionnez une locale') {
                cellValues[id.toUpperCase()] = value + color;
            }
        });
        let resultsHTML = '<h3>Résultats Actuels</h3>';
        if (Object.keys(cellValues).length > 0) {
            resultsHTML += '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
            resultsHTML += '<tr style="background-color: #ffeaa7;"><th>Cellule</th><th>Valeur</th></tr>';
            Object.keys(cellValues).forEach(cellId => {
                resultsHTML += `<tr style="border-bottom: 1px solid #ddd;">
                    <td><strong>${cellId}</strong></td>
                    <td>${cellValues[cellId] || ''}</td>
                </tr>`;
            });
            resultsHTML += '</table>';
        } else {
            resultsHTML += '<p style="color: #856404;">Aucune donnée à afficher pour le moment.</p>';
        }
        resultsContainer.innerHTML = resultsHTML;
    }
    // Fonctions de gestion des cellules
    function resetAllExceptA1D1A3() {
        const cellsToReset = ['a2', 'a4', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4', 'd2', 'd3', 'd4'];
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
        displayCurrentResults();
    }
    function manualRefresh() {
        const cellsToReset = ['a1', 'a2', 'a4', 'b4', 'c2', 'c3', 'c4', 'd4'];
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
        displayCurrentResults();
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
                    return true;
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
        showNotification('Tâche complète ! 🎉', true);
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
        displayCurrentResults();
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
                displayCurrentResults();
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
                displayCurrentResults();
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
            displayCurrentResults();
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
        displayCurrentResults();
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
            displayCurrentResults();
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
        displayCurrentResults();
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
        displayCurrentResults();
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
        displayCurrentResults();
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
            const duration = (taskEndTime - taskStartTime) / 1000;
            const user = document.getElementById('d1').querySelector('.cell-content').textContent;
            // const formattedStartTime = formatTimeHHMM(taskStartTime); // hhmm - Ancien format pour A2
            // const formattedEndTime = formatTimeHHMMColon(taskEndTime); // hh:mm - Format pour A3
            // Utiliser le format hh:mm pour les deux lors de la fin explicite
            const formattedStartTime = formatTimeHHMMColon(taskStartTime); // hh:mm - Nouveau format pour A2 aussi
            const formattedEndTime = formatTimeHHMMColon(taskEndTime); // hh:mm - Format pour A3
            // Stocker l'heure de fin pour la prochaine tâche
            previousTaskEndTime = taskEndTime;
            // Mettre à jour A2 avec l'heure de début au format hh:mm
            const startTimeCell = document.getElementById('a2');
            startTimeCell.querySelector('.cell-content').textContent = formattedStartTime;
            startTimeCell.querySelector('.cell-content').classList.remove('placeholder');
            // Mettre à jour A3 avec l'heure de fin au format hh:mm
            const endTimeCell = document.getElementById('a3');
            endTimeCell.querySelector('.cell-content').textContent = formattedEndTime;
            endTimeCell.querySelector('.cell-content').classList.remove('placeholder');
            const taskData = {
                locale: selectedLocale,
                user: user,
                startTime: formatTime(taskStartTime), // Format complet pour Google Sheets
                endTime: formatTime(taskEndTime), // Format complet pour Google Sheets
                duration: duration
            };
            addToTaskHistory(taskData);
            sendToGoogleSheet(taskData);
            showNotification(`Tâche pour ${selectedLocale} terminée ! 🎉`, true);
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
        displayCurrentResults();
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
        const optionalCells = ['a4', 'b4', 'c4', 'd4'];
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
    // Gérer les clics sur les cellules
    document.querySelector('.grid').addEventListener('click', function(event) {
        const cell = event.target.closest('.cell');
        if (!cell || cell.classList.contains('empty-cell') || cell.classList.contains('default-user-active')) return;
        const cellId = cell.id;
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
                displayCurrentResults();
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
    document.querySelector('.grid').addEventListener('click', function(event) {
        const item = event.target.closest('.dropdown-item');
        if (!item) return;
        const cell = item.closest('.cell');
        const cellId = cell.id;
        const content = cell.querySelector('.cell-content');
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
            displayCurrentResults();
            checkCompletion();
        } else if (cellId === 'a1') {
            // Workflow complet : D1 -> A1 -> A2 -> C2 -> C3
            const newLocale = item.querySelector('.dropdown-item-content').textContent.trim();

            // --- Logique modifiée pour A3 (heure fin tâche précédente) et A2 (heure début nouvelle tâche) ---
            // 1. Si une tâche était en cours/terminée, stocker son heure de fin
            if (taskStartTime) {
                 // Optionnel : Terminer automatiquement la tâche précédente ?
                 // handleFinTask();
                 // Ou simplement stocker l'heure de fin pour la prochaine tâche
                 if (taskEndTime) {
                      previousTaskEndTime = taskEndTime;
                 } else if (taskStartTime) {
                      // Si la tâche a commencé mais pas explicitement terminée, on considère la fin comme maintenant
                      previousTaskEndTime = new Date(); // Ou garder taskEndTime = null pour ne pas afficher ?
                 }
            }

            // 2. Mettre à jour la sélection de la nouvelle locale
            selectedLocale = newLocale;
            content.textContent = selectedLocale;
            content.classList.remove('placeholder');
            updateResults();

            // 3. A2 affiche l'heure de début de la NOUVELLE tâche (format hh:mm)
            taskStartTime = new Date(); // Démarre le chrono pour la nouvelle tâche
            const startTimeCell = document.getElementById('a2');
            startTimeCell.querySelector('.cell-content').textContent = formatTimeHHMMColon(taskStartTime); // Utilise hh:mm
            startTimeCell.querySelector('.cell-content').classList.remove('placeholder');

            // 4. A3 affiche l'heure de fin de la TÂCHE PRÉCÉDENTE (format hh:mm), si disponible
            if (previousTaskEndTime) {
                const endTimeCell = document.getElementById('a3');
                endTimeCell.querySelector('.cell-content').textContent = formatTimeHHMMColon(previousTaskEndTime); // Utilise hh:mm
                endTimeCell.querySelector('.cell-content').classList.remove('placeholder');
            } else {
                 // Optionnel : Réinitialiser A3 si aucune tâche précédente
                 // const endTimeCell = document.getElementById('a3');
                 // endTimeCell.querySelector('.cell-content').textContent = 'Fin';
                 // endTimeCell.querySelector('.cell-content').classList.add('placeholder');
            }

            // 5. Afficher les boutons de contrôle
            const finBtn = document.querySelector('.fin-btn');
            const pauseBtn = document.querySelector('.pause-btn');
            if (finBtn) finBtn.style.display = 'block';
            if (pauseBtn) pauseBtn.style.display = 'block';

            // 6. Charger automatiquement les endroits à contrôler depuis le sheet (C2)
            loadControlLocationsFromSheet(selectedLocale);
            // 7. Charger les contrôles pour C3
            loadC3Controls(selectedLocale);
            // --- Fin de la logique modifiée ---
        } else if (cellId === 'a4' || cellId === 'b4' || cellId === 'c4' || cellId === 'd4') {
            const selectedText = item.querySelector('.dropdown-item-content').textContent.trim();
            content.textContent = selectedText;
            content.classList.remove('placeholder');
            updateResults();
            displayCurrentResults();
            // Vérifier si toutes les cases facultatives ont "Vide" comme valeur par défaut
            checkOptionalCellsDefault();
        }
        item.closest('.dropdown-menu').classList.remove('show');
        activeMenu = null;
    });
    // Fonction pour vérifier les cases facultatives
    function checkOptionalCellsDefault() {
        const optionalCells = ['a4', 'b4', 'c4', 'd4'];
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
    displayCurrentResults();
    loadTaskHistory();
    displayTaskHistory();
    showA1Buttons();
    initializeOptionalCellMenus(); // Initialiser les menus des cases facultatives
    // Initialiser les cases facultatives avec "Vide" par défaut
    const optionalCells = ['a4', 'b4', 'c4', 'd4'];
    optionalCells.forEach(cellId => {
        const cell = document.getElementById(cellId);
        const content = cell.querySelector('.cell-content');
        if (content && content.classList.contains('placeholder')) {
            content.textContent = 'Vide';
            content.classList.remove('placeholder');
        }
    });
});
