
# Data Files

This directory contains data files used throughout the application.

## Files:

- **rules.json**: Contains all cricket rules data displayed on the Rules page.

## How to modify the rules:

To add or modify cricket rules:

1. Open `rules.json`
2. Find the appropriate section for your rule (match, scoring, dismissals, conduct)
3. Add a new rule point to the "points" array following this structure:

```json
{
  "id": "unique-id",  // Unique identifier for this rule point
  "title": "Rule Title",  // Short title displayed in bold
  "short": "Brief description shown initially",  // Always visible summary
  "details": "Detailed explanation shown when expanded"  // Shown when clicked
}
```

4. If you need to add an entirely new section, follow this structure:

```json
{
  "id": "section-id",  // Unique identifier for this section
  "title": "Section Title",  // Displayed at the top of the card
  "icon": "material_icon_name",  // Material icon name (see https://fonts.google.com/icons)
  "points": [
    // Array of rule points following the structure above
  ]
}
```

5. Save the file and the changes will be automatically reflected on the Rules page.