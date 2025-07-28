import { useState, useEffect } from 'react';
import { GetServerSidePropsContext } from 'next';
import { jwtVerify } from 'jose';
import { Auth } from '@/libs/auth';
import axios from 'axios';
import { API_BASE_URL } from '@/src/components/BaseURL';
import Layout from '@/src/components/Layout';
import Head from 'next/head';
import styles from '@/styles/CRUD.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faSearch } from '@fortawesome/free-solid-svg-icons';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroRol, setFiltroRol] = useState('Todos');

  const fetchSolicitudes = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/solicitudes`);
      const newSolicitudes = response.data.solicitudes;
      setSolicitudes(newSolicitudes);

      const pendiente = newSolicitudes.filter((s: Solicitud) => s.ESTADO === 'Pendiente').length;
      if (pendiente > 0) {
        Store.addNotification({
          title: "Nuevas solicitudes",
          message: `Hay ${pendiente} solicitud(es) de registro pendiente(s).`,
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

  // Filtrar solicitudes según los filtros aplicados
  const filteredSolicitudes = solicitudes.filter((solicitud) => {
    const matchesSearch = searchTerm === '' || 
      solicitud.USU_NOMBRE.toLowerCase().includes(searchTerm.toLowerCase()) ||
      solicitud.PEI_NOMBRE.toLowerCase().includes(searchTerm.toLowerCase()) ||
      solicitud.PEI_APELLIDO_PATERNO.toLowerCase().includes(searchTerm.toLowerCase()) ||
      solicitud.PEI_EMAIL_INSTITUCIONAL.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEstado = filtroEstado === 'Todos' || solicitud.ESTADO === filtroEstado;
    const matchesRol = filtroRol === 'Todos' || solicitud.ROL === filtroRol;
    
    return matchesSearch && matchesEstado && matchesRol;
  });

  // Obtener roles únicos para el filtro
  const rolesUnicos = ['Todos', ...Array.from(new Set(solicitudes.map(s => s.ROL)))];

  const limpiarFiltros = () => {
    setSearchTerm('');
    setFiltroEstado('Todos');
    setFiltroRol('Todos');
  };

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  return (
    <Layout usuarioLogueado={usuarioLogueado}>
      <Head>
        <title>Gestionar Solicitudes</title>
      </Head>
      <div className={styles.crud_container}>
        <div className={styles.crud_header}>
          <h1>Gestionar Solicitudes de Registro</h1>
        </div>

        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
        
        {/* Panel de Filtros - Siempre visible */}
        <div className={styles.crud_body}>
          <div style={{ 
            backgroundColor: 'var(--background_lighter)',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0px 2px 8px rgba(54, 54, 54, 0.15)',
            border: '1px solid var(--line_gray)',
            marginBottom: '25px'
          }}>
            <h3 style={{ 
              margin: '0 0 20px 0', 
              color: 'var(--font_color_light)',
              textAlign: 'center',
              fontSize: '18px',
              fontWeight: '500'
            }}>
              🔍 Filtros de Búsqueda
            </h3>
            
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr auto',
              gap: '20px',
              alignItems: 'end',
              marginBottom: '15px'
            }}>
              {/* Búsqueda */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px',
                  color: 'var(--font_color_lighter)',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Buscar:
                </label>
                <div className={styles.search_container} style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Nombre, usuario, correo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ 
                      width: '100%',
                      padding: '12px 40px 12px 16px',
                      borderRadius: '50px',
                      border: '2px solid var(--background_superlight)',
                      backgroundColor: 'var(--gray_soft)',
                      color: 'var(--font_color_light)',
                      fontSize: '15px',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--dark_green)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--background_superlight)'}
                  />
                  <FontAwesomeIcon 
                    icon={faSearch} 
                    style={{
                      position: 'absolute',
                      right: '15px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--font_color_lighter)',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Filtro por Estado */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px',
                  color: 'var(--font_color_lighter)',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Estado:
                </label>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '50px',
                    border: '2px solid var(--background_superlight)',
                    backgroundColor: 'var(--gray_soft)',
                    color: 'var(--font_color_light)',
                    fontSize: '15px',
                    width: '100%',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--dark_green)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--background_superlight)'}
                >
                  <option value="Todos">🔄 Todos</option>
                  <option value="Pendiente">⏳ Pendiente</option>
                  <option value="Aceptado">✅ Aceptado</option>
                  <option value="Rechazado">❌ Rechazado</option>
                </select>
              </div>

              {/* Filtro por Rol */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px',
                  color: 'var(--font_color_lighter)',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Rol:
                </label>
                <select
                  value={filtroRol}
                  onChange={(e) => setFiltroRol(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '50px',
                    border: '2px solid var(--background_superlight)',
                    backgroundColor: 'var(--gray_soft)',
                    color: 'var(--font_color_light)',
                    fontSize: '15px',
                    width: '100%',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--dark_green)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--background_superlight)'}
                >
                  <option value="Todos">👥 Todos</option>
                  {rolesUnicos.slice(1).map(rol => (
                    <option key={rol} value={rol}>
                      {rol === 'Administrador' ? '👤' : 
                       rol === 'Docente' ? '🎓' : 
                       rol === 'Estudiante' ? '📚' : '👤'} {rol}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botón Limpiar */}
              <div>
                <button
                  onClick={limpiarFiltros}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '50px',
                    border: '2px solid var(--green2)',
                    backgroundColor: 'transparent',
                    color: 'var(--green2)',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.backgroundColor = 'var(--green2)';
                    target.style.color = 'var(--white)';
                  }}
                  onMouseLeave={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.backgroundColor = 'transparent';
                    target.style.color = 'var(--green2)';
                  }}
                >
                  🧹 Limpiar
                </button>
              </div>
            </div>

            {/* Contador de resultados */}
            <div style={{ 
              textAlign: 'center',
              padding: '12px 20px',
              backgroundColor: 'var(--background_superlight)',
              borderRadius: '50px',
              color: 'var(--font_color_light)',
              fontSize: '14px',
              fontWeight: '500',
              border: '1px solid var(--line_gray)'
            }}>
              📊 {filteredSolicitudes.length} de {solicitudes.length} solicitudes
              {(searchTerm || filtroEstado !== 'Todos' || filtroRol !== 'Todos') && 
                <span style={{ color: 'var(--green2)', marginLeft: '5px' }}>
                  (filtradas)
                </span>
              }
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className={styles.load_container}>
            <p>Cargando solicitudes...</p>
          </div>
        ) : (
          <div className={styles.crud_body}>
            {/* Tabla de Solicitudes */}
            {filteredSolicitudes.length > 0 ? (
              <div className={styles.crud_table}>
                <table>
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
                      <th>Comentario Admin</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSolicitudes.map((solicitud) => (
                      <tr key={solicitud.PK_REGISTRO_SOLICITUD}>
                        <td><strong>{solicitud.USU_NOMBRE}</strong></td>
                        <td>{solicitud.PEI_NOMBRE}</td>
                        <td>{solicitud.PEI_APELLIDO_PATERNO}</td>
                        <td>{solicitud.PEI_APELLIDO_MATERNO || '-'}</td>
                        <td>{solicitud.PEI_EMAIL_INSTITUCIONAL}</td>
                        <td>{solicitud.ROL}</td>
                        <td>
                          <span className={
                            solicitud.ESTADO === 'Pendiente' ? styles.estado_pendiente :
                            solicitud.ESTADO === 'Aceptado' ? styles.estado_activo :
                            styles.estado_inactivo
                          }>
                            {solicitud.ESTADO}
                          </span>
                        </td>
                        <td>{new Date(solicitud.FECHA_SOLICITUD).toLocaleDateString()}</td>
                        <td>{solicitud.COMENTARIO_ADMIN || '-'}</td>
                        <td>
                          {solicitud.ESTADO === 'Pendiente' && (
                            <div style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '8px',
                              minWidth: '200px'
                            }}>
                              <input
                                type="text"
                                placeholder="Comentario (opcional)"
                                value={comentario}
                                onChange={(e) => setComentario(e.target.value)}
                                style={{ 
                                  padding: '6px 10px',
                                  borderRadius: '15px',
                                  border: 'none',
                                  backgroundColor: 'var(--gray_soft)',
                                  color: 'var(--font_color_light)',
                                  fontSize: '13px',
                                  width: '100%',
                                  boxSizing: 'border-box'
                                }}
                              />
                              <div style={{ 
                                display: 'flex', 
                                gap: '5px'
                              }}>
                                <button
                                  onClick={() => handleAccion(solicitud.PK_REGISTRO_SOLICITUD, 'Aceptado')}
                                  className={styles.crud_normal_button}
                                  disabled={isLoading}
                                  style={{ 
                                    backgroundColor: 'var(--light_green)',
                                    padding: '5px 10px',
                                    fontSize: '12px',
                                    flex: '1'
                                  }}
                                >
                                  <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '4px' }} />
                                  Aceptar
                                </button>
                                <button
                                  onClick={() => handleAccion(solicitud.PK_REGISTRO_SOLICITUD, 'Rechazado')}
                                  className={styles.crud_normal_button}
                                  disabled={isLoading}
                                  style={{ 
                                    backgroundColor: 'var(--red)',
                                    padding: '5px 10px',
                                    fontSize: '12px',
                                    flex: '1'
                                  }}
                                >
                                  <FontAwesomeIcon icon={faTimesCircle} style={{ marginRight: '4px' }} />
                                  Rechazar
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.notfound}>
                <div className={styles.notfound_icon}>
                  <FontAwesomeIcon icon={faSearch} />
                </div>
                <p className={styles.notfound_text}>
                  {searchTerm ? 'No se encontraron solicitudes que coincidan con la búsqueda' : 'No hay solicitudes disponibles'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}