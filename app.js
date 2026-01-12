/**
 * Aufgabenplaner - Vanilla JavaScript Application
 * Minimalistischer Selbst-gehosteter Aufgabenplaner
 * Mit Quick-Add, Subtasks, Pomodoro Timer, Kalender und Benachrichtigungen
 */

// ============================================
// State Management
// ============================================
const state = {
    tasks: [],
    projects: [],
    currentProject: null,
    currentView: 'kanban', // 'kanban', 'list', or 'calendar'
    theme: 'light',
    filters: {
        priority: 'all',
        search: ''
    },
    sortBy: 'created',
    draggedTask: null,
    // Calendar state
    calendar: {
        year: new Date().getFullYear(),
        month: new Date().getMonth()
    },
    selectedCalendarDate: null,
    // Pomodoro state
    pomodoro: {
        isRunning: false,
        isPaused: false,
        currentTaskId: null,
        timeLeft: 25 * 60,
        mode: 'work', // 'work', 'break', 'longBreak'
        completedPomodoros: 0,
        intervalId: null,
        settings: {
            workDuration: 25,
            breakDuration: 5,
            longBreakDuration: 15,
            pomodorosUntilLongBreak: 4,
            soundEnabled: true
        }
    },
    // Notifications
    notificationsEnabled: false,
    notifiedTasks: new Set(),
    // Subtasks (temporary for modal)
    tempSubtasks: []
};

// ============================================
// LocalStorage Keys
// ============================================
const STORAGE_KEYS = {
    TASKS: 'aufgabenplaner_tasks',
    PROJECTS: 'aufgabenplaner_projects',
    THEME: 'aufgabenplaner_theme',
    VIEW: 'aufgabenplaner_view',
    CURRENT_PROJECT: 'aufgabenplaner_current_project',
    POMODORO_SETTINGS: 'aufgabenplaner_pomodoro_settings',
    NOTIFICATIONS_ENABLED: 'aufgabenplaner_notifications'
};

// ============================================
// Utility Functions
// ============================================
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Heute';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
        return 'Morgen';
    }

    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function isOverdue(dateString) {
    if (!dateString) return false;
    const deadline = new Date(dateString);
    deadline.setHours(23, 59, 59, 999);
    return deadline < new Date();
}

function isSoon(dateString) {
    if (!dateString) return false;
    const deadline = new Date(dateString);
    const today = new Date();
    const threeDays = new Date(today);
    threeDays.setDate(threeDays.getDate() + 3);
    return deadline <= threeDays && !isOverdue(dateString);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// Storage Functions
// ============================================
function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(state.tasks));
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(state.projects));
        localStorage.setItem(STORAGE_KEYS.THEME, state.theme);
        localStorage.setItem(STORAGE_KEYS.VIEW, state.currentView);
        localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT, state.currentProject || '');
        localStorage.setItem(STORAGE_KEYS.POMODORO_SETTINGS, JSON.stringify(state.pomodoro.settings));
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, state.notificationsEnabled);
    } catch (e) {
        console.error('Error saving to localStorage:', e);
        showToast('Fehler beim Speichern!', 'error');
    }
}

function loadFromStorage() {
    try {
        const tasks = localStorage.getItem(STORAGE_KEYS.TASKS);
        const projects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
        const theme = localStorage.getItem(STORAGE_KEYS.THEME);
        const view = localStorage.getItem(STORAGE_KEYS.VIEW);
        const currentProject = localStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT);
        const pomodoroSettings = localStorage.getItem(STORAGE_KEYS.POMODORO_SETTINGS);
        const notificationsEnabled = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED);

        if (tasks) state.tasks = JSON.parse(tasks);
        if (projects) state.projects = JSON.parse(projects);
        if (theme) state.theme = theme;
        if (view) state.currentView = view;
        if (currentProject) state.currentProject = currentProject;
        if (pomodoroSettings) state.pomodoro.settings = JSON.parse(pomodoroSettings);
        if (notificationsEnabled) state.notificationsEnabled = notificationsEnabled === 'true';

        // Initialize timeLeft based on settings
        state.pomodoro.timeLeft = state.pomodoro.settings.workDuration * 60;
    } catch (e) {
        console.error('Error loading from localStorage:', e);
    }
}

function clearAllData() {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    state.tasks = [];
    state.projects = [];
    state.currentProject = null;
    renderAll();
    showToast('Alle Daten wurden gelöscht', 'success');
}

// ============================================
// Export/Import Functions
// ============================================
function exportData() {
    const data = {
        tasks: state.tasks,
        projects: state.projects,
        exportDate: new Date().toISOString(),
        version: '2.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aufgabenplaner_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Daten exportiert!', 'success');
}

function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.tasks && Array.isArray(data.tasks)) {
                state.tasks = data.tasks;
            }
            if (data.projects && Array.isArray(data.projects)) {
                state.projects = data.projects;
            }
            saveToStorage();
            renderAll();
            showToast('Daten importiert!', 'success');
        } catch (err) {
            showToast('Ungültige Datei!', 'error');
        }
    };
    reader.readAsText(file);
}

