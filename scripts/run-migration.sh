#!/bin/bash

# Supabase Migration Script
# Run: bash scripts/run-migration.sh

echo "🚀 Starting Supabase migration..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Run migration
echo "📦 Running migration: 20260209000000_add_public_rally_banners.sql"
supabase db push

echo "✅ Migration completed!"
