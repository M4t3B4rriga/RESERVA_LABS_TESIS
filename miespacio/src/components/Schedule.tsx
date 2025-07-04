import { useState } from 'react';
import styles from '@/styles/Schedule.module.css';

interface AvailabilityBox {
  id: number;
  dayIndex: number;
  startHour: number;
  duration: number;
}

const SchedulePage = () => {
  const [availabilityBoxes, setAvailabilityBoxes] = useState<AvailabilityBox[]>([]);
  let boxId = 1; // Identificador único para los cuadros de disponibilidad

  const handleDayClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, dayIndex: number) => {
    const dayElement = event.currentTarget;
    const rect = dayElement.getBoundingClientRect();
    const y = event.clientY - rect.top;

    const rowHeight = dayElement.clientHeight / 24; // Dividir en 24 filas para las horas

    const startHour = Math.floor(y / rowHeight);
    const duration = 45; // Duración del cuadro en minutos (ejemplo: 45 minutos)

    const newBox: AvailabilityBox = {
      id: boxId++,
      dayIndex,
      startHour,
      duration,
    };

    setAvailabilityBoxes([...availabilityBoxes, newBox]);

    // Guardar en la base de datos
    // Implementa la lógica para enviar newBox al servidor y almacenarlo en la base de datos
  };

  return (
    <div>
      <div className={styles.schedule}>
        <div className={styles.days}>
          {/* Renderizar los días */}
          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day, index) => (
            <div key={index} className={styles.day} onClick={(event) => handleDayClick(event, index)}>
              {day}
            </div>
          ))}
        </div>
        <div className={styles.availability_boxes}>
          {/* Renderizar los cuadros de disponibilidad */}
          {availabilityBoxes.map((box) => (
            <div
              key={box.id}
              className={styles.availability_box}
              style={{
                top: box.startHour * 60 + 'px',
                height: box.duration + 'px',
              }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;