// ============================================
// Quick-Add Parser
// ============================================
function parseQuickAdd(text, defaultStatus = 'todo') {
    const result = {
        title: text,
        priority: 'medium',
        projectId: null,
        tags: [],
        deadline: null,
        status: defaultStatus
    };

    // Parse priority: !h, !high, !m, !medium, !l, !low
    const priorityMatch = text.match(/!(h|high|m|medium|l|low)\b/i);
    if (priorityMatch) {
        const p = priorityMatch[1].toLowerCase();
        if (p === 'h' || p === 'high') result.priority = 'high';
        else if (p === 'm' || p === 'medium') result.priority = 'medium';
        else if (p === 'l' || p === 'low') result.priority = 'low';
        result.title = result.title.replace(priorityMatch[0], '').trim();
    }

    // Parse project: @projektname
    const projectMatch = text.match(/@(\S+)/);
    if (projectMatch) {
        const projectName = projectMatch[1].toLowerCase();
        const project = state.projects.find(p => p.name.toLowerCase().includes(projectName));
        if (project) {
            result.projectId = project.id;
        }
        result.title = result.title.replace(projectMatch[0], '').trim();
    }

    // Parse tags: #tag1 #tag2
    const tagMatches = text.match(/#(\S+)/g);
    if (tagMatches) {
        result.tags = tagMatches.map(t => t.slice(1));
        tagMatches.forEach(t => {
            result.title = result.title.replace(t, '').trim();
        });
    }

    // Parse deadline: >2024-01-20 or >heute or >morgen
    const deadlineMatch = text.match(/>(\S+)/);
    if (deadlineMatch) {
        const dateStr = deadlineMatch[1].toLowerCase();
        const today = new Date();

        if (dateStr === 'heute' || dateStr === 'today') {
            result.deadline = today.toISOString().split('T')[0];
        } else if (dateStr === 'morgen' || dateStr === 'tomorrow') {
            today.setDate(today.getDate() + 1);
            result.deadline = today.toISOString().split('T')[0];
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            result.deadline = dateStr;
        }
        result.title = result.title.replace(deadlineMatch[0], '').trim();
    }

    // Clean up title
    result.title = result.title.replace(/\s+/g, ' ').trim();

    return result;
}

// ============================================
// Task Functions
// ============================================
function createTask(taskData) {
    const task = {
        id: generateId(),
        title: taskData.title,
        description: taskData.description || '',
        projectId: taskData.projectId || null,
        priority: taskData.priority || 'medium',
        deadline: taskData.deadline || null,
        reminder: taskData.reminder || null,
        status: taskData.status || 'todo',
        tags: taskData.tags || [],
        subtasks: taskData.subtasks || [],
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
        pomodoroCount: 0,
        order: state.tasks.filter(t => t.status === taskData.status).length
    };

    state.tasks.push(task);
    saveToStorage();
    renderAll();
    showToast('Aufgabe erstellt!', 'success');
    return task;
}

function updateTask(taskId, updates) {
    const index = state.tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
        // Handle completion
        if (updates.completed !== undefined && updates.completed !== state.tasks[index].completed) {
            updates.completedAt = updates.completed ? new Date().toISOString() : null;
            if (updates.completed) {
                updates.status = 'done';
            }
        }

        state.tasks[index] = { ...state.tasks[index], ...updates };
        saveToStorage();
        renderAll();
    }
}

function deleteTask(taskId) {
    // Stop timer if this task is active
    if (state.pomodoro.currentTaskId === taskId) {
        stopPomodoro();
    }
    state.tasks = state.tasks.filter(t => t.id !== taskId);
    saveToStorage();
    renderAll();
    showToast('Aufgabe gelöscht!', 'success');
}

function toggleTaskComplete(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        updateTask(taskId, {
            completed: !task.completed,
            status: !task.completed ? 'done' : 'todo'
        });
    }
}

function moveTask(taskId, newStatus, newIndex = null) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        task.status = newStatus;
        if (newStatus === 'done' && !task.completed) {
            task.completed = true;
            task.completedAt = new Date().toISOString();
        } else if (newStatus !== 'done' && task.completed) {
            task.completed = false;
            task.completedAt = null;
        }

        // Reorder tasks
        const tasksInColumn = getFilteredTasks().filter(t => t.status === newStatus && t.id !== taskId);
        if (newIndex !== null && newIndex >= 0) {
            tasksInColumn.splice(newIndex, 0, task);
        } else {
            tasksInColumn.push(task);
        }
        tasksInColumn.forEach((t, i) => {
            const stateTask = state.tasks.find(st => st.id === t.id);
            if (stateTask) stateTask.order = i;
        });

        saveToStorage();
        renderAll();
    }
}

function getFilteredTasks() {
    let tasks = [...state.tasks];

    // Filter by project
    if (state.currentProject) {
        tasks = tasks.filter(t => t.projectId === state.currentProject);
    }

    // Filter by priority
    if (state.filters.priority !== 'all') {
        tasks = tasks.filter(t => t.priority === state.filters.priority);
    }

    // Filter by search
    if (state.filters.search) {
        const search = state.filters.search.toLowerCase();
        tasks = tasks.filter(t =>
            t.title.toLowerCase().includes(search) ||
            t.description.toLowerCase().includes(search) ||
            t.tags.some(tag => tag.toLowerCase().includes(search))
        );
    }

    // Sort
    tasks.sort((a, b) => {
        switch (state.sortBy) {
            case 'deadline':
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return new Date(a.deadline) - new Date(b.deadline);
            case 'priority':
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            case 'created':
            default:
                return a.order - b.order;
        }
    });

    return tasks;
}

// ============================================
// Subtask Functions
// ============================================
function getSubtaskProgress(task) {
    if (!task.subtasks || task.subtasks.length === 0) return null;
    const completed = task.subtasks.filter(s => s.completed).length;
    const total = task.subtasks.length;
    return { completed, total, percent: Math.round((completed / total) * 100) };
}

function toggleSubtask(taskId, subtaskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task && task.subtasks) {
        const subtask = task.subtasks.find(s => s.id === subtaskId);
        if (subtask) {
            subtask.completed = !subtask.completed;
            saveToStorage();
            renderAll();
        }
    }
}

