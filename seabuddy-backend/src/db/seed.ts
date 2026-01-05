import { db, tenants, users, resources } from './index.js';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Seed script to populate the database with sample data
 * Run with: tsx src/db/seed.ts
 */
async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // 1. Create a demo tenant (shipping company)
    const [tenant] = await db.insert(tenants).values({
      name: 'Demo Shipping Co.',
      slug: 'demo-shipping',
      isActive: true,
    }).returning();

    console.log('✅ Created tenant:', tenant.name);

    // 2. Create sample users
    const demoUsers = await db.insert(users).values([
      {
        tenantId: tenant.id,
        email: 'crew@example.com',
        name: 'John Doe',
        role: 'crew',
        shipName: 'SS Pacific Star',
        isActive: true,
      },
      {
        tenantId: tenant.id,
        email: 'admin@example.com',
        name: 'Jane Smith',
        role: 'admin',
        isActive: true,
      },
      {
        tenantId: tenant.id,
        email: 'psych@example.com',
        name: 'Dr. Sarah Johnson',
        role: 'psychologist',
        isActive: true,
      },
    ]).returning();

    console.log('✅ Created users:', demoUsers.map(u => u.name).join(', '));

    // 3. Create sample mental health resources
    const sampleResources = await db.insert(resources).values([
      {
        tenantId: null, // Global resource
        title: 'Managing Stress at Sea',
        description: 'Practical techniques for managing stress during long voyages',
        type: 'article',
        content: `# Managing Stress at Sea

Being at sea for extended periods can be challenging. Here are some proven techniques:

## 1. Maintain a Routine
- Wake up and sleep at consistent times
- Regular exercise, even in small spaces
- Scheduled breaks throughout the day

## 2. Stay Connected
- Video calls with family when possible
- Write in a journal
- Connect with crew members

## 3. Mindfulness Practices
- Deep breathing exercises
- Progressive muscle relaxation
- Gratitude journaling

Remember: It's normal to feel stressed. Reach out for support when needed.`,
        category: 'stress',
        tags: ['stress', 'mental-health', 'coping'],
        offlineAvailable: true,
        estimatedMinutes: 5,
        isPublished: true,
      },
      {
        tenantId: null,
        title: '5-Minute Breathing Exercise',
        description: 'Quick breathing exercise to reduce anxiety and improve focus',
        type: 'exercise',
        content: `# 5-Minute Breathing Exercise

## Instructions

1. Find a comfortable position, sitting or standing
2. Close your eyes or soften your gaze
3. Breathe in slowly through your nose for 4 counts
4. Hold for 4 counts
5. Breathe out slowly through your mouth for 6 counts
6. Repeat for 5 minutes

This exercise activates your parasympathetic nervous system, helping you feel calmer and more focused.`,
        category: 'mindfulness',
        tags: ['breathing', 'anxiety', 'quick-exercise'],
        offlineAvailable: true,
        estimatedMinutes: 5,
        isPublished: true,
      },
      {
        tenantId: null,
        title: 'Sleep Better on Night Watch',
        description: 'Tips for getting quality sleep despite irregular schedules',
        type: 'article',
        content: `# Sleep Better on Night Watch

Working night shifts disrupts your circadian rhythm. Here's how to cope:

## Before Sleep
- Make your cabin as dark as possible
- Use earplugs or white noise
- Avoid caffeine 6 hours before bed
- Light stretching or meditation

## During Night Watch
- Take short breaks
- Stay hydrated
- Use bright light to stay alert
- Healthy snacks, not sugar

## Sleep Hygiene
- Keep cabin cool (60-67°F / 15-19°C)
- Same sleep/wake times daily if possible
- Limit screen time before bed

Quality sleep is essential for mental health and safety at sea.`,
        category: 'sleep',
        tags: ['sleep', 'night-shift', 'health'],
        offlineAvailable: true,
        estimatedMinutes: 7,
        isPublished: true,
      },
      {
        tenantId: tenant.id, // Tenant-specific resource
        title: 'Company Mental Health Resources',
        description: 'Access to professional mental health support',
        type: 'article',
        content: `# Mental Health Support Available to You

## 24/7 Support Hotline
Call: 1-800-CREW-HELP
Available in multiple languages

## Confidential Counseling
- Free sessions with licensed therapists
- Video call or phone
- No questions asked, completely confidential

## On-Board Resources
- Speak with our ship psychologist
- Regular wellness check-ins
- Peer support groups

Your mental health matters. Seeking help is a sign of strength, not weakness.`,
        category: 'support',
        tags: ['support', 'counseling', 'resources'],
        offlineAvailable: true,
        estimatedMinutes: 3,
        isPublished: true,
      },
    ]).returning();

    console.log('✅ Created resources:', sampleResources.length);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\nDemo credentials:');
    console.log('- Crew member: crew@example.com');
    console.log('- Admin: admin@example.com');
    console.log('- Psychologist: psych@example.com');
    console.log(`\nTenant ID: ${tenant.id}`);
    console.log(`First user ID: ${demoUsers[0].id}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
