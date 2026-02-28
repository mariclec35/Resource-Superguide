import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

console.log("Supabase URL present:", !!supabaseUrl);
console.log("Supabase Service Key present:", !!supabaseServiceKey);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase configuration");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUser() {
  console.log("Attempting to create admin user: rosesroses1212@gmail.com");
  
  const { data, error } = await supabase.auth.admin.createUser({
    email: "rosesroses1212@gmail.com",
    password: "Lovechris*1212",
    email_confirm: true
  });

  if (error) {
    console.error("Error creating user:");
    console.error(JSON.stringify(error, null, 2));
    process.exit(1);
  }

  console.log("Successfully created user:");
  console.log(JSON.stringify(data.user, null, 2));
}

createUser();
