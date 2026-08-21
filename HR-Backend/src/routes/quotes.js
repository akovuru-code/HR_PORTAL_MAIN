const express = require('express');
const router = express.Router();

const quotes = [
    { author: "Swami Vivekananda", text: "Arise, awake, and stop not till the goal is reached." },
    { author: "Subhas Chandra Bose", text: "Give me blood, and I will give you freedom." },
    { author: "A. P. J. Abdul Kalam", text: "Dream, dream, dream. Dreams transform into thoughts." },
    { author: "Bhagat Singh", text: "They may kill me, but they cannot kill my ideas." },

];

router.get("/", (req, res) => {
    const idx = Math.floor(Math.random() * quotes.length);
    res.json(quotes[idx]);
});

module.exports = router;