const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { initializeDatabase, getDb } = require('./schema');

console.log('Seeding Signal database...');

// Initialize fresh database
const dbPath = path.join(__dirname, '..', '..', 'signal.db');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Removed existing database.');
}

initializeDatabase();
const db = getDb();

// --- Users ---
const adminId = uuidv4();
const member1Id = uuidv4();
const member2Id = uuidv4();
const member3Id = uuidv4();

const insertUser = db.prepare(`
  INSERT INTO users (id, email, password_hash, name, role, title, institution_type, linkedin_url, bio)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const hash = (pw) => bcrypt.hashSync(pw, 10);

insertUser.run(adminId, 'admin@signal.com', hash('Signal2025!'), 'Sarah Chen', 'admin',
  'BSA/AML Director', 'Bank', 'https://linkedin.com/in/sarahchen', 'Leading BSA/AML compliance at First National. 15+ years in financial crime prevention.');
insertUser.run(member1Id, 'james@signal.com', hash('Signal2025!'), 'James Whitfield', 'member',
  'Compliance Officer', 'Credit Union', 'https://linkedin.com/in/jameswhitfield', 'Focused on SAR filing quality and exam readiness.');
insertUser.run(member2Id, 'maria@signal.com', hash('Signal2025!'), 'Maria Rodriguez', 'member',
  'AML Analyst', 'Fintech', '', 'Specializing in transaction monitoring and KYC processes for digital banking.');
insertUser.run(member3Id, 'david@signal.com', hash('Signal2025!'), 'David Okafor', 'member',
  'Risk Manager', 'Bank', 'https://linkedin.com/in/davidokafor', 'Risk assessment and regulatory compliance specialist.');

console.log('Created 4 users (1 admin + 3 members)');

// --- Announcements ---
const ann1Id = uuidv4();
const ann2Id = uuidv4();

const insertAnn = db.prepare(`
  INSERT INTO announcements (id, title, body, pinned, author_id, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertAnn.run(ann1Id, 'Welcome to Signal',
  'Welcome to the Signal community! This is a private platform for BSA/AML compliance professionals to share knowledge, discuss best practices, and support each other through regulatory challenges.\n\n**Getting started:**\n- Update your profile in the Member Directory\n- Check out the Vault for key documents and templates\n- Join the conversation in our channels\n\nPlease keep all discussions confidential and professional.',
  1, adminId, '2025-04-01T10:00:00.000Z');

insertAnn.run(ann2Id, 'FinCEN Advisory: Updated SAR Filing Guidance',
  'FinCEN has released updated guidance on SAR narrative best practices. Key changes include:\n\n1. Enhanced requirements for describing suspicious activity patterns\n2. New fields for virtual currency-related filings\n3. Updated thresholds for CTR aggregation\n\nThe full guidance document has been uploaded to the Vault under **SAR Guidance**. Please review before your next filing cycle.',
  0, adminId, '2025-04-05T14:30:00.000Z');

console.log('Created 2 announcements (1 pinned)');

// --- Channels ---
const generalId = uuidv4();
const sarTipsId = uuidv4();

const insertChannel = db.prepare(`
  INSERT INTO channels (id, name, description, created_by) VALUES (?, ?, ?, ?)
`);

insertChannel.run(generalId, 'general', 'General discussion for the Signal community', adminId);
insertChannel.run(sarTipsId, 'sar-tips', 'Tips and best practices for SAR filing', adminId);

console.log('Created 2 channels');

// --- Messages ---
const insertMsg = db.prepare(`
  INSERT INTO messages (id, channel_id, author_id, content, parent_id, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const msg1Id = uuidv4();
const msg2Id = uuidv4();
const msg3Id = uuidv4();
const msg4Id = uuidv4();
const msg5Id = uuidv4();

// General channel
insertMsg.run(msg1Id, generalId, adminId,
  'Welcome everyone! This is our main channel for general BSA/AML discussion. Feel free to share articles, ask questions, or start conversations.',
  null, '2025-04-01T10:05:00.000Z');
insertMsg.run(msg2Id, generalId, member1Id,
  'Thanks Sarah! Glad to be here. Has anyone dealt with the new **FinCEN beneficial ownership** reporting requirements? Looking for implementation tips.',
  null, '2025-04-01T11:20:00.000Z');
insertMsg.run(msg3Id, generalId, member2Id,
  'We just rolled out our CDD updates last month. Happy to share our approach — the biggest challenge was integrating the new data fields into our existing onboarding workflow.',
  msg2Id, '2025-04-01T11:45:00.000Z');

// SAR Tips channel
insertMsg.run(msg4Id, sarTipsId, adminId,
  'Pro tip: When writing SAR narratives, always use the **5 W\'s framework**: Who, What, When, Where, and Why. This ensures your narrative is complete and examiner-friendly.',
  null, '2025-04-02T09:00:00.000Z');
insertMsg.run(msg5Id, sarTipsId, member3Id,
  'Great tip! I\'d add: always include the `dollar amount`, `number of transactions`, and `date range` in the first paragraph. Examiners appreciate being able to quickly assess the scope.',
  null, '2025-04-02T10:15:00.000Z');

// Add some reactions
const insertReaction = db.prepare(
  'INSERT INTO message_reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)'
);
insertReaction.run(uuidv4(), msg1Id, member1Id, '👍');
insertReaction.run(uuidv4(), msg1Id, member2Id, '👍');
insertReaction.run(uuidv4(), msg4Id, member1Id, '🔥');
insertReaction.run(uuidv4(), msg4Id, member2Id, '💡');
insertReaction.run(uuidv4(), msg5Id, adminId, '👍');

console.log('Created sample messages with reactions');

// --- Vault Documents (placeholder files) ---
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const insertDoc = db.prepare(`
  INSERT INTO vault_documents (id, title, description, category, filename, original_name, file_size, mime_type, uploaded_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const placeholderContent = (title) =>
  `This is a placeholder file for: ${title}\n\nIn production, this would be an actual document.`;

const docs = [
  {
    title: 'BSA/AML Risk Assessment Template',
    description: 'Comprehensive risk assessment template covering all BSA/AML risk categories including products, services, customers, and geographic locations.',
    category: 'Risk Assessment',
    originalName: 'bsa-aml-risk-assessment-template.pdf',
  },
  {
    title: 'SAR Narrative Writing Guide',
    description: 'Step-by-step guide for writing effective SAR narratives that meet FinCEN expectations and examiner standards.',
    category: 'SAR Guidance',
    originalName: 'sar-narrative-writing-guide.pdf',
  },
  {
    title: 'Annual BSA Training Presentation',
    description: '2025 annual BSA training slides covering regulatory updates, typologies, and case studies for frontline staff.',
    category: 'Training',
    originalName: 'annual-bsa-training-2025.pdf',
  },
];

docs.forEach((doc) => {
  const id = uuidv4();
  const filename = `${id}.pdf`;
  const content = placeholderContent(doc.title);
  fs.writeFileSync(path.join(uploadsDir, filename), content);

  insertDoc.run(id, doc.title, doc.description, doc.category, filename, doc.originalName, Buffer.byteLength(content), 'application/pdf', adminId);
});

console.log('Created 3 vault documents with placeholder files');
console.log('\nSeed complete! Login with: admin@signal.com / Signal2025!');
