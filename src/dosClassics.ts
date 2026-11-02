/** User-provided Facebook thread tally, approximately 994 usable recommendations.
 * Metadata only: no linked games or implied reproduction rights. */
export interface DosClassic {
  title: string;
  mentions: number;
  rank: number;
}

export const dosClassics: DosClassic[] = [
  { title: "Commander Keen", mentions: 23, rank: 1 },
  { title: "Descent", mentions: 17, rank: 2 },
  { title: "Doom", mentions: 14, rank: 3 },
  { title: "Leisure Suit Larry", mentions: 14, rank: 3 },
  { title: "Lemmings", mentions: 11, rank: 5 },
  { title: "Dune II", mentions: 11, rank: 5 },
  { title: "Wing Commander", mentions: 10, rank: 7 },
  { title: "Blood", mentions: 9, rank: 8 },
  { title: "Civilization", mentions: 9, rank: 8 },
  { title: "Carmageddon", mentions: 9, rank: 8 },
  { title: "Street Rod", mentions: 9, rank: 8 },
  { title: "One Must Fall 2097", mentions: 8, rank: 12 },
  { title: "Scorched Earth", mentions: 8, rank: 12 },
  { title: "Day of the Tentacle", mentions: 8, rank: 12 },
  { title: "Jazz Jackrabbit", mentions: 8, rank: 12 },
  { title: "Heretic", mentions: 8, rank: 12 },
  { title: "Another World / Flashback", mentions: 8, rank: 12 },
  { title: "Syndicate", mentions: 8, rank: 12 },
  { title: "Stunts", mentions: 7, rank: 19 },
  { title: "Dangerous Dave", mentions: 7, rank: 19 },
  { title: "Supaplex", mentions: 7, rank: 19 },
  { title: "Lands of Lore", mentions: 7, rank: 19 },
  { title: "Prince of Persia", mentions: 7, rank: 19 },
  { title: "Colonization", mentions: 7, rank: 19 },
  { title: "Prehistorik", mentions: 7, rank: 19 },
  { title: "Hugo’s House of Horrors", mentions: 6, rank: 26 },
  { title: "Darklands", mentions: 6, rank: 26 },
  { title: "Jill of the Jungle", mentions: 6, rank: 26 },
  { title: "BioForge", mentions: 6, rank: 26 },
  { title: "Police Quest", mentions: 6, rank: 26 },
  { title: "Quest for Glory", mentions: 6, rank: 26 },
  { title: "King’s Quest", mentions: 6, rank: 26 },
  { title: "Cannon Fodder", mentions: 6, rank: 26 },
  { title: "Wolfenstein 3D", mentions: 5, rank: 34 },
  { title: "Hocus Pocus", mentions: 5, rank: 34 },
  { title: "Solar Winds", mentions: 5, rank: 34 },
  { title: "Alley Cat", mentions: 5, rank: 34 },
  { title: "Master of Magic", mentions: 5, rank: 34 },
  { title: "X-COM", mentions: 5, rank: 34 },
  { title: "Eye of the Beholder", mentions: 5, rank: 34 },
  { title: "Might and Magic", mentions: 5, rank: 34 },
  { title: "Crusader: No Remorse", mentions: 5, rank: 34 },
  { title: "Gorillas (QBasic)", mentions: 5, rank: 34 },
  { title: "Betrayal at Krondor", mentions: 5, rank: 34 },
  { title: "The Lost Vikings", mentions: 5, rank: 34 },
  { title: "Blake Stone", mentions: 5, rank: 34 },
];

export const otherCommunityFavorites = [
  "Star Control II", "Albion", "The Horde", "Secret Agent",
  "Crystal Caves", "Rise of the Triad", "Master of Orion II",
] as const;
