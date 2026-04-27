import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

const sampleData = [
  {
    "org_slug": "mn-recovery-hub-central",
    "name": "MN Recovery Hub Central",
    "name_aliases": [
      "Central Support Hub",
      "Recovery Navigator Center"
    ],
    "search_embeddings_text": "MN Recovery Hub Central is the primary navigational node for recovery services in Minnesota. It provides comprehensive peer recovery support, professional recovery coaching training, and community resource mapping. As a non-clinical organization, it focuses on building recovery capital through peer-led advocacy, mutual aid meeting coordination, and systemic navigation assistance.",
    "metadata": {
      "is_assessment_center": false,
      "pathway_tags": [
        "peer-led",
        "all-recovery",
        "non-12-step",
        "harm-reduction"
      ],
      "referral_required": "None / Walk-in",
      "last_verified": "2026-04-27"
    },
    "eligibility": {
      "populations": [
        "individuals-in-recovery",
        "families",
        "allies"
      ],
      "gender_focus": "any",
      "min_age": 0,
      "sober_living_required": false
    },
    "relational_graph": {
      "parent_org": null,
      "child_programs": [
        "peer-navigator-training",
        "hub-support-meetings"
      ],
      "next_step_referrals": [
        "nuway-alliance",
        "wayside-recovery-center"
      ]
    },
    "locations": [
      {
        "label": "Main St. Paul Office",
        "address": "1821 University Ave W, Suite S-100",
        "city": "St. Paul",
        "state": "MN",
        "zip": "55104",
        "coordinates": {
          "lat": 44.9557,
          "lng": -93.1843
        }
      }
    ],
    "contact": {
      "phone": "(612) 584-4158",
      "website": "https://mnrecoveryhub.org"
    }
  }
];

async function runImport() {
  console.log('Inserting sample resource...');
  
  const row = sampleData[0];
  const { data, error } = await supabase.from('resources').insert({
    name: row.name,
    category: row.metadata.pathway_tags[0] || 'Other',
    address: row.locations[0].address,
    phone: row.contact.phone,
    website: row.contact.website,
    description: row.search_embeddings_text,
    status: 'active',
    org_slug: row.org_slug,
    name_aliases: row.name_aliases,
    search_embeddings_text: row.search_embeddings_text,
    metadata: row.metadata,
    eligibility: row.eligibility,
    relational_graph: row.relational_graph,
    locations: row.locations,
    contact: row.contact
  }).select();

  if (error) {
    console.error('Insert error:', error.message);
  } else {
    console.log('Insert SUCCESS:', data);
  }
}

runImport();
