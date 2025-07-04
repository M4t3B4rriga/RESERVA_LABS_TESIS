import cron from 'node-cron';

// Esta función se ejecutará todos los días a las 11:30 p.m. hora de Ecuador
cron.schedule('35 23 * * *', async () => {
  const date = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Guayaquil',
    hour12: false,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  };
  const formatter = new Intl.DateTimeFormat('es-EC', options);
  const ecuadorTime = formatter.format(date);
  console.log(`Tarea programada ejecutada a las ${ecuadorTime}`);
  // Lógica para actualizar los horarios de tu base de datos
});