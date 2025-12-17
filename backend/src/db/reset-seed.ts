import { db } from '../config/db';
import {
  agencies,
  agencyUsers,
  clients,
  clientUsers,
  opportunities,
  clientOpportunityStatus,
  followUpTasks,
  restoreRequests,
} from './schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import bcryptjs from 'bcryptjs';

async function resetSeed() {
  try {
    logger.info('Starting database reset and reseed...');

    const agencyId = 'agency_aopr';

    // Delete in order of dependencies (child tables first)
    logger.info('Deleting existing data...');

    // Delete restore requests
    await db.delete(restoreRequests).where(eq(restoreRequests.agency_id, agencyId));
    logger.info('Restore requests deleted');

    // Delete QA messages and conversations (using raw SQL since tables may exist in DB but not schema)
    try {
      await db.execute(sql`DELETE FROM qa_messages WHERE conversation_id IN (SELECT id FROM qa_conversations WHERE agency_id = ${agencyId})`);
      await db.execute(sql`DELETE FROM qa_conversations WHERE agency_id = ${agencyId}`);
      logger.info('QA conversations deleted');
    } catch (e) {
      logger.info('No QA tables to clean or already empty');
    }

    // Delete ALL opportunity_chats for this agency (using raw SQL)
    try {
      await db.execute(sql`DELETE FROM opportunity_chat_messages WHERE chat_id IN (
        SELECT oc.id FROM opportunity_chats oc
        JOIN opportunities o ON oc.opportunity_id = o.id
        WHERE o.agency_id = ${agencyId}
      )`);
    } catch (e) {
      logger.info('No opportunity_chat_messages table or no data');
    }
    try {
      await db.execute(sql`DELETE FROM opportunity_chats WHERE opportunity_id IN (
        SELECT id FROM opportunities WHERE agency_id = ${agencyId}
      )`);
      logger.info('Opportunity chats deleted');
    } catch (e) {
      logger.info('No opportunity_chats table or no data');
    }

    // Delete follow-up tasks
    await db.delete(followUpTasks).where(eq(followUpTasks.agency_id, agencyId));
    logger.info('Follow-up tasks deleted');

    // Delete client opportunity statuses
    await db.delete(clientOpportunityStatus).where(eq(clientOpportunityStatus.agency_id, agencyId));
    logger.info('Client opportunity statuses deleted');

    // Delete opportunities
    await db.delete(opportunities).where(eq(opportunities.agency_id, agencyId));
    logger.info('Opportunities deleted');

    // Now recreate all the seed data
    logger.info('Recreating seed data...');

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

    logger.info('Agency user updated');

    // Create 26 opportunities (fresh, unassigned)
    const allOpportunities = [
      // 1. Forbes Women Founders Feature
      {
        id: 'opp_forbes_founder',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'Forbes Women Founders Feature',
        summary: 'Feature opportunity in Forbes for women founders in tech and consumer brands. Looking for founders with $1M+ revenue and compelling growth stories.',
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
        ingestion_metadata: { ingested_via: 'manual_form', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Ideal for founder clients with strong revenue story', priority: 'high' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 2. TechCrunch Panel
      {
        id: 'opp_techcrunch_panel',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'TechCrunch Early Stage Panel',
        summary: 'Panel opportunity at TechCrunch Disrupt for founders in growth mode. Topic: "Building Consumer Brands in 2025".',
        source: 'csv_import',
        media_type: 'panel',
        outlet_name: 'TechCrunch',
        opportunity_type: 'Speaking',
        category_tags: JSON.stringify(['panel', 'startup']),
        topic_tags: JSON.stringify(['growth', 'fundraising']),
        industry_tags: JSON.stringify(['tech', 'startups']),
        deadline_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'csv_import', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Great exposure for growth-stage clients', priority: 'medium' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 3. Essence Black Excellence
      {
        id: 'opp_essence_feature',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'Essence Black Excellence Feature',
        summary: 'Feature on Black-owned beauty brands making impact. Annual feature highlighting entrepreneurs who are changing the industry.',
        source: 'manual_form',
        media_type: 'feature_article',
        outlet_name: 'Essence',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['beauty', 'black_owned']),
        topic_tags: JSON.stringify(['entrepreneurship', 'culture']),
        industry_tags: JSON.stringify(['beauty', 'consumer']),
        deadline_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'manual_form', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Perfect for Throne Society and beauty clients', priority: 'high' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 4. BBC Podcast
      {
        id: 'opp_bbc_podcast',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'BBC World Service Podcast Interview',
        summary: 'Podcast interview opportunity about future of sustainable beauty. Global audience of 5M+ listeners.',
        source: 'email_parser',
        media_type: 'podcast',
        outlet_name: 'BBC World Service',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['podcast', 'interview']),
        topic_tags: JSON.stringify(['sustainability', 'innovation']),
        industry_tags: JSON.stringify(['beauty', 'sustainability']),
        deadline_at: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'email_parser', ingested_at: new Date().toISOString() },
        metadata: { notes: 'International exposure opportunity', priority: 'medium' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 5. Vogue Beauty
      {
        id: 'opp_vogue_beauty',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'Vogue Beauty Rising Stars',
        summary: 'Annual feature spotlighting emerging beauty brands. Editorial team seeking innovative products and founder stories.',
        source: 'csv_import',
        media_type: 'feature_article',
        outlet_name: 'Vogue',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['beauty', 'luxury']),
        topic_tags: JSON.stringify(['innovation', 'trends']),
        industry_tags: JSON.stringify(['beauty', 'fashion']),
        deadline_at: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'csv_import', ingested_at: new Date().toISOString() },
        metadata: { notes: 'High-profile placement', priority: 'high' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 6. Business Insider
      {
        id: 'opp_business_insider',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'Business Insider: Brands to Watch 2025',
        summary: 'Feature in BI annual roundup of emerging consumer brands. Focus on DTC success stories.',
        source: 'csv_import',
        media_type: 'feature_article',
        outlet_name: 'Business Insider',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['business', 'dtc']),
        topic_tags: JSON.stringify(['ecommerce', 'growth']),
        industry_tags: JSON.stringify(['consumer', 'tech']),
        deadline_at: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'csv_import', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Good for DTC brands', priority: 'medium' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 7. Good Morning America
      {
        id: 'opp_gma_segment',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'Good Morning America Beauty Segment',
        summary: 'Live TV segment featuring innovative beauty products. 3-minute segment with product demo opportunity.',
        source: 'manual_form',
        media_type: 'tv_appearance',
        outlet_name: 'Good Morning America',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['tv', 'morning_show']),
        topic_tags: JSON.stringify(['beauty', 'products']),
        industry_tags: JSON.stringify(['beauty', 'consumer']),
        deadline_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'manual_form', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Major TV exposure - tight deadline', priority: 'high' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 8. Allure Best of Beauty
      {
        id: 'opp_allure_best',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'Allure Best of Beauty Awards Consideration',
        summary: 'Submit products for Allure Best of Beauty Awards consideration. Industry-leading recognition.',
        source: 'csv_import',
        media_type: 'feature_article',
        outlet_name: 'Allure',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['awards', 'beauty']),
        topic_tags: JSON.stringify(['products', 'recognition']),
        industry_tags: JSON.stringify(['beauty']),
        deadline_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'csv_import', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Prestigious beauty award', priority: 'high' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 9. NPR How I Built This
      {
        id: 'opp_npr_hibt',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'NPR How I Built This Interview',
        summary: 'Podcast interview opportunity on How I Built This with Guy Raz. Looking for compelling founder origin stories.',
        source: 'email_parser',
        media_type: 'podcast',
        outlet_name: 'NPR',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['podcast', 'founder_story']),
        topic_tags: JSON.stringify(['entrepreneurship', 'journey']),
        industry_tags: JSON.stringify(['consumer', 'tech']),
        deadline_at: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'email_parser', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Highly selective - strong founder story needed', priority: 'high' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 10. Refinery29
      {
        id: 'opp_refinery29',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'Refinery29 Unbothered Feature',
        summary: 'Feature in Unbothered vertical celebrating Black beauty founders. Editorial + social amplification.',
        source: 'csv_import',
        media_type: 'feature_article',
        outlet_name: 'Refinery29',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['digital', 'culture']),
        topic_tags: JSON.stringify(['beauty', 'diversity']),
        industry_tags: JSON.stringify(['beauty', 'lifestyle']),
        deadline_at: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'csv_import', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Strong social media presence required', priority: 'medium' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 11. Inc. Magazine
      {
        id: 'opp_inc_30under30',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'Inc. 30 Under 30 Nomination',
        summary: 'Nomination window for Inc. 30 Under 30 list. Requires founder under 30 with significant business traction.',
        source: 'manual_form',
        media_type: 'feature_article',
        outlet_name: 'Inc. Magazine',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['awards', 'recognition']),
        topic_tags: JSON.stringify(['young_founders', 'success']),
        industry_tags: JSON.stringify(['tech', 'consumer']),
        deadline_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'manual_form', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Age requirement: under 30', priority: 'medium' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 12. SXSW Panel
      {
        id: 'opp_sxsw_panel',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'SXSW 2025 Panel: Future of Beauty Tech',
        summary: 'Panel speaker opportunity at SXSW discussing intersection of beauty and technology.',
        source: 'csv_import',
        media_type: 'panel',
        outlet_name: 'SXSW',
        opportunity_type: 'Speaking',
        category_tags: JSON.stringify(['conference', 'panel']),
        topic_tags: JSON.stringify(['beauty_tech', 'innovation']),
        industry_tags: JSON.stringify(['tech', 'beauty']),
        deadline_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'csv_import', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Major conference exposure', priority: 'high' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 13. The Cut
      {
        id: 'opp_thecut_profile',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'The Cut Founder Profile',
        summary: 'In-depth founder profile for The Cut. Looking for unique perspectives on building beauty/fashion brands.',
        source: 'email_parser',
        media_type: 'feature_article',
        outlet_name: 'The Cut',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['profile', 'longform']),
        topic_tags: JSON.stringify(['founder', 'personal_story']),
        industry_tags: JSON.stringify(['beauty', 'fashion']),
        deadline_at: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'email_parser', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Prestigious NY Mag property', priority: 'high' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 14. Glossy Beauty Podcast
      {
        id: 'opp_glossy_podcast',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'Glossy Beauty Podcast Guest',
        summary: 'Guest opportunity on Glossy Beauty Podcast. Industry-focused audience of beauty executives.',
        source: 'csv_import',
        media_type: 'podcast',
        outlet_name: 'Glossy',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['podcast', 'industry']),
        topic_tags: JSON.stringify(['business', 'strategy']),
        industry_tags: JSON.stringify(['beauty']),
        deadline_at: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'csv_import', ingested_at: new Date().toISOString() },
        metadata: { notes: 'B2B focused audience', priority: 'medium' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 15. Today Show
      {
        id: 'opp_today_show',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'Today Show Steals & Deals Feature',
        summary: 'Product feature opportunity on Today Show Steals & Deals segment. High-volume sales opportunity.',
        source: 'manual_form',
        media_type: 'tv_appearance',
        outlet_name: 'Today Show',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['tv', 'product_feature']),
        topic_tags: JSON.stringify(['deals', 'products']),
        industry_tags: JSON.stringify(['consumer', 'beauty']),
        deadline_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'manual_form', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Requires inventory commitment', priority: 'high' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 16. WWD
      {
        id: 'opp_wwd_emerging',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'WWD Emerging Brands Report',
        summary: 'Feature in WWD annual emerging brands report. Trade publication reaching retailers and investors.',
        source: 'csv_import',
        media_type: 'feature_article',
        outlet_name: 'WWD',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['trade', 'business']),
        topic_tags: JSON.stringify(['emerging_brands', 'growth']),
        industry_tags: JSON.stringify(['beauty', 'fashion']),
        deadline_at: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'csv_import', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Industry trade publication', priority: 'medium' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 17. Cosmopolitan
      {
        id: 'opp_cosmo_feature',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'Cosmopolitan Beauty Awards Feature',
        summary: 'Coverage in Cosmo Beauty Awards issue. Mass market reach to millennial audience.',
        source: 'csv_import',
        media_type: 'feature_article',
        outlet_name: 'Cosmopolitan',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['awards', 'mass_market']),
        topic_tags: JSON.stringify(['beauty', 'products']),
        industry_tags: JSON.stringify(['beauty']),
        deadline_at: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'csv_import', ingested_at: new Date().toISOString() },
        metadata: { notes: 'High-reach mass market', priority: 'medium' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 18. Bloomberg
      {
        id: 'opp_bloomberg_profile',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'Bloomberg Businessweek Profile',
        summary: 'Business profile opportunity focusing on brand growth strategy and market positioning.',
        source: 'email_parser',
        media_type: 'feature_article',
        outlet_name: 'Bloomberg Businessweek',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['business', 'finance']),
        topic_tags: JSON.stringify(['strategy', 'growth']),
        industry_tags: JSON.stringify(['consumer', 'business']),
        deadline_at: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'email_parser', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Requires strong financials', priority: 'high' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 19. Afrotech Conference
      {
        id: 'opp_afrotech_speaker',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'AfroTech Conference Keynote',
        summary: 'Keynote speaking opportunity at AfroTech Conference. Theme: Black founders reshaping industries.',
        source: 'manual_form',
        media_type: 'speaking_engagement',
        outlet_name: 'AfroTech',
        opportunity_type: 'Speaking',
        category_tags: JSON.stringify(['conference', 'keynote']),
        topic_tags: JSON.stringify(['tech', 'diversity']),
        industry_tags: JSON.stringify(['tech', 'consumer']),
        deadline_at: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'manual_form', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Highly visible speaking slot', priority: 'high' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 20. Elle
      {
        id: 'opp_elle_future',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'Elle Future of Beauty Feature',
        summary: 'Feature in Elle special issue on future of beauty. Focus on innovation and sustainability.',
        source: 'csv_import',
        media_type: 'feature_article',
        outlet_name: 'Elle',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['magazine', 'fashion']),
        topic_tags: JSON.stringify(['innovation', 'sustainability']),
        industry_tags: JSON.stringify(['beauty', 'fashion']),
        deadline_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'csv_import', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Prestigious fashion publication', priority: 'high' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 21. Entrepreneur Magazine
      {
        id: 'opp_entrepreneur_mag',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'Entrepreneur Magazine Cover Story Consideration',
        summary: 'Cover story consideration for Entrepreneur Magazine. Looking for scalable business stories.',
        source: 'manual_form',
        media_type: 'feature_article',
        outlet_name: 'Entrepreneur',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['cover', 'business']),
        topic_tags: JSON.stringify(['entrepreneurship', 'scaling']),
        industry_tags: JSON.stringify(['business', 'consumer']),
        deadline_at: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'manual_form', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Long lead time - cover opportunity', priority: 'high' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 22. Byrdie
      {
        id: 'opp_byrdie_clean',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'Byrdie Clean Beauty Guide',
        summary: 'Feature in Byrdie annual clean beauty guide. High SEO value for product discovery.',
        source: 'csv_import',
        media_type: 'feature_article',
        outlet_name: 'Byrdie',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['digital', 'clean_beauty']),
        topic_tags: JSON.stringify(['ingredients', 'sustainability']),
        industry_tags: JSON.stringify(['beauty']),
        deadline_at: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'csv_import', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Strong SEO benefits', priority: 'medium' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 23. CNBC Make It
      {
        id: 'opp_cnbc_makeit',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'CNBC Make It Success Story',
        summary: 'Video feature for CNBC Make It series. Focus on founder journey and business milestones.',
        source: 'email_parser',
        media_type: 'tv_appearance',
        outlet_name: 'CNBC',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['video', 'business']),
        topic_tags: JSON.stringify(['success', 'journey']),
        industry_tags: JSON.stringify(['business', 'consumer']),
        deadline_at: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'email_parser', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Video content - high engagement', priority: 'high' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 24. Beauty Independent
      {
        id: 'opp_beautyindependent',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'Beauty Independent Brand Spotlight',
        summary: 'In-depth brand spotlight for Beauty Independent. Trade audience of retailers and buyers.',
        source: 'csv_import',
        media_type: 'feature_article',
        outlet_name: 'Beauty Independent',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['trade', 'indie_beauty']),
        topic_tags: JSON.stringify(['brand_story', 'retail']),
        industry_tags: JSON.stringify(['beauty']),
        deadline_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'csv_import', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Good for retail partnerships', priority: 'medium' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 25. The Breakfast Club
      {
        id: 'opp_breakfast_club',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'The Breakfast Club Interview',
        summary: 'Radio interview opportunity on The Breakfast Club. Massive urban audience reach.',
        source: 'manual_form',
        media_type: 'podcast',
        outlet_name: 'The Breakfast Club',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['radio', 'urban']),
        topic_tags: JSON.stringify(['culture', 'entrepreneurship']),
        industry_tags: JSON.stringify(['consumer', 'lifestyle']),
        deadline_at: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'manual_form', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Major urban radio - compelling founder story needed', priority: 'high' },
        created_at: new Date(),
        updated_at: new Date(),
      },
      // 26. Fast Company
      {
        id: 'opp_fastcompany_innovation',
        agency_id: agencyId,
        created_by_user_id: userId,
        title: 'Fast Company Most Innovative Companies',
        summary: 'Nomination for Fast Company Most Innovative Companies list. Requires demonstrable innovation.',
        source: 'csv_import',
        media_type: 'feature_article',
        outlet_name: 'Fast Company',
        opportunity_type: 'PR',
        category_tags: JSON.stringify(['awards', 'innovation']),
        topic_tags: JSON.stringify(['tech', 'disruption']),
        industry_tags: JSON.stringify(['tech', 'consumer']),
        deadline_at: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000),
        status: 'active',
        visibility: 'internal_only',
        ingestion_metadata: { ingested_via: 'csv_import', ingested_at: new Date().toISOString() },
        metadata: { notes: 'Prestigious innovation recognition', priority: 'high' },
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    await db.insert(opportunities).values(allOpportunities as any);

    logger.info('Fresh opportunities created (unassigned)');

    // Note: Tasks are not created since they require client_id and opportunities are unassigned

    logger.info('Database reset and reseed complete!');
    logger.info('All opportunities are now unassigned and ready for testing.');

  } catch (error) {
    logger.error('Reset seed error', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

resetSeed();
