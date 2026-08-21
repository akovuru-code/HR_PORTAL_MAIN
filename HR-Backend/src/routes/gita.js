const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');

// Load all JSON files
const verses = JSON.parse(fs.readFileSync(path.join(dataDir, 'verse.json'), 'utf8'));
const translations = JSON.parse(fs.readFileSync(path.join(dataDir, 'translation.json'), 'utf8'));
const chapters = JSON.parse(fs.readFileSync(path.join(dataDir, 'chapters.json'), 'utf8'));
const authors = JSON.parse(fs.readFileSync(path.join(dataDir, 'authors.json'), 'utf8'));

// Filter only English translations
const englishTranslations = translations.filter(t => t.lang === 'english');

// Build a list of verses that have English translations
const versesWithEnglish = verses.filter(verse =>
    englishTranslations.some(t => t.verse_id === verse.id)
);

router.get('/slok/random', (req, res) => {
    if (versesWithEnglish.length === 0) {
        return res.status(500).json({ error: 'No English sloks available.' });
    }

    // Pick a random verse that has an English translation
    const randomIndex = Math.floor(Math.random() * versesWithEnglish.length);
    const slok = versesWithEnglish[randomIndex];

    // Find the matching English translation
    const translation = englishTranslations.find(t => t.verse_id === slok.id);
    const chapter = chapters.find(c => c.id === slok.chapter_id) || {};
    const author = authors.find(a => a.id === translation?.author_id) || {};

    res.json({
        slok: slok.text || 'No slok found',
        chapter: chapter.name_translation || `Chapter ${slok.chapter_number || 'N/A'}`,
        translation: translation?.description || 'No English translation found',
        author: author.name || 'Unknown',
    });
});

module.exports = router;
