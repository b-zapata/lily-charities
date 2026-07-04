import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, "..");
const repoDir = path.resolve(appDir, "..", "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(appDir, ".env.local"));
loadEnvFile(path.join(repoDir, ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const managerEmail = process.env.MANAGER_EMAIL;
const managerPassword = process.env.MANAGER_PASSWORD;
const managerName = process.env.MANAGER_NAME;
const managerRole = process.env.MANAGER_ROLE || "manager";

if (!supabaseUrl || !serviceRoleKey || !managerEmail) {
  console.error(
    "Missing required env. Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and MANAGER_EMAIL."
  );
  process.exit(1);
}

if (!["manager", "admin"].includes(managerRole)) {
  console.error("MANAGER_ROLE must be manager or admin.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < perPage) return null;

    page += 1;
  }
}

let user = await findUserByEmail(managerEmail);

if (!user) {
  if (!managerPassword) {
    console.error(
      "No auth user exists for MANAGER_EMAIL. Set MANAGER_PASSWORD to create one, or create the auth user in Supabase first."
    );
    process.exit(1);
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: managerEmail,
    password: managerPassword,
    email_confirm: true,
    user_metadata: {
      display_name: managerName || managerEmail
    }
  });

  if (error) throw error;
  user = data.user;
}

if (!user) {
  console.error("Could not find or create manager auth user.");
  process.exit(1);
}

const { error: profileError } = await supabase.from("profiles").upsert({
  id: user.id,
  display_name: managerName || user.user_metadata?.display_name || user.email || managerEmail,
  email: user.email || managerEmail,
  role: managerRole,
  is_active: true
});

if (profileError) throw profileError;

console.log(`${managerRole} profile ready for ${managerEmail}.`);
