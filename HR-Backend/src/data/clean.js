// HR-backend/src/data/clean.js
const fs = require('fs');
const path = require('path');

const dataDir = __dirname;

const versePath = path.join(dataDir, 'verse.json');
const translationPath = path.join(dataDir, 'translation.json');

const verses = JSON.parse(fs.readFileSync(versePath, 'utf8'));
const translations = JSON.parse(fs.readFileSync(translationPath, 'utf8'));

// Keep only English translations
const englishTranslations = translations.filter(t => t.lang === 'english');

// Get the verse_ids that have English translations
const englishVerseIds = new Set(englishTranslations.map(t => t.verse_id));

// Keep only verses with English translations
const englishVerses = verses.filter(v => englishVerseIds.has(v.id));

// Save back the filtered results
fs.writeFileSync(versePath, JSON.stringify(englishVerses, null, 2));
fs.writeFileSync(translationPath, JSON.stringify(englishTranslations, null, 2));

console.log(`✅ Done! Removed ${verses.length - englishVerses.length} verses and ${translations.length - englishTranslations.length} translations that were not in English.`);
