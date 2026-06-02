export type Meal = {
  id: string;
  name: string;
  type: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  time: string;
  loggedDate?: string; // YYYY-MM-DD — added for per-day filtering
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  emoji: string;
};

export const todayMeals: Meal[] = [
  { id: "1", name: "Masala Poha", type: "Breakfast", time: "07:42", calories: 380, protein: 9, carbs: 62, fat: 11, emoji: "🍛" },
  { id: "2", name: "Masala Chai", type: "Breakfast", time: "08:15", calories: 90, protein: 3, carbs: 12, fat: 3, emoji: "🍵" },
  { id: "3", name: "Paneer Tikka Salad", type: "Lunch", time: "12:35", calories: 520, protein: 32, carbs: 28, fat: 28, emoji: "🥗" },
  { id: "4", name: "Lassi (Protein)", type: "Snack", time: "16:10", calories: 240, protein: 18, carbs: 26, fat: 6, emoji: "🥤" },
  { id: "5", name: "Dal, Roti & Sabzi", type: "Dinner", time: "19:25", calories: 640, protein: 26, carbs: 84, fat: 18, emoji: "🍲" },

];

export const goals = {
  calories: 2200,
  protein: 165,
  carbs: 240,
  fat: 70,
};

export const totals = todayMeals.reduce(
  (a, m) => ({
    calories: a.calories + m.calories,
    protein: a.protein + m.protein,
    carbs: a.carbs + m.carbs,
    fat: a.fat + m.fat,
  }),
  { calories: 0, protein: 0, carbs: 0, fat: 0 },
);

export const weeklyCalories = [
  { day: "Mon", kcal: 2050, goal: 2200 },
  { day: "Tue", kcal: 2310, goal: 2200 },
  { day: "Wed", kcal: 1980, goal: 2200 },
  { day: "Thu", kcal: 2150, goal: 2200 },
  { day: "Fri", kcal: 2240, goal: 2200 },
  { day: "Sat", kcal: 2480, goal: 2200 },
  { day: "Sun", kcal: totals.calories, goal: 2200 },
];

export const weightTrend = [
  { week: "W1", kg: 82.4 },
  { week: "W2", kg: 81.9 },
  { week: "W3", kg: 81.5 },
  { week: "W4", kg: 80.8 },
  { week: "W5", kg: 80.3 },
  { week: "W6", kg: 79.7 },
  { week: "W7", kg: 79.2 },
];

export const proteinWeek = [
  { day: "Mon", g: 142 },
  { day: "Tue", g: 168 },
  { day: "Wed", g: 151 },
  { day: "Thu", g: 174 },
  { day: "Fri", g: 160 },
  { day: "Sat", g: 138 },
  { day: "Sun", g: totals.protein },
];

export const workouts = [
  { id: "w1", title: "Push Day — Chest & Triceps", time: "18:00", duration: "55 min", done: false },
  { id: "w2", title: "Zone 2 Cardio", time: "07:00", duration: "30 min", done: true },
  { id: "w3", title: "Pull Day — Back & Biceps", time: "Tomorrow 18:00", duration: "60 min", done: false },
];

export const streaks = {
  logging: 23,
  protein: 11,
  workouts: 4,
};

export const coachMessages = [
  { role: "coach" as const, text: "Morning! You hit your protein 5 days in a row 💪 Want me to plan today's meals around 165g protein?" },
  { role: "user" as const, text: "Yes, but keep dinner under 700 kcal." },
  { role: "coach" as const, text: "Got it. I'll suggest grilled tandoori chicken with jeera rice (640 kcal, 42g protein) and a small bowl of dahi to hit your macros." },
];

export const foodSearchResults = [
  { name: "Tandoori Chicken", serving: "100 g", kcal: 175, p: 28, c: 2, f: 6 },
  { name: "Basmati Rice, cooked", serving: "1 cup", kcal: 205, p: 4.3, c: 45, f: 0.4 },
  { name: "Roti (Whole Wheat)", serving: "1 medium", kcal: 120, p: 3.5, c: 22, f: 2.5 },
  { name: "Paneer", serving: "50 g", kcal: 130, p: 9, c: 1.2, f: 10 },
  { name: "Dal Tadka", serving: "1 cup", kcal: 198, p: 11, c: 28, f: 5 },
  { name: "Idli", serving: "2 pieces", kcal: 78, p: 3, c: 16, f: 0.4 },
  { name: "Masala Dosa", serving: "1 medium", kcal: 168, p: 4, c: 29, f: 4 },
  { name: "Banana", serving: "1 medium", kcal: 105, p: 1.3, c: 27, f: 0.4 },

];
