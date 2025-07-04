import styles from '@/styles/404.module.css';
import Link from 'next/link';

export default function Custom404() {
  return (
    <div className={styles.container}>
      <div className={styles.error404}>
        <div className={styles.number}>404</div>
        <div className={styles.message}>Página no encontrada</div>
      </div>
      <div className={styles.emoji}>😢</div>
      <div className={styles.homeLink}>
        <Link href="/">Volver al inicio</Link>
      </div>
    </div>
  );
}