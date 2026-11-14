import pg from "pg";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const seedPassword = process.env.SEED_PASSWORD;
if (!seedPassword || seedPassword.length < 10) throw new Error("Set a private SEED_PASSWORD of at least 10 characters.");

const pool = new Pool({ connectionString, max: 1 });
const scrypt = promisify(scryptCallback);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${Buffer.from(derived).toString("hex")}`;
}

const eventSeeds = [
  ["desert-light-editorial", "Desert Light Editorial", "Editorial", "Scottsdale, AZ", "A sunset-led fashion production shaped around warm desert light.", "Build an editorial story across modern architecture and open desert terrain. The crew moves through three planned looks with clear call sheets, lighting windows, and portfolio deliverables.\nModels and photographers receive a final image-sharing schedule and production credits.", "/images/desert-production.png", "2026-10-17T15:00:00-07:00", "2026-10-17T21:00:00-07:00", "Private North Scottsdale residence", 32500, ["Creative direction", "Location and permits", "Wardrobe styling", "Lunch and refreshments", "Shared final gallery"], ["Three camera-ready looks", "Neutral shoes", "Government-issued identification"], 12, 4, true],
  ["neon-after-dark", "Neon After Dark", "Studio", "Phoenix, AZ", "A controlled night-studio session for cinematic color and movement.", "Create bold fashion and beauty work using neon practicals, projection, and controlled motion. Small rotating teams keep shooting time focused while the production lead maintains a consistent visual brief.", "/images/neon-studio.png", "2026-11-08T18:00:00-07:00", "2026-11-08T23:00:00-07:00", "Warehouse 215 Studio", 27500, ["Studio rental", "Lighting package", "Creative direction", "Hair and makeup touchups", "Edited selects"], ["Black base wardrobe", "One statement look", "Closed-toe studio shoes"], 8, 3, false],
  ["poolside-portfolio-day", "Poolside Portfolio Day", "Lifestyle", "Paradise Valley, AZ", "A full-day resort portfolio production with lifestyle and swim sets.", "Work through poolside lifestyle, shaded beauty, and golden-hour resort scenes. The day is designed for efficient portfolio variety with planned rotations and protected meal breaks.", "/images/poolside-network.png", "2026-11-22T09:00:00-07:00", "2026-11-22T18:00:00-07:00", "Paradise Valley private resort", 42500, ["Private location", "Three produced sets", "Lunch", "Changing areas", "Usage-ready image gallery"], ["Two swim or resort looks", "Robe and sandals", "Sun protection"], 16, 7, false],
  ["sedona-motion-lab", "Sedona Motion Lab", "Movement", "Sedona, AZ", "A two-day movement and fabric study set against red-rock landscapes.", "Explore motion, shape, and scale through sunrise and late-afternoon sessions. This small-group production prioritizes expressive posing and environmental portraiture.", "/images/models/model-08.jpg", "2026-12-05T06:00:00-07:00", "2026-12-06T17:00:00-07:00", "West Sedona production base", 69000, ["Two production days", "Local transportation", "Location access", "Breakfast and lunch", "Safety coordinator"], ["Layered wardrobe", "Trail-safe footwear", "Reusable water bottle"], 10, 4, true],
  ["downtown-campaign-night", "Downtown Campaign Night", "Campaign", "Phoenix, AZ", "An evening street-style campaign with real locations and a commercial brief.", "Move through three downtown locations with a compact lighting team and brand-style shot list. Participants leave with commercial images built around a coherent campaign idea.", "/images/models/model-13.jpg", "2026-12-12T16:00:00-07:00", "2026-12-12T22:00:00-07:00", "Roosevelt Row production hub", 24000, ["Permits", "Lighting crew", "Wardrobe coordination", "Production insurance", "Edited campaign selects"], ["Streetwear look", "Comfortable walking shoes", "Weather layer"], 12, 5, false],
  ["miami-swim-editorial", "Miami Swim Editorial", "Swim", "Miami Beach, FL", "A sunrise swim and resort editorial designed for publication-ready work.", "Begin before sunrise for clean beach light, then transition to a private resort set. The production balances natural movement, beauty details, and commercial swim imagery.", "/images/models/model-16.jpg", "2027-01-16T05:30:00-05:00", "2027-01-16T14:00:00-05:00", "South Beach and private resort", 55000, ["Beach permits", "Resort access", "Hair and makeup", "Breakfast and lunch", "Retouched selects"], ["Two swim looks", "Resort cover-up", "Natural manicure"], 14, 6, true],
  ["joshua-tree-lookbook", "Joshua Tree Lookbook", "Lookbook", "Joshua Tree, CA", "A focused two-day lookbook production in a quiet desert house.", "Build a cohesive fashion story across interiors, boulder fields, and open road. A defined shot list keeps the team productive without losing room for experimentation.", "/images/models/model-19.jpg", "2027-01-30T08:00:00-08:00", "2027-01-31T17:00:00-08:00", "Joshua Tree production house", 78000, ["Two-day location", "Production transportation", "Wardrobe stylist", "Meals", "Final lookbook gallery"], ["Four approved looks", "Desert footwear", "Overnight bag"], 9, 3, false],
  ["la-beauty-studio", "LA Beauty Studio", "Beauty", "Los Angeles, CA", "A precision beauty day for clean portraits, detail work, and bold color.", "Rotate through clean beauty, graphic color, and close-detail sets with experienced lighting and makeup teams. Every participant receives clearly credited portfolio outcomes.", "/images/models/model-22.jpg", "2027-02-13T09:00:00-08:00", "2027-02-13T18:00:00-08:00", "Arts District beauty studio", 47500, ["Studio and lighting", "Beauty team", "Three set changes", "Lunch", "Retouched beauty selects"], ["Clean skin on arrival", "Strapless neutral base", "Reference images"], 8, 2, false],
];

const profileSeeds = [
  {
    values: ["daisy-monroe", "Daisy Monroe", "model", "Miami · Phoenix", "/images/daisy.jpg", true, "pro", "Editorial and lifestyle model working between Miami and Phoenix. Daisy is known for expressive movement, warm-weather campaigns, and collaborative destination productions.", 7, "5′9″", "34–25–36", "Dark brown", "Hazel", ["Editorial", "Lifestyle", "Swim", "Beauty"], "https://example.com/daisy"],
    shots: [
      ["/images/daisy.jpg", "Botanical editorial", "Model Escape · Miami"],
      ["/images/desert-model.jpg", "Desert movement study", "Scottsdale editorial"],
      ["/images/scottsdale.jpg", "Southwest portrait", "Golden hour series"],
      ["/images/poolside-network.png", "Resort campaign", "Paradise Valley"],
      ["/images/neon-studio.png", "After-dark studio", "Phoenix"],
      ["/images/desert-production.png", "On-location campaign", "Arizona"],
      ["/images/creative-planning.png", "Creative direction session", "Model Escape"],
    ],
  },
  {
    values: ["sofia-reyes", "Sofia Reyes", "model", "Las Vegas · Los Angeles", "/images/desert-model.jpg", true, "creator", "Commercial and editorial model with a focus on fashion, beauty, and location-led storytelling throughout the Southwest.", 4, "5′8″", "33–24–35", "Black", "Brown", ["Fashion", "Commercial", "Beauty"], "https://example.com/sofia"],
    shots: [
      ["/images/desert-model.jpg", "Desert fashion story", "Model Escape"],
      ["/images/daisy.jpg", "Beauty portrait", "Miami"],
      ["/images/scottsdale.jpg", "Resort editorial", "Scottsdale"],
      ["/images/neon-studio.png", "Neon studio", "Las Vegas"],
      ["/images/poolside-network.png", "Poolside lifestyle", "Paradise Valley"],
      ["/images/desert-production.png", "Campaign production", "Arizona"],
    ],
  },
  {
    values: ["mara-scott", "Mara Scott", "model", "Scottsdale, AZ", "/images/scottsdale.jpg", false, "profile", "Scottsdale-based model building a focused editorial and lifestyle portfolio with local creative teams.", 2, "5′7″", null, "Auburn", "Green", ["Lifestyle", "Editorial"], null],
    shots: [
      ["/images/scottsdale.jpg", "Scottsdale portrait", "Model Escape"],
      ["/images/daisy.jpg", "Additional portrait", "Upgrade preview"],
    ],
  },
  {
    values: ["alex-chen", "Alex Chen", "photographer", "Phoenix · Los Angeles", "/images/desert-production.png", true, "pro", "Editorial and commercial photographer creating cinematic portraits, destination campaigns, and collaborative portfolio productions.", 9, null, null, null, null, ["Editorial", "Portrait", "Campaign", "Travel"], "https://example.com/alex"],
    shots: [
      ["/images/desert-production.png", "Desert campaign production", "Photographed by Alex Chen"],
      ["/images/daisy.jpg", "Botanical portrait", "Miami"],
      ["/images/desert-model.jpg", "Southwest editorial", "Arizona"],
      ["/images/neon-studio.png", "Neon after dark", "Phoenix"],
      ["/images/poolside-network.png", "Resort lifestyle", "Paradise Valley"],
      ["/images/scottsdale.jpg", "Golden hour portrait", "Scottsdale"],
    ],
  },
];

const referenceModelNames = [
  "Amara Vale",
  "Sienna Brooks",
  "Nova Hart",
  "Camille Stone",
  "Lena Marlowe",
  "Isla Reed",
  "Zoe Laurent",
  "Maya Rowe",
  "Aria Quinn",
  "Naomi Vega",
  "Jade Monroe",
  "Talia West",
  "Eva Sinclair",
  "Nia Bennett",
  "Lucia Ray",
  "Skye Morgan",
  "Brielle Cruz",
  "Layla James",
  "Celine Foster",
  "Ayla Rose",
  "Rhea Coleman",
  "Mila Santos",
  "Ivy Mercer",
  "Noelle Banks",
];

const referenceLocations = [
  "Phoenix, AZ",
  "Los Angeles, CA",
  "Miami, FL",
  "Las Vegas, NV",
  "Scottsdale, AZ",
  "San Diego, CA",
];

profileSeeds.push(
  ...referenceModelNames.map((name, index) => {
    const number = String(index + 1).padStart(2, "0");
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const imagePath = `/images/models/model-${number}.jpg`;
    const tier = index % 7 === 0 ? "pro" : index % 3 === 0 ? "creator" : "profile";
    return {
      values: [
        slug,
        name,
        "model",
        referenceLocations[index % referenceLocations.length],
        imagePath,
        index % 4 !== 1,
        tier,
        `${name} is a fashion and lifestyle model focused on collaborative editorial, swim, beauty, and destination work.`,
        2 + (index % 8),
        `${5 + (index % 2)}′${7 + (index % 5)}″`,
        null,
        index % 3 === 0 ? "Black" : index % 3 === 1 ? "Blonde" : "Brown",
        index % 2 === 0 ? "Brown" : "Hazel",
        index % 2 === 0
          ? ["Editorial", "Swim", "Lifestyle"]
          : ["Beauty", "Commercial", "Fashion"],
        null,
      ],
      shots: [[imagePath, `${name} portfolio portrait`, "Model Escape reference collection"]],
    };
  }),
);

try {
  const demoPasswordHash = await hashPassword(seedPassword);

  for (const values of eventSeeds) {
    await pool.query(
      `insert into events
        (slug, title, category, location, summary, description, image_path, starts_at, ends_at, venue, price_cents, included, requirements, capacity, spots_remaining, is_featured)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14, $15, $16)
       on conflict (slug) do update set
        title = excluded.title,
        category = excluded.category,
        location = excluded.location,
        summary = excluded.summary,
        description = excluded.description,
        image_path = excluded.image_path,
        starts_at = excluded.starts_at,
        ends_at = excluded.ends_at,
        venue = excluded.venue,
        price_cents = excluded.price_cents,
        included = excluded.included,
        requirements = excluded.requirements,
        capacity = excluded.capacity,
        spots_remaining = excluded.spots_remaining,
        is_featured = excluded.is_featured,
        updated_at = now()`,
      [...values.slice(0, 11), JSON.stringify(values[11]), JSON.stringify(values[12]), ...values.slice(13)],
    );
  }

  for (const [profileIndex, profile] of profileSeeds.entries()) {
    const slug = profile.values[0];
    const socialHandle = `modelescape_${slug.replaceAll("-", "_")}`;
    const isPremiumBlur =
      profile.values[6] === "pro" && profileIndex % 2 === 0;
    const demoEmail = `${slug}@demo.modelescape.local`;
    const memberResult = await pool.query(
      `insert into members
        (email, username, name, password_hash, primary_role, home_market, email_verified_at, admin_approved_at)
       values ($1, $2, $3, $4, $5::proposal_role, $6, now(), now())
       on conflict (email) do update set
        username = excluded.username,
        name = excluded.name,
        password_hash = excluded.password_hash,
        primary_role = excluded.primary_role,
        home_market = excluded.home_market,
        email_verified_at = coalesce(members.email_verified_at, now()),
        admin_approved_at = coalesce(members.admin_approved_at, now()),
        updated_at = now()
       returning id`,
      [
        demoEmail,
        profile.values[1].split(/\s+/)[0].toLowerCase(),
        profile.values[1],
        demoPasswordHash,
        profile.values[2],
        profile.values[3],
      ],
    );
    const memberId = memberResult.rows[0].id;
    const result = await pool.query(
      `insert into profiles
        (slug, name, role, location, image_path, is_available, membership_tier, bio, experience_years, height, measurements, hair_color, eye_color, specialties, portfolio_url, x_url, instagram_url, youtube_url, onlyfans_url, custom_url, is_premium_blur, member_id, is_verified)
       values ($1, $2, $3::member_role, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16, $17, $18, $19, $20, $21, $22, false)
       on conflict (member_id) do update set
        slug = excluded.slug,
        name = excluded.name,
        role = excluded.role,
        location = excluded.location,
        image_path = excluded.image_path,
        is_available = excluded.is_available,
        membership_tier = excluded.membership_tier,
        bio = excluded.bio,
        experience_years = excluded.experience_years,
        height = excluded.height,
        measurements = excluded.measurements,
        hair_color = excluded.hair_color,
        eye_color = excluded.eye_color,
        specialties = excluded.specialties,
        portfolio_url = excluded.portfolio_url,
        x_url = excluded.x_url,
        instagram_url = excluded.instagram_url,
        youtube_url = excluded.youtube_url,
        onlyfans_url = excluded.onlyfans_url,
        custom_url = excluded.custom_url,
        is_premium_blur = excluded.is_premium_blur,
        member_id = excluded.member_id,
        updated_at = now()
       returning id`,
      [
        ...profile.values.slice(0, 13),
        JSON.stringify(profile.values[13]),
        profile.values[14],
        profileIndex % 2 === 0 ? `https://x.com/${socialHandle}` : null,
        profileIndex % 5 !== 0 ? `https://instagram.com/${socialHandle}` : null,
        profileIndex % 3 === 0 ? `https://youtube.com/@${socialHandle}` : null,
        profile.values[6] !== "profile" && profileIndex % 2 === 1
          ? `https://onlyfans.com/${socialHandle}`
          : null,
        profile.values[14] || (profileIndex % 4 === 0 ? `https://example.com/${slug}` : null),
        isPremiumBlur,
        memberId,
      ],
    );
    const profileId = result.rows[0].id;
    for (const [index, shot] of profile.shots.entries()) {
      await pool.query(
        `insert into portfolio_items
          (profile_id, image_path, caption, credit, sort_order)
         values ($1, $2, $3, $4, $5)
         on conflict (profile_id, image_path) do update set
          caption = excluded.caption,
          credit = excluded.credit,
          sort_order = excluded.sort_order`,
        [profileId, ...shot, index],
      );
    }
  }

  const promoterResult = await pool.query(
    `insert into members
      (email, username, name, password_hash, primary_role, home_market, country_code, state_code, city, email_verified_at, admin_approved_at)
     values ($1, $2, $3, $4, 'host', $5, 'US', 'FL', 'Miami', now(), now())
     on conflict (email) do update set
      username = excluded.username,
      name = excluded.name,
      password_hash = excluded.password_hash,
      primary_role = excluded.primary_role,
      home_market = excluded.home_market,
      country_code = excluded.country_code,
      state_code = excluded.state_code,
      city = excluded.city,
      email_verified_at = now(),
      admin_approved_at = now(),
      updated_at = now()
     returning id`,
    [
      "babes@demo.modelescape.local",
      "babes",
      "Babes in Toyland Charity",
      demoPasswordHash,
      "Miami, FL, United States",
    ],
  );
  const promoterId = promoterResult.rows[0].id;
  const organizerResult = await pool.query(
    `insert into members
      (email, username, name, password_hash, primary_role, home_market, country_code, state_code, city, organization, bio, website_url, email_verified_at, admin_approved_at)
     values ($1, 'olivia', 'Olivia Hart', $2, 'host', 'Scottsdale, AZ, United States', 'US', 'AZ', 'Scottsdale', 'Hart Creative Productions', $3, 'https://example.com/hart-creative', now(), now())
     on conflict (email) do update set
      username = excluded.username,
      name = excluded.name,
      password_hash = excluded.password_hash,
      primary_role = excluded.primary_role,
      home_market = excluded.home_market,
      country_code = excluded.country_code,
      state_code = excluded.state_code,
      city = excluded.city,
      organization = excluded.organization,
      bio = excluded.bio,
      website_url = excluded.website_url,
      email_verified_at = now(),
      admin_approved_at = now(),
      updated_at = now()
     returning id`,
    [
      "olivia@demo.modelescape.local",
      demoPasswordHash,
      "Event host coordinating editorial teams, permits, schedules, and participant outcomes.",
    ],
  );
  const organizerId = organizerResult.rows[0].id;
  await pool.query(
    `update events
     set owner_id = $1, updated_at = now()
     where slug = 'desert-light-editorial'`,
    [organizerId],
  );
  const miamiPaths = [
    { type: "model", enabled: true, title: "Attending model", description: "Join the hosted fashion and charity experience.", priceCents: 35000, capacity: 20, approvalRequired: true },
    { type: "photographer", enabled: true, title: "Event photographer", description: "Apply for an approved photography credential.", priceCents: 45000, capacity: 10, approvalRequired: true },
    { type: "sponsor", enabled: true, title: "Brand sponsor", description: "Support the charity event with funding, product, or hospitality.", priceCents: 150000, capacity: 8, approvalRequired: true },
    { type: "attendee", enabled: true, title: "White Party guest", description: "Attend the Miami networking and charity evening.", priceCents: 12500, capacity: 150, approvalRequired: false },
  ];
  const miamiEventResult = await pool.query(
    `insert into events
      (owner_id, slug, title, category, location, country_code, state_code, city, summary, description, image_path, starts_at, ends_at, venue, price_cents, refund_days_before, participation_paths, included, requirements, capacity, spots_remaining, is_featured)
     values ($1, 'the-miami-white-party', 'The Miami White Party', 'Networking mixer', 'Miami, FL, United States', 'US', 'FL', 'Miami', $2, $3, '/images/poolside-network.png', '2027-05-15T18:00:00-04:00', '2027-05-16T00:00:00-04:00', 'Private Miami waterfront venue', 12500, 4, $4::jsonb, $5::jsonb, $6::jsonb, 188, 188, true)
     on conflict (slug) do update set
      owner_id = excluded.owner_id,
      participation_paths = excluded.participation_paths,
      refund_days_before = excluded.refund_days_before,
      updated_at = now()
     returning id`,
    [
      promoterId,
      "A polished all-white charity evening bringing models, photographers, sponsors, and guests together in Miami.",
      "Babes in Toyland Charity presents a waterfront White Party with fashion moments, sponsor activations, photography, fundraising, and curated networking.",
      JSON.stringify(miamiPaths),
      JSON.stringify(["Charity program", "Sponsor activations", "Networking", "Hosted photography"]),
      JSON.stringify(["All-white attire", "Government-issued identification", "Professional conduct"]),
    ],
  );
  const miamiEventId = miamiEventResult.rows[0].id;

  const sponsorSeeds = [
    ["fhm", "FHM", "Media", "/logos/fhm.svg", "https://www.fhm.com", "partnerships@fhm.example", "Media partner supporting editorial coverage, talent visibility, and campaign storytelling."],
    ["glow-beauty-labs", "Glow Beauty Labs", "Beauty", null, "https://example.com/glow", "partners@glow.example", "Beauty brand partnering on glam teams, product integrations, and creator campaigns."],
    ["vista-resorts", "Vista Resorts", "Hospitality", null, "https://example.com/vista", "events@vista.example", "Hospitality partner supporting destination productions, stays, and private venues."],
    ["apex-camera-co", "Apex Camera Co.", "Photography", null, "https://example.com/apex", "sponsors@apex.example", "Photography partner providing production equipment and creator education."],
  ];
  const sponsorDetails = {
    fhm: ["Jordan Lee", "+1 305 555 0140", "Diamond", "Featured media partner, event hero, and press wall"],
    "glow-beauty-labs": ["Camila Torres", "+1 305 555 0184", "Gold", "Beauty preparation area and event gallery"],
    "vista-resorts": ["Morgan Reed", "+1 305 555 0128", "Platinum", "Destination and venue sections"],
    "apex-camera-co": ["Avery Brooks", "+1 602 555 0172", "Silver", "Photographer area and production credits"],
  };
  for (const sponsor of sponsorSeeds) {
    const sponsorResult = await pool.query(
      `insert into sponsors (slug, name, category, logo_path, website_url, contact_email, description, location)
       values ($1, $2, $3, $4, $5, $6, $7, 'Miami, FL, United States')
       on conflict (slug) do update set
        name = excluded.name,
        category = excluded.category,
        logo_path = excluded.logo_path,
        website_url = excluded.website_url,
        contact_email = excluded.contact_email,
        description = excluded.description,
        location = excluded.location,
        updated_at = now()
       returning id`,
      sponsor,
    );
    const details = sponsorDetails[sponsor[0]];
    await pool.query(
      `update sponsors set
        contact_name = $2,
        contact_phone = $3,
        sponsor_level = $4,
        preferred_placement = $5,
        preferred_logo_size = 'Equal partner sizing; preserve clear space around logo',
        brand_guidelines = 'Use the supplied full-color logo on a neutral background. Do not stretch, recolor, crop, or add effects.',
        logo_usage_approved = true,
        sponsorship_starts_on = '2026-07-01',
        sponsorship_ends_on = '2027-06-30',
        required_wording = case when slug = 'fhm' then 'Featured media partner: FHM.' else 'Official Model Escape event partner.' end,
        tracking_url = website_url,
        updated_at = now()
       where id = $1`,
      [sponsorResult.rows[0].id, ...details],
    );
    const sponsorMemberResult = await pool.query(
      `insert into members
        (email, username, name, password_hash, primary_role, home_market, country_code, state_code, city, organization, bio, website_url, email_verified_at, admin_approved_at)
       values ($1, $2, $3, $4, 'sponsor', 'Miami, FL, United States', 'US', 'FL', 'Miami', $5, $6, $7, now(), now())
       on conflict (email) do update set
        username = excluded.username,
        name = excluded.name,
        password_hash = excluded.password_hash,
        primary_role = excluded.primary_role,
        organization = excluded.organization,
        bio = excluded.bio,
        website_url = excluded.website_url,
        email_verified_at = now(),
        admin_approved_at = now(),
        updated_at = now()
       returning id`,
      [
        sponsor[5],
        sponsor[0].split("-")[0],
        `${sponsor[1]} Partnerships`,
        demoPasswordHash,
        sponsor[1],
        sponsor[6],
        sponsor[4],
      ],
    );
    await pool.query(
      `insert into sponsor_members (sponsor_id, member_id, permission)
       values ($1, $2, 'owner')
       on conflict (member_id) do update set
        sponsor_id = excluded.sponsor_id,
        permission = excluded.permission`,
      [sponsorResult.rows[0].id, sponsorMemberResult.rows[0].id],
    );
    await pool.query(
      `insert into event_sponsors (event_id, sponsor_id, level, contribution)
       values ($1, $2, $3, $4)
       on conflict (event_id, sponsor_id) do update set
        level = excluded.level,
        contribution = excluded.contribution`,
      [
        miamiEventId,
        sponsorResult.rows[0].id,
        sponsor[0] === "fhm" ? "Media partner" : "Supporting sponsor",
        sponsor[0] === "fhm" ? "Editorial media coverage" : "Event production support",
      ],
    );
  }

  await pool.query(
    `insert into sponsorship_requests
      (event_id, sponsor_id, requester_member_id, direction, message, status)
     select $1, s.id, $2, 'promoter_to_sponsor',
       'We would like FHM to join The Miami White Party as the featured media partner, with editorial coverage and an on-site branded activation.',
       'pending'
     from sponsors s
     where s.slug = 'fhm'
       and not exists (
         select 1 from sponsorship_requests sr
         where sr.event_id = $1 and sr.sponsor_id = s.id and sr.status = 'pending'
       )`,
    [miamiEventId, promoterId],
  );

  await pool.query(
    `insert into collaboration_requests
      (sender_member_id, recipient_member_id, event_id, subject, message, status)
     select $1, p.member_id, $2, 'Model invitation for The Miami White Party',
       'We would like to discuss a confirmed model placement for the Miami White Party, including the call time, compensation, wardrobe brief, and sponsor deliverables.',
       'pending'
     from profiles p
     where p.slug = 'amara-vale'
       and not exists (
         select 1 from collaboration_requests cr
         where cr.sender_member_id = $1 and cr.recipient_member_id = p.member_id and cr.event_id = $2
       )`,
    [promoterId, miamiEventId],
  );

  await pool.query(
    `insert into collaboration_requests
      (sender_member_id, recipient_member_id, event_id, kind, subject, message, status)
     select conversation.sender_id, conversation.recipient_id, conversation.event_id, 'event_invite',
       conversation.subject, conversation.message, 'accepted'
     from (
       select $1::uuid as sender_id, p.member_id as recipient_id, $2::uuid as event_id,
         'Miami campaign photography' as subject,
         'Alex, are you available to photograph the sponsor arrivals and editorial portraits?' as message
       from profiles p where p.slug = 'alex-chen'
       union all
       select $3::uuid, p.member_id, $4::uuid,
         'Phoenix creative production',
         'Maya, I would like to discuss a model placement for an upcoming Phoenix production.'
       from profiles p where p.slug = 'maya-rowe'
     ) conversation
     where not exists (
       select 1 from collaboration_requests existing
       where existing.sender_member_id = conversation.sender_id
         and existing.recipient_member_id = conversation.recipient_id
         and existing.subject = conversation.subject
     )`,
    [promoterId, miamiEventId, organizerId, miamiEventId],
  );
  await pool.query(
    `insert into collaboration_messages (request_id, sender_member_id, body, created_at)
     select request.id, message.sender_id, message.body, now() - message.age
     from collaboration_requests request
     cross join lateral (
       values
         (request.recipient_member_id, 'Thanks for reaching out. Please send the creative brief and confirmed call time.', interval '2 hours'),
         (request.sender_member_id, 'Absolutely. I will share the call sheet here and keep the full conversation in one place.', interval '1 hour')
     ) as message(sender_id, body, age)
     where request.subject in ('Miami campaign photography', 'Phoenix creative production')
       and not exists (select 1 from collaboration_messages existing where existing.request_id = request.id)`,
  );

  await pool.query(
    `insert into event_participations
      (event_id, member_id, path_type, status, applicant_name, applicant_email, note, price_cents)
     select e.id, selected.id, 'model', 'confirmed', selected.name, selected.email,
       'Seeded attending model for the local event preview.', 0
     from events e
     cross join lateral (
       select m.id, m.name, m.email
       from members m
       where m.primary_role = 'model'
       order by md5(e.id::text || m.id::text)
       limit 4
     ) selected
     on conflict (event_id, member_id, path_type) do update set
      status = 'confirmed',
      applicant_name = excluded.applicant_name,
      applicant_email = excluded.applicant_email,
      updated_at = now()`,
  );

  const completedEventResult = await pool.query(
    `insert into events
      (owner_id, slug, title, category, location, country_code, state_code, city, summary, description, image_path, starts_at, ends_at, venue, price_cents, refund_days_before, participation_paths, included, requirements, capacity, spots_remaining, is_featured, is_published)
     values ($1, 'completed-creative-review-demo', 'Completed Creative Review Demo', 'Editorial', 'Phoenix, AZ, United States', 'US', 'AZ', 'Phoenix',
       'A completed private production used to demonstrate verified collaboration ratings.',
       'This unpublished local event provides confirmed collaboration history for the ratings workflow.',
       '/images/desert-production.png', '2025-03-08T09:00:00-07:00', '2025-03-08T18:00:00-07:00',
       'Private Phoenix studio', 0, 4, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 8, 0, false, false)
     on conflict (slug) do update set owner_id = excluded.owner_id, updated_at = now()
     returning id`,
    [organizerId],
  );
  const completedEventId = completedEventResult.rows[0].id;
  await pool.query(
    `insert into event_participations
      (event_id, member_id, path_type, status, applicant_name, applicant_email, note, price_cents)
     select $1, p.member_id, case when p.role = 'photographer' then 'photographer' else 'model' end, 'confirmed', m.name, m.email, '', 0
       from profiles p join members m on m.id = p.member_id
      where p.slug in ('amara-vale', 'naomi-vega', 'maya-rowe', 'alex-chen')
     on conflict (event_id, member_id, path_type) do update set status = 'confirmed', updated_at = now()`,
    [completedEventId],
  );
  await pool.query(
    `insert into member_reviews
      (event_id, reviewer_member_id, reviewed_member_id, overall_rating, reliability_rating, professionalism_rating, would_work_again, no_show, comment)
     select $1, reviewer.id, target.id, values.overall, values.reliability, values.professionalism, values.work_again, values.no_show, values.comment
       from (values
         ('olivia', 'amara-vale', 10, 10, 10, true, false, 'Prepared, communicative, and professional.'),
         ('maya', 'amara-vale', 10, 10, 10, true, false, 'Strong collaborator.'),
         ('alex', 'amara-vale', 8, 10, 8, true, false, 'Reliable on set.'),
         ('olivia', 'maya-rowe', 6, 6, 6, true, false, 'Average overall: completed the brief and delivered acceptable work.'),
         ('olivia', 'naomi-vega', 2, 2, 2, false, true, 'Did not arrive for the confirmed call time and was rude when the host followed up.'),
         ('maya', 'naomi-vega', 4, 2, 4, false, false, 'Repeatedly late to replies and difficult to work with.'),
         ('alex', 'naomi-vega', 4, 2, 4, false, false, 'Creative potential, but unreliable timing and unprofessional communication.'),
         ('olivia', 'alex-chen', 10, 10, 10, true, false, 'Excellent photographer: prepared, calm on set, and delivered strong work on schedule.')
       ) as values(reviewer_slug, target_slug, overall, reliability, professionalism, work_again, no_show, comment)
       join members reviewer on reviewer.username = values.reviewer_slug
       join profiles target_profile on target_profile.slug = values.target_slug
       join members target on target.id = target_profile.member_id
     on conflict (event_id, reviewer_member_id, reviewed_member_id) do update set
       overall_rating = excluded.overall_rating,
       reliability_rating = excluded.reliability_rating,
       professionalism_rating = excluded.professionalism_rating,
       would_work_again = excluded.would_work_again,
       no_show = excluded.no_show,
       comment = excluded.comment,
       updated_at = now()`,
    [completedEventId],
  );

  await pool.query(
    `update members
     set username = coalesce(username, lower(regexp_replace(split_part(name, ' ', 1), '[^a-zA-Z0-9]', '', 'g'))),
         password_hash = $1,
         updated_at = now()
     where deleted_at is null`,
    [demoPasswordHash],
  );

  await pool.query(
    `insert into admin_accounts (username, password_hash, is_active)
     values ($1, $2, true)
     on conflict (username) do update set
      password_hash = excluded.password_hash,
      is_active = true,
      updated_at = now()`,
    ["admin", await hashPassword(seedPassword)],
  );

  console.log("Database seed data is current.");
} finally {
  await pool.end();
}
