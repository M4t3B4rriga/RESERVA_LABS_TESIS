import React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { faUsers, faBuilding, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from '@/styles/List.module.css';
import Image from 'next/image';

interface ListProps {
  imageUrl: string;
  nombreEspacio: string;
  nombreTipoEspacio: string;
  disponibilidad: number;
  capacidad: number;
  id: number;
}

const List: React.FC<ListProps> = ({ imageUrl, nombreEspacio, nombreTipoEspacio, disponibilidad, capacidad, id }) => {
  const [src, setSrc] = useState(imageUrl);

  return (
    <Link key={id} href={`/espacios/${id}`} className={styles.link}>
      <div className={styles.list}>
        <div className={styles.info}>
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
          <div className={styles.column1}>
            <div className={styles.title}>{nombreEspacio}</div>
            <div className={styles.tipo_espacio}>
              <FontAwesomeIcon icon={faBuilding} className={styles.list_icon} /> <span>{nombreTipoEspacio}</span>
            </div>
          </div>
        </div>
        <div className={styles.column2}>
          <div className={`${styles.disponibility} ${disponibilidad ? styles.available : styles.unavailable}`}>
            <div>{disponibilidad ? 'Disponible' : 'No disponible'}</div>
          </div>
          <div className={styles.capacity}>
            {capacidad} <FontAwesomeIcon icon={faUsers} className={styles.list_icon} />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default List;