function renderSubtasksList() {
    const list = document.getElementById('subtasksList');
    if (state.tempSubtasks.length === 0) {
        list.innerHTML = '<p class="empty-state" style="padding: 0.5rem; font-size: 0.75rem;">Keine Subtasks vorhanden</p>';
        return;
    }

    list.innerHTML = state.tempSubtasks.map(subtask => `
        <div class="subtask-item" data-subtask-id="${subtask.id}">
            <div class="subtask-checkbox ${subtask.completed ? 'checked' : ''}" data-id="${subtask.id}"></div>
            <span class="subtask-title ${subtask.completed ? 'completed' : ''}">${escapeHtml(subtask.title)}</span>
            <button class="subtask-delete" data-id="${subtask.id}">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');

    // Add event listeners
    list.querySelectorAll('.subtask-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', () => {
            const id = checkbox.dataset.id;
            const subtask = state.tempSubtasks.find(s => s.id === id);
            if (subtask) {
                subtask.completed = !subtask.completed;
                renderSubtasksList();
            }
        });
    });

    list.querySelectorAll('.subtask-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            state.tempSubtasks = state.tempSubtasks.filter(s => s.id !== btn.dataset.id);
            renderSubtasksList();
        });
    });
}

// ============================================
// Project Functions
// ============================================
function createProject(projectData) {
    const project = {
        id: generateId(),
        name: projectData.name,
        color: projectData.color || '#6366f1',
        createdAt: new Date().toISOString()
    };

    state.projects.push(project);
    saveToStorage();
    renderProjects();
    updateProjectSelect();
    showToast('Projekt erstellt!', 'success');
    return project;
}

function updateProject(projectId, updates) {
    const index = state.projects.findIndex(p => p.id === projectId);
    if (index !== -1) {
        state.projects[index] = { ...state.projects[index], ...updates };
        saveToStorage();
        renderProjects();
        renderTasks();
    }
}

function deleteProject(projectId) {
    state.projects = state.projects.filter(p => p.id !== projectId);
    state.tasks.forEach(task => {
        if (task.projectId === projectId) {
            task.projectId = null;
        }
    });
    if (state.currentProject === projectId) {
        state.currentProject = null;
    }
    saveToStorage();
    renderAll();
    showToast('Projekt gelöscht!', 'success');
}

function selectProject(projectId) {
    state.currentProject = projectId || null;
    saveToStorage();
    renderProjects();
    renderTasks();
}

function getProjectById(projectId) {
    return state.projects.find(p => p.id === projectId);
}

function getTaskCountByProject(projectId) {
    if (projectId === null) {
        return state.tasks.length;
    }
    return state.tasks.filter(t => t.projectId === projectId).length;
}

// ============================================
// Pomodoro Timer Functions
// ============================================
function startPomodoro(taskId = null) {
    if (taskId) {
        state.pomodoro.currentTaskId = taskId;
    }

    if (!state.pomodoro.isRunning) {
        state.pomodoro.isRunning = true;
        state.pomodoro.isPaused = false;
        state.pomodoro.intervalId = setInterval(tick, 1000);
    } else if (state.pomodoro.isPaused) {
        state.pomodoro.isPaused = false;
        state.pomodoro.intervalId = setInterval(tick, 1000);
    }

    updateTimerDisplay();
    showHeaderTimer();
}

function pausePomodoro() {
    if (state.pomodoro.isRunning && !state.pomodoro.isPaused) {
        state.pomodoro.isPaused = true;
        clearInterval(state.pomodoro.intervalId);
        updateTimerDisplay();
    }
}

function stopPomodoro() {
    clearInterval(state.pomodoro.intervalId);
    state.pomodoro.isRunning = false;
    state.pomodoro.isPaused = false;
    state.pomodoro.currentTaskId = null;
    state.pomodoro.timeLeft = state.pomodoro.settings.workDuration * 60;
    state.pomodoro.mode = 'work';
    updateTimerDisplay();
    hideHeaderTimer();
    renderTasks();
}

function tick() {
    state.pomodoro.timeLeft--;

    if (state.pomodoro.timeLeft <= 0) {
        clearInterval(state.pomodoro.intervalId);

        // Play sound
        if (state.pomodoro.settings.soundEnabled) {
            playTimerSound();
        }

        // Handle mode switch
        if (state.pomodoro.mode === 'work') {
            state.pomodoro.completedPomodoros++;

            // Update task pomodoro count
            if (state.pomodoro.currentTaskId) {
                const task = state.tasks.find(t => t.id === state.pomodoro.currentTaskId);
                if (task) {
                    task.pomodoroCount = (task.pomodoroCount || 0) + 1;
                    saveToStorage();
                }
            }

            // Check for long break
            if (state.pomodoro.completedPomodoros % state.pomodoro.settings.pomodorosUntilLongBreak === 0) {
                state.pomodoro.mode = 'longBreak';
                state.pomodoro.timeLeft = state.pomodoro.settings.longBreakDuration * 60;
                showToast('Zeit für eine lange Pause!', 'success');
                sendNotification('Pomodoro', 'Zeit für eine lange Pause!');
            } else {
                state.pomodoro.mode = 'break';
                state.pomodoro.timeLeft = state.pomodoro.settings.breakDuration * 60;
                showToast('Zeit für eine kurze Pause!', 'success');
                sendNotification('Pomodoro', 'Zeit für eine kurze Pause!');
            }
        } else {
            state.pomodoro.mode = 'work';
            state.pomodoro.timeLeft = state.pomodoro.settings.workDuration * 60;
            showToast('Pause vorbei - weiter geht\'s!', 'info');
            sendNotification('Pomodoro', 'Pause vorbei - weiter geht\'s!');
        }

        // Auto-start next session
        state.pomodoro.intervalId = setInterval(tick, 1000);
    }

    updateTimerDisplay();
}

function playTimerSound() {
    // Create a simple beep using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;

        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
            audioContext.close();
        }, 200);

        // Play 3 beeps
        setTimeout(() => {
            const ctx2 = new (window.AudioContext || window.webkitAudioContext)();
            const osc2 = ctx2.createOscillator();
            const gain2 = ctx2.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx2.destination);
            osc2.frequency.value = 800;
            gain2.gain.value = 0.3;
            osc2.start();
            setTimeout(() => { osc2.stop(); ctx2.close(); }, 200);
        }, 300);

        setTimeout(() => {
            const ctx3 = new (window.AudioContext || window.webkitAudioContext)();
            const osc3 = ctx3.createOscillator();
            const gain3 = ctx3.createGain();
            osc3.connect(gain3);
            gain3.connect(ctx3.destination);
            osc3.frequency.value = 1000;
            gain3.gain.value = 0.3;
            osc3.start();
            setTimeout(() => { osc3.stop(); ctx3.close(); }, 400);
        }, 600);
    } catch (e) {
        console.log('Audio not supported');
    }
}

function updateTimerDisplay() {
    const display = document.getElementById('timerDisplay');
    const mode = document.getElementById('timerMode');
    const taskName = document.getElementById('timerTaskName');
    const playPauseBtn = document.getElementById('timerPlayPause');
    const headerTimer = document.getElementById('headerTimer');

    display.textContent = formatTime(state.pomodoro.timeLeft);

    const modeText = state.pomodoro.mode === 'work' ? 'Arbeit' :
                     state.pomodoro.mode === 'break' ? 'Pause' : 'Lange Pause';
    mode.textContent = modeText;

    // Update task name
    if (state.pomodoro.currentTaskId) {
        const task = state.tasks.find(t => t.id === state.pomodoro.currentTaskId);
        taskName.textContent = task ? task.title : 'Keine Aufgabe';
    } else {
        taskName.textContent = 'Keine Aufgabe';
    }

    // Update play/pause button
    const icon = playPauseBtn.querySelector('i');
    if (state.pomodoro.isRunning && !state.pomodoro.isPaused) {
        icon.className = 'fas fa-pause';
    } else {
        icon.className = 'fas fa-play';
    }

    // Update header timer styling
    headerTimer.classList.remove('active', 'break');
    if (state.pomodoro.isRunning) {
        if (state.pomodoro.mode === 'work') {
            headerTimer.classList.add('active');
        } else {
            headerTimer.classList.add('break');
        }
    }

    // Update page title
    if (state.pomodoro.isRunning) {
        document.title = `${formatTime(state.pomodoro.timeLeft)} - Aufgabenplaner`;
    } else {
        document.title = 'Aufgabenplaner';
    }
}

function showHeaderTimer() {
    document.getElementById('headerTimer').classList.remove('hidden');
}

function hideHeaderTimer() {
    document.getElementById('headerTimer').classList.add('hidden');
}

function savePomodoroSettings() {
    state.pomodoro.settings.workDuration = parseInt(document.getElementById('workDuration').value) || 25;
    state.pomodoro.settings.breakDuration = parseInt(document.getElementById('breakDuration').value) || 5;
    state.pomodoro.settings.longBreakDuration = parseInt(document.getElementById('longBreakDuration').value) || 15;
    state.pomodoro.settings.pomodorosUntilLongBreak = parseInt(document.getElementById('pomodorosUntilLongBreak').value) || 4;
    state.pomodoro.settings.soundEnabled = document.getElementById('pomodoroSound').checked;

    // Reset timer with new duration if not running
    if (!state.pomodoro.isRunning) {
        state.pomodoro.timeLeft = state.pomodoro.settings.workDuration * 60;
        updateTimerDisplay();
    }

    saveToStorage();
    closePomodoroModal();
    showToast('Einstellungen gespeichert!', 'success');
}

// ============================================
// Notification Functions
// ============================================
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        showToast('Benachrichtigungen werden nicht unterstützt', 'warning');
        return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        state.notificationsEnabled = true;
        saveToStorage();
        showToast('Benachrichtigungen aktiviert!', 'success');
        startNotificationChecker();
    } else {
        state.notificationsEnabled = false;
        saveToStorage();
        showToast('Benachrichtigungen abgelehnt', 'warning');
    }
}

function sendNotification(title, body) {
    if (state.notificationsEnabled && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">✓</text></svg>'
        });
    }
}

function startNotificationChecker() {
    // Check every minute for upcoming deadlines
    setInterval(checkDeadlineNotifications, 60000);
    checkDeadlineNotifications(); // Check immediately
}

function checkDeadlineNotifications() {
    if (!state.notificationsEnabled) return;

    const now = new Date();

    state.tasks.forEach(task => {
        if (task.completed || !task.deadline || !task.reminder) return;
        if (state.notifiedTasks.has(task.id)) return;

        const deadline = new Date(task.deadline);
        deadline.setHours(9, 0, 0, 0); // Assume 9 AM deadline

        const reminderMinutes = parseInt(task.reminder);
        const reminderTime = new Date(deadline.getTime() - reminderMinutes * 60000);

        if (now >= reminderTime && now < deadline) {
            sendNotification(
                'Erinnerung: ' + task.title,
                reminderMinutes === 0 ? 'Fällig jetzt!' :
                reminderMinutes < 60 ? `Fällig in ${reminderMinutes} Minuten` :
                reminderMinutes < 1440 ? `Fällig in ${Math.round(reminderMinutes/60)} Stunde(n)` :
                'Fällig morgen'
            );
            state.notifiedTasks.add(task.id);
        }
    });
}

// ============================================
// Calendar Functions
// ============================================
function renderCalendar() {
    const { year, month } = state.calendar;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = (firstDay.getDay() + 6) % 7; // Monday = 0

    const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

    document.getElementById('calendarTitle').textContent = `${monthNames[month]} ${year}`;

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Previous month days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        const date = new Date(year, month - 1, day);
        grid.appendChild(createCalendarDay(date, true));
    }

    // Current month days
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const isToday = date.getTime() === today.getTime();
        grid.appendChild(createCalendarDay(date, false, isToday));
    }

    // Next month days
    const totalCells = grid.children.length;
    const remainingCells = 42 - totalCells; // 6 rows * 7 days
    for (let day = 1; day <= remainingCells; day++) {
        const date = new Date(year, month + 1, day);
        grid.appendChild(createCalendarDay(date, true));
    }
}

function createCalendarDay(date, isOtherMonth, isToday = false) {
    const div = document.createElement('div');
    div.className = 'calendar-day';
    if (isOtherMonth) div.classList.add('other-month');
    if (isToday) div.classList.add('today');

    const dateStr = date.toISOString().split('T')[0];
    const tasksForDay = getTasksForDate(dateStr);

    if (tasksForDay.length > 0) {
        div.classList.add('has-tasks');
    }

    div.innerHTML = `
        <div class="calendar-day-number">${date.getDate()}</div>
        <div class="calendar-day-tasks">
            ${tasksForDay.slice(0, 2).map(task => {
                const project = task.projectId ? getProjectById(task.projectId) : null;
                const color = project ? project.color : getPriorityColor(task.priority);
                return `<div class="calendar-task-dot">
                    <span class="dot" style="background: ${color}"></span>
                    ${escapeHtml(task.title.substring(0, 15))}${task.title.length > 15 ? '...' : ''}
                </div>`;
            }).join('')}
            ${tasksForDay.length > 2 ? `<div class="calendar-day-more">+${tasksForDay.length - 2} mehr</div>` : ''}
        </div>
    `;

    div.addEventListener('click', () => openCalendarDayModal(dateStr, tasksForDay));

    return div;
}

function getTasksForDate(dateStr) {
    return state.tasks.filter(task => task.deadline === dateStr && !task.completed);
}

function getPriorityColor(priority) {
    switch (priority) {
        case 'high': return '#ef4444';
        case 'medium': return '#f59e0b';
        case 'low': return '#10b981';
        default: return '#6366f1';
    }
}

function navigateMonth(direction) {
    state.calendar.month += direction;
    if (state.calendar.month > 11) {
        state.calendar.month = 0;
        state.calendar.year++;
    } else if (state.calendar.month < 0) {
        state.calendar.month = 11;
        state.calendar.year--;
    }
    renderCalendar();
}

function goToToday() {
    const today = new Date();
    state.calendar.year = today.getFullYear();
    state.calendar.month = today.getMonth();
    renderCalendar();
}

function openCalendarDayModal(dateStr, tasks) {
    state.selectedCalendarDate = dateStr;
    const date = new Date(dateStr);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('calendarDayTitle').textContent = date.toLocaleDateString('de-DE', options);

    const container = document.getElementById('calendarDayTasks');
    if (tasks.length === 0) {
        container.innerHTML = '<p class="empty-state"><i class="fas fa-calendar-check"></i><br>Keine Aufgaben an diesem Tag</p>';
    } else {
        container.innerHTML = tasks.map(task => {
            const project = task.projectId ? getProjectById(task.projectId) : null;
            return `
                <div class="calendar-modal-task" data-task-id="${task.id}">
                    <div class="priority-dot" style="background: ${getPriorityColor(task.priority)}"></div>
                    <div class="task-info">
                        <div class="title">${escapeHtml(task.title)}</div>
                        ${project ? `<div class="project">${escapeHtml(project.name)}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.calendar-modal-task').forEach(item => {
            item.addEventListener('click', () => {
                closeCalendarDayModal();
                openTaskModal(item.dataset.taskId);
            });
        });
    }

    document.getElementById('calendarDayModal').classList.add('show');
}

function closeCalendarDayModal() {
    document.getElementById('calendarDayModal').classList.remove('show');
}

// ============================================
// Render Functions
// ============================================
function renderAll() {
    renderProjects();
    renderTasks();
    updateStats();
    updateProjectSelect();
}

function renderProjects() {
    const projectList = document.getElementById('projectList');

    let html = `
        <li class="project-item ${state.currentProject === null ? 'active' : ''}" data-project-id="">
            <span class="color-dot" style="background: var(--primary)"></span>
            <span class="project-name">Alle Aufgaben</span>
            <span class="project-count">${state.tasks.length}</span>
        </li>
    `;

    state.projects.forEach(project => {
        const count = getTaskCountByProject(project.id);
        html += `
            <li class="project-item ${state.currentProject === project.id ? 'active' : ''}" data-project-id="${project.id}">
                <span class="color-dot" style="background: ${project.color}"></span>
                <span class="project-name">${escapeHtml(project.name)}</span>
                <span class="project-count">${count}</span>
                <div class="project-actions">
                    <button class="edit-project" data-id="${project.id}" title="Bearbeiten">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="delete-project" data-id="${project.id}" title="Löschen">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </li>
        `;
    });

    projectList.innerHTML = html;

    // Add event listeners
    projectList.querySelectorAll('.project-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.project-actions')) {
                selectProject(item.dataset.projectId || null);
            }
        });
    });

    projectList.querySelectorAll('.edit-project').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openProjectModal(btn.dataset.id);
        });
    });

    projectList.querySelectorAll('.delete-project').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showConfirm('Projekt löschen?', 'Das Projekt wird gelöscht. Aufgaben bleiben erhalten.', () => {
                deleteProject(btn.dataset.id);
            });
        });
    });
}

function renderTasks() {
    if (state.currentView === 'kanban') {
        renderKanbanBoard();
        document.getElementById('kanbanBoard').classList.remove('hidden');
        document.getElementById('listView').classList.add('hidden');
        document.getElementById('calendarView').classList.add('hidden');
    } else if (state.currentView === 'list') {
        renderListView();
        document.getElementById('kanbanBoard').classList.add('hidden');
        document.getElementById('listView').classList.remove('hidden');
        document.getElementById('calendarView').classList.add('hidden');
    } else if (state.currentView === 'calendar') {
        renderCalendar();
        document.getElementById('kanbanBoard').classList.add('hidden');
        document.getElementById('listView').classList.add('hidden');
        document.getElementById('calendarView').classList.remove('hidden');
    }
}

function renderKanbanBoard() {
    const tasks = getFilteredTasks();

    ['todo', 'inprogress', 'done'].forEach(status => {
        const list = document.getElementById(`${status}List`);
        const count = document.getElementById(`${status}Count`);
        const statusTasks = tasks.filter(t => t.status === status);

        count.textContent = statusTasks.length;

        if (statusTasks.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>Keine Aufgaben</p>
                </div>
            `;
        } else {
            list.innerHTML = statusTasks.map(task => renderTaskCard(task)).join('');
        }

        setupTaskCardListeners(list);
    });
}

