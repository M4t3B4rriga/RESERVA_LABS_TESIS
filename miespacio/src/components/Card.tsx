import React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { faUsers, faBuilding, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from '@/styles/Card.module.css';
import Image from 'next/image';

interface CardProps {
  imageUrl: string;
  nombreEspacio: string;
  nombreTipoEspacio: string;
  disponibilidad: number;
  capacidad: number;
  id: number;
  estado: string;
}

const Card: React.FC<CardProps> = ({ imageUrl, nombreEspacio, nombreTipoEspacio, disponibilidad, capacidad, id, estado }) => {
  const [src, setSrc] = useState(imageUrl);

  return (
    <Link key={id} href={`/espacios/${id}`} className={styles.link}>
      <div className={styles.card}>
        <div className={styles.image}>
          <Image
            alt={nombreEspacio}
            src={src}
            width={800}
            height={500}
            placeholder="blur"
            blurDataURL='/images/placeholder/placeholder.png'
            onError={() => setSrc('/images/descarga.jpg')}
            className={styles.img}
          />
        </div>
        <div className={`${styles.title} ${estado == '0' ? styles.red_color : ''}`}>
          {nombreEspacio}
        </div>
        <div className={styles.info}>
          <div className={styles.capacity}>
            <FontAwesomeIcon icon={faUsers} className={styles.card_icon} /> {capacidad}
          </div>
          <div className={styles.tipo_espacio}>
            <FontAwesomeIcon icon={faBuilding} className={styles.card_icon} /> <span>{nombreTipoEspacio}</span>
          </div>
        </div>
        <div className={`${styles.disponibility} ${disponibilidad ? styles.available : styles.unavailable}`}>
          <div>{disponibilidad ? 'Disponible' : 'No disponible'}</div>
        </div>
      </div>
    </Link>
  );
};

export default Card;
