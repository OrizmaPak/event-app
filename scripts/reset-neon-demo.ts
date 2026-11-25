import { loadEnvFile } from "node:process";
import { Pool } from "@neondatabase/serverless";
import { hashPassword } from "../lib/auth/password";

loadEnvFile(".env.local");

const superAdminEmail = (process.env.SUPERADMIN_EMAIL ?? "superadmin@nasaevent.demo").trim().toLowerCase();
const superAdminPassword = process.env.SUPERADMIN_PASSWORD ?? "Admin123456";
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured");

const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();

try {
  await client.query("begin");
  await client.query(`
    truncate table
      user_sessions,
      auth_tokens,
      support_access_grants,
      notification_deliveries,
      notifications,
      check_ins,
      refunds,
      refund_requests,
      ledger_entries,
      payouts,
      organizer_bank_accounts,
      payment_webhook_events,
      payment_transactions,
      payment_attempts,
      booking_attendees,
      bookings,
      invitations,
      inventory_holds,
      seats,
      layout_objects,
      price_bands,
      ticket_categories,
      registration_questions,
      event_pages,
      events,
      audit_logs,
      event_staff_assignments,
      member_permission_overrides,
      workspace_invitations,
      organizer_members,
      role_permissions,
      roles,
      media_assets,
      background_jobs,
      organizers
    restart identity cascade
  `);
  await client.query("delete from platform_members where user_id in (select id from users where email_normalized <> $1)", [superAdminEmail]);
  await client.query("delete from mfa_factors where user_id in (select id from users where email_normalized <> $1)", [superAdminEmail]);
  await client.query("delete from mfa_recovery_codes where user_id in (select id from users where email_normalized <> $1)", [superAdminEmail]);
  await client.query("delete from mfa_factors where user_id in (select id from users where email_normalized = $1)", [superAdminEmail]);
  await client.query("delete from mfa_recovery_codes where user_id in (select id from users where email_normalized = $1)", [superAdminEmail]);
  await client.query("delete from password_credentials where user_id in (select id from users where email_normalized <> $1)", [superAdminEmail]);
  const deleted = await client.query("delete from users where email_normalized <> $1 returning id", [superAdminEmail]);
  const admin = await client.query("update users set status = 'active', email_verified_at = coalesce(email_verified_at, now()), updated_at = now() where email_normalized = $1 returning id", [superAdminEmail]);
  if (admin.rowCount !== 1) throw new Error(`Super admin account not found: ${superAdminEmail}`);
  const passwordHash = await hashPassword(superAdminPassword);
  await client.query("insert into password_credentials (user_id, password_hash, hash_version, changed_at) values ($1, $2, 1, now()) on conflict (user_id) do update set password_hash = excluded.password_hash, hash_version = 1, changed_at = now()", [admin.rows[0].id, passwordHash]);
  await client.query("insert into platform_members (user_id, role, status, created_at, updated_at) values ($1, 'super_admin', 'active', now(), now()) on conflict (user_id) do update set role = 'super_admin', status = 'active', updated_at = now()", [admin.rows[0].id]);
  await client.query("commit");

  const counts = await client.query(`
    select
      (select count(*) from users) as users,
      (select count(*) from organizers) as organizers,
      (select count(*) from events) as events,
      (select count(*) from bookings) as bookings,
      (select count(*) from invitations) as invitations,
      (select count(*) from platform_members) as platform_members,
      (select string_agg(email, ', ' order by email) from users) as emails
  `);
  console.log(JSON.stringify({ deletedUsers: deleted.rowCount ?? 0, ...counts.rows[0], passwordReset: true }));
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}
