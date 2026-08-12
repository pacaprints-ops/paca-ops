// fix-orders-import.mjs
// Fixes the June 2026 import where the CSV had 10 cols but importer expected 12.
// Result: shipping was set to 0, revenue was set to the shipping amount, recipes were blank.
// This script: sets correct shipping, fixes revenue = Custom Paid, adds recipe line items.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zlswqubmeeacoctpppqb.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpsc3dxdWJtZWVhY29jdHBwcHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTE2ODYsImV4cCI6MjA4NTI4NzY4Nn0.WFytKpiW0IdP0Y1JUXJp_cX1y2YQnK3zL0O1ZHOPrY8";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// CSV rows parsed from the uploaded file
// Columns: ref, platform, product, qty, discount, customPaid, date, customer, shipping, recipe
const csvRows = [
  { ref: "576909884096354842", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0, customPaid: 6.1, date: "2026-06-15", customer: "Faith Rayner", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576909778579659437", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0, customPaid: 6.78, date: "2026-06-15", customer: "Nicole finlay", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "24-14760-49941", platform: "ebay", product: "we herd its your birthday", qty: 1, discount: 0, customPaid: 3.94, date: "2026-06-14", customer: "chelsea", shipping: 1.55, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576909691524782479", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0, customPaid: 6.78, date: "2026-06-14", customer: "Sarah Smith", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576909659022858730", platform: "tiktok", product: "dad light car", qty: 1, discount: 0.9, customPaid: 5.43, date: "2026-06-14", customer: "Alfie House", shipping: 2.29, recipe: "Square card - a4 no bend used" },
  { ref: "576909609094322233", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0, customPaid: 6.78, date: "2026-06-14", customer: "Karma-lecia Crofts", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576909591924283677", platform: "tiktok", product: "Unplugged Wedding", qty: 1, discount: 3.5, customPaid: 13.25, date: "2026-06-14", customer: "Gemma Kennedy", shipping: 3.65, recipe: "A3 print x 1 No bend used" },
  { ref: "576909457470561205", platform: "tiktok", product: "teacher classic", qty: 1, discount: 2, customPaid: 11.02, date: "2026-06-14", customer: "Ashleen Thompson", shipping: 2.91, recipe: "Teacher classic x 1" },
  { ref: "576909359324634101", platform: "tiktok", product: "phone birthday card", qty: 1, discount: 0, customPaid: 6.58, date: "2026-06-14", customer: "Jazmin Kerrison", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "2200", platform: "shopify", product: "scratch", qty: 1, discount: 0.55, customPaid: 6.59, date: "2026-06-14", customer: "siobhan", shipping: 1.55, recipe: "A6 Card A4 No Bend" },
  { ref: "576909251793230231", platform: "tiktok", product: "dad light car", qty: 1, discount: 0.9, customPaid: 5.68, date: "2026-06-13", customer: "Kaitlyn Todd", shipping: 2.29, recipe: "Square card - a4 no bend used" },
  { ref: "576909139569908530", platform: "tiktok", product: "dad next level", qty: 1, discount: 0, customPaid: 5.68, date: "2026-06-13", customer: "chloe smith", shipping: 2.29, recipe: "Square card - a4 no bend used" },
  { ref: "576909109444974819", platform: "tiktok", product: "teeth brushing", qty: 1, discount: 0.9, customPaid: 6.58, date: "2026-06-13", customer: "Sarah Lou Mills", shipping: 2.29, recipe: "Kids Charts A4 Laminated" },
  { ref: "576909100662954647", platform: "tiktok", product: "phone birthday card", qty: 1, discount: 0, customPaid: 6.58, date: "2026-06-13", customer: "stacey haddock", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576909096305530954", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0, customPaid: 6.78, date: "2026-06-13", customer: "Michaela Morgan", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576908994528254419", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0, customPaid: 6.78, date: "2026-06-13", customer: "Emily Walker", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576908988638665163", platform: "tiktok", product: "photo name and date print", qty: 1, discount: 2, customPaid: 12.05, date: "2026-06-13", customer: "Colin Oliver oliver", shipping: 2.91, recipe: "Photo framed x 1" },
  { ref: "576908949654116780", platform: "tiktok", product: "dreamy pastel set of 3 prints", qty: 1, discount: 5.2, customPaid: 13.78, date: "2026-06-13", customer: "Debi lapere", shipping: 2.91, recipe: "3 x Framed Print" },
  { ref: "576908746315373109", platform: "tiktok", product: "step dad less of a knob", qty: 1, discount: 0, customPaid: 5.63, date: "2026-06-12", customer: "tallisalford", shipping: 2.29, recipe: "Square card - a4 no bend used" },
  { ref: "576908664733014718", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0, customPaid: 6.57, date: "2026-06-12", customer: "Keira white", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576908643464419575", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0, customPaid: 6.78, date: "2026-06-12", customer: "Kayla", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576908627095427663", platform: "tiktok", product: "step dad less of a knob", qty: 1, discount: 0, customPaid: 5.98, date: "2026-06-12", customer: "Maizie Fidoe", shipping: 2.29, recipe: "Square card - a4 no bend used" },
  { ref: "576908612536277701", platform: "tiktok", product: "teacher classic", qty: 1, discount: 2, customPaid: 12.86, date: "2026-06-12", customer: "kirstystuart", shipping: 2.91, recipe: "Teacher classic x 1" },
  { ref: "576908597619038926", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0, customPaid: 6.28, date: "2026-06-12", customer: "caitlin Leslie", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "4089023823", platform: "etsy", product: "scratch", qty: 1, discount: 0, customPaid: 4.19, date: "2026-06-12", customer: "Nishma", shipping: 1.55, recipe: "A6 Card A4 No Bend" },
  { ref: "576908596224825801", platform: "tiktok", product: "Dad bod", qty: 1, discount: 0, customPaid: 6.58, date: "2026-06-12", customer: "Lewis Jones", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576908268584016893", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0, customPaid: 6.78, date: "2026-06-11", customer: "Ben Stephenson", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576908269434083779", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0, customPaid: 5.83, date: "2026-06-11", customer: "Skye", shipping: 2.85, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576908256970841034", platform: "tiktok", product: "67 teacher reasons", qty: 1, discount: 0, customPaid: 6.58, date: "2026-06-11", customer: "Nicola Steele", shipping: 2.29, recipe: "Square card - a4 no bend used" },
  { ref: "576908253573192522", platform: "tiktok", product: "teacher poem print", qty: 1, discount: 1.6, customPaid: 9.38, date: "2026-06-11", customer: "Jasmine Mcknight", shipping: 2.85, recipe: "A4 Print Only x 1" },
  { ref: "576908252952565895", platform: "tiktok", product: "mcdreamy card", qty: 1, discount: 0, customPaid: 6.68, date: "2026-06-11", customer: "Ian Macdougall", shipping: 2.29, recipe: "A6 Card A4 No Bend" },
  { ref: "576908226168396442", platform: "tiktok", product: "teacher poem print", qty: 1, discount: 1.6, customPaid: 9.38, date: "2026-06-11", customer: "Tiffany Rowbottom", shipping: 2.85, recipe: "A4 Print Only x 1" },
  { ref: "576908166334814562", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-11", customer: "Grace Worth", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576908162276432318", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-11", customer: "Grace Southgate", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576908139353971562", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-11", customer: "Heather Gill", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576908105497811118", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-11", customer: "Becca Chase", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576908076747364602", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 5.89, date: "2026-06-11", customer: "Darcey roberts", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576908038497212440", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 2.58, date: "2026-06-11", customer: "Izabela Loj", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576908031254240091", platform: "tiktok", product: "portrait family print", qty: 1, discount: 5.4, customPaid: 14.08, date: "2026-06-11", customer: "cherelle cuthbert", shipping: 2.29, recipe: "A4 Print Only x 1" },
  { ref: "576908032009870286", platform: "tiktok", product: "step dad less of a knob", qty: 1, discount: 0.52, customPaid: 2.23, date: "2026-06-11", customer: "Megan Butler", shipping: 2.29, recipe: "Square card - a4 no bend used" },
  { ref: "576908032040802754", platform: "tiktok", product: "wedding welcome", qty: 1, discount: 6, customPaid: 9.98, date: "2026-06-11", customer: "Claire Aldridge", shipping: 2.91, recipe: "A3 Print Only x 1" },
  { ref: "576908016061421995", platform: "tiktok", product: "step dad less of a knob", qty: 1, discount: 0.52, customPaid: 5.96, date: "2026-06-11", customer: "Adel Pierce", shipping: 2.29, recipe: "Square card - a4 no bend used" },
  { ref: "576907988291918488", platform: "tiktok", product: "step dad less of a knob", qty: 1, discount: 0.52, customPaid: 5.46, date: "2026-06-11", customer: "Abby Richardson Lear", shipping: 2.29, recipe: "Square card - a4 no bend used" },
  { ref: "576907964488849774", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 5.39, date: "2026-06-11", customer: "Cameron7842 Neal", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907922374367884", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 5.71, date: "2026-06-11", customer: "katy Thompson", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907896821684648", platform: "tiktok", product: "67 teacher reasons", qty: 1, discount: 0.54, customPaid: 5.54, date: "2026-06-11", customer: "Laura brown", shipping: 2.29, recipe: "Square card - a4 no bend used" },
  { ref: "576907841886460308", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 5.41, date: "2026-06-11", customer: "Rebecca Dearing", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907840849484220", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-11", customer: "Jorja thomas", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907811315948524", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-10", customer: "Ethan Goodchild", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907773899479355", platform: "tiktok", product: "scratch a5", qty: 1, discount: 0, customPaid: 6.88, date: "2026-06-10", customer: "kat field", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907756833774518", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-10", customer: "Grace Dias", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907756309027061", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-10", customer: "Jessica cox", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907751372200275", platform: "tiktok", product: "teacher complete", qty: 1, discount: 4.47, customPaid: 15.01, date: "2026-06-10", customer: "Thaiba rehman", shipping: 2.91, recipe: "Teacher complete x 1" },
  { ref: "576907746001132131", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-10", customer: "Bailey", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907710626306984", platform: "tiktok", product: "dad light car", qty: 1, discount: 0.9, customPaid: 5.45, date: "2026-06-10", customer: "Alice Criddle", shipping: 2.29, recipe: "Square card - a4 no bend used" },
  { ref: "576907681587698323", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-10", customer: "chloe price Price", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907536991034245", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 5.94, date: "2026-06-10", customer: "Caitlin Govan", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907533680024228", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 5.98, date: "2026-06-10", customer: "Brogan Mclean", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907533658069732", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-10", customer: "liza.hunt", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907510646938189", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-10", customer: "Ellie topp", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907500522346771", platform: "tiktok", product: "dad review", qty: 1, discount: 0.52, customPaid: 2.75, date: "2026-06-10", customer: "Molly Hanlon", shipping: 2.29, recipe: "Square card - a4 no bend used" },
  { ref: "576907487798991487", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 5.53, date: "2026-06-10", customer: "Karys church", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907382232226372", platform: "tiktok", product: "dreamy pastel set of 3 prints", qty: 1, discount: 0, customPaid: 11.98, date: "2026-06-10", customer: "Caitlyn Shand", shipping: 2.29, recipe: "A4 Print Only x 3" },
  { ref: "576907362608061292", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-09", customer: "Chloe Collins", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907349404260619", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-09", customer: "macie alton", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907309467408494", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 5.65, date: "2026-06-09", customer: "Melissa causier", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907150804490829", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-09", customer: "Chloe Green", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907104814406151", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-09", customer: "faith cunnah", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "4086543835", platform: "etsy", product: "she maybe 33", qty: 1, discount: 0, customPaid: 4.1, date: "2026-06-09", customer: "holly bee", shipping: 1.55, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576907104455334164", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-09", customer: "kerryleigh duncan", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576906921703479702", platform: "tiktok", product: "67 teacher reasons", qty: 1, discount: 0.54, customPaid: 6.04, date: "2026-06-08", customer: "Isla Woodland", shipping: 2.29, recipe: "Square card - a4 no bend used" },
  { ref: "576906916469708818", platform: "tiktok", product: "scratch dad peace", qty: 6, discount: 5.42, customPaid: 20.31, date: "2026-06-08", customer: "Emily Bowles", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576906894162893100", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-08", customer: "Claire arthur", shipping: 2.85, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576906886965008835", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 5.41, date: "2026-06-08", customer: "Matthew Donoghue", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576906882822936792", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-08", customer: "Lauren Pavey", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576906869133908839", platform: "tiktok", product: "phone birthday card", qty: 1, discount: 0, customPaid: 6.58, date: "2026-06-08", customer: "Mared Jones", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576906844565445044", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-08", customer: "Vicky sullivan", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576906841843603876", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 5.41, date: "2026-06-08", customer: "Hollie Willow", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576906840905587554", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-08", customer: "constance sands", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576906823567841875", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-08", customer: "Kimberley Smith", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "576906798668290130", platform: "tiktok", product: "scratch dad peace", qty: 1, discount: 0.57, customPaid: 6.21, date: "2026-06-08", customer: "Chloe Wright", shipping: 2.29, recipe: "A5 Card non gloss - A4 no bend used" },
  { ref: "4080143498", platform: "etsy", product: "rumi purple", qty: 1, discount: 0, customPaid: 4.46, date: "2026-06-07", customer: "caroline", shipping: 1.55, recipe: "A5 Card non gloss - A4 no bend used" },
];

async function main() {
  console.log("Loading recipes and products from DB...");

  // Load all recipes
  const { data: recipesData, error: recipeErr } = await supabase.from("recipes").select("id,name");
  if (recipeErr) { console.error("Failed to load recipes:", recipeErr.message); process.exit(1); }

  // Build case-insensitive, space-normalised recipe map
  const recipeMap = {};
  for (const r of recipesData) {
    const key = r.name.trim().toLowerCase().replace(/\s+/g, " ");
    recipeMap[key] = r.id;
  }

  let updated = 0, recipesAdded = 0, notFound = 0, errors = 0;

  for (const row of csvRows) {
    // 1. Find the order
    const { data: order, error: findErr } = await supabase
      .from("orders")
      .select("id,platform,platform_order_ref,order_date,customer_name,gross_revenue,discounts")
      .eq("platform_order_ref", row.ref)
      .maybeSingle();

    if (findErr) {
      console.error(`[ERROR] ${row.ref}: ${findErr.message}`);
      errors++;
      continue;
    }

    if (!order) {
      console.warn(`[NOT FOUND] ${row.ref} (${row.customer})`);
      notFound++;
      continue;
    }

    // 2. Update header: fix revenue and shipping_cost
    const { error: updateErr } = await supabase.rpc("update_order_header", {
      p_order_id: order.id,
      p_order_date: row.date,
      p_platform: row.platform,
      p_platform_order_ref: row.ref,
      p_customer_name: row.customer || null,
      p_revenue: row.customPaid,
      p_shipping_cost: row.shipping,
      p_discounts: row.discount,
      p_gross_revenue: row.customPaid,
      p_platform_fees: 0,
      p_cogs_override: null,
    });

    if (updateErr) {
      console.error(`[ERROR] update_order_header ${row.ref}: ${updateErr.message}`);
      errors++;
      continue;
    }

    updated++;

    // 3. Add recipe/product if order has no line items
    const { data: existingItems } = await supabase
      .from("order_products")
      .select("id")
      .eq("order_id", order.id)
      .limit(1);

    if (!existingItems || existingItems.length === 0) {
      const recipeKey = row.recipe.trim().toLowerCase().replace(/\s+/g, " ");
      const recipeId = recipeMap[recipeKey] ?? null;

      if (!recipeId) {
        console.warn(`[NO RECIPE MATCH] ${row.ref} — "${row.recipe}"`);
      } else {
        // Find or create product
        const { data: productRow } = await supabase
          .from("products")
          .select("id")
          .ilike("name", row.product)
          .maybeSingle();

        let productId = productRow?.id;
        if (!productId) {
          const { data: newProduct, error: newProdErr } = await supabase
            .from("products")
            .insert({ name: row.product })
            .select("id")
            .single();
          if (newProdErr) {
            console.error(`[ERROR] create product ${row.product}: ${newProdErr.message}`);
            continue;
          }
          productId = newProduct.id;
          console.log(`  [NEW PRODUCT] Created "${row.product}"`);
        }

        // Direct insert — bypasses FIFO stock deduction (correct for historical orders)
        const { error: lineErr } = await supabase.from("order_products").insert({
          order_id: order.id,
          recipe_id: recipeId,
          product_id: productId,
          quantity: row.qty,
          unit_cost: 0,
          total_cost: 0,
        });

        if (lineErr) {
          console.error(`[ERROR] insert order_products ${row.ref}: ${lineErr.message}`);
        } else {
          recipesAdded++;
        }
      }
    } else {
      console.log(`  [SKIP RECIPE] ${row.ref} already has line items`);
    }
  }

  console.log("\n=== DONE ===");
  console.log(`Updated headers:  ${updated}`);
  console.log(`Recipes added:    ${recipesAdded}`);
  console.log(`Not found:        ${notFound}`);
  console.log(`Errors:           ${errors}`);
}

main().catch(console.error);
