// app/seasonal/events.ts
// Single source of truth used by both /seasonal and /dashboard

export type SeasonalEvent = {
  name: string;
  dateISO?: string; // exact date if known
  approxLabel?: string; // for variable dates
  leadDays: number; // used to calculate prep-by
  ideas?: string;
  tiktok?: string;
  notes?: string;
  tags?: string[];
};

export const seasonalEvents: SeasonalEvent[] = [
  {
    name: "Mother’s Day (UK)",
    dateISO: "2026-03-15",
    leadDays: 28,
    ideas: "Mum cards (funny + cute), personalised family prints, bundles with crochet bouquet.",
    notes: "Aim for drafts live + shipping cutoffs in place.",
    tags: ["cards", "prints"],
  },
  {
    name: "Easter (Good Friday bank holiday)",
    dateISO: "2026-04-03",
    leadDays: 42,
    ideas: "Easter activity packs, kids gift bundles, personalised prints for nursery/kids rooms.",
    notes: "Treat as the start of Easter buying window.",
    tags: ["kids", "gifts"],
  },
  {
    name: "Easter Monday (bank holiday)",
    dateISO: "2026-04-06",
    leadDays: 42,
    ideas: "Same as Easter weekend—use this as a last shipping ‘deadline’ marker.",
    tags: ["kids", "gifts"],
  },
  {
    name: "Father’s Day (UK)",
    dateISO: "2026-06-21",
    leadDays: 42,
    ideas: "Dad/Grandad cards, funny ‘dad’ prints, personalised family prints incl. pets.",
    notes: "Start teasers earlier if you’re doing personalisation.",
    tags: ["cards", "prints"],
  },
  {
    name: "End of School Year / Teacher Gifts",
    approxLabel: "Late Jul (varies by area)",
    leadDays: 35,
    ideas: "Teacher cards, vinyl decals (name/label sets), small gift bundles, classroom prints.",
    notes: "Term dates vary — keep stock ready and designs templated.",
    tags: ["teacher", "gifts"],
  },
  {
    name: "Back to School",
    approxLabel: "Early Sep (varies by area)",
    leadDays: 28,
    ideas: "Lunchbox labels, name decals, planner/organisation prints, first-day boards.",
    notes: "Great for vinyl + personalised sets.",
    tags: ["vinyl", "labels"],
  },
  {
    name: "Halloween",
    dateISO: "2026-10-31",
    leadDays: 45,
    ideas: "Halloween cards, spooky prints, party signage, kids ‘boo basket’ labels.",
    notes: "List early—people buy in Sept/Oct.",
    tags: ["seasonal"],
  },
  {
    name: "Bonfire Night (Guy Fawkes Night)",
    dateISO: "2026-11-05",
    leadDays: 21,
    ideas: "Cozy/autumn prints, party labels, funny seasonal cards (low effort quick wins).",
    tags: ["seasonal"],
  },
  {
    name: "Black Friday",
    dateISO: "2026-11-27",
    leadDays: 30,
    ideas: "Bundles, best-seller discounts, gift-ready framed prints, stock clearance promos.",
    notes: "Plan bundles + shipping messaging.",
    tags: ["promo"],
  },
  {
    name: "Cyber Monday",
    dateISO: "2026-11-30",
    leadDays: 30,
    ideas: "Digital downloads, last-chance bundles, quick turnaround personalisation push.",
    tags: ["promo"],
  },
  {
    name: "Christmas Day",
    dateISO: "2026-12-25",
    leadDays: 60,
    ideas: "Christmas cards, family prints, pet ornaments/labels, gift bundles + wrapping inserts.",
    notes: "Start listings earlier (Oct).",
    tags: ["q4"],
  },
  {
    name: "Valentine’s Day",
    dateISO: "2027-02-14",
    leadDays: 45,
    ideas: "Cheeky cards, LGBTQ+ cards, couple prints, Galentine’s cards.",
    notes: "Prep in Dec/Jan so you’re not scrambling.",
    tags: ["cards"],
  },
];