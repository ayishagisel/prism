import { db } from '../config/db';
import {
  agencies,
  agencyUsers,
  clients,
  clientUsers,
  opportunities,
  clientOpportunityStatus,
  followUpTasks,
} from './schema';
import { v4 as uuid } from 'uuid';
import { logger } from '../utils/logger';
import bcryptjs from 'bcryptjs';

export async function seed() {
  try {
    logger.info('Starting database seed...');

    // Create agency
    const agencyId = 'agency_aopr';
    await db
      .insert(agencies)
      .values({
        id: agencyId,
        name: 'Apples & Oranges Public Relations',
        slug: 'apples-and-oranges-pr',
        primary_contact_name: 'Amore Phillip',
        primary_contact_email: 'amore@applesandorangespr.com',
        timezone: 'America/New_York',
        settings: {
          default_opportunity_view: 'pipeline',
          default_client_notification_method: 'email',
          demo_mode_enabled: true,
        },
        metadata: {
          website: 'https://applesandorangespr.com',
          notes: 'Primary tenant for PRISM MVP',
        },
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflictDoNothing();

    logger.info('Agency created');

    // Create agency user
    const userId = 'user_amore';
    const passwordHash = await bcryptjs.hash('throne123', 10);
    await db
      .insert(agencyUsers)
      .values({
        id: userId,
        agency_id: agencyId,
        name: 'Amore Phillip',
        email: 'amore@applesandorangespr.com',
        password_hash: passwordHash,
        role: 'AGENCY_ADMIN',
        status: 'active',
        metadata: {
          title: 'Founder & CEO',
          phone: '+1-555-123-4567',
        },
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: agencyUsers.id,
        set: {
          password_hash: passwordHash,
          updated_at: new Date(),
        },
      });

    logger.info('Agency user created');

    // Create clients
    const clientIds = ['client_throne_society', 'client_nylon', 'client_glow_up'];

    await db
      .insert(clients)
      .values([
        {
          id: clientIds[0],
          agency_id: agencyId,
          name: 'The Throne Society',
          industry: 'Beauty & Wellness',
          primary_contact_name: 'Client Founder',
          primary_contact_email: 'founder@thronesociety.com',
          tags: JSON.stringify(['beauty', 'founder-led', 'ecommerce']),
          media_readiness_flags: {
            has_headshots: true,
            has_bio: true,
            prefers_live_interviews: false,
          },
          status: 'active',
          metadata: {
            notes: 'High-visibility launch focus',
          },
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: clientIds[1],
          agency_id: agencyId,
          name: 'Nylon',
          industry: 'Fashion & Media',
          primary_contact_name: 'Chief Editor',
          primary_contact_email: 'editor@nylon.com',
          tags: JSON.stringify(['fashion', 'media', 'lifestyle']),
          media_readiness_flags: {
            has_headshots: true,
            has_bio: true,
            prefers_live_interviews: true,
          },
          status: 'active',
          metadata: {
            notes: 'Digital-first media outlet',
          },
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: clientIds[2],
          agency_id: agencyId,
          name: 'Glow Up',
          industry: 'Beauty Tech',
          primary_contact_name: 'CEO',
          primary_contact_email: 'ceo@glowup.com',
          tags: JSON.stringify(['beauty', 'tech', 'sustainability']),
          media_readiness_flags: {
            has_headshots: true,
            has_bio: true,
            prefers_live_interviews: false,
          },
          status: 'active',
          metadata: {
            notes: 'Early-stage startup, first media push',
          },
          created_at: new Date(),
          updated_at: new Date(),
        },
      ])
      .onConflictDoNothing();

    logger.info('Clients created');

    // Create client users (for demo login)
    const clientPasswordHash = await bcryptjs.hash('throne123', 10);
    const glowUpPasswordHash = await bcryptjs.hash('shine123', 10);

    // Insert Throne Society client user
    await db
      .insert(clientUsers)
      .values({
        id: 'client_user_throne',
        client_id: clientIds[0], // The Throne Society
        agency_id: agencyId,
        name: 'Demo Client User',
        email: 'client@demo.com',
        password_hash: clientPasswordHash,
        role: 'CLIENT_OWNER',
        status: 'active',
        metadata: {
          title: 'Founder',
          demo_user: true,
        },
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: clientUsers.id,
        set: {
          password_hash: clientPasswordHash,
          updated_at: new Date(),
        },
      });

    // Insert Glow Up client user
    await db
      .insert(clientUsers)
      .values({
        id: 'client_user_glow',
        client_id: clientIds[2], // Glow Up
        agency_id: agencyId,
        name: 'Glow Up CEO',
        email: 'ceo@glowup.com',
        password_hash: glowUpPasswordHash,
        role: 'CLIENT_OWNER',
        status: 'active',
        metadata: {
          title: 'CEO',
        },
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: clientUsers.id,
        set: {
          password_hash: glowUpPasswordHash,
          updated_at: new Date(),
        },
      });

    logger.info('Client users created');

    // Create opportunities
    const opportunityIds = [
      'opp_forbes_founder',
      'opp_techcrunch_panel',
      'opp_essence_feature',
      'opp_bbc_podcast',
    ];

    await db
      .insert(opportunities)
      .values([
        {
          id: opportunityIds[0],
          agency_id: agencyId,
          created_by_user_id: userId,
          title: 'Forbes Women Founders Feature',
          summary: 'Feature opportunity in Forbes for women founders in tech and consumer brands.',
          source: 'manual_form',
          media_type: 'feature_article',
          outlet_name: 'Forbes',
          opportunity_type: 'PR',
          category_tags: JSON.stringify(['women_founders', 'business_feature']),
          topic_tags: JSON.stringify(['entrepreneurship', 'scaling']),
          industry_tags: JSON.stringify(['beauty', 'tech', 'consumer']),
          deadline_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          status: 'active',
          visibility: 'internal_only',
          ingestion_metadata: {
            ingested_via: 'manual_form',
            ingested_at: new Date().toISOString(),
          },
          metadata: {
            notes: 'Ideal for founder clients with strong revenue story',
            priority: 'high',
          },
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: opportunityIds[1],
          agency_id: agencyId,
          created_by_user_id: userId,
          title: 'TechCrunch Early Stage Panel',
          summary: 'Panel opportunity at TechCrunch for founders in growth mode.',
          source: 'csv_import',
          media_type: 'panel',
          outlet_name: 'TechCrunch',
          opportunity_type: 'Event',
          category_tags: JSON.stringify(['startup', 'growth_stage']),
          topic_tags: JSON.stringify(['fundraising', 'scaling']),
          industry_tags: JSON.stringify(['tech', 'startups']),
          deadline_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          status: 'active',
          visibility: 'shared_with_clients',
          ingestion_metadata: {
            ingested_via: 'csv_import',
            ingested_at: new Date().toISOString(),
          },
          metadata: {
            priority: 'medium',
          },
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: opportunityIds[2],
          agency_id: agencyId,
          created_by_user_id: userId,
          title: 'Essence Magazine Cover Feature',
          summary:
            'Cover story opportunity in Essence Magazine focusing on Black women entrepreneurs.',
          source: 'manual_form',
          media_type: 'feature_article',
          outlet_name: 'Essence',
          opportunity_type: 'PR',
          category_tags: JSON.stringify(['women_entrepreneurs', 'cover_story']),
          topic_tags: JSON.stringify(['entrepreneurship', 'diversity']),
          industry_tags: JSON.stringify(['beauty', 'fashion', 'lifestyle']),
          deadline_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          status: 'closed',
          visibility: 'shared_with_clients',
          ingestion_metadata: {
            ingested_via: 'manual_form',
            ingested_at: new Date().toISOString(),
          },
          metadata: {
            priority: 'high',
            notes: 'Strong fit for beauty/lifestyle clients',
          },
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: opportunityIds[3],
          agency_id: agencyId,
          created_by_user_id: userId,
          title: 'BBC Slow Fashion Podcast Episode',
          summary: 'Episode feature on BBC podcast about sustainable fashion and beauty.',
          source: 'manual_form',
          media_type: 'podcast',
          outlet_name: 'BBC',
          opportunity_type: 'PR',
          category_tags: JSON.stringify(['sustainability', 'podcast']),
          topic_tags: JSON.stringify(['eco_friendly', 'fashion']),
          industry_tags: JSON.stringify(['beauty', 'sustainability']),
          deadline_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          status: 'expired',
          visibility: 'internal_only',
          ingestion_metadata: {
            ingested_via: 'manual_form',
            ingested_at: new Date().toISOString(),
          },
          metadata: {
            priority: 'medium',
          },
          created_at: new Date(),
          updated_at: new Date(),
        },
      ])
      .onConflictDoNothing();

    logger.info('Opportunities created');

    // Create client opportunity statuses
    await db
      .insert(clientOpportunityStatus)
      .values([
        {
          id: 'cos_throne_forbes',
          agency_id: agencyId,
          client_id: clientIds[0],
          opportunity_id: opportunityIds[0],
          response_state: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'cos_throne_techcrunch',
          agency_id: agencyId,
          client_id: clientIds[0],
          opportunity_id: opportunityIds[1],
          response_state: 'interested',
          responded_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'cos_glow_essence',
          agency_id: agencyId,
          client_id: clientIds[2],
          opportunity_id: opportunityIds[2],
          response_state: 'accepted',
          responded_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'cos_glow_bbc',
          agency_id: agencyId,
          client_id: clientIds[2],
          opportunity_id: opportunityIds[3],
          response_state: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'cos_nylon_forbes',
          agency_id: agencyId,
          client_id: clientIds[1],
          opportunity_id: opportunityIds[0],
          response_state: 'declined',
          responded_at: new Date(),
          decline_reason: 'Not aligned with current editorial focus',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ])
      .onConflictDoNothing();

    logger.info('Client opportunity statuses created');

    // Create follow-up tasks
    await db
      .insert(followUpTasks)
      .values([
        {
          id: 'task_brief_glow_essence',
          agency_id: agencyId,
          opportunity_id: opportunityIds[2],
          client_id: clientIds[2],
          assigned_to_user_id: userId,
          title: 'Schedule pre-interview briefing with Glow Up CEO',
          description:
            'Align talking points, confirm availability, and share Essence editorial guidelines.',
          due_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          status: 'pending',
          task_type: 'briefing',
          priority: 'high',
          created_by_user_id: 'system_auto',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'task_assets_glow_essence',
          agency_id: agencyId,
          opportunity_id: opportunityIds[2],
          client_id: clientIds[2],
          assigned_to_user_id: userId,
          title: 'Collect Glow Up media assets',
          description: 'Gather professional headshots, CEO bio, company information.',
          due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          status: 'pending',
          task_type: 'asset_collection',
          priority: 'high',
          created_by_user_id: 'system_auto',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'task_followup_throne',
          agency_id: agencyId,
          opportunity_id: opportunityIds[1],
          client_id: clientIds[0],
          assigned_to_user_id: userId,
          title: 'Follow up on TechCrunch panel interest',
          description:
            'Check in with Throne Society on panel opportunity details and availability.',
          due_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          status: 'pending',
          task_type: 'follow_up',
          priority: 'normal',
          created_by_user_id: 'system_auto',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ])
      .onConflictDoNothing();

    logger.info('Follow-up tasks created');

    logger.info('Seed complete!');
  } catch (err) {
    logger.error('Seed failed', err);
    process.exit(1);
  }
}

seed().then(() => process.exit(0));