function renderTaskCard(task) {
    const project = task.projectId ? getProjectById(task.projectId) : null;
    const deadlineClass = task.deadline ? (isOverdue(task.deadline) ? 'overdue' : (isSoon(task.deadline) ? 'soon' : '')) : '';
    const progress = getSubtaskProgress(task);
    const isTimerActive = state.pomodoro.currentTaskId === task.id && state.pomodoro.isRunning;

    return `
        <div class="task-card priority-${task.priority} ${task.completed ? 'completed' : ''} ${isTimerActive ? 'timer-active' : ''}"
             data-task-id="${task.id}"
             draggable="true">
            <div class="task-actions">
                <button class="timer-task timer" data-id="${task.id}" title="Pomodoro starten">
                    <i class="fas fa-clock"></i>
                </button>
                <button class="edit-task" data-id="${task.id}" title="Bearbeiten">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="delete-task delete" data-id="${task.id}" title="Löschen">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="task-header">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-id="${task.id}"></div>
                <div class="task-title">${escapeHtml(task.title)}</div>
            </div>
            ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
            ${progress ? `
                <div class="task-progress">
                    <div class="task-progress-bar">
                        <div class="task-progress-fill" style="width: ${progress.percent}%"></div>
                    </div>
                    <div class="task-progress-text">${progress.completed}/${progress.total} Subtasks</div>
                </div>
            ` : ''}
            <div class="task-meta">
                ${project ? `<span class="task-project-badge" style="background: ${project.color}">${escapeHtml(project.name)}</span>` : ''}
                ${task.deadline ? `<span class="task-deadline ${deadlineClass}"><i class="fas fa-calendar"></i> ${formatDate(task.deadline)}</span>` : ''}
                ${task.reminder ? `<span class="task-reminder"><i class="fas fa-bell"></i></span>` : ''}
                ${task.pomodoroCount > 0 ? `<span class="task-pomodoros"><i class="fas fa-clock"></i> ${task.pomodoroCount}</span>` : ''}
                ${task.tags.length > 0 ? `<div class="task-tags">${task.tags.map(tag => `<span class="task-tag">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
            </div>
        </div>
    `;
}

function setupTaskCardListeners(container) {
    container.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTaskComplete(checkbox.dataset.id);
        });
    });

    container.querySelectorAll('.edit-task').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openTaskModal(btn.dataset.id);
        });
    });

    container.querySelectorAll('.delete-task').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showConfirm('Aufgabe löschen?', 'Diese Aktion kann nicht rückgängig gemacht werden.', () => {
                deleteTask(btn.dataset.id);
            });
        });
    });

    container.querySelectorAll('.timer-task').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            startPomodoro(btn.dataset.id);
        });
    });

    // Drag and Drop
    container.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });
}

