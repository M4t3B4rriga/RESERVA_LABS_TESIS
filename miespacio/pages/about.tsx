import React, { useEffect, useRef, useState } from 'react';
import styles from '@/styles/About.module.css';
import { jwtVerify } from 'jose';
import { GetServerSidePropsContext } from 'next';
import { Auth } from '@/libs/auth';
import Head from 'next/head';
import Layout from '@/src/components/Layout';
import Image from 'next/image';
import { set } from 'date-fns';
import { Modal } from '@mui/material';

export async function getServerSideProps(context: GetServerSidePropsContext) {

  try {
    const { miEspacioSession } = context.req.cookies;

    if (miEspacioSession === undefined) {
      console.log('No hay cookie');
      return { props: { reservas: [], totalCount: 0, usuarioLogueado: null } };
    }

    const { payload } = await jwtVerify(
      miEspacioSession,
      new TextEncoder().encode('secret')
    );

    console.log(payload);

    const CodPersonaInterna = payload?.PI;
    const NombreUsuario = payload?.Nombre + ' ' + payload?.ApellPaterno;
    const CodRol = payload?.CodRol;
    const CodUsuario = payload?.CodUsuario;

    const usuarioLogueado = {
      CodPersonaInterna: CodPersonaInterna as number,
      usuarioNombre: NombreUsuario as string,
      CodRol: CodRol as number,
      usuarioLogueado: CodUsuario as number,
    } as Auth;

    if (CodPersonaInterna === undefined || NombreUsuario === undefined || CodRol === undefined || CodUsuario === undefined) {
      console.log('No hay payload');
      return { props: { usuarioLogueado: null } };
    }

    return { props: { usuarioLogueado: usuarioLogueado } };
  } catch (error) {
    console.error(error);
    return { props: { usuarioLogueado: null } };
  }
}

const About = ({ usuarioLogueado: InitialUsuario }: { usuarioLogueado: Auth | null }) => {
  const [usuarioLogueado, setUsuarioLogueado] = useState<Auth | null>(InitialUsuario);
  const [clickCount, setClickCount] = useState(0);
  const [shownImages, setShownImages] = useState<number[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const imagePositionsRef = useRef<{ [key: number]: number }>({});
  const [secretButtonClickCount, setSecretButtonClickCount] = useState(0);

  const handleMiEspacioClick = () => {
    setClickCount((prevCount) => prevCount + 1);
    setShownImages((prevImages) => [...prevImages, clickCount]);
  };

  const clearImages = () => {
    setShownImages([]);
  };

  useEffect(() => {
    if (shownImages.length > 0) {
      const timeoutId = setTimeout(clearImages, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [shownImages]);

  const getRandomRight = (index: number) => {
    const minRight = 0;
    const maxRight = 50;

    if (!imagePositionsRef.current[index]) {
      imagePositionsRef.current[index] = Math.random() * (maxRight - minRight) + minRight;
    }

    return imagePositionsRef.current[index];
  };

  const handleSecretButtonClick = () => {
    setSecretButtonClickCount((prevCount) => prevCount + 1);
    setClickCount((prevCount) => prevCount + 1);
  };

  useEffect(() => {
    if (clickCount % 30 === 0 && clickCount > 0 || secretButtonClickCount === 1) {
      setShownImages((prevImages) => [...prevImages, secretButtonClickCount]);
    }
    if (secretButtonClickCount === 90 || secretButtonClickCount === 190) {
      setIsOpen(true);
      setTimeout(() => {
        setIsOpen(false);
      }, 2000);
    }
  }, [secretButtonClickCount]);

  return (
    <>
      <Layout usuarioLogueado={usuarioLogueado}>
        <Head>
          <title>Acerca de</title>
        </Head>
        <Modal open={isOpen} className={`${styles.modal}`}>
          <div
            className={styles.imageSecretContainer}
          >
            <Image
              src="/images/4/image_s.jpg"
              alt="Mi Espacio App"
              width={300}
              height={200}
              layout="responsive"
            />
          </div>
        </Modal>
        {isOpen && (
          <div className={styles.full_container}>
            <div className={styles.firework}></div>
            <div className={styles.firework}></div>
            <div className={styles.firework}></div>
          </div>
        )}
        <h1>Acerca de</h1>
        <div className={styles.container}>
          <h1 className={styles.title}>&quot;Mi Espacio&quot;</h1>
          <p className={styles.description}>
            La plataforma web para la gestión integrada de reservas de laboratorios, aulas y otros espacios <span className={styles.green} onClick={handleMiEspacioClick}>Mi Espacio</span> fue desarrollada por Diego Padilla y Christian Novoa desde abril a julio de 2023 utilizando Next.js.
          </p>
          <p className={styles.description}>
            Bajo la supervisión del Ph.D. Mauricio Loachamin, este proyecto se llevó a cabo como parte de la tesis de grado en la Universidad de las Fuerzas Armadas ESPE.
          </p>
          <p className={styles.description}>
            El objetivo del proyecto era crear una solución eficiente y versátil para optimizar la gestión de reservas de espacios en la universidad, brindando una experiencia amigable tanto para los usuarios como para los administradores.
          </p>
          <h2 className={styles.subtitle}>Equipo de Desarrollo</h2>
          <ul className={styles.teamList}>
            <li>Diego Padilla - Desarrollador Full Stack</li>
            <li>Christian Novoa - Desarrollador Full Stack</li>
          </ul>
          <h2 className={styles.subtitle}>Asesoría y Supervisión</h2>
          <p className={styles.description}>
            El proyecto contó con la valiosa guía y asesoría del Ph.D. Mauricio Loachamin, quien proporcionó conocimientos especializados y orientación durante todo el proceso de desarrollo.
          </p>
        </div>
        {shownImages.map((index) => (
          <div
            key={index}
            className={styles.imageContainer}
            style={{ right: `${getRandomRight(index)}%` }}
          >
            <Image
              src="/images/logos/mi_espacio_sec.png"
              alt="Mi Espacio App"
              width={300}
              height={200}
              layout="responsive"
            />
          </div>
        ))}
        <button type='button' className={styles.super_hidden_tiny_button} onClick={handleSecretButtonClick}></button>
      </Layout>
    </>
  );
};

export default About;