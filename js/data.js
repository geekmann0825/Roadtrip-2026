// data.js — Trip structure and helper functions

const TRIP_STOPS = [
  {
    id: "day-1-boston",
    day: 1,
    date: "2026-06-26",
    city: "Boston / Springfield",
    label: "Boston + Basketball Hall of Fame",
    stops: [
      { id: "nba-hof", name: "Naismith Basketball Hall of Fame", type: "hall-of-fame" },
      { id: "boston-hotel", name: "Boston / Springfield Overnight", type: "hotel" }
    ]
  },
  {
    id: "day-2-fenway",
    day: 2,
    date: "2026-06-27",
    city: "Boston",
    label: "Fenway Park",
    stops: [
      { id: "fenway", name: "Fenway Park", type: "stadium" },
      { id: "red-sox-game", name: "Red Sox Game", type: "game" }
    ]
  },
  {
    id: "day-3-cooperstown",
    day: 3,
    date: "2026-06-28",
    city: "Cooperstown",
    label: "Baseball Hall of Fame",
    stops: [
      { id: "mlb-hof", name: "National Baseball Hall of Fame", type: "hall-of-fame" }
    ]
  },
  {
    id: "day-4-toronto",
    day: 4,
    date: "2026-06-29",
    city: "Toronto",
    label: "Tom's Birthday + Blue Jays",
    stops: [
      { id: "hockey-hof", name: "Hockey Hall of Fame", type: "hall-of-fame" },
      { id: "blue-jays-game", name: "Mets at Blue Jays", type: "game" },
      { id: "toronto-city", name: "Toronto City", type: "city" }
    ]
  },
  {
    id: "day-5-niagara-cleveland",
    day: 5,
    date: "2026-06-30",
    city: "Niagara Falls / Cleveland",
    label: "Niagara Falls + Cleveland",
    stops: [
      { id: "niagara-falls", name: "Niagara Falls", type: "attraction" },
      { id: "rock-hall", name: "Rock & Roll Hall of Fame", type: "hall-of-fame" },
      { id: "guardians-game", name: "Guardians Game", type: "game" },
      { id: "wooster-overnight", name: "Wooster Overnight", type: "hotel" }
    ]
  },
  {
    id: "day-6-canton-philly",
    day: 6,
    date: "2026-07-01",
    city: "Canton / Philadelphia",
    label: "Football Hall of Fame + Drive to Philly",
    stops: [
      { id: "nfl-hof", name: "Pro Football Hall of Fame", type: "hall-of-fame" },
      { id: "drive-to-philly", name: "Drive to Philadelphia", type: "drive" }
    ]
  },
  {
    id: "day-7-philly",
    day: 7,
    date: "2026-07-02",
    city: "Philadelphia",
    label: "Philadelphia + Phillies",
    stops: [
      { id: "philly-city", name: "Philadelphia City", type: "city" },
      { id: "phillies-game", name: "Phillies Game", type: "game" }
    ]
  },
  {
    id: "day-8-open",
    day: 8,
    date: "2026-07-03",
    city: "Between Philly and DC",
    label: "Open Day",
    stops: [
      { id: "open-day", name: "Open Day / Gap Between Philly and DC", type: "open" }
    ]
  },
  {
    id: "day-9-dc",
    day: 9,
    date: "2026-07-04",
    city: "Washington DC",
    label: "DC Fireworks",
    stops: [
      { id: "dc-city", name: "Washington DC", type: "city" },
      { id: "dc-fireworks", name: "July 4 Fireworks", type: "event" },
      { id: "post-fireworks-drive", name: "Drive after Fireworks", type: "drive" }
    ]
  },
  {
    id: "day-10-home",
    day: 10,
    date: "2026-07-05",
    city: "Home",
    label: "Drive Home",
    stops: [
      { id: "drive-home", name: "Drive Home", type: "drive" }
    ]
  }
];

const QUICK_TAGS = [
  "Mets", "Jets", "Knicks", "Islanders", "St. John's",
  "Tom Birthday", "Ryan", "John", "Family",
  "Food", "Hotel", "Stadium", "Hall of Fame",
  "Funny", "Best Shot", "Must Print"
];

const PEOPLE = ["Tom", "Ryan", "John", "Family"];

const CATEGORIES = [
  { id: "hall-of-fame", label: "Hall of Fame", emoji: "🏆" },
  { id: "stadium", label: "Stadium", emoji: "🏟️" },
  { id: "game", label: "Game", emoji: "⚾" },
  { id: "attraction", label: "Attraction", emoji: "🌊" },
  { id: "city", label: "City", emoji: "🏙️" },
  { id: "hotel", label: "Hotel", emoji: "🏨" },
  { id: "food", label: "Food", emoji: "🍔" },
  { id: "drive", label: "Drive", emoji: "🚗" },
  { id: "event", label: "Event", emoji: "🎆" },
  { id: "memory", label: "Memory", emoji: "📸" }
];

const STOP_TYPE_ICONS = {
  "hall-of-fame": "🏆",
  "stadium": "🏟️",
  "game": "⚾",
  "attraction": "🌊",
  "city": "🏙️",
  "hotel": "🏨",
  "food": "🍔",
  "drive": "🚗",
  "event": "🎆",
  "open": "📅"
};

function getAllStops() {
  const stops = [];
  TRIP_STOPS.forEach(day => {
    day.stops.forEach(stop => {
      stops.push({ ...stop, dayId: day.id, dayLabel: day.label, date: day.date, city: day.city, day: day.day });
    });
  });
  return stops;
}

function getDayById(dayId) {
  return TRIP_STOPS.find(d => d.id === dayId) || null;
}

function getStopById(stopId) {
  for (const day of TRIP_STOPS) {
    const stop = day.stops.find(s => s.id === stopId);
    if (stop) return { ...stop, dayId: day.id, date: day.date, city: day.city, day: day.day };
  }
  return null;
}

function getTodayTripDay() {
  const today = new Date().toISOString().split('T')[0];
  // Find matching day
  let match = TRIP_STOPS.find(d => d.date === today);
  if (match) return match;
  // Find nearest upcoming day
  const upcoming = TRIP_STOPS.filter(d => d.date >= today);
  if (upcoming.length > 0) return upcoming[0];
  // Trip is over, return last day
  return TRIP_STOPS[TRIP_STOPS.length - 1];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isTripActive() {
  const today = new Date().toISOString().split('T')[0];
  const start = TRIP_STOPS[0].date;
  const end = TRIP_STOPS[TRIP_STOPS.length - 1].date;
  return today >= start && today <= end;
}
