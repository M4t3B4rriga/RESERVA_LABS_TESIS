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
import { faCheckCircle, faTimesCircle, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { Store } from 'react-notifications-component';
import 'react-notifications-component/dist/theme.css';

interface SolicitudPassword {
  PK_CAMBIO_PASSWORD_SOLICITUD: number;
  XEUSU_CODIGO: number;
  USU_NOMBRE: string;
  PEI_EMAIL_INSTITUCIONAL: string;
  PEI_NOMBRE: string;
  PEI_APELLIDO_PATERNO: string;
  JUSTIFICACION: string;
  ESTADO: string;
  FECHA_SOLICITUD: string;
  FECHA_RESPUESTA?: string;
  COMENTARIO_ADMIN?: string;
  ADMIN_PROCESADOR?: string;
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

export default function ManagePasswordChanges({ usuarioLogueado }: Props) {
  const [solicitudes, setSolicitudes] = useState<SolicitudPassword[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [comentarios, setComentarios] = useState<{ [key: number]: string }>({});
  const [nuevasPasswords, setNuevasPasswords] = useState<{ [key: number]: string }>({});
  const [showPasswords, setShowPasswords] = useState<{ [key: number]: boolean }>({});

  const fetchSolicitudes = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/password-change-solicitudes`);
      const newSolicitudes = response.data.solicitudes;
      setSolicitudes(newSolicitudes);

      const pendientes = newSolicitudes.filter((s: SolicitudPassword) => s.ESTADO === 'Pendiente').length;
      if (pendientes > 0) {
        Store.addNotification({
          title: "Solicitudes de Cambio de Contraseña",
          message: `Hay ${pendientes} solicitud(es) de cambio de contraseña pendiente(s).`,
          type: "info",
          insert: "top",
          container: "top-right",
          animationIn: ["animate__animated", "animate__fadeIn"],
          animationOut: ["animate__animated", "animate__fadeOut"],
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
    const comentario = comentarios[solicitudId] || '';
    const nuevaPassword = nuevasPasswords[solicitudId] || '';

    if (accion === 'Aceptado' && !nuevaPassword) {
      Store.addNotification({
        title: "Error",
        message: "Debes ingresar una nueva contraseña para aceptar la solicitud.",
        type: "danger",
        insert: "top",
        container: "top-left",
        animationIn: ["animate__animated", "animate__fadeIn"],
        animationOut: ["animate__animated", "animate__fadeOut"],
        dismiss: { duration: 3000, onScreen: true },
      });
      return;
    }

    if (accion === 'Aceptado' && nuevaPassword.length < 6) {
      Store.addNotification({
        title: "Error",
        message: "La nueva contraseña debe tener al menos 6 caracteres.",
        type: "danger",
        insert: "top",
        container: "top-left",
        animationIn: ["animate__animated", "animate__fadeIn"],
        animationOut: ["animate__animated", "animate__fadeOut"],
        dismiss: { duration: 3000, onScreen: true },
      });
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/manage-password-change`, {
        solicitudId,
        accion,
        comentario,
        nuevaPassword: accion === 'Aceptado' ? nuevaPassword : undefined,
      });

      // Limpiar los campos
      setComentarios(prev => ({ ...prev, [solicitudId]: '' }));
      setNuevasPasswords(prev => ({ ...prev, [solicitudId]: '' }));
      setShowPasswords(prev => ({ ...prev, [solicitudId]: false }));

      fetchSolicitudes();
      Store.addNotification({
        title: "Acción Completada",
        message: `Solicitud ${accion.toLowerCase()} con éxito.`,
        type: "success",
        insert: "top",
        container: "top-left",
        animationIn: ["animate__animated", "animate__fadeIn"],
        animationOut: ["animate__animated", "animate__fadeOut"],
        dismiss: { duration: 5000, onScreen: true },
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || `Error al ${accion.toLowerCase()} la solicitud`;
      setErrorMessage(errorMsg);
      Store.addNotification({
        title: "Error",
        message: errorMsg,
        type: "danger",
        insert: "top",
        container: "top-left",
        animationIn: ["animate__animated", "animate__fadeIn"],
        animationOut: ["animate__animated", "animate__fadeOut"],
        dismiss: { duration: 5000, onScreen: true },
      });
    }
    setIsLoading(false);
  };

  const toggleShowPassword = (solicitudId: number) => {
    setShowPasswords(prev => ({
      ...prev,
      [solicitudId]: !prev[solicitudId]
    }));
  };

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  return (
    <Layout usuarioLogueado={usuarioLogueado}>
      <Head>
        <title>Gestionar Cambios de Contraseña</title>
      </Head>
      <div className={styles.container}>
        <h1>Gestionar Solicitudes de Cambio de Contraseña</h1>
        {errorMessage && <p className={styles.labelError}>{errorMessage}</p>}
        
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
          <strong>Total de solicitudes:</strong> {solicitudes.length} | 
          <strong> Pendientes:</strong> {solicitudes.filter(s => s.ESTADO === 'Pendiente').length} | 
          <strong> Procesadas:</strong> {solicitudes.filter(s => s.ESTADO !== 'Pendiente').length}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre Completo</th>
                <th>Correo</th>
                <th>Justificación</th>
                <th>Estado</th>
                <th>Fecha Solicitud</th>
                <th>Fecha Respuesta</th>
                <th>Procesado Por</th>
                <th>Comentario Admin</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((solicitud) => (
                <tr key={solicitud.PK_CAMBIO_PASSWORD_SOLICITUD}>
                  <td><strong>{solicitud.USU_NOMBRE}</strong></td>
                  <td>{solicitud.PEI_NOMBRE} {solicitud.PEI_APELLIDO_PATERNO}</td>
                  <td>{solicitud.PEI_EMAIL_INSTITUCIONAL}</td>
                  <td style={{ maxWidth: '200px', wordWrap: 'break-word' }}>
                    {solicitud.JUSTIFICACION}
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: 'white',
                      backgroundColor: 
                        solicitud.ESTADO === 'Pendiente' ? '#ffa500' :
                        solicitud.ESTADO === 'Aceptado' ? '#28a745' : '#dc3545'
                    }}>
                      {solicitud.ESTADO}
                    </span>
                  </td>
                  <td>{new Date(solicitud.FECHA_SOLICITUD).toLocaleString()}</td>
                  <td>{solicitud.FECHA_RESPUESTA ? new Date(solicitud.FECHA_RESPUESTA).toLocaleString() : '-'}</td>
                  <td>{solicitud.ADMIN_PROCESADOR || '-'}</td>
                  <td style={{ maxWidth: '150px', wordWrap: 'break-word' }}>
                    {solicitud.COMENTARIO_ADMIN || '-'}
                  </td>
                  <td style={{ minWidth: '300px' }}>
                    {solicitud.ESTADO === 'Pendiente' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          type="text"
                          placeholder="Comentario (opcional)"
                          value={comentarios[solicitud.PK_CAMBIO_PASSWORD_SOLICITUD] || ''}
                          onChange={(e) => setComentarios(prev => ({
                            ...prev,
                            [solicitud.PK_CAMBIO_PASSWORD_SOLICITUD]: e.target.value
                          }))}
                          className={styles.input}
                          style={{ marginBottom: '5px' }}
                        />
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showPasswords[solicitud.PK_CAMBIO_PASSWORD_SOLICITUD] ? 'text' : 'password'}
                            placeholder="Nueva contraseña (mín. 6 caracteres)"
                            value={nuevasPasswords[solicitud.PK_CAMBIO_PASSWORD_SOLICITUD] || ''}
                            onChange={(e) => setNuevasPasswords(prev => ({
                              ...prev,
                              [solicitud.PK_CAMBIO_PASSWORD_SOLICITUD]: e.target.value
                            }))}
                            className={styles.input}
                            style={{ paddingRight: '40px' }}
                          />
                          <button
                            type="button"
                            onClick={() => toggleShowPassword(solicitud.PK_CAMBIO_PASSWORD_SOLICITUD)}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          >
                            <FontAwesomeIcon 
                              icon={showPasswords[solicitud.PK_CAMBIO_PASSWORD_SOLICITUD] ? faEye : faEyeSlash} 
                            />
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            onClick={() => handleAccion(solicitud.PK_CAMBIO_PASSWORD_SOLICITUD, 'Aceptado')}
                            className={styles.button}
                            disabled={isLoading}
                            style={{ 
                              backgroundColor: '#28a745', 
                              fontSize: '12px', 
                              padding: '8px 12px',
                              flex: 1
                            }}
                          >
                            <FontAwesomeIcon icon={faCheckCircle} /> Aceptar
                          </button>
                          <button
                            onClick={() => handleAccion(solicitud.PK_CAMBIO_PASSWORD_SOLICITUD, 'Rechazado')}
                            className={styles.button}
                            disabled={isLoading}
                            style={{ 
                              backgroundColor: '#dc3545', 
                              fontSize: '12px', 
                              padding: '8px 12px',
                              flex: 1
                            }}
                          >
                            <FontAwesomeIcon icon={faTimesCircle} /> Rechazar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        Ya procesada
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {solicitudes.length === 0 && !isLoading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>No hay solicitudes de cambio de contraseña.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}