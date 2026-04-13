const express = require('express');
const router = express.Router();

const modules = [
  {
    id: 'reading',
    name: 'Reading Journey',
    icon: 'book',
    route: '/reading',
    status: '3 books in progress',
    color: 'rose',
  },
  {
    id: 'cinema',
    name: 'Cinema & TV',
    icon: 'film',
    route: '/cinema',
    status: '4 series watched',
    color: 'green',
  },
  {
    id: 'wealth',
    name: 'Spending Tracker',
    icon: 'wallet',
    route: '/expenses',
    status: 'Portfolio up 2.4%',
    color: 'purple',
  },
  {
    id: 'growth',
    name: 'Personal Growth',
    icon: 'chart',
    route: '/growth',
    status: 'Daily goals 80%',
    color: 'blue',
  },
  {
    id: 'mindfulness',
    name: 'Mindfulness',
    icon: 'leaf',
    route: '/mindfulness',
    status: '15 min streak',
    color: 'teal',
  },
];

router.get('/', (req, res) => {
  res.json({ modules });
});

module.exports = router;
