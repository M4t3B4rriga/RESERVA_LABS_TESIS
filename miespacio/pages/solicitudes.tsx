import { useState, useEffect } from 'react';
import { GetServerSidePropsContext } from 'next';
import { jwtVerify } from 'jose';
import { Auth } from '@/libs/auth';
import axios from 'axios';
import { API_BASE_URL } from '@/src/components/BaseURL';
import Layout from '@/src/components/Layout';
import Head from 'next/head';
import styles from '@/styles/Home.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { Store } from 'react-notifications-component';
import 'react-notifications-component/dist/theme.css';

interface Solicitud {
  PK_REGISTRO_SOLICITUD: number;
  USU_NOMBRE: string;
  PEI_NOMBRE: string;
  PEI_APELLIDO_PATERNO: string;
  PEI_APELLIDO_MATERNO: string;
  PEI_EMAIL_INSTITUCIONAL: string;
  ROL: string;
  ESTADO: string;
  FECHA_SOLICITUD: string;
  COMENTARIO_ADMIN?: string;
}

interface Props {
  usuarioLogueado: Auth | null;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  try {
    const { miEspacioSession } = context.req.cookies;

    if (!miEspacioSession) {
      console.log('No hay cookie de sesión');
      return { redirect: { destination: '/login', permanent: false } };
    }

    const { payload } = await jwtVerify(
      miEspacioSession,
      new TextEncoder().encode('secret')
    );

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
      return { props: { usuarioLogueado: null } };
    }

    // Verificar si el usuario es Admin Root
    if (CodRol !== 3) {
      return { redirect: { destination: '/', permanent: false } };
    }

    return { props: { usuarioLogueado } };
  } catch (error) {
    console.error('Error en getServerSideProps:', error);
    return { redirect: { destination: '/login', permanent: false } };
  }
}

export default function Solicitudes({ usuarioLogueado }: Props) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [comentario, setComentario] = useState('');

  const fetchSolicitudes = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/solicitudes`);
      const newSolicitudes = response.data.solicitudes;
      setSolicitudes(newSolicitudes);

      const pendiente = newSolicitudes.filter((s: Solicitud)=> s.ESTADO === 'Pendiente').lengh;
      if (pendiente > 0){
        Store.addNotification({
          title: "Nuevas solicitudes",
          message: 'Hay ${pendientes} solicitud(es) de registro pendiente(s).',
          type: "info",
          insert: "top",
          container: "top-right",
          animationIn: ["animate__animated" , "animate__fadeIn"],
          animationOut: ["animate__animated" , "animate__fadeOut"],
          dismiss: {
            duration: 5000,
            onScreen: true,
          },
        });
      }

    } catch (error) {
      setErrorMessage('Error al cargar las solicitudes');
    }
    setIsLoading(false);
  };

  const handleAccion = async (solicitudId: number, accion: 'Aceptado' | 'Rechazado') => {
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/manage-registration`, {
        solicitudId,
        accion,
        comentario,
      });
      setComentario('');
      fetchSolicitudes();
      Store.addNotification({
        title: "Acción Completada",
        message: `Solicitud ${accion.toLowerCase()} con éxito.`,
        type: "success",
        insert: "top",
        container: "top-left",
        animationIn: ["animate__animated", "animate__fadeIn"],
        animationOut: ["animate__animated", "animate__fadeOut"],
        dismiss: {
          duration: 5000,
          onScreen: true,
        },
      });
    } catch (error) {
      setErrorMessage(`Error al ${accion.toLowerCase()} la solicitud`);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  return (
    <Layout usuarioLogueado={usuarioLogueado}>
      <Head>
        <title>Gestionar Solicitudes</title>
      </Head>
      <div className={styles.container}>
        <h1>Gestionar Solicitudes de Registro</h1>
        {errorMessage && <p className={styles.labelError}>{errorMessage}</p>}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Apellido Paterno</th>
              <th>Apellido Materno</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Fecha Solicitud</th>
              <th>Comentario</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((solicitud) => (
              <tr key={solicitud.PK_REGISTRO_SOLICITUD}>
                <td>{solicitud.USU_NOMBRE}</td>
                <td>{solicitud.PEI_NOMBRE}</td>
                <td>{solicitud.PEI_APELLIDO_PATERNO}</td>
                <td>{solicitud.PEI_APELLIDO_MATERNO || '-'}</td>
                <td>{solicitud.PEI_EMAIL_INSTITUCIONAL}</td>
                <td>{solicitud.ROL}</td>
                <td>{solicitud.ESTADO}</td>
                <td>{new Date(solicitud.FECHA_SOLICITUD).toLocaleDateString()}</td>
                <td>{solicitud.COMENTARIO_ADMIN || '-'}</td>
                <td>
                  {solicitud.ESTADO === 'Pendiente' && (
                    <>
                      <input
                        type="text"
                        placeholder="Comentario (opcional)"
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        className={styles.input}
                      />
                      <button
                        onClick={() => handleAccion(solicitud.PK_REGISTRO_SOLICITUD, 'Aceptado')}
                        className={styles.button}
                        disabled={isLoading}
                      >
                        <FontAwesomeIcon icon={faCheckCircle} /> Aceptar
                      </button>
                      <button
                        onClick={() => handleAccion(solicitud.PK_REGISTRO_SOLICITUD, 'Rechazado')}
                        className={styles.button}
                        disabled={isLoading}
                      >
                        <FontAwesomeIcon icon={faTimesCircle} /> Rechazar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}