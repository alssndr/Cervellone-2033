import { storage } from './storage';
import { normalizeE164 } from '@shared/schema';

const NAMES = [
  'Luca', 'Marco', 'Giulia', 'Sara', 'Paolo', 'Francesco', 'Chiara', 'Marta', 
  'Davide', 'Alessia', 'Stefano', 'Giorgia', 'Simone', 'Alberto', 'Elisa', 
  'Carlo', 'Anna', 'Matteo', 'Ilaria', 'Gabriele', 'Enrico', 'Silvia'
];

const SURNAMES = [
  'Rossi', 'Bianchi', 'Verdi', 'Ferrari', 'Romano', 'Colombo', 'Ricci', 'Marino',
  'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano',
  'Rizzo', 'Lombardi', 'Moretti', 'Barbieri', 'Fontana', 'Santoro'
];

function randomRating(min = 1, max = 5): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function seedPlayers() {
  console.log('🌱 Seeding database with placeholder players...');

  // Create admin user if not exists
  const adminPhone = normalizeE164('+390000000000');
  let admin = await storage.getUserByPhone(adminPhone);
  
  if (!admin) {
    admin = await storage.createUser({
      phone: adminPhone,
      email: 'admin@example.com',
      name: 'Admin',
      surname: 'Sistema',
      role: 'ADMIN',
    });
    console.log('✅ Admin user created');
  }

  // Create 22 placeholder players
  for (let i = 0; i < 22; i++) {
    const phone = normalizeE164(`+39333${String(1000000 + i).slice(-7)}`);
    
    // Check if player already exists
    const existingPlayer = await storage.getPlayerByPhone(phone);
    if (existingPlayer) {
      continue; // Skip if player already exists
    }

    // Create user
    const user = await storage.createUser({
      phone,
      name: NAMES[i % NAMES.length],
      surname: SURNAMES[i % SURNAMES.length],
      role: 'USER',
    });

    // Create player
    const player = await storage.createPlayer({
      userId: user.id,
      name: user.name!,
      surname: user.surname!,
      phone,
      notes: 'Giocatore segnaposto per test',
    });

    // Create random ratings
    await storage.createPlayerRatings({
      playerId: player.id,
      defense: randomRating(),
      attack: randomRating(),
      speed: randomRating(),
      power: randomRating(),
      technique: randomRating(),
      shot: randomRating(),
    });
  }

  const allPlayers = await storage.getAllPlayers();
  console.log(`✅ Seed complete: ${allPlayers.length} players in database`);
}
