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
  { id: "1", name: "Greek Yogurt Bowl", type: "Breakfast", time: "07:42", calories: 380, protein: 28, carbs: 42, fat: 9, emoji: "🥣" },
  { id: "2", name: "Cold Brew + Oat Milk", type: "Breakfast", time: "08:15", calories: 90, protein: 2, carbs: 12, fat: 3, emoji: "☕" },
  { id: "3", name: "Grilled Chicken Salad", type: "Lunch", time: "12:35", calories: 520, protein: 44, carbs: 28, fat: 22, emoji: "🥗" },
  { id: "4", name: "Protein Smoothie", type: "Snack", time: "16:10", calories: 240, protein: 26, carbs: 22, fat: 4, emoji: "🥤" },
  { id: "5", name: "Salmon, Rice & Greens", type: "Dinner", time: "19:25", calories: 640, protein: 42, carbs: 58, fat: 24, emoji: "🍣" },
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
  { role: "coach" as const, text: "Got it. I'll suggest a salmon bowl (640 kcal, 42g protein) and a Greek yogurt snack to hit your macros." },
];

export const foodSearchResults = [
  { name: "Chicken Breast, grilled", serving: "100 g", kcal: 165, p: 31, c: 0, f: 3.6 },
  { name: "Brown Rice, cooked", serving: "1 cup", kcal: 216, p: 5, c: 45, f: 1.8 },
  { name: "Avocado", serving: "1/2 medium", kcal: 160, p: 2, c: 9, f: 15 },
  { name: "Egg, whole", serving: "1 large", kcal: 72, p: 6, c: 0.4, f: 5 },
  { name: "Banana", serving: "1 medium", kcal: 105, p: 1.3, c: 27, f: 0.4 },
  { name: "Almonds", serving: "28 g", kcal: 164, p: 6, c: 6, f: 14 },
];
