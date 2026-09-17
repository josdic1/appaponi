import type {
  MenuSeed,
} from "../services/menuSeeds.js";

const DAILY_BREAKFAST = [
  "Hardboiled eggs",
  "Bagels",
  "Assorted cold cereals",
  "Fresh fruit",
  "Yogurt",
  "Oatmeal",
];

function section(
  dayOfWeek: number,
  mealType: "Breakfast" | "Lunch" | "Dinner",
  names: string[],
) {
  return names.map((name, index) => ({
    day_of_week: dayOfWeek,
    meal_type: mealType,
    name,
    sort_order: index,
  }));
}

export const familyCampMenuSeed: MenuSeed = {
  key: "family-camp",
  name: "Family Camp Menu",
  description:
    "Camp Mataponi seven-day breakfast, lunch, and dinner menu. Snack service is intentionally separate.",
  items: [
    ...section(6, "Breakfast", [
      ...DAILY_BREAKFAST,
      "Cinnamon buns",
      "Cut fresh fruit",
      "Juices / Milk",
    ]),
    ...section(0, "Breakfast", [
      ...DAILY_BREAKFAST,
      "French toast sticks",
      "Fruit salad",
      "Juices / Milk",
    ]),
    ...section(1, "Breakfast", [
      ...DAILY_BREAKFAST,
      "Omelet bar",
      "Juices / Milk",
    ]),
    ...section(2, "Breakfast", [
      ...DAILY_BREAKFAST,
      "Belgian waffles",
      "Strawberry sauce",
      "Fresh strawberries",
      "Juices / Milk",
    ]),
    ...section(3, "Breakfast", [
      ...DAILY_BREAKFAST,
      "Scrambled eggs",
      "Fried potatoes",
      "English muffins",
      "Juices / Milk",
    ]),
    ...section(4, "Breakfast", [
      ...DAILY_BREAKFAST,
      "Chocolate chip banana bread / muffins",
      "Juices / Milk",
    ]),
    ...section(5, "Breakfast", [
      ...DAILY_BREAKFAST,
      "Pancakes",
      "Sliced melons",
      "Juices / Milk",
    ]),

    ...section(6, "Lunch", [
      "Salad bar",
      "Pizza day — cheese and veggie",
      "Tossed Italian salad",
      "Cut carrots and cucumbers",
    ]),
    ...section(0, "Lunch", [
      "Salad bar",
      "Chicken patties on roll",
      "French fries",
      "Celery and carrot sticks",
    ]),
    ...section(1, "Lunch", [
      "Salad bar",
      "Sliced turkey",
      "Deli roast beef",
      "Beef salami",
      "Breads / wraps",
      "Pasta salad",
      "Lettuce, tomatoes, cheese",
      "Chips / pickles",
    ]),
    ...section(2, "Lunch", [
      "Salad bar",
      "Bread bowls",
      "Chowder",
      "Chili / cheese",
      "Tuna salad wraps",
      "Corn chips",
    ]),
    ...section(3, "Lunch", [
      "Salad bar",
      "Stromboli — cheese; chicken, broccoli & cheddar",
      "Spinach salad",
    ]),
    ...section(4, "Lunch", [
      "Salad bar",
      "Meatball subs",
      "Curly fries",
      "Corn niblets",
      "Mozzarella sticks",
      "Marinara sauce",
    ]),
    ...section(5, "Lunch", [
      "Salad bar",
      "Chicken Caesar salad wrap",
      "Pizza pockets",
      "Potato chips",
      "Carrot and celery",
    ]),

    ...section(6, "Dinner", [
      "Salad bar",
      "French onion soup",
      "Grilled chicken breast",
      "Sweet potato fries",
      "Sautéed vegetables",
      "Fresh wheat rolls",
      "Frosted cake",
    ]),
    ...section(0, "Dinner", [
      "Salad bar",
      "Spaghetti dinner",
      "Meat sauce",
      "Plain sauce",
      "Cream sauce",
      "Green beans",
      "Garlic bread",
      "Ice cream sundaes",
    ]),
    ...section(1, "Dinner", [
      "Salad bar",
      "Burgers / hotdogs",
      "Veggie burgers",
      "Lettuce, tomatoes, cheese",
      "Condiments",
      "Corn on the cob",
      "Potato salad",
      "Watermelon slices",
    ]),
    ...section(2, "Dinner", [
      "Salad bar",
      "Taco night",
      "Soft and hard shells",
      "All the fixings",
      "Corn niblets",
      "Rice",
      "Chocolate cream pies",
    ]),
    ...section(3, "Dinner", [
      "Salad bar",
      "Beef stir fry",
      "White rice",
      "Steamed snow peas",
      "Fried rice",
      "Brownies",
    ]),
    ...section(4, "Dinner", [
      "Salad bar",
      "Chicken parmesan",
      "Penne pasta",
      "Plain sauce",
      "Peas",
      "Garlic knots",
      "Chocolate pudding",
    ]),
    ...section(5, "Dinner", [
      "Salad bar",
      "Roast turkey / beef",
      "Gravy",
      "Mashed potatoes",
      "Stuffing",
      "Cranberry sauce",
      "Peas / carrots",
      "Fresh rolls",
      "Apple pie with whipped topping",
    ]),
  ],
};
