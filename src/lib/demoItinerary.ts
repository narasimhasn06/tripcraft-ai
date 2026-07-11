export interface DemoActivity {
  sortOrder: number;
  startTime: string;
  title: string;
  description: string;
  location: string;
  estimatedCost: string;
  category: string;
}

export interface DemoDay {
  dayNumber: number;
  date: string;
  title: string;
  summary: string;
  activities: DemoActivity[];
}

export interface DemoItinerary {
  tripTitle: string;
  summary: string;
  days: DemoDay[];
}

export function buildDemoItinerary(
  destination: string,
  startDate: string,
  endDate: string
): DemoItinerary {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = Math.abs(end.getTime() - start.getTime());
  const dayCount = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;

  const destName = destination || 'Kyoto, Japan';

  const dayTemplates = [
    {
      title: "Zen Gardens & Scenic Walks",
      summary: "Explore historic shrines, quiet parks, and traditional tea spots.",
      activities: [
        {
          sortOrder: 1,
          startTime: "09:00",
          title: "Scenic Morning Garden Stroll",
          description: "Walk through serene stone paths as the morning light filters through the trees. A quiet, spiritual start to your journey.",
          location: "Central Historic Park",
          estimatedCost: "Free (estimate)",
          category: "Nature"
        },
        {
          sortOrder: 2,
          startTime: "13:30",
          title: "Traditional Heritage Site Visit",
          description: "Explore the stunning architecture of a historic 14th-century temple, featuring central ponds reflecting surrounding mountains.",
          location: "Historic Temple Complex",
          estimatedCost: "$15/person (estimate)",
          category: "Culture"
        },
        {
          sortOrder: 3,
          startTime: "18:00",
          title: "Mindful Art & Tea Ceremony",
          description: "Experience the mindful preparation of traditional local tea. Sip freshly whisked drinks served with traditional sweets.",
          location: "Heritage Tea House",
          estimatedCost: "$25/person (estimate)",
          category: "Culture"
        }
      ]
    },
    {
      title: "Historic Landmarks & Local Bites",
      summary: "Marvel at iconic architecture and dive into local food lanes.",
      activities: [
        {
          sortOrder: 1,
          startTime: "09:30",
          title: "Golden Pavilion Exploration",
          description: "Visit the stunning gold-leaf-covered pavilion standing majestically over a shimmering mirror pond.",
          location: "Northern Hills Area",
          estimatedCost: "$8/person (estimate)",
          category: "Culture"
        },
        {
          sortOrder: 2,
          startTime: "14:00",
          title: "Stroll Through Ancient Districts",
          description: "Walk down preserved historic streets filled with wooden merchant homes, artisan shops, and traditional sweet houses.",
          location: "Old Merchant Quarter",
          estimatedCost: "Free (estimate)",
          category: "Shopping"
        },
        {
          sortOrder: 3,
          startTime: "19:00",
          title: "Culinary Tasting Dinner",
          description: "Savor a multi-course seasonal culinary masterpiece, showcasing delicate local flavors and exquisite presentation.",
          location: "Downtown Food Market",
          estimatedCost: "$60/person (estimate)",
          category: "Food"
        }
      ]
    },
    {
      title: "Nature Trails & Panoramic Views",
      summary: "Hike up scenic ridges and enjoy local street food.",
      activities: [
        {
          sortOrder: 1,
          startTime: "08:30",
          title: "Mountain Ridge Hike",
          description: "Ascend a scenic pathway bordered by thousands of vermilion shrine gates stretching across the wooded mountain.",
          location: "Southern Mountain Ridge",
          estimatedCost: "Free (estimate)",
          category: "Nature"
        },
        {
          sortOrder: 2,
          startTime: "13:00",
          title: "Local Craft Museum",
          description: "Learn about regional crafts, fabrics, and ceramics inside a beautifully preserved wooden workshop museum.",
          location: "Traditional Crafts District",
          estimatedCost: "$10/person (estimate)",
          category: "Culture"
        },
        {
          sortOrder: 3,
          startTime: "18:30",
          title: "Riverfront Evening Walk",
          description: "Enjoy sunset views from a wooden deck overlook by the river, followed by local food stalls.",
          location: "Riverside Promenade",
          estimatedCost: "$15/person (estimate)",
          category: "Nightlife"
        }
      ]
    }
  ];

  const days: DemoDay[] = [];

  for (let i = 0; i < dayCount; i++) {
    const template = dayTemplates[i % dayTemplates.length];
    
    // Calculate date for this day
    const dayDate = new Date(start);
    dayDate.setDate(start.getDate() + i);
    const dateStr = dayDate.toISOString().split('T')[0];

    days.push({
      dayNumber: i + 1,
      date: dateStr,
      title: template.title,
      summary: template.summary,
      activities: template.activities.map(act => ({
        ...act,
        location: act.location.replace("Central", destName).replace("Historic", destName)
      }))
    });
  }

  return {
    tripTitle: `Demo Itinerary: Discovery in ${destName}`,
    summary: `This is a high-quality demonstration fallback itinerary curated for ${destName} over ${dayCount} days. It replaces live AI generation due to server congestion. All listed costs, schedules, and times are estimated.`,
    days
  };
}
