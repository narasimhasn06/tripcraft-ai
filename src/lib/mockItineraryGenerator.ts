interface ActivityItem {
  time_of_day: string;
  title: string;
  description: string;
  cost_estimate: string;
  duration: string;
  location: string;
}

interface ItineraryDay {
  day_number: number;
  theme: string;
  activities: ActivityItem[];
}

interface Itinerary {
  title: string;
  destination: string;
  days: ItineraryDay[];
}

const TEMPLATE_ACTIVITIES: Record<string, { theme: string; activities: ActivityItem[] }[]> = {
  tokyo: [
    {
      theme: "Neon Lights & Traditional Shrines",
      activities: [
        {
          time_of_day: "Morning",
          title: "Meiji Jingu Shrine Visit",
          description: "Walk under the massive wooden torii gates into a tranquil forest inside the city. Learn about Shinto purification rites.",
          location: "Yoyogi Park, Shibuya",
          duration: "2 hours",
          cost_estimate: "Free"
        },
        {
          time_of_day: "Afternoon",
          title: "Explore Harajuku & Takeshita Street",
          description: "Experience the vibrant heart of Japanese youth culture and extreme fashion. Sample giant colorful cotton candy.",
          location: "Harajuku, Shibuya",
          duration: "2.5 hours",
          cost_estimate: "¥1,500"
        },
        {
          time_of_day: "Evening",
          title: "Shibuya Crossing & Izakaya Crawl",
          description: "Stand atop Shibuya Sky to watch the scramble crossing, then dive into narrow neon alleys for grilled yakitori and cold drinks.",
          location: "Shibuya Crossing, Tokyo",
          duration: "3 hours",
          cost_estimate: "¥4,500"
        }
      ]
    },
    {
      theme: "Cyberpunk Tech & Historic Temples",
      activities: [
        {
          time_of_day: "Morning",
          title: "Senso-ji Temple in Asakusa",
          description: "Visit Tokyo's oldest Buddhist temple. Stroll down Nakamise shopping street to buy traditional rice crackers and souvenirs.",
          location: "Asakusa, Taito Ward",
          duration: "2 hours",
          cost_estimate: "Free"
        },
        {
          time_of_day: "Afternoon",
          title: "Akihabara Electric Town Tech Exploration",
          description: "Immerse yourself in retro gaming hubs, massive electronic stores, and anime shops that define Otaku subculture.",
          location: "Akihabara, Chiyoda Ward",
          duration: "3 hours",
          cost_estimate: "¥2,000"
        },
        {
          time_of_day: "Evening",
          title: "teamLab Borderless digital museum",
          description: "Wander through three-dimensional light artworks, interactive water mirrors, and rooms of projection lanterns.",
          location: "Azabudai Hills, Minato Ward",
          duration: "2 hours",
          cost_estimate: "¥4,200"
        }
      ]
    }
  ],
  paris: [
    {
      theme: "Art Galleries & Iconic Landmarks",
      activities: [
        {
          time_of_day: "Morning",
          title: "Eiffel Tower Ascent",
          description: "Climb up to the second floor of Paris's iconic iron structure for breathtaking panoramic views across the River Seine.",
          location: "Champ de Mars, Paris",
          duration: "2.5 hours",
          cost_estimate: "€28"
        },
        {
          time_of_day: "Afternoon",
          title: "Louvre Museum Highlights",
          description: "Skip the line to marvel at historical art masterpieces, including the Mona Lisa, Winged Victory, and Venus de Milo.",
          location: "Rue de Rivoli, Paris",
          duration: "3 hours",
          cost_estimate: "€22"
        },
        {
          time_of_day: "Evening",
          title: "Sunset River Seine Cruise",
          description: "Glide under historic stone bridges while listening to commentary as city monuments begin lighting up.",
          location: "Bateaux Parisiens, Port de la Bourdonnais",
          duration: "1.5 hours",
          cost_estimate: "€18"
        }
      ]
    },
    {
      theme: "Bohemian Cafes & Cobbled Heights",
      activities: [
        {
          time_of_day: "Morning",
          title: "Sacre-Coeur Basilica & Montmartre",
          description: "Ascend the white stone basilica on the highest hill in Paris. Explore the cobblestone streets filled with easel painters.",
          location: "Montmartre, Paris",
          duration: "2 hours",
          cost_estimate: "Free"
        },
        {
          time_of_day: "Afternoon",
          title: "Stroll along Champs-Élysées to Arc de Triomphe",
          description: "Walk down the world's most famous avenue, looking at premium boutiques. Ascend the Arc de Triomphe for views.",
          location: "Place Charles de Gaulle, Paris",
          duration: "2 hours",
          cost_estimate: "€13"
        },
        {
          time_of_day: "Evening",
          title: "Traditional Parisian Bistro Dining",
          description: "Savor garlic butter escargots, beef bourguignon, and crème brûlée at a cozy corner bistro with red checkered curtains.",
          location: "Latin Quarter, Paris",
          duration: "2.5 hours",
          cost_estimate: "€45"
        }
      ]
    }
  ]
};

