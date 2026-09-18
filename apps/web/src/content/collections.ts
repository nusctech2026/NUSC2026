export type RichTextPart = { text: string; strong?: boolean };

export const snapshot: { label: string; value: string }[] = [
  {
    label: "Founded",
    value: "2024",
  },
  {
    label: "Registered",
    value: "29 Nov 2024",
  },
  {
    label: "Home",
    value: "Kohima",
  },
  {
    label: "Motto",
    value: "Rise Together",
  },
  {
    label: "Values",
    value: "Unity · Progress",
  },
  {
    label: "Standard",
    value: "Excellence",
  },
];

export const achievements: string[] = [
  "NSF Martyrs Memorial Trophy — Champions 2025",
  "3rd — Inaugural Nagaland Super League",
  "4 Players — Inspire Institute of Sport",
  "Dr T. Ao Trophy — Mon District Champions",
  "Players signed to Calicut FC & Mawlai SC",
  "Santosh Trophy — Nagaland Selection",
];

export const players: {
  initials: string;
  name: string;
  description: RichTextPart[];
}[] = [
  {
    initials: "YL",
    name: "Yhoto Lohe",
    description: [
      {
        text: "Signed for ",
      },
      {
        text: "Calicut FC",
        strong: true,
      },
      {
        text: " · Kerala Premier League",
      },
    ],
  },
  {
    initials: "AK",
    name: "Arap Konyak",
    description: [
      {
        text: "Signed for ",
      },
      {
        text: "Calicut FC",
        strong: true,
      },
      {
        text: " · Kerala Premier League",
      },
    ],
  },
  {
    initials: "MC",
    name: "Mengulhoukho Chalieu",
    description: [
      {
        text: "Progressed to ",
      },
      {
        text: "Mawlai SC",
        strong: true,
      },
      {
        text: " · I-League 3",
      },
    ],
  },
  {
    initials: "GC",
    name: "Ghuqhe Chishi",
    description: [
      {
        text: "Selected for ",
      },
      {
        text: "Nagaland",
        strong: true,
      },
      {
        text: " · Santosh Trophy",
      },
    ],
  },
  {
    initials: "BP",
    name: "Bapenyimjong",
    description: [
      {
        text: "Selected for ",
      },
      {
        text: "Nagaland",
        strong: true,
      },
      {
        text: " · Santosh Trophy",
      },
    ],
  },
  {
    initials: "AA",
    name: "Atou Awomi",
    description: [
      {
        text: "Selected for ",
      },
      {
        text: "Nagaland",
        strong: true,
      },
      {
        text: " · Santosh Trophy",
      },
    ],
  },
  {
    initials: "TZ",
    name: "Thejangulie Zatsu",
    description: [
      {
        text: "Nagaland",
        strong: true,
      },
      {
        text: ", Santosh Trophy · Best Defender, Dr T. Ao Trophy",
      },
    ],
  },
  {
    initials: "PS",
    name: "Paotinsat Sitlhou",
    description: [
      {
        text: "Recruited into the ",
      },
      {
        text: "Territorial Army",
        strong: true,
      },
      {
        text: " through football",
      },
    ],
  },
  {
    initials: "MK",
    name: "Manton Konyak",
    description: [
      {
        text: "Recruited into the ",
      },
      {
        text: "Territorial Army",
        strong: true,
      },
      {
        text: " through football",
      },
    ],
  },
];

export const awards: { title: string; name: string }[] = [
  {
    title: "Player of the Tournament",
    name: "Sanathoi Metei",
  },
  {
    title: "Best Goalkeeper",
    name: "Sanaton",
  },
  {
    title: "Best Defender",
    name: "Hemping L",
  },
  {
    title: "Best Coach",
    name: "Wangkhem Singh",
  },
];

