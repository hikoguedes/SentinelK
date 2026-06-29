import User, { hashPassword } from '../models/User';

export async function seedUsers() {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('[Seeder] Usuários já existem no banco de dados. Pulando seeding.');
      return;
    }

    console.log('[Seeder] Banco de dados vazio. Inicializando seeding dos usuários de teste...');

    const defaultUsers = [
      {
        email: 'admin@sentinelk.com',
        name: 'Administrador SentinelK',
        role: 'superadmin' as const,
        password: 'admin123'
      },
      {
        email: 'parceiro@hotel.com',
        name: 'Alpino Resort Manager',
        role: 'partner_manager' as const,
        password: 'partner123'
      },
      {
        email: 'recepcao@restaurante.com',
        name: 'Recepção Alpino',
        role: 'reception' as const,
        password: 'recepcao123'
      }
    ];

    for (const userData of defaultUsers) {
      const passwordHash = hashPassword(userData.password);
      const newUser = new User({
        email: userData.email,
        name: userData.name,
        role: userData.role,
        passwordHash: passwordHash
      });
      await newUser.save();
      console.log(`[Seeder] Usuário criado: ${userData.name} (${userData.role})`);
    }

    console.log('[Seeder] Todos os usuários de teste foram criados com sucesso!');
  } catch (error: any) {
    console.error('[Seeder] Erro crítico ao rodar o seeder:', error.message);
  }
}