export function generateMockItinerary(
  destination: string,
  startDate: string,
  endDate: string,
  budgetLevel: string,
  travelPace: string,
  _interests: string[]
): Itinerary {
  void _interests;
  const destClean = destination.toLowerCase().trim();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = Math.abs(end.getTime() - start.getTime());
  const dayCount = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;

  // Select templates or fallback
  const isTokyo = destClean.includes('tokyo') || destClean.includes('japan');
  const isParis = destClean.includes('paris') || destClean.includes('france');

  const selectedTemplate = isTokyo 
    ? TEMPLATE_ACTIVITIES.tokyo 
    : isParis 
    ? TEMPLATE_ACTIVITIES.paris 
    : null;

  const days: ItineraryDay[] = [];

  for (let i = 1; i <= dayCount; i++) {
    // Determine theme & activities
    let theme = '';
    let activities: ActivityItem[] = [];

    if (selectedTemplate && selectedTemplate[(i - 1) % selectedTemplate.length]) {
      const templateDay = selectedTemplate[(i - 1) % selectedTemplate.length];
      theme = templateDay.theme;
      // Map templates but customize descriptions/costs for budget level slightly
      activities = templateDay.activities.map(act => {
        let cost = act.cost_estimate;
        if (budgetLevel === 'Budget') {
          cost = cost.includes('¥') ? '¥500' : cost.includes('€') ? '€5' : 'Free';
        } else if (budgetLevel === 'Luxury') {
          cost = cost.includes('¥') ? '¥12,000' : cost.includes('€') ? '€120' : '$150';
        }
        return { ...act, cost_estimate: cost };
      });
    } else {
      // Fallback generator for other cities
      const themeOptions = [
        `Discovering Local Heritage & Historical Sights`,
        `Exploring Scenic Nature, Parks & Scenic Lookouts`,
        `Culinary Masterclasses & Vibrant Neighborhoods`,
        `Modern Architecture, Shopping Hubs & Leisure`,
        `Mindful Day of Art, Craft Galleries & Wellness`,
      ];
      
      theme = themeOptions[(i - 1) % themeOptions.length];

      activities = [
        {
          time_of_day: "Morning",
          title: `Exploring Historic Heart of ${destination}`,
          description: `Embark on a guided morning walking exploration around ${destination}'s most historic landmarks. Learn about local architecture and origins.`,
          location: `Old Town Center, ${destination}`,
          duration: "2 hours",
          cost_estimate: budgetLevel === 'Budget' ? 'Free' : budgetLevel === 'Luxury' ? '$120' : '$25'
        },
        {
          time_of_day: "Afternoon",
          title: `Leisure & Neighborhood Exploration`,
          description: `Wander through local boutique lanes, artisanal shops, and cozy cafes. Pick up local street food and souvenirs.`,
          location: `Downtown, ${destination}`,
          duration: travelPace === 'Fast' ? '1.5 hours' : '3 hours',
          cost_estimate: budgetLevel === 'Budget' ? '$10' : budgetLevel === 'Luxury' ? '$200' : '$40'
        },
        {
          time_of_day: "Evening",
          title: `Sunset Views & Traditional Feast`,
          description: `Head to a popular sunset overlook or river promenade, followed by a fine dinner highlighting local ingredients.`,
          location: `Scenic Viewpoint, ${destination}`,
          duration: "2.5 hours",
          cost_estimate: budgetLevel === 'Budget' ? '$15' : budgetLevel === 'Luxury' ? '$300' : '$55'
        }
      ];

      // Filter activities based on pace
      if (travelPace === 'Relaxed') {
        // remove afternoon activity to keep it slow
        activities = [activities[0], activities[2]];
      } else if (travelPace === 'Fast') {
        // add a night activity
        activities.push({
          time_of_day: "Night",
          title: `Vibrant Nightlife & City Lights`,
          description: `Cap off your fast-paced day with skyline views, live music lounges, or night market explorations.`,
          location: `Entertainment District, ${destination}`,
          duration: "2 hours",
          cost_estimate: budgetLevel === 'Budget' ? '$5' : '$45'
        });
      }
    }

    days.push({
      day_number: i,
      theme,
      activities
    });
  }

  const titleOptions = [
    `${dayCount} Days of Culture & Escape in ${destination}`,
    `Uncovering the Hidden Gems of ${destination}`,
    `The Ultimate ${budgetLevel} Voyage: ${destination}`,
    `Mindful Escape & Exploration in ${destination}`,
  ];

  return {
    title: titleOptions[(dayCount - 1) % titleOptions.length],
    destination,
    days
  };
}
