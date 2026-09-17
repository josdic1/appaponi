export const familyCampSeed = {
  "seed_name": "Family Camp 2026 demo",
  "event": {
    "name": "Family Camp 2026",
    "event_type": "Family Camp",
    "starts_at": "2026-08-19T11:00:00-04:00",
    "ends_at": "2026-08-22T11:15:00-04:00"
  },
  "staff": [
    {
      "username": "alex",
      "full_name": "Alex Belle",
      "babysitting_eligible": false,
      "qualifications": [
        "Waterskiing",
        "Lifeguard"
      ]
    },
    {
      "username": "quinn",
      "full_name": "Quinn Snowe",
      "babysitting_eligible": true,
      "qualifications": [
        "Waterskiing",
        "Lifeguard"
      ]
    },
    {
      "username": "lu",
      "full_name": "Lu Weeks",
      "babysitting_eligible": true,
      "qualifications": []
    }
  ],
  "households": [
    {
      "username": "dicker",
      "spots_paid_for": 3,
      "cabin": "Cabin 14",
      "people": [
        {
          "full_name": "Josh Dicker",
          "role": "primary",
          "email": "josh@demo.com"
        },
        {
          "full_name": "Dorrie Dicker",
          "role": "adult",
          "email": "dorrie@demo.com"
        },
        {
          "full_name": "Demi Dicker",
          "role": "child",
          "dietary_restrictions": "No peanuts"
        }
      ],
      "display_name": "Dicker Family"
    },
    {
      "username": "muskat",
      "spots_paid_for": 4,
      "cabin": "Cabin 15",
      "people": [
        {
          "full_name": "Jake Muskat",
          "role": "primary",
          "email": "jake@demo.com"
        },
        {
          "full_name": "Kim Kaufman",
          "role": "adult",
          "email": "kime@demo.com"
        },
        {
          "full_name": "Serena Muskat",
          "role": "child"
        },
        {
          "full_name": "Reed Muskat",
          "role": "child"
        }
      ],
      "display_name": "Muskat Family"
    }
  ],
  "cabins": [
    {
      "name": "Cabin 14",
      "map_slot_id": "cabin-a1"
    },
    {
      "name": "Cabin 15",
      "map_slot_id": "cabin-a2"
    },
    {
      "name": "Cabin 16",
      "map_slot_id": "cabin-a3"
    }
  ],
  "activities": [
    {
      "name": "Arrival",
      "area": "Guest Services",
      "setting": "inside",
      "map_place_id": "office"
    },
    {
      "name": "Waterfront & Activities Open (Waterski Sign-Up)",
      "area": "Waterfront",
      "setting": "outside",
      "map_place_id": "waterfront"
    },
    {
      "name": "Mostest!",
      "area": "General Events",
      "setting": "outside",
      "map_place_id": "field"
    },
    {
      "name": "Campfire & S'mores",
      "area": "General Events",
      "setting": "outside",
      "map_place_id": "camp-fire"
    },
    {
      "name": "Drop-In Gymnastics",
      "area": "Athletics",
      "setting": "inside",
      "map_place_id": "gymnastics"
    },
    {
      "name": "Pickleball Tournament",
      "area": "Athletics",
      "setting": "outside",
      "map_place_id": "tennis"
    },
    {
      "name": "Carnival in Junior Camp with Slip N Slide",
      "area": "General Events",
      "setting": "outside",
      "map_place_id": "field"
    },
    {
      "name": "Activities Open",
      "area": "General Events",
      "setting": "outside",
      "map_place_id": "field"
    },
    {
      "name": "Beach Luau & Night Blobbing",
      "area": "Waterfront",
      "setting": "outside",
      "map_place_id": "waterfront"
    },
    {
      "name": "Bonfire on the Beach",
      "area": "Waterfront",
      "setting": "outside",
      "map_place_id": "waterfront"
    },
    {
      "name": "Rest Hour",
      "area": "Lodging / Cabins",
      "setting": "inside",
      "map_place_id": "your-cabin"
    },
    {
      "name": "Color War!",
      "area": "Athletics",
      "setting": "outside",
      "map_place_id": "field"
    },
    {
      "name": "Watermelon Eating Contest",
      "area": "General Events",
      "setting": "outside",
      "map_place_id": "field"
    },
    {
      "name": "Activities Open (Waterski / Tubing Sign-Up)",
      "area": "Waterfront",
      "setting": "outside",
      "map_place_id": "waterfront"
    },
    {
      "name": "Adult Only Campfire",
      "area": "General Events",
      "setting": "outside",
      "map_place_id": "camp-fire"
    },
    {
      "name": "Waterfront Open",
      "area": "Waterfront",
      "setting": "outside",
      "map_place_id": "waterfront"
    },
    {
      "name": "Departure",
      "area": "Guest Services",
      "setting": "inside",
      "map_place_id": "office"
    }
  ],
  "schedule": [
    {
      "activity": "Arrival",
      "starts_at": "2026-08-19T11:00:00-04:00",
      "ends_at": "2026-08-19T11:30:00-04:00",
      "staff": [
        "alex"
      ]
    },
    {
      "activity": "Waterfront & Activities Open (Waterski Sign-Up)",
      "starts_at": "2026-08-19T14:00:00-04:00",
      "ends_at": "2026-08-19T17:00:00-04:00",
      "staff": [
        "alex",
        "quinn"
      ]
    },
    {
      "activity": "Mostest!",
      "starts_at": "2026-08-19T19:30:00-04:00",
      "ends_at": "2026-08-19T20:30:00-04:00",
      "staff": [
        "alex"
      ]
    },
    {
      "activity": "Campfire & S'mores",
      "starts_at": "2026-08-19T20:30:00-04:00",
      "ends_at": "2026-08-19T21:30:00-04:00",
      "staff": [
        "alex"
      ]
    },
    {
      "activity": "Drop-In Gymnastics",
      "starts_at": "2026-08-20T09:00:00-04:00",
      "ends_at": "2026-08-20T12:00:00-04:00",
      "staff": [
        "alex"
      ]
    },
    {
      "activity": "Pickleball Tournament",
      "starts_at": "2026-08-20T09:00:00-04:00",
      "ends_at": "2026-08-20T12:00:00-04:00",
      "staff": [
        "quinn"
      ]
    },
    {
      "activity": "Activities Open",
      "starts_at": "2026-08-20T09:00:00-04:00",
      "ends_at": "2026-08-20T12:00:00-04:00",
      "staff": [
        "lu"
      ]
    },
    {
      "activity": "Rest Hour",
      "starts_at": "2026-08-20T13:00:00-04:00",
      "ends_at": "2026-08-20T14:00:00-04:00",
      "staff": [
        "quinn"
      ]
    },
    {
      "activity": "Carnival in Junior Camp with Slip N Slide",
      "starts_at": "2026-08-20T14:00:00-04:00",
      "ends_at": "2026-08-20T15:00:00-04:00",
      "staff": [
        "alex"
      ]
    },
    {
      "activity": "Activities Open",
      "starts_at": "2026-08-20T15:00:00-04:00",
      "ends_at": "2026-08-20T17:00:00-04:00",
      "staff": [
        "alex"
      ]
    },
    {
      "activity": "Beach Luau & Night Blobbing",
      "starts_at": "2026-08-20T19:30:00-04:00",
      "ends_at": "2026-08-20T21:00:00-04:00",
      "staff": [
        "alex",
        "quinn"
      ]
    },
    {
      "activity": "Bonfire on the Beach",
      "starts_at": "2026-08-20T21:00:00-04:00",
      "ends_at": "2026-08-20T22:00:00-04:00",
      "staff": [
        "alex",
        "quinn"
      ]
    },
    {
      "activity": "Color War!",
      "starts_at": "2026-08-21T09:00:00-04:00",
      "ends_at": "2026-08-21T12:00:00-04:00",
      "staff": [
        "alex",
        "quinn"
      ]
    },
    {
      "activity": "Rest Hour",
      "starts_at": "2026-08-21T13:00:00-04:00",
      "ends_at": "2026-08-21T14:00:00-04:00",
      "staff": [
        "quinn"
      ]
    },
    {
      "activity": "Watermelon Eating Contest",
      "starts_at": "2026-08-21T14:00:00-04:00",
      "ends_at": "2026-08-21T15:00:00-04:00",
      "staff": [
        "alex"
      ]
    },
    {
      "activity": "Activities Open (Waterski / Tubing Sign-Up)",
      "starts_at": "2026-08-21T15:00:00-04:00",
      "ends_at": "2026-08-21T17:00:00-04:00",
      "staff": [
        "alex",
        "quinn"
      ]
    },
    {
      "activity": "Adult Only Campfire",
      "starts_at": "2026-08-21T20:00:00-04:00",
      "ends_at": "2026-08-21T23:00:00-04:00",
      "staff": [
        "alex"
      ]
    },
    {
      "activity": "Waterfront Open",
      "starts_at": "2026-08-22T08:00:00-04:00",
      "ends_at": "2026-08-22T10:00:00-04:00",
      "staff": [
        "alex",
        "quinn"
      ]
    },
    {
      "activity": "Departure",
      "starts_at": "2026-08-22T11:00:00-04:00",
      "ends_at": "2026-08-22T11:15:00-04:00",
      "staff": [
        "alex"
      ]
    }
  ],
  "after_hours_food": [
    {
      "name": "Grilled cheese",
      "description": "Classic toasted sandwich"
    },
    {
      "name": "Turkey sandwich",
      "description": "Turkey on sliced bread"
    },
    {
      "name": "Fruit cup",
      "description": "Fresh cut fruit"
    },
    {
      "name": "Cookies",
      "description": "Two cookies"
    }
  ],
  "meals": [
    {
      "meal_type": "Lunch",
      "menu": "Family Camp Menu",
      "starts_at": "2026-08-19T12:00:00-04:00",
      "ends_at": "2026-08-19T13:00:00-04:00",
      "title": "Lunch"
    },
    {
      "meal_type": "Dinner",
      "menu": "Family Camp Menu",
      "starts_at": "2026-08-19T18:00:00-04:00",
      "ends_at": "2026-08-19T19:00:00-04:00",
      "title": "Dinner"
    },
    {
      "meal_type": "Breakfast",
      "menu": "Family Camp Menu",
      "starts_at": "2026-08-20T07:30:00-04:00",
      "ends_at": "2026-08-20T09:00:00-04:00",
      "title": "Breakfast"
    },
    {
      "meal_type": "Lunch",
      "menu": "Family Camp Menu",
      "starts_at": "2026-08-20T12:00:00-04:00",
      "ends_at": "2026-08-20T13:00:00-04:00",
      "title": "Lunch"
    },
    {
      "meal_type": "Dinner",
      "menu": "Family Camp Menu",
      "starts_at": "2026-08-20T18:00:00-04:00",
      "ends_at": "2026-08-20T19:00:00-04:00",
      "title": "Dinner"
    },
    {
      "meal_type": "Breakfast",
      "menu": "Family Camp Menu",
      "starts_at": "2026-08-21T07:30:00-04:00",
      "ends_at": "2026-08-21T09:00:00-04:00",
      "title": "Breakfast"
    },
    {
      "meal_type": "Lunch",
      "menu": "Family Camp Menu",
      "starts_at": "2026-08-21T12:00:00-04:00",
      "ends_at": "2026-08-21T13:00:00-04:00",
      "title": "Lunch"
    },
    {
      "meal_type": "Dinner",
      "menu": "Family Camp Menu",
      "title": "Banquet",
      "starts_at": "2026-08-21T18:00:00-04:00",
      "ends_at": "2026-08-21T19:30:00-04:00"
    },
    {
      "meal_type": "Breakfast",
      "menu": "Family Camp Menu",
      "starts_at": "2026-08-22T07:30:00-04:00",
      "ends_at": "2026-08-22T09:00:00-04:00",
      "title": "Breakfast"
    }
  ],
  "activity_signups": [
    {
      "person": "Demi Dicker",
      "activity": "Waterfront & Activities Open (Waterski Sign-Up)"
    },
    {
      "person": "Dorrie Dicker",
      "activity": "Waterfront & Activities Open (Waterski Sign-Up)"
    },
    {
      "person": "Josh Dicker",
      "activity": "Color War!"
    }
  ],
  "babysitting": [
    {
      "household": "dicker",
      "member": "Demi Dicker",
      "staff": "quinn",
      "starts_at": "2026-08-21T20:00:00-04:00",
      "ends_at": "2026-08-21T23:00:00-04:00",
      "status": "confirmed",
      "notes": "Adult Only Campfire coverage"
    }
  ],
  "notifications": [
    {
      "targets": [
        "dicker",
        "muskat"
      ],
      "kind": "general",
      "title": "Family Camp is ready",
      "body": "Your Family Camp weekend schedule is available."
    }
  ]
} as const;
