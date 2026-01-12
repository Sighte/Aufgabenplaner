# Aufgabenplaner

Ein minimalistischer, selbst-gehosteter Aufgabenplaner als reine Client-Side Web-Anwendung.

## Features

- **Kanban-Board** mit Drag-and-Drop (To-Do, In Progress, Done)
- **Listen-Ansicht** als Alternative
- **Projekte** zur Organisation mit Farbcodierung
- **Prioritäten** (Hoch, Mittel, Niedrig) mit visueller Kennzeichnung
- **Deadlines** mit Überfällig-Warnung
- **Tags** für zusätzliche Kategorisierung
- **Dark/Light Mode**
- **Suche** und **Filter**
- **Export/Import** als JSON
- **Automatische Speicherung** im LocalStorage

## Schnellstart

### Option 1: Direkt im Browser öffnen
Einfach die `index.html` Datei im Browser öffnen (Doppelklick).

### Option 2: Lokaler Server (empfohlen)

**Mit Python:**
```bash
cd AufgabenPlanerNEU
python -m http.server 8000
```
Dann im Browser: http://localhost:8000

**Mit Node.js:**
```bash
npx serve
```

**Mit PHP:**
```bash
php -S localhost:8000
```

## Tastaturkürzel

| Taste | Aktion |
|-------|--------|
| `N` | Neue Aufgabe erstellen |
| `P` | Neues Projekt erstellen |
| `/` | Suche fokussieren |
| `V` | Ansicht wechseln (Kanban/Liste) |
| `T` | Theme wechseln (Dark/Light) |
| `S` | Statistiken anzeigen |
| `Esc` | Dialog schließen |

## Datensicherung

### Export
1. Klicke auf das Menü (drei Punkte oben rechts)
2. Wähle "Export JSON"
3. Die Datei wird automatisch heruntergeladen

### Import
1. Klicke auf das Menü
2. Wähle "Import JSON"
3. Wähle eine zuvor exportierte JSON-Datei

### LocalStorage anzeigen
1. Klicke auf das Menü
2. Wähle "Backup anzeigen"
3. Du kannst den Inhalt in die Zwischenablage kopieren

## Dateistruktur

```
AufgabenPlanerNEU/
├── index.html    # Hauptseite
├── style.css     # Styling
├── app.js        # Anwendungslogik
└── README.md     # Diese Datei
```

## Technologie

- **HTML5** - Struktur
- **CSS3** - Styling mit CSS Custom Properties
- **Vanilla JavaScript** - Keine Frameworks
- **LocalStorage** - Datenpersistenz
- **Font Awesome** (CDN) - Icons

## Daten

Alle Daten werden im LocalStorage des Browsers gespeichert:
- `aufgabenplaner_tasks` - Aufgaben
- `aufgabenplaner_projects` - Projekte
- `aufgabenplaner_theme` - Theme-Einstellung
- `aufgabenplaner_view` - Ansicht-Einstellung
- `aufgabenplaner_current_project` - Ausgewähltes Projekt

**Hinweis:** LocalStorage ist browser- und domänenspezifisch. Daten sind nur im selben Browser verfügbar.

## Browser-Kompatibilität

Getestet mit:
- Chrome/Edge (empfohlen)
- Firefox
- Safari

## Lizenz

MIT - Frei verwendbar