function renderListView() {
    const tasks = getFilteredTasks();
    const tbody = document.getElementById('taskTableBody');

    if (tasks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>Keine Aufgaben gefunden</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = tasks.map(task => {
        const project = task.projectId ? getProjectById(task.projectId) : null;
        const deadlineClass = task.deadline ? (isOverdue(task.deadline) ? 'overdue' : (isSoon(task.deadline) ? 'soon' : '')) : '';
        const progress = getSubtaskProgress(task);

        return `
            <tr data-task-id="${task.id}">
                <td>
                    <div class="list-checkbox ${task.completed ? 'checked' : ''}" data-id="${task.id}"></div>
                </td>
                <td>
                    <span class="list-title ${task.completed ? 'completed' : ''}">${escapeHtml(task.title)}</span>
                </td>
                <td>
                    ${progress ? `
                        <div class="list-progress">
                            <div class="list-progress-bar">
                                <div class="list-progress-fill" style="width: ${progress.percent}%"></div>
                            </div>
                        </div>
                    ` : '-'}
                </td>
                <td>
                    ${project ? `<span class="task-project-badge" style="background: ${project.color}">${escapeHtml(project.name)}</span>` : '-'}
                </td>
                <td>
                    <span class="priority-badge ${task.priority}">${task.priority === 'high' ? 'Hoch' : task.priority === 'medium' ? 'Mittel' : 'Niedrig'}</span>
                </td>
                <td>
                    ${task.deadline ? `<span class="task-deadline ${deadlineClass}">${formatDate(task.deadline)}</span>` : '-'}
                </td>
                <td>
                    <span class="status-badge ${task.status}">${task.status === 'todo' ? 'To-Do' : task.status === 'inprogress' ? 'In Progress' : 'Done'}</span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="timer-task" data-id="${task.id}" title="Pomodoro starten">
                            <i class="fas fa-clock"></i>
                        </button>
                        <button class="edit-task" data-id="${task.id}" title="Bearbeiten">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="delete-task delete" data-id="${task.id}" title="Löschen">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Add event listeners
    tbody.querySelectorAll('.list-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', () => toggleTaskComplete(checkbox.dataset.id));
    });

    tbody.querySelectorAll('.edit-task').forEach(btn => {
        btn.addEventListener('click', () => openTaskModal(btn.dataset.id));
    });

    tbody.querySelectorAll('.delete-task').forEach(btn => {
        btn.addEventListener('click', () => {
            showConfirm('Aufgabe löschen?', 'Diese Aktion kann nicht rückgängig gemacht werden.', () => {
                deleteTask(btn.dataset.id);
            });
        });
    });

    tbody.querySelectorAll('.timer-task').forEach(btn => {
        btn.addEventListener('click', () => startPomodoro(btn.dataset.id));
    });
}

function updateProjectSelect() {
    const select = document.getElementById('taskProject');
    select.innerHTML = '<option value="">Kein Projekt</option>' +
        state.projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
}

function updateStats() {
    const total = state.tasks.length;
    const todo = state.tasks.filter(t => t.status === 'todo').length;
    const inProgress = state.tasks.filter(t => t.status === 'inprogress').length;
    const done = state.tasks.filter(t => t.status === 'done').length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = state.tasks.filter(t => {
        if (!t.completedAt) return false;
        const completedDate = new Date(t.completedAt);
        completedDate.setHours(0, 0, 0, 0);
        return completedDate.getTime() === today.getTime();
    }).length;

    const totalPomodoros = state.tasks.reduce((sum, t) => sum + (t.pomodoroCount || 0), 0);

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statTodo').textContent = todo;
    document.getElementById('statInProgress').textContent = inProgress;
    document.getElementById('statDone').textContent = done;
    document.getElementById('statToday').textContent = completedToday;
    document.getElementById('statPomodoros').textContent = totalPomodoros;
}

// ============================================
// Drag and Drop
// ============================================
function handleDragStart(e) {
    state.draggedTask = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    state.draggedTask = null;
    document.querySelectorAll('.task-list').forEach(list => {
        list.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const list = e.target.closest('.task-list');
    if (list) {
        list.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const list = e.target.closest('.task-list');
    if (list && !list.contains(e.relatedTarget)) {
        list.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    const list = e.target.closest('.task-list');
    if (!list || !state.draggedTask) return;

    list.classList.remove('drag-over');

    const taskId = e.dataTransfer.getData('text/plain');
    const newStatus = list.dataset.status;

    const afterElement = getDragAfterElement(list, e.clientY);
    const newIndex = afterElement ?
        Array.from(list.querySelectorAll('.task-card:not(.dragging)')).indexOf(afterElement) :
        null;

    moveTask(taskId, newStatus, newIndex);
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ============================================
// Modal Functions
// ============================================
function openTaskModal(taskId = null, defaultStatus = 'todo') {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    const title = document.getElementById('modalTitle');

    form.reset();
    document.getElementById('taskId').value = '';
    document.getElementById('taskStatus').value = defaultStatus;
    state.tempSubtasks = [];

    if (taskId) {
        const task = state.tasks.find(t => t.id === taskId);
        if (task) {
            title.textContent = 'Aufgabe bearbeiten';
            document.getElementById('taskId').value = task.id;
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description;
            document.getElementById('taskProject').value = task.projectId || '';
            document.getElementById('taskPriority').value = task.priority;
            document.getElementById('taskDeadline').value = task.deadline || '';
            document.getElementById('taskReminder').value = task.reminder || '';
            document.getElementById('taskStatus').value = task.status;
            document.getElementById('taskTags').value = task.tags.join(', ');
            state.tempSubtasks = task.subtasks ? [...task.subtasks] : [];
        }
    } else {
        title.textContent = 'Neue Aufgabe';
        if (state.currentProject) {
            document.getElementById('taskProject').value = state.currentProject;
        }
        if (state.selectedCalendarDate) {
            document.getElementById('taskDeadline').value = state.selectedCalendarDate;
        }
    }

    renderSubtasksList();
    modal.classList.add('show');
    document.getElementById('taskTitle').focus();
}

function closeTaskModal() {
    document.getElementById('taskModal').classList.remove('show');
    state.tempSubtasks = [];
    state.selectedCalendarDate = null;
}

function openProjectModal(projectId = null) {
    const modal = document.getElementById('projectModal');
    const form = document.getElementById('projectForm');
    const title = document.getElementById('projectModalTitle');

    form.reset();
    document.getElementById('projectId').value = '';
    document.getElementById('projectColor').value = '#6366f1';
    updateColorPreview('#6366f1');

    if (projectId) {
        const project = state.projects.find(p => p.id === projectId);
        if (project) {
            title.textContent = 'Projekt bearbeiten';
            document.getElementById('projectId').value = project.id;
            document.getElementById('projectName').value = project.name;
            document.getElementById('projectColor').value = project.color;
            updateColorPreview(project.color);
        }
    } else {
        title.textContent = 'Neues Projekt';
    }

    modal.classList.add('show');
    document.getElementById('projectName').focus();
}

function closeProjectModal() {
    document.getElementById('projectModal').classList.remove('show');
}

function openStatsModal() {
    updateStats();
    document.getElementById('statsModal').classList.add('show');
}

function closeStatsModal() {
    document.getElementById('statsModal').classList.remove('show');
}

function openPomodoroModal() {
    document.getElementById('workDuration').value = state.pomodoro.settings.workDuration;
    document.getElementById('breakDuration').value = state.pomodoro.settings.breakDuration;
    document.getElementById('longBreakDuration').value = state.pomodoro.settings.longBreakDuration;
    document.getElementById('pomodorosUntilLongBreak').value = state.pomodoro.settings.pomodorosUntilLongBreak;
    document.getElementById('pomodoroSound').checked = state.pomodoro.settings.soundEnabled;
    document.getElementById('pomodoroModal').classList.add('show');
}

function closePomodoroModal() {
    document.getElementById('pomodoroModal').classList.remove('show');
}

function openBackupModal() {
    const data = {
        tasks: state.tasks,
        projects: state.projects
    };
    document.getElementById('backupData').textContent = JSON.stringify(data, null, 2);
    document.getElementById('backupModal').classList.add('show');
}

function closeBackupModal() {
    document.getElementById('backupModal').classList.remove('show');
}

function updateColorPreview(color) {
    document.getElementById('colorPreview').style.background = color;
}

// ============================================
// Confirm Dialog
// ============================================
let confirmCallback = null;

function showConfirm(title, message, callback) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = callback;
    document.getElementById('confirmModal').classList.add('show');
}

function closeConfirm() {
    document.getElementById('confirmModal').classList.remove('show');
    confirmCallback = null;
}

// ============================================
// Toast Notifications
// ============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// Theme Toggle
// ============================================
function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcon();
    saveToStorage();
}

function updateThemeIcon() {
    const icon = document.querySelector('#themeToggle i');
    icon.className = state.theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// ============================================
// View Toggle
// ============================================
function cycleView() {
    const views = ['kanban', 'list', 'calendar'];
    const currentIndex = views.indexOf(state.currentView);
    state.currentView = views[(currentIndex + 1) % views.length];
    updateViewIcon();
    saveToStorage();
    renderTasks();
}

function setView(view) {
    state.currentView = view;
    updateViewIcon();
    saveToStorage();
    renderTasks();
}

function updateViewIcon() {
    const icon = document.querySelector('#viewToggle i');
    if (state.currentView === 'kanban') {
        icon.className = 'fas fa-columns';
    } else if (state.currentView === 'list') {
        icon.className = 'fas fa-list';
    } else {
        icon.className = 'fas fa-calendar';
    }
}

// ============================================
// Event Listeners
// ============================================
function initEventListeners() {
    // Theme Toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // View Toggle
    document.getElementById('viewToggle').addEventListener('click', cycleView);

    // Stats Button
    document.getElementById('statsBtn').addEventListener('click', openStatsModal);

    // Pomodoro Button
    document.getElementById('pomodoroBtn').addEventListener('click', () => {
        if (!state.pomodoro.isRunning) {
            showHeaderTimer();
        }
        openPomodoroModal();
    });

    // Timer Controls
    document.getElementById('timerPlayPause').addEventListener('click', () => {
        if (state.pomodoro.isRunning && !state.pomodoro.isPaused) {
            pausePomodoro();
        } else {
            startPomodoro();
        }
    });

    document.getElementById('timerStop').addEventListener('click', stopPomodoro);
    document.getElementById('timerSettings').addEventListener('click', openPomodoroModal);

    // New Task FAB
    document.getElementById('newTaskFab').addEventListener('click', () => openTaskModal());

    // Add Project Button
    document.getElementById('addProjectBtn').addEventListener('click', () => openProjectModal());

    // Quick-Add Inputs
    document.querySelectorAll('.quick-add-input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                const parsed = parseQuickAdd(input.value.trim(), input.dataset.status);
                if (parsed.title) {
                    createTask(parsed);
                    input.value = '';
                }
            }
        });
    });

    // Task Form
    document.getElementById('taskForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const taskId = document.getElementById('taskId').value;
        const taskData = {
            title: document.getElementById('taskTitle').value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            projectId: document.getElementById('taskProject').value || null,
            priority: document.getElementById('taskPriority').value,
            deadline: document.getElementById('taskDeadline').value || null,
            reminder: document.getElementById('taskReminder').value || null,
            status: document.getElementById('taskStatus').value,
            tags: document.getElementById('taskTags').value.split(',').map(t => t.trim()).filter(t => t),
            subtasks: state.tempSubtasks
        };

        if (taskId) {
            updateTask(taskId, taskData);
            showToast('Aufgabe aktualisiert!', 'success');
        } else {
            createTask(taskData);
        }
        closeTaskModal();
    });

    // Add Subtask Button
    document.getElementById('addSubtaskBtn').addEventListener('click', () => {
        const input = document.getElementById('newSubtaskInput');
        const title = input.value.trim();
        if (title) {
            state.tempSubtasks.push({
                id: generateId(),
                title: title,
                completed: false
            });
            input.value = '';
            renderSubtasksList();
        }
    });

    document.getElementById('newSubtaskInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('addSubtaskBtn').click();
        }
    });

    // Project Form
    document.getElementById('projectForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const projectId = document.getElementById('projectId').value;
        const projectData = {
            name: document.getElementById('projectName').value.trim(),
            color: document.getElementById('projectColor').value
        };

        if (projectId) {
            updateProject(projectId, projectData);
            showToast('Projekt aktualisiert!', 'success');
        } else {
            createProject(projectData);
        }
        closeProjectModal();
    });

    // Pomodoro Form
    document.getElementById('pomodoroForm').addEventListener('submit', (e) => {
        e.preventDefault();
        savePomodoroSettings();
    });

    // Color Picker
    document.getElementById('projectColor').addEventListener('input', (e) => {
        updateColorPreview(e.target.value);
    });

    // Modal Close Buttons
    document.getElementById('closeModal').addEventListener('click', closeTaskModal);
    document.getElementById('cancelTask').addEventListener('click', closeTaskModal);
    document.getElementById('closeProjectModal').addEventListener('click', closeProjectModal);
    document.getElementById('cancelProject').addEventListener('click', closeProjectModal);
    document.getElementById('closeStatsModal').addEventListener('click', closeStatsModal);
    document.getElementById('closePomodoroModal').addEventListener('click', closePomodoroModal);
    document.getElementById('cancelPomodoro').addEventListener('click', closePomodoroModal);
    document.getElementById('closeBackupModal').addEventListener('click', closeBackupModal);
    document.getElementById('closeCalendarDayModal').addEventListener('click', closeCalendarDayModal);
    document.getElementById('closeConfirmModal').addEventListener('click', closeConfirm);
    document.getElementById('confirmCancel').addEventListener('click', closeConfirm);
    document.getElementById('confirmOk').addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        closeConfirm();
    });

    // Add Task for Day Button
    document.getElementById('addTaskForDay').addEventListener('click', () => {
        closeCalendarDayModal();
        openTaskModal();
    });

    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });

    // Dropdown Menu
    document.getElementById('menuBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('dropdownMenu').classList.toggle('show');
    });

    document.addEventListener('click', () => {
        document.getElementById('dropdownMenu').classList.remove('show');
    });

    // Notifications Button
    document.getElementById('notificationBtn').addEventListener('click', requestNotificationPermission);

    // Export/Import
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', (e) => {
        if (e.target.files[0]) {
            importData(e.target.files[0]);
            e.target.value = '';
        }
    });

    // Backup
    document.getElementById('backupBtn').addEventListener('click', openBackupModal);
    document.getElementById('copyBackup').addEventListener('click', () => {
        navigator.clipboard.writeText(document.getElementById('backupData').textContent);
        showToast('In Zwischenablage kopiert!', 'success');
    });

    // Clear Data
    document.getElementById('clearDataBtn').addEventListener('click', () => {
        showConfirm('Alle Daten löschen?', 'Diese Aktion kann nicht rückgängig gemacht werden.', clearAllData);
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        renderTasks();
    });

    // Filter Priority
    document.getElementById('filterPriority').addEventListener('change', (e) => {
        state.filters.priority = e.target.value;
        renderTasks();
    });

    // Sort By
    document.getElementById('sortBy').addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderTasks();
    });

    // Calendar Navigation
    document.getElementById('prevMonth').addEventListener('click', () => navigateMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => navigateMonth(1));
    document.getElementById('todayBtn').addEventListener('click', goToToday);

    // Drag and Drop
    document.querySelectorAll('.task-list').forEach(list => {
        list.addEventListener('dragover', handleDragOver);
        list.addEventListener('dragleave', handleDragLeave);
        list.addEventListener('drop', handleDrop);
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            if (e.key === 'Escape') {
                e.target.blur();
            }
            return;
        }

        switch (e.key.toLowerCase()) {
            case 'n':
                e.preventDefault();
                openTaskModal();
                break;
            case 'p':
                e.preventDefault();
                openProjectModal();
                break;
            case '/':
                e.preventDefault();
                document.getElementById('searchInput').focus();
                break;
            case 'v':
                e.preventDefault();
                cycleView();
                break;
            case 't':
                e.preventDefault();
                toggleTheme();
                break;
            case 's':
                e.preventDefault();
                openStatsModal();
                break;
            case 'c':
                e.preventDefault();
                setView('calendar');
                break;
            case 'escape':
                document.querySelectorAll('.modal.show').forEach(modal => {
                    modal.classList.remove('show');
                });
                break;
        }
    });
}

// ============================================
// Initialize App
// ============================================
function init() {
    loadFromStorage();
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcon();
    updateViewIcon();
    updateTimerDisplay();

    initEventListeners();
    renderAll();

    // Start notification checker if enabled
    if (state.notificationsEnabled && Notification.permission === 'granted') {
        startNotificationChecker();
    }
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