export const pathwaySteps: { title: string; description: string }[] = [
  {
    title: "Identify",
    description:
      "We scout and sign talent from across Nagaland, from local grounds to district football.",
  },
  {
    title: "Develop",
    description:
      "Daily training under an AFC-licensed coaching staff, with proper physio and support.",
  },
  {
    title: "Expose",
    description:
      "Elite camps like the Inspire Institute of Sport put our players in a national environment.",
  },
  {
    title: "Compete",
    description:
      "League football, cup runs and inter-district championships test them against the best.",
  },
  {
    title: "Progress",
    description:
      "Players move up to professional clubs, higher leagues, national selection and careers in sport.",
  },
];

export const scholars: { name: string; role: string }[] = [
  {
    name: "Thejangulie",
    role: "Forward / Winger",
  },
  {
    name: "Hesaka",
    role: "Midfielder",
  },
  {
    name: "Paotinsat",
    role: "Defender",
  },
  {
    name: "Mengulhoukho",
    role: "Forward",
  },
];

export const partnerTiers: { title: string; names: string[] }[] = [
  {
    title: "Strategic Partners",
    names: ["Puma", "Kingfisher", "Renedy Singh"],
  },
  {
    title: "Club & Network Partners",
    names: [
      "Academy Partners",
      "Travel & Hospitality Allies",
      "Media & Broadcast Friends",
    ],
  },
  {
    title: "Institutional Support",
    names: [
      "Govt. of Nagaland",
      "Nagaland Football Assoc.",
      "District Football Assocs.",
    ],
  },
];

export const jobs: {
  title: string;
  description: string;
  lead: boolean;
  requirements: RichTextPart[][];
}[] = [
  {
    title: "First-Team Head Coach",
    description:
      "Lead the First Team's tactical direction, matchday decisions and overall football philosophy.",
    lead: true,
    requirements: [
      [
        {
          text: "AFC A License",
          strong: true,
        },
        {
          text: " required — AFC Pro License preferred",
        },
      ],
      [
        {
          text: "3–5 years' coaching at senior / professional or elite academy level",
        },
      ],
    ],
  },
  {
    title: "Assistant Coach",
    description:
      "Support the Head Coach in training design, matchday preparation and squad management.",
    lead: false,
    requirements: [
      [
        {
          text: "AFC A License",
          strong: true,
        },
        {
          text: " required — AFC Pro License preferred",
        },
      ],
      [
        {
          text: "2–3 years' coaching at senior or elite youth level",
        },
      ],
    ],
  },
  {
    title: "Goalkeeping Coach",
    description:
      "Oversee the technical, tactical and physical development of the club's goalkeepers.",
    lead: false,
    requirements: [
      [
        {
          text: "AFC Goalkeeping B Diploma",
          strong: true,
        },
        {
          text: " required — GK A Diploma preferred",
        },
      ],
      [
        {
          text: "2+ years coaching goalkeepers at senior or elite academy level",
        },
      ],
    ],
  },
  {
    title: "Strength & Conditioning Coach",
    description:
      "Design and deliver strength, conditioning and injury-prevention programmes for the squad.",
    lead: false,
    requirements: [
      [
        {
          text: "Degree in ",
        },
        {
          text: "Sports / Exercise Science",
          strong: true,
        },
        {
          text: " or a related field",
        },
      ],
      [
        {
          text: "NSCA-CSCS",
          strong: true,
        },
        {
          text: " (or equivalent) certification preferred",
        },
      ],
      [
        {
          text: "2+ years with football or elite team-sport athletes",
        },
      ],
      [
        {
          text: "Skilled in periodisation, GPS / load monitoring and return-to-play",
        },
      ],
    ],
  },
  {
    title: "Physiotherapist",
    description:
      "Manage injury prevention, treatment and rehabilitation for the first-team squad.",
    lead: false,
    requirements: [
      [
        {
          text: "BPT / MPT",
          strong: true,
        },
        {
          text: " — Sports Physiotherapy specialisation preferred",
        },
      ],
      [
        {
          text: "Registered with the ",
        },
        {
          text: "IAP",
          strong: true,
        },
        {
          text: " or State Physiotherapy Council",
        },
      ],
      [
        {
          text: "2+ years' clinical experience, ideally in sport or football",
        },
      ],
      [
        {
          text: "Sports injury management, taping and on-field emergency response",
        },
      ],
    ],
  },
];
