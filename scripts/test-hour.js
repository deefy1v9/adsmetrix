const now = new Date();
const currentHour = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).slice(0, 2);
console.log('Now (ISO):', now.toISOString());
console.log('Locale string:', now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }));
console.log('Current hour extracted:', currentHour);

const timeInDb = "09:00";
console.log(`Does "${timeInDb}" start with "${currentHour}"?`, timeInDb.startsWith(currentHour));
