// src/routes/news.js

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Cache news for 10 minutes
const NodeCache = require('node-cache');
const newsCache = new NodeCache({ stdTTL: 600 });

// GET /api/news?q=immigration
router.get('/', async (req, res) => {
    try {
        const query = req.query.q || 'immigration';
        const cacheKey = `news-${query}`;

        // Check cache first
        const cached = newsCache.get(cacheKey);

        if (cached) {
            return res.json({
                success: true,
                articles: cached
            });
        }

        // Google News RSS
        // No API key required
        const url =
            `https://news.google.com/rss/search?q=${encodeURIComponent(query)}` +
            `&hl=en-US&gl=US&ceid=US:en`;

        const response = await axios.get(url, {
            responseType: 'text',
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        const xml = response.data;

        // Find all RSS <item> elements
        const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

        const articles = itemMatches.slice(0, 10).map((item) => {

            const getTagValue = (tag) => {
                const regex = new RegExp(
                    `<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
                    'i'
                );

                const match = item.match(regex);

                return match ? match[1].trim() : '';
            };

            return {
                title: getTagValue('title'),
                link: getTagValue('link'),
                pubDate: getTagValue('pubDate'),
                source: getTagValue('source')
            };
        });

        // Save in cache
        newsCache.set(cacheKey, articles);

        // Send response to frontend
        res.json({
            success: true,
            articles
        });

    } catch (error) {
        console.error(
            '❌ Google News Error:',
            error.response?.status || '',
            error.message
        );

        res.status(500).json({
            success: false,
            error: 'Failed to fetch news'
        });
    }
});

module.exports = router;