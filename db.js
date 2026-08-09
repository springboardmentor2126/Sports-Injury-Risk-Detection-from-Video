const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

let dbConnection = null;

async function getDb() {
  if (dbConnection) return dbConnection;

  dbConnection = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  return dbConnection;
}

async function initDb() {
  const db = await getDb();

  // Create Users Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('Admin', 'Coach', 'Athlete')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Athletes Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS athletes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NULL,
      name TEXT NOT NULL,
      sport TEXT NOT NULL,
      position TEXT,
      age INTEGER,
      height REAL,
      weight REAL,
      injury_history TEXT,
      status TEXT CHECK(status IN ('Active', 'Rehab', 'Injured')) DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    )
  `);

  // Create Biomechanics Sessions Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS biomechanics_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      athlete_id INTEGER NOT NULL,
      test_type TEXT NOT NULL,
      session_date TEXT NOT NULL,
      knee_valgus_angle REAL,
      ground_contact_time REAL,
      symmetry_index REAL,
      hip_flexion_angle REAL,
      peak_force REAL,
      injury_risk_score REAL,
      risk_level TEXT CHECK(risk_level IN ('Low', 'Medium', 'High')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (athlete_id) REFERENCES athletes (id) ON DELETE CASCADE
    )
  `);

  // Seed default data if users table is empty
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    console.log('Seeding database with default users, athletes, and biomechanics sessions...');

    // Hash passwords
    const adminHash = await bcrypt.hash('admin123', 10);
    const coachHash = await bcrypt.hash('coach123', 10);
    const athleteHash = await bcrypt.hash('athlete123', 10);

    // Seed users
    const adminUser = await db.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Dr. Sarah Miller', 'admin@sportsbiomech.com', adminHash, 'Admin']
    );

    const coachUser = await db.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Coach Robert Vance', 'coach@sportsbiomech.com', coachHash, 'Coach']
    );

    const athleteUser = await db.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Sarah Jenkins', 'athlete@sportsbiomech.com', athleteHash, 'Athlete']
    );

    // Seed athletes
    const sarahProfile = await db.run(
      `INSERT INTO athletes (user_id, name, sport, position, age, height, weight, injury_history, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [athleteUser.lastID, 'Sarah Jenkins', 'Soccer', 'Midfielder', 22, 170, 62, 'Mild left ankle sprain (6 months ago)', 'Active']
    );

    const marcusProfile = await db.run(
      `INSERT INTO athletes (user_id, name, sport, position, age, height, weight, injury_history, status) 
       VALUES (NULL, 'Marcus Carter', 'Basketball', 'Guard', 24, 192, 88, 'Right patellar tendinitis (active rehab)', 'Rehab')`
    );

    const elenaProfile = await db.run(
      `INSERT INTO athletes (user_id, name, sport, position, age, height, weight, injury_history, status) 
       VALUES (NULL, 'Elena Rostova', 'Track & Field', 'Sprinter', 20, 165, 55, 'Left ACL reconstruction surgery (9 months ago)', 'Injured')`
    );

    // Seed biomechanics sessions (using real metrics for prediction demonstration)
    // Sarah Jenkins (Low-to-Medium risk)
    await db.run(
      `INSERT INTO biomechanics_sessions (athlete_id, test_type, session_date, knee_valgus_angle, ground_contact_time, symmetry_index, hip_flexion_angle, peak_force, injury_risk_score, risk_level, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sarahProfile.lastID, 'Drop Jump Landing', '2026-05-10', 8.5, 210, 94.5, 68, 1200, 18, 'Low', 'Good dynamic knee alignment. Symmetrical landing mechanics. Trace ankle stiffness noted.']
    );

    await db.run(
      `INSERT INTO biomechanics_sessions (athlete_id, test_type, session_date, knee_valgus_angle, ground_contact_time, symmetry_index, hip_flexion_angle, peak_force, injury_risk_score, risk_level, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sarahProfile.lastID, 'Drop Jump Landing', '2026-07-15', 12.0, 225, 91.2, 62, 1350, 31, 'Low', 'Slight increase in knee valgus loading when fatigued. Symmetry is stable at 91%.']
    );

    // Marcus Carter (Medium risk - Patellar Tendonitis Rehab)
    await db.run(
      `INSERT INTO biomechanics_sessions (athlete_id, test_type, session_date, knee_valgus_angle, ground_contact_time, symmetry_index, hip_flexion_angle, peak_force, injury_risk_score, risk_level, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [marcusProfile.lastID, 'Drop Jump Landing', '2026-08-01', 15.8, 255, 84.8, 54, 1800, 58, 'Medium', 'Exhibits mild bilateral knee collapse (valgus). Landing asymmetry present; favors left side (rehab side is right). Recommended hamstring and hip abductor activation.']
    );

    // Elena Rostova (High risk - Post ACL Rehab/Return to play assessment)
    await db.run(
      `INSERT INTO biomechanics_sessions (athlete_id, test_type, session_date, knee_valgus_angle, ground_contact_time, symmetry_index, hip_flexion_angle, peak_force, injury_risk_score, risk_level, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [elenaProfile.lastID, 'Drop Jump Landing', '2026-08-05', 21.4, 290, 72.3, 44, 2100, 86, 'High', 'Critical risk metrics detected. Severe knee valgus on landing (left side collapse >20°). Left leg unloading (Limb Symmetry is very low at 72.3%). Restrict return-to-play. Recommend immediate biomechanical corrective program targeting landing mechanics and quadriceps-hamstring balance.']
    );

    console.log('Database seeded successfully!');
  }
}

module.exports = {
  getDb,
  initDb
};
