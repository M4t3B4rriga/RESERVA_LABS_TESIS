import cron from "cron";


const { CronJob } = cron;

const updateHorarios = async () => {
  try {
    console.log("me ejecute");
  } catch (error) {
    console.error(error);
  }
};

// Programar la tarea para que se ejecute a las 12:00 AM
const job = new CronJob(
    "59 23 * * *",
    async () => {
      console.log("Ejecutando tarea programada...");
      await updateHorarios();
    },
    null,
    true,
    "America/Guayaquil"
  );

job.start();