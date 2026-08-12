// One-shot import script: run with  node import-orders.mjs
// Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local
// Upserts all rows by platform_order_ref — creates new, updates changed.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load .env.local ────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, ".env.local");
const env = readFileSync(envPath, "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"(.*)"$/, "$1");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE env vars in .env.local"); process.exit(1);
}

// ── Supabase client ────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── CSV data ───────────────────────────────────────────────────────────────
// Paste path to your CSV file here, or embed the data directly:
const CSV = `Platform ref ,Platform,Product Name,Quantity,Discount,Customer Paid,Date,Recipient,Payout,Shipping,Receipe,Fee
1919,Shopify,Scratch,1,0,4.68,07/05/2026,jess simes,4.34,1.55,A6 Card A4 No Bend,0.34
576893284809873503,Tiktok,Scratch,1,0,5.68,07/05/2026,matthew brown,4.93,2.3,A6 Card A4 No Bend,
576893256822332035,Tiktok,Kids Teeth Brushing Chart,1,1.52,4.96,07/05/2026,jade wilson,4.81,2.3,Kids Charts A4 Laminated ,
576893227931835343,Tiktok,Scratch,1,0,6.11,07/05/2026,ruth mcwilliams,5.38,2.3,A6 Card A4 No Bend,
576893196991044051,Tiktok,fuck it this will do ,1,0,6.58,07/05/2026,blake alcock,5.29,2.3,Square card - a4 no bend used ,
1914,Shopify ,Scratch,1,0.55,4.13,07/05/2026,summer wingrove,3.8,1.55,A6 Card A4 No Bend,0.33
576893123609992002,Tiktok,step dad less of a knob,1,0,5.48,07/05/2026,shanee papp,4.76,2.3,Square card - a4 no bend used ,
576893099618638656,Tiktok,Scratch,1,0,6.68,07/05/2026,elliot nash,5.38,2.3,A6 Card A4 No Bend,
576893009313831505,Tiktok,Scratch,1,0.64,5.04,06/05/2026,Daniel mckay,4.53,2.3,A6 Card A4 No Bend,
23-14584-90529,Ebay,Scratch,1,0,4.05,06/05/2026,Danielle,3.69,0.91,A6 Card A4 No Bend,0.36
576892960594828086,Tiktok,Scratch,1,0,5.68,06/05/2026,Mariana,5.11,2.3,A6 Card A4 No Bend,
576892955933776083,Tiktok,Scratch,1,0.8,5.38,06/05/2026,Simon,4.84,2.3,A6 Card A4 No Bend,
576892879851002651,Tiktok,Scratch,1,0.64,5.04,06/05/2026,Mark,4.53,2.3,A6 Card A4 No Bend,
576892864783816923,Tiktok,Scratch,1,0.64,5.04,06/05/2026,Tanya,4.53,2.3,A6 Card A4 No Bend,
576892854983891415,Tiktok,Scratch,1,0.64,5.04,06/05/2026,Claire,4.53,2.3,A6 Card A4 No Bend,
576892842371291678,Tiktok,Scratch,1,0.74,5.94,06/05/2026,Tracey,4.9,2.3,A6 Card A4 No Bend,
576892829679851915,Tiktok,Scratch,1,0.64,5.04,06/05/2026,lee,4.53,2.3,A6 Card A4 No Bend,
576892825956752293,Tiktok,Scratch,1,0.64,5.04,06/05/2026,Roisin,4.53,2.85,A6 Card A4 No Bend,
576892817108081011,Tiktok,Scratch,1,0.64,5.04,06/05/2026,Lee,4.53,2.85,A6 Card A4 No Bend,
576892806789830853,Tiktok,Scratch,1,0.74,5.94,06/05/2026,zoe,5.4,2.3,A6 Card A4 No Bend,
576892806541383843,Tiktok,Scratch,1,0.64,5.04,06/05/2026,Mrs e grant,5.03,2.85,A6 Card A4 No Bend,
576892798416034292,Tiktok,Scratch,1,0.74,5.2,06/05/2026,Ashley,5.4,2.3,A6 Card A4 No Bend,
576892774890576068,Tiktok,Scratch,1,0.74,5.94,06/05/2026,Delyth,5.4,2.3,A6 Card A4 No Bend,
576892766134966598,Tiktok,Scratch,1,0.74,5.94,06/05/2026,Lyn,5.04,2.3,A6 Card A4 No Bend,
576892765744568409,Tiktok,Scratch,1,0.64,5.04,06/05/2026,Scott,4.53,2.3,A6 Card A4 No Bend,
576892763482856192,Tiktok,Scratch,1,0.64,5.54,06/05/2026,Brian quinn,4.99,2.3,A6 Card A4 No Bend,
576892755180821412,Tiktok,Scratch,1,0.74,5.94,06/05/2026,Andrea,4.9,2.3,A6 Card A4 No Bend,
576892742008412355,Tiktok,Scratch,4,2.95,14.3,06/05/2026,Patrick molloy,12.5,2.3,A6 Card A4 No Bend and 3 x A6 card & Env,
576892726736295990,Tiktok,Scratch,2,1.84,8.03,06/05/2026,Amy,7.3,2.3,"A6 Card ONLY CARD, A6 card & Env",
4050062408,Etsy,Stranger lights card ,1,0,2.89,06/05/2026,Rebecca,2.89,1.55,A5 Card non gloss,0.7
576892664106883508,Tiktok,Scratch,1,0.64,5.04,06/05/2026,Laura,4.53,2.3,A6 Card A4 No Bend,
576892627774249185,Tiktok,Scratch,1,0.64,5.04,06/05/2026,philipa,4.53,2.3,A6 Card A4 No Bend,
576892608102308435,Tiktok,Scratch,2,1.84,8.03,06/05/2026,Alison,7.3,2.3,"A6 Card ONLY CARD, A6 card & Env",
576892564332780085,Tiktok,Scratch,1,0.64,5.04,06/05/2026,vicky,5.03,2.3,A6 Card A4 No Bend,
576892538174085222,Tiktok,Scratch,1,0.64,5.04,06/05/2026,Matt,5.03,2.3,A6 Card A4 No Bend,
576892538474568411,Tiktok,Scratch,1,0.64,5.04,06/05/2026,Scott,5.03,2.3,A6 Card A4 No Bend,
576892491581004375,Tiktok,Scratch,1,0.64,5.04,06/05/2026,Kev,5.03,2.3,A6 Card A4 No Bend,
1884,Shopify,Scratch,1,0.55,4.13,06/05/2026,Andrew,3.8,1.55,A6 Card A4 No Bend,0.33
576892444914391969,Tiktok,Scratch,1,0.64,5.04,06/05/2026,Sam,5.03,2.3,A6 Card A4 No Bend,
576892432094632815,Tiktok,Scratch,1,0.64,5.04,06/05/2026,Angela,5.03,2.3,A6 Card A4 No Bend,
576892417580899031,Tiktok,Scratch,1,0.64,5.04,06/05/2026,Nina,5.03,2.3,A6 Card A4 No Bend,
576892392548243556,Tiktok,Scratch,1,0.64,5.04,06/05/2026,Anne,5.03,2.3,A6 Card A4 No Bend,
576892379488557201,Tiktok,Scratch,1,0.64,5.04,06/05/2026,Deborah,5.03,2.3,A6 Card A4 No Bend,
576892366713035735,Tiktok,Scratch,1,0.64,5.04,05/05/2026,Sharon,5.03,2.3,A6 Card A4 No Bend,
576892345887988208,Tiktok,Scratch,1,0.64,5.04,05/05/2026,paul,5.03,2.3,A6 Card A4 No Bend,
576892337713224433,Tiktok,Scratch,1,0.64,5.04,05/05/2026,Jos,5.03,2.3,A6 Card A4 No Bend,
576892333427956673,Tiktok,Scratch,1,0.64,5.04,05/05/2026,Ben,5.03,2.3,A6 Card A4 No Bend,
576892330529364852,Tiktok,Scratch,1,0.64,5.04,05/05/2026,Trina,5.03,2.3,A6 Card A4 No Bend,
576892329212943176,Tiktok,Scratch,1,0.64,5.04,05/05/2026,Charlotte,5.03,2.3,A6 Card A4 No Bend,
576892324041431309,Tiktok,Scratch,1,0.74,5.94,05/05/2026,Ruth ,5.4,2.3,A6 Card A4 No Bend,
576892324024982527,Tiktok,Scratch,1,0.64,5.04,05/05/2026,Becky,5.03,2.3,A6 Card A4 No Bend,
576892322660587951,Tiktok,Scratch,1,0.64,4.24,05/05/2026,Tracy,5.03,2.3,A6 Card A4 No Bend,
576892322351782739,Tiktok,Scratch,1,0.8,4.88,05/05/2026,Sally,4.89,2.3,A6 Card A4 No Bend,
576892315781536265,Tiktok,Teacher Classic ,1,2.1,8.78,05/05/2026,Natalie,11.26,2.3,Teacher classic x 1 ,
576892315367676875,Tiktok,Scratch,1,0.64,5.04,05/05/2026,Lisa,5.03,2.3,A6 Card A4 No Bend,
576892304997587910,Tiktok,Scratch,1,0.8,4.88,05/05/2026,Nicola,4.89,2.3,A6 Card A4 No Bend,
576892303343721251,Tiktok,Scratch,1,0.64,5.54,05/05/2026,Natalie,5.49,2.3,A6 Card A4 No Bend,
576892301861624540,Tiktok,Scratch,1,0.64,5.04,05/05/2026,Jennifer,5.03,2.3,A6 Card A4 No Bend,
576892295410128942,Tiktok,Scratch,1,0.64,5.54,05/05/2026,Paul,5.49,2.3,A6 Card A4 No Bend,
576892293962832021,Titkok,Scratch,1,0.64,5.03,05/05/2026,kay,5.03,2.3,A6 Card A4 No Bend,
576892290416351899,Titkok,Scratch,1,0.64,5.04,05/05/2026,mandy,5.03,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892284868860437,Titkok,Scratch,1,0.64,5.04,05/05/2026,Bev,5.03,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892281570695502,Titkok,Scratch,1,0.74,5.44,05/05/2026,claire,4.44,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892270390319489,Titkok,Scratch,1,0.64,5.04,05/05/2026,chris h ,5.03,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892266172488120,Titkok,Scratch,1,0.74,5.94,05/05/2026,Nicci Oliver,5.4,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892262803347800,Titkok,Scratch,1,0.64,5.04,05/05/2026,claire,4.53,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892259719354699,Titkok,Scratch,1,0.64,5.04,05/05/2026,katie,5.03,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892259438205017,Titkok,Scratch,1,0.74,5.44,05/05/2026,val,4.94,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892255766550913,Titkok,Scratch,1,0.74,5.44,05/05/2026,erika,4.94,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892250794728074,Titkok,Scratch,1,0.64,5.04,05/05/2026,angela,4.53,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892245969443674,Titkok,Scratch,1,0.64,5.04,05/05/2026,sean,4.53,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892244929714573,Titkok,Scratch,1,0.64,5.04,05/05/2026,kirsty,4.53,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892240144931131,Titkok,Scratch,1,0.64,5.04,05/05/2026,nic,4.53,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892236959881340,Titkok,Scratch,1,0.64,5.04,05/05/2026,Tara,4.53,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892233607715566,Titkok,Scratch,1,0.74,5.94,05/05/2026,Leah,4.9,2.3,A6 Card SQ Cellophane A4 No Bend ,
1844,Shopify,Scratch,1,0.55,4.13,05/05/2026,Michelle ,3.8,1.55,A6 Card SQ Cellophane A4 No Bend ,0.33
576892225062542224,Titkok,Scratch,1,0.64,4.24,05/05/2026,Claire ,5.03,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892224255531397,Titkok,Scratch,1,0.64,5.54,05/05/2026,Alison,5.49,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892216840198759,Titkok,Scratch,1,0.64,5.54,05/05/2026,Russell Aubin,4.99,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892215481178770,Titkok,Scratch,1,0.74,5.94,05/05/2026,Lynn James,4.9,2.3,A6 Card SQ Cellophane A4 No Bend ,
1838,Shopify,she maybe 33,1,0,5.84,05/05/2026,Chris ,5.47,2.3,A6 Card SQ Cellophane A4 No Bend ,0.37
576892202091124846,Titkok,Scratch,1,0.64,5.04,05/05/2026,miss Helen Renshaw,4.53,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892201974798365,Titkok,Scratch,1,0.64,4.24,05/05/2026,Samantha Webb,4.53,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892199977523335,Titkok,Scratch,1,0.64,5.04,05/05/2026,Ronnie Sims,4.53,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892189637515671,Titkok,Scratch,1,0.92,4.84,05/05/2026,Michelle Fisher,4.53,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892180487379491,Titkok,Scratch,1,0.64,5.04,05/05/2026,Emma Wykeham-Martin,4.53,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892166041017188,Titkok,Scratch,1,0.64,4.74,05/05/2026,Tammy Saunders,4.99,2.3,A6 Card SQ Cellophane A4 No Bend ,
576892164982282243,Titkok,Scratch,1,0.8,4.08,05/05/2026,Stefanie Beswick,4.39,2.3,A6 Card SQ Cellophane,
576892162483919350,Titkok,photo words name print,1,5.98,9.96,05/05/2026,Farida Talbi Talbi,9.51,3.65,1 x Framed Print,
576892153208674627,Titkok,Scratch,1,0.64,5.04,05/05/2026,Alan Muir,4.53,2.3,A6 Card SQ Cellophane,
576892152008906979,Titkok,Scratch,1,0.64,5.54,05/05/2026,margaret griffiths,4.99,2.3,A6 Card SQ Cellophane,
576892151519681339,Titkok,Scratch,1,0.64,5.04,05/05/2026,Ian Darvell,4.53,2.3,A6 Card SQ Cellophane,
576892140616456777,Titkok,Scratch,3,2.21,11.35,05/05/2026,peterstolban stolban,9.82,2.3,A6 Card SQ Cellophane and 2x A6 card & Env,
576892133392357943,Titkok,Scratch,1,0.64,5.04,05/05/2026,Mark Oneill,4.53,2.3,A6 Card SQ Cellophane,
576892096874584974,Titkok,Scratch,1,0.64,5.04,05/05/2026,Karen Mason,4.53,2.3,A6 Card SQ Cellophane,
1823,Shopify,Scratch,1,0.55,4.13,05/05/2026,Michelle ,3.8,0.91,A6 Card SQ Cellophane,0.33
576892076440525458,Titkok,Scratch,1,0.64,5.04,05/05/2026,Jo Lake,4.53,2.3,A6 Card SQ Cellophane,
576892055306148722,Titkok,Scratch,1,0.64,5.04,05/05/2026,Stephen Comer,4.53,2.3,A6 Card SQ Cellophane,
576892052851890371,Titkok,Scratch,1,0.74,5.94,05/05/2026,neil Stephan,4.9,2.3,A6 Card SQ Cellophane,
576892049744501704,Titkok,Scratch,1,0.64,5.04,05/05/2026,Jason Bennett,4.53,2.3,A6 Card,
1818,Shopify,Scratch,1,0,4.68,05/05/2026,Gary,4.34,0.91,A6 Card,0.34
576892034829490675,Titkok,Scratch,1,0.64,5.04,05/05/2026,sorin Pop,4.53,2.3,A6 Card,
576892009679198837,Titkok,Scratch,1,0.74,5.94,05/05/2026,Amanda Griffiths,4.9,2.3,A6 Card,
576891991664138728,Titkok,Scratch,1,0.64,5.04,05/05/2026,Chris Ogden,4.53,2.3,A6 Card,
576891954920331865,Titkok,Scratch,1,0.74,5.94,05/05/2026,Philip Smith,4.9,2.3,A6 Card,
576891925334497860,Titkok,Scratch,1,0.74,5.44,04/05/2026,Louise newton,4.44,2.3,A6 Card,
576891864366422790,Titkok,Scratch,1,0.64,5.04,04/05/2026,Darren Randall,4.53,2.3,A6 Card,
576891846719674514,Titkok,Scratch,1,0.74,5.94,04/05/2026,Craig Franks,4.9,2.3,A6 Card,
576891834951244636,Titkok,Scratch,1,0.74,5.94,04/05/2026,Andrea johnston,4.9,2.3,A6 Card,
576891809825921779,Titkok,Scratch,1,0.74,5.94,04/05/2026,Building site girls,4.9,2.3,A6 Card,
576891799278885456,Titkok,Scratch,1,0.74,5.94,04/05/2026,Lynn Gilbert,5.41,2.3,A6 Card,
576891745257494885,Titkok,Daily Reminder Affirmation Card,1,0.72,5.86,04/05/2026,hannah stonier,4.83,2.3,,
576891741120600190,Titkok,Scratch,1,0.74,5.94,04/05/2026,Kath Orrell,4.91,2.3,A6 Card,
576891709782137770,Titkok,Scratch,1,0.92,4.84,04/05/2026,dean hedley,4.74,2.3,A6 Card,
576891701839436563,Titkok,Scratch,2,1.84,8.53,04/05/2026,Suzy Braybrook,7.26,2.3,A6 Card & A6 Card ONLY CARD,
576891690783774868,Titkok,Scratch,1,0.74,5.94,04/05/2026,Jamie Holloway,4.91,2.3,A6 Card,
576891669920717779,Titkok,Scratch,1,0.74,5.94,04/05/2026,Nichola Fothergill,4.91,2.3,A6 Card,
576891653691054355,Titkok,Scratch,1,0,6.68,04/05/2026,Barry Holder,5.58,2.3,A6 Card,
576891615703440198,Titkok,Scratch,1,0.74,5.94,04/05/2026,Caroline brown,4.91,2.3,A6 Card,
576891591143365041,Titkok,Scratch,1,0.74,5.94,04/05/2026,Sarah Flemming,4.91,2.3,A6 Card,
576891581775124501,Titkok,Scratch,1,0.74,5.94,04/05/2026,Jane Davies,4.91,2.3,A6 Card,
576891531096135898,Titkok,Scratch,1,0.74,5.94,04/05/2026,jason barratt,4.91,2.3,A6 Card,
576891515972066162,Titkok,Scratch,1,0.74,5.94,03/05/2026,Beverley Devenny,4.91,2.3,A6 Card,
576891505973631531,Titkok,Scratch,1,0.74,5.94,03/05/2026,Amanda Bleakley,4.91,2.3,A6 Card,
576891494269885424,Titkok,Scratch,1,0.74,5.94,03/05/2026,bethany joy,4.91,2.3,A6 Card,
576891487619160423,Titkok,Scratch,2,1.48,8.89,03/05/2026,Joanne Comley,7.59,2.3,A6 Card & A6 Card ONLY CARD,
576891466677394011,Titkok,Scratch,1,0.8,4.88,03/05/2026,Kelly hughes,4.4,2.3,A6 Card,
576891463795055432,Titkok,Scratch,1,0.74,5.94,03/05/2026,Jackie Brierley,4.91,2.3,A6 Card,
576891463251499682,Titkok,Scratch,1,0.64,5.04,03/05/2026,kerry regan,4.54,2.3,A6 Card,
576891461780281507,Titkok,Scratch,1,0.74,5.94,03/05/2026,Scott Rowntree,4.91,2.3,A6 Card,
576891459972929849,Titkok,Scratch,1,0.74,5.94,03/05/2026,Joanne Henderson,4.91,2.3,A6 Card,
576891457617893401,Titkok,Scratch,1,0.74,4.7,03/05/2026,David Gibb,4.45,2.3,A6 Card,
576891442226371177,Titkok,Scratch,1,0.74,5.94,03/05/2026,Julie Ambrose,4.91,2.3,A6 Card,
576891440804960395,Titkok,Scratch,1,0.74,5.94,03/05/2026,jamma Wilkinson,4.91,2.3,A6 Card,
576891420199656262,Titkok,Scratch,1,0.74,5.94,03/05/2026,rosalind damsell,4.91,2.3,A6 Card,
576891412921358769,Titkok,Scratch,1,0.74,5.94,03/05/2026,user5314597981157,4.91,2.3,A6 Card,
576891410509109785,Titkok,Scratch,2,1.84,8.53,03/05/2026,becky Henry,7.26,2.3,A6 Card & A6 Card ONLY CARD,
576891360680974719,Titkok,Scratch,1,0.74,5.94,03/05/2026,Angie gill,4.91,2.85,A6 Card,
576891348824463643,Titkok,Scratch,1,0.74,5.94,03/05/2026,Nicola Stonehouse,4.91,2.3,A6 Card,
576891327464643429,Titkok,Ice Cream & Biscuit Card,1,0.72,5.86,03/05/2026,Nicole tempest,4.83,2.3,A6 Card,
576891284046125568,Titkok,Scratch,1,0.74,5.94,03/05/2026,Darren Thornton,4.7,2.3,A6 Card,
576891256338946175,Titkok,Scratch,4,2.95,14.8,03/05/2026,Tracey Goodridge,12.45,2.3,A6 Card & 3x A6 Card ONLY CARD,
576891255543012175,Titkok,Scratch,1,0.74,5.94,03/05/2026,Robin Hall,4.7,2.3,A6 Card,
576891251080862125,Titkok,Scratch,1,0.74,5.94,03/05/2026,Joanna Stamps,4.7,2.3,A6 Card,
576891228185861005,Titkok,Scratch,1,0.92,5.76,03/05/2026,Amanda Payne,4.54,2.3,A6 Card,
1773,Shopify,Scratch,1,0,4.68,03/05/2026,Jane ,4.34,2.3,A6 Card,0.34
576891164828670739,Titkok,Scratch,1,0.74,5.94,03/05/2026,Allan Watson,4.7,2.85,A6 Card,
576891163353913415,Titkok,Scratch,1,0.74,5.94,03/05/2026,Helen Ramsay,4.7,2.3,A6 Card,
576891159554136310,Titkok,Scratch,1,0.74,5.94,03/05/2026,Kelly Abbott,4.7,2.3,A6 Card,
576891143602412281,Titkok,Scratch,1,0.74,5.94,03/05/2026,Jeanette Donaldson,4.7,2.85,A6 Card,
576891095670692591,Titkok,Scratch,1,0.74,5.94,03/05/2026,Seamus Snowden,4.7,2.3,A6 Card,
576891088283539715,Titkok,Scratch,1,0.74,5.94,03/05/2026,Jodh Ferris,4.7,2.3,A6 Card,
576891050384332977,Titkok,Scratch,1,0.74,5.94,02/05/2026,Joanna Kirkness,4.7,2.85,A6 Card,
576891047849859572,Titkok,Scratch,1,0.74,5.94,02/05/2026,Carole Green,4.7,2.3,A6 Card,
1764,Shopify,Scratch,3,0,12.06,02/05/2026,Michael Roques,11.57,0.91,A6 Card & 2x A6 Card ONLY CARD,0.49
576891040148724093,Titkok,Scratch,2,1.48,8.89,02/05/2026,Claire Wass,7.28,2.3,A6 Card & A6 Card ONLY CARD,
576891029911739265,Titkok,Scratch,1,0.74,5.94,02/05/2026,Karen Stedman,4.7,2.3,A6 Card,
576891024865663956,Titkok,Scratch,1,0.74,5.94,02/05/2026,Susan Phillips,4.7,2.3,A6 Card,
576891007303391261,Titkok,Scratch,1,0.74,5.94,02/05/2026,Vicky goodwin,4.7,2.3,A6 Card,
576891004116965899,Titkok,Scratch,1,0.74,5.94,02/05/2026,Mervin Peakes,4.7,2.3,A6 Card,
576891000816900147,Titkok,Scratch,1,0.74,5.94,02/05/2026,Hazel Wakefield,4.7,2.3,A6 Card,
576890995391305774,Titkok,Scratch,1,0.74,5.94,02/05/2026,Christina Plant,4.7,2.3,A6 Card,
576890994041002758,Titkok,Scratch,1,0.74,5.94,02/05/2026,Claire Stirling,4.7,2.3,A6 Card,
576890990117034002,Titkok,Scratch,1,0.74,5.94,02/05/2026,terri ufton,4.7,2.3,A6 Card,
576890984229541898,Titkok,Scratch,1,0.74,5.94,02/05/2026,Stacey Mitchell,4.7,2.85,A6 Card,
576890977481366400,Titkok,Scratch,1,0.74,5.94,02/05/2026,victoria brooke,4.7,2.3,A6 Card,
576890971980667601,Titkok,Scratch,1,0.74,5.94,02/05/2026,Lynda Sewell,4.7,2.3,A6 Card,
576890966875872129,Titkok,Scratch,1,0.74,5.94,02/05/2026,Edward Mckeown,4.7,2.85,A6 Card,
576890957595450097,Titkok,Scratch,1,0.74,5.94,02/05/2026,paul mccormick,4.7,2.3,A6 Card,
576890952792251075,Titkok,Scratch,1,0.74,5.94,02/05/2026,Mel Cole,4.7,2.3,A6 Card,
576890941621640113,Titkok,Scratch,3,2.21,11.85,02/05/2026,penny Annison,9.87,2.3,A6 Card & 2x A6 Card ONLY CARD,
576890912740186550,Titkok,bathroom wordsearch,1,1.62,7.86,02/05/2026,Rebecca xxx Ivin,6.37,2.3,,
576890911085992398,Titkok,Scratch,1,0.74,5.94,02/05/2026,Callum Gregson,4.7,2.3,A6 Card,
576890909576829272,Titkok,Scratch,1,0.74,5.94,02/05/2026,Darren Rickwood,4.7,2.3,A6 Card,
576890904269002793,Titkok,Scratch,1,0.74,5.94,02/05/2026,Paddy McKeown,4.7,2.85,A6 Card,
576890901556336925,Titkok,Scratch,1,0.74,5.94,02/05/2026,Robert syldatk,4.7,2.3,A6 Card,
576890883226442250,Titkok,Scratch,1,0.74,5.94,02/05/2026,martin cameron,4.73,2.3,A6 Card,
576890872342551491,Titkok,Scratch,1,0.74,5.94,02/05/2026,DazT23 taylor,4.73,2.3,A6 Card,
576890861246585421,Titkok,Scratch,1,0.74,5.94,02/05/2026,Mike vittery,4.73,2.3,A6 Card,
576890854961616954,Titkok,Scratch,1,0.74,5.94,02/05/2026,Ruth Edwards,4.73,2.3,A6 Card,
576890852484225099,Titkok,Scratch,1,0.74,5.94,02/05/2026,Lesley Kearns,4.73,2.3,A6 Card,
576890834777315900,Titkok,Scratch,1,0.74,5.94,02/05/2026,swflooring,4.73,2.3,A6 Card,
576890827999713528,Titkok,Scratch,1,0.74,5.94,02/05/2026,Tracey Reed,4.73,2.3,A6 Card,
576890792049023717,Titkok,Scratch,1,0.74,5.94,02/05/2026,Joanne Harmer,4.73,2.3,A6 Card,
576890759690164466,Titkok,Scratch,1,0.92,5.76,02/05/2026,Martin Gilchrist,4.57,2.3,A6 Card,
576890758524344378,Titkok,Scratch,3,2.21,11.85,02/05/2026,Tony kelton,9.92,2.3,A6 Card & 2x A6 Card ONLY CARD,
576890732419389938,Titkok,Scratch,1,0.74,5.94,02/05/2026,Paul Barran,4.73,2.3,A6 Card,
576890717142424043,Titkok,Scratch,1,0.74,5.94,02/05/2026,Andrew Cottam,4.73,2.58,A6 Card,
576890711084931551,Titkok,Scratch,1,0.74,5.94,02/05/2026,Michael Mansaray,4.73,2.3,A6 Card,
576890674220997075,Titkok,Scratch,1,0.92,5.76,02/05/2026,Dewi Evans,4.57,2.3,A6 Card,
576890665225263768,Titkok,Scratch,1,0.74,5.94,02/05/2026,Helen Thomas,4.73,2.3,A6 Card,
576890633170754084,Titkok,Scratch,1,0.74,5.94,02/05/2026,Lewis Warden,4.73,2.3,A6 Card,
576890340381858013,Titkok,rumi purple,1,1,5.98,01/05/2026,rachel ward,4.76,2.3,,
576890290890382091,Titkok,Kids Teeth Brushing Chart,4,1.8,17.36,01/05/2026,Lara Haines,14.78,2.3,,`;

// ── Helpers ────────────────────────────────────────────────────────────────
function normalizePlatform(p) {
  const lower = p.trim().toLowerCase().replace(/\s+/g, "");
  if (lower === "titkok" || lower === "tiktok") return "tiktok";
  if (lower === "shopify") return "shopify";
  if (lower === "ebay") return "ebay";
  if (lower === "etsy") return "etsy";
  return lower || "tiktok";
}

function parseDate(raw) {
  const parts = raw.trim().split("/");
  if (parts.length !== 3) return null;
  let [d, m, y] = parts;
  const yr = parseInt(y, 10);
  if (yr < 2020 || yr > 2035) y = "2026";
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function parseCsvLine(line) {
  const cols = [];
  let cur = "";
  let inQuotes = false;
  for (const c of line) {
    if (c === '"') { inQuotes = !inQuotes; }
    else if (c === "," && !inQuotes) { cols.push(cur); cur = ""; }
    else { cur += c; }
  }
  cols.push(cur);
  return cols;
}

function parseRows(csv) {
  const lines = csv.split("\n").map(s => s.trim()).filter(Boolean).slice(1);
  return lines.map(line => {
    const c = parseCsvLine(line);
    return {
      platform_order_ref: c[0]?.trim() ?? "",
      platform: normalizePlatform(c[1] ?? ""),
      product_name: c[2]?.trim() ?? "",
      discounts: parseFloat(c[4]) || 0,
      gross_revenue: parseFloat(c[5]) || 0,
      order_date: parseDate(c[6] ?? ""),
      raw_date: c[6]?.trim() ?? "",
      customer_name: c[7]?.trim() ?? "",
      revenue: parseFloat(c[8]) || 0,
      shipping_cost: parseFloat(c[9]) || 0,
      platform_fees: parseFloat(c[11]) || 0,
    };
  });
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const rows = parseRows(CSV);
  console.log(`Parsed ${rows.length} rows\n`);

  let created = 0, updated = 0, skipped = 0, errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const label = `[${i + 1}/${rows.length}] ${row.platform_order_ref}`;

    if (!row.platform_order_ref) {
      console.log(`  SKIP (no ref)`);
      skipped++; continue;
    }
    if (!row.order_date) {
      console.log(`  SKIP ${label} — bad date: ${row.raw_date}`);
      skipped++; continue;
    }

    try {
      const { data: existing, error: checkErr } = await supabase
        .from("orders")
        .select("id")
        .eq("platform_order_ref", row.platform_order_ref)
        .maybeSingle();

      if (checkErr) throw checkErr;

      if (existing?.id) {
        const { error: updateErr } = await supabase.rpc("update_order_header", {
          p_order_id: existing.id,
          p_order_date: row.order_date,
          p_platform: row.platform,
          p_platform_order_ref: row.platform_order_ref,
          p_customer_name: row.customer_name || null,
          p_revenue: row.revenue,
          p_shipping_cost: row.shipping_cost,
          p_discounts: row.discounts,
          p_gross_revenue: row.gross_revenue,
          p_platform_fees: row.platform_fees,
          p_cogs_override: null,
        });
        if (updateErr) throw updateErr;
        console.log(`  UPDATE ${label} — ${row.customer_name}`);
        updated++;
      } else {
        const { data: orderId, error: createErr } = await supabase.rpc("create_order", {
          p_order_date: row.order_date,
          p_customer_name: row.customer_name || null,
          p_platform: row.platform,
          p_platform_order_ref: row.platform_order_ref,
          p_revenue: row.revenue,
          p_shipping_cost: row.shipping_cost,
          p_discounts: row.discounts,
        });
        if (createErr) throw createErr;

        const { error: moneyErr } = await supabase.rpc("update_order_money", {
          p_order_id: orderId,
          p_gross_revenue: row.gross_revenue,
          p_platform_fees: row.platform_fees,
          p_payout: row.revenue,
          p_shipping_cost: row.shipping_cost,
          p_discounts: row.discounts,
        });
        if (moneyErr) throw moneyErr;

        console.log(`  CREATE ${label} — ${row.customer_name}`);
        created++;
      }
    } catch (e) {
      console.error(`  ERROR ${label} — ${e?.message ?? e}`);
      errors++;
    }
  }

  console.log(`\n── Summary ──────────────────────────`);
  console.log(`  Created : ${created}`);
  console.log(`  Updated : ${updated}`);
  console.log(`  Skipped : ${skipped}`);
  console.log(`  Errors  : ${errors}`);
  console.log(`─────────────────────────────────────`);
}

main().catch(console.error);
