#!/usr/bin/env node
/**
 * Hace idempotentes los archivos SQL de drizzle:
 * - CREATE TABLE -> CREATE TABLE IF NOT EXISTS
 * - CREATE TYPE -> DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;
 * - ALTER TABLE ADD CONSTRAINT -> DO $$ BEGIN IF NOT EXISTS (pg_constraint) THEN ... END IF; END $$;
 * - ALTER TABLE ADD COLUMN -> ALTER TABLE ADD COLUMN IF NOT EXISTS (PostgreSQL 9.5+)
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const drizzleDir = join(__dirname, "..", "drizzle");

const journalPath = join(drizzleDir, "meta", "_journal.json");
const journal = JSON.parse(readFileSync(journalPath, "utf8"));
const tags = journal.entries.map((e) => e.tag);

function transformStatement(stmt) {
  let s = stmt;

  // CREATE TABLE "name" -> CREATE TABLE IF NOT EXISTS "name"
  if (s.match(/^CREATE TABLE "/)) {
    s = s.replace(/^CREATE TABLE "/, 'CREATE TABLE IF NOT EXISTS "');
    return s;
  }

  // CREATE TYPE "public"."name" AS ENUM(...); -> DO block
  const createTypeMatch = s.match(/^CREATE TYPE "public"\."([^"]+)" AS ENUM\(([^)]+)\);/);
  if (createTypeMatch) {
    const [, name, values] = createTypeMatch;
    const fullCreate = `CREATE TYPE "public"."${name}" AS ENUM(${values})`;
    return `DO $$ BEGIN ${fullCreate}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`;
  }

  // ALTER TABLE "t" ADD CONSTRAINT "cname" ... -> DO block
  const addConstraintMatch = s.match(/^ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)" (.+);/);
  if (addConstraintMatch) {
    const [, table, constraintName, rest] = addConstraintMatch;
    const alterFull = `ALTER TABLE "${table}" ADD CONSTRAINT "${constraintName}" ${rest}`;
    return `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = '${constraintName}') THEN ${alterFull}; END IF; END $$;`;
  }

  // ALTER TABLE "t" ADD COLUMN "col" -> ADD COLUMN IF NOT EXISTS "col"
  if (s.match(/^ALTER TABLE "[^"]+" ADD COLUMN "/) && !s.includes("ADD COLUMN IF NOT EXISTS")) {
    s = s.replace(/ADD COLUMN "/g, 'ADD COLUMN IF NOT EXISTS "');
    return s;
  }

  return s;
}

function processFile(content) {
  const parts = content.split(/(--> statement-breakpoint\n?)/);
  const result = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].match(/--> statement-breakpoint/)) {
      result.push(parts[i]);
      continue;
    }
    const stmt = parts[i].trim();
    if (!stmt) continue;
    const transformed = transformStatement(stmt);
    result.push(transformed + "\n");
  }
  return result.join("");
}

for (const tag of tags) {
  const sqlPath = join(drizzleDir, `${tag}.sql`);
  try {
    const content = readFileSync(sqlPath, "utf8");
    const newContent = processFile(content);
    if (newContent !== content) {
      writeFileSync(sqlPath, newContent, "utf8");
      console.log("Updated:", `${tag}.sql`);
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      console.warn("Skip (not found):", `${tag}.sql`);
    } else {
      throw err;
    }
  }
}

console.log("Done.");
