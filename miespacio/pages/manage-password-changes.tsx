import { useState, useEffect } from 'react';
import { GetServerSidePropsContext } from 'next';
import { jwtVerify } from 'jose';
import { Auth } from '@/libs/auth';
import axios from 'axios';
import { API_BASE_URL } from '@/src/components/BaseURL';
import Layout from '@/src/components/Layout';
import Head from 'next/head';
import styles from '@/styles/ManagePasswordChanges.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faEye, faEyeSlash, faClipboardList, faFilter, faUser, faLock, faEdit, faTrashAlt, faUndo, faExclamationTriangle, faSort, faSortUp, faSortDown, faPrint, faFileCsv, faFilePdf, faPlus } from '@fortawesome/free-solid-svg-icons';
import { Store } from 'react-notifications-component';
import 'react-notifications-component/dist/theme.css';
import { ReactNotifications } from 'react-notifications-component';
import Pagination from '@/src/components/Pagination';
import SearchBar from '@/src/components/SearchBar';

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
  const [filtroEstado, setFiltroEstado] = useState<string>('Todos');
  const [showScrollHint, setShowScrollHint] = useState(false);
  
  // Estados para funcionalidad CRUD
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalSolicitudes, setTotalSolicitudes] = useState(0);
  const [error, setError] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Contadores totales para los filtros
  const [contadoresTotales, setContadoresTotales] = useState({
    todos: 0,
    pendiente: 0,
    aceptado: 0,
    rechazado: 0
  });

  // Detectar si es dispositivo móvil para mostrar hint de scroll
  useEffect(() => {
    const checkMobile = () => {
      setShowScrollHint(window.innerWidth <= 992);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Funciones para CRUD
  const handleSearchTermChange = (newSearchTerm: string) => {
    setSearch(newSearchTerm);
    setPage(1);
    
    // Limpiar timeout anterior
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Establecer nuevo timeout para búsqueda
    const newTimeout = setTimeout(() => {
      console.log('Ejecutando búsqueda con término:', newSearchTerm); // Para debug
      // El useEffect se encargará de hacer la búsqueda
    }, 500); // Esperar 500ms después de que el usuario deje de escribir
    
    setSearchTimeout(newTimeout);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleReload = () => {
    setError(false);
    setMessageError('');
    fetchSolicitudes(true); // Mostrar notificación al recargar manualmente
  };

  const fetchContadoresTotales = async () => {
    try {
      // Obtener contadores sin filtros para mostrar números totales
      const response = await axios.get(`${API_BASE_URL}/api/auth/password-change-solicitudes`, {
        params: { page: 1, limit: 1000 } // Obtener muchos registros para contar correctamente
      });
      
      const todasLasSolicitudes = response.data.solicitudes;
      setContadoresTotales({
        todos: todasLasSolicitudes.length,
        pendiente: todasLasSolicitudes.filter((s: SolicitudPassword) => s.ESTADO === 'Pendiente').length,
        aceptado: todasLasSolicitudes.filter((s: SolicitudPassword) => s.ESTADO === 'Aceptado').length,
        rechazado: todasLasSolicitudes.filter((s: SolicitudPassword) => s.ESTADO === 'Rechazado').length
      });
    } catch (error) {
      console.error('Error al obtener contadores:', error);
    }
  };

  const fetchSolicitudes = async (showNotification = false) => {
    setIsLoading(true);
    try {
      const params: any = { page, limit };
      
      // Agregar búsqueda por usuario si existe
      if (search && search.trim() !== '') {
        params.usuario = search.trim(); // Cambiamos 'search' por 'usuario' para ser más específico
        console.log('Buscando por usuario:', search.trim()); // Para debug
      }
      
      // Agregar filtro si no es "Todos"
      if (filtroEstado !== 'Todos') {
        params.filter = filtroEstado;
      }

      console.log('Parámetros enviados al servidor:', params); // Para debug

      const response = await axios.get(`${API_BASE_URL}/api/auth/password-change-solicitudes`, {
        params
      });
      const newSolicitudes = response.data.solicitudes;
      setSolicitudes(newSolicitudes);
      setTotalSolicitudes(response.data.totalCount || newSolicitudes.length);

      // Solo mostrar notificación en la carga inicial o cuando se especifique
      if (showNotification) {
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
      }
    } catch (error) {
      console.error('Error al cargar solicitudes:', error); // Para debug
      setError(true);
      setMessageError('Error al cargar las solicitudes');
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

      fetchSolicitudes(); // No mostrar notificación al procesar una solicitud
      fetchContadoresTotales(); // Actualizar contadores después de procesar
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
    fetchSolicitudes(true); // Solo mostrar notificación en la carga inicial
    fetchContadoresTotales(); // Cargar contadores iniciales
  }, []);

  useEffect(() => {
    // Debounce para la búsqueda
    const timeoutId = setTimeout(() => {
      console.log('UseEffect ejecutándose con:', { page, search, filtroEstado }); // Para debug
      fetchSolicitudes(); // No mostrar notificaciones en filtros/búsquedas
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [page, search, filtroEstado]);

  return (
    <Layout usuarioLogueado={usuarioLogueado}>
      <Head>
        <title>Gestionar Cambios de Contraseña - Mi Espacio</title>
        <meta name="description" content="Panel de administración para gestionar solicitudes de cambio de contraseña" />
      </Head>
      <div className={styles.container}>
        <ReactNotifications />
        <h1 className={styles.title}>
          <FontAwesomeIcon icon={faClipboardList} />
          Panel de Gestión de Contraseñas
        </h1>
        
        {errorMessage && (
          <div className={styles.labelError}>
            <strong>⚠️ Error:</strong> {errorMessage}
          </div>
        )}

        <div className={styles.infoCard}>
          <div className={styles.infoCardTitle}>Información Importante</div>
          <p className={styles.infoCardText}>
            Como administrador, puedes gestionar las solicitudes de cambio de contraseña de los usuarios. 
            Las solicitudes pendientes requieren tu atención para asignar una nueva contraseña temporal.
          </p>
        </div>
        
        <div className={styles.statsContainer}>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>{contadoresTotales.todos}</span>
            <span className={styles.statLabel}>📊 Total de Solicitudes</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber} style={{ color: '#ffa500' }}>
              {contadoresTotales.pendiente}
            </span>
            <span className={styles.statLabel}>⏳ Pendientes de Revisar</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber} style={{ color: '#28a745' }}>
              {contadoresTotales.aceptado}
            </span>
            <span className={styles.statLabel}>✅ Solicitudes Aceptadas</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber} style={{ color: '#dc3545' }}>
              {contadoresTotales.rechazado}
            </span>
            <span className={styles.statLabel}>❌ Solicitudes Rechazadas</span>
          </div>
        </div>

        <div className={styles.filterSection}>
          <div className={styles.filterTitle}>
            <FontAwesomeIcon icon={faFilter} />
            Filtrar solicitudes por estado
          </div>
          <div className={styles.filterOptions}>
            {['Todos', 'Pendiente', 'Aceptado', 'Rechazado'].map(estado => {
              let contador = 0;
              switch(estado) {
                case 'Todos': contador = contadoresTotales.todos; break;
                case 'Pendiente': contador = contadoresTotales.pendiente; break;
                case 'Aceptado': contador = contadoresTotales.aceptado; break;
                case 'Rechazado': contador = contadoresTotales.rechazado; break;
              }
              
              return (
                <button
                  key={estado}
                  className={`${styles.filterButton} ${filtroEstado === estado ? styles.active : ''}`}
                  onClick={() => setFiltroEstado(estado)}
                >
                  {estado === 'Todos' && '📋'} 
                  {estado === 'Pendiente' && '⏳'} 
                  {estado === 'Aceptado' && '✅'} 
                  {estado === 'Rechazado' && '❌'} 
                  {estado} ({contador})
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            marginBottom: '8px', 
            fontSize: '14px', 
            color: '#666',
            fontWeight: '500'
          }}>
            🔍 Buscar por nombre de usuario:
          </div>
          <SearchBar 
            searchTerm={search} 
            onSearchTermChange={handleSearchTermChange}
          />
          {search && (
            <div style={{ 
              marginTop: '10px', 
              padding: '8px 12px', 
              background: '#e3f2fd', 
              borderRadius: '6px', 
              fontSize: '14px',
              color: '#1976d2'
            }}>
              🔍 Buscando usuario: <strong>{search}</strong> 
              {isLoading && <span> - Cargando...</span>}
            </div>
          )}
        </div>

        {error ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>
              ⚠️
            </div>
            <p className={styles.emptyStateText}>{messageError}</p>
            <button type='button' onClick={handleReload} className={`${styles.button} ${styles.buttonAccept}`}>
              Volver a intentar
            </button>
          </div>
        ) : solicitudes.length === 0 && !isLoading ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>
              {filtroEstado === 'Todos' ? '📋' : 
               filtroEstado === 'Pendiente' ? '⏳' : 
               filtroEstado === 'Aceptado' ? '✅' : '❌'}
            </div>
            <p className={styles.emptyStateText}>
              {filtroEstado === 'Todos' 
                ? 'No hay solicitudes de cambio de contraseña registradas.' 
                : `No hay solicitudes con estado "${filtroEstado}".`}
            </p>
          </div>
        ) : (
          <div>
            {showScrollHint && solicitudes.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)',
                border: '1px solid #ffc107',
                borderRadius: '8px',
                padding: '10px 15px',
                marginBottom: '15px',
                fontSize: '13px',
                color: '#856404',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                📱 <strong>Consejo:</strong> Desliza horizontalmente en la tabla para ver todas las columnas
              </div>
            )}
            <div className={`${styles.tableContainer} ${isLoading ? styles.loadingOverlay : ''}`}>
              <div className={styles.tableScrollContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>👤 Usuario</th>
                      <th>📋 Información Personal</th>
                      <th>💬 Justificación</th>
                      <th>📊 Estado</th>
                      <th>📅 Fecha Solicitud</th>
                      <th>⚡ Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudes.map((solicitud, index) => (
                      <tr 
                        key={solicitud.PK_CAMBIO_PASSWORD_SOLICITUD}
                        className={solicitud.ESTADO === 'Pendiente' ? styles.priorityRow : ''}
                      >
                        <td>{(page - 1) * limit + index + 1}</td>
                        <td>
                          <div className={styles.userName}>
                            <FontAwesomeIcon icon={faUser} />
                            {solicitud.USU_NOMBRE}
                          </div>
                        </td>
                        <td>
                          <div className={styles.personalInfo}>
                            <div className={styles.fullName}>
                              {solicitud.PEI_NOMBRE} {solicitud.PEI_APELLIDO_PATERNO}
                            </div>
                            <div className={styles.emailText}>
                              📧 {solicitud.PEI_EMAIL_INSTITUCIONAL}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className={styles.justificationText}>
                            {solicitud.JUSTIFICACION}
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${
                            solicitud.ESTADO === 'Pendiente' ? styles.statusPendiente :
                            solicitud.ESTADO === 'Aceptado' ? styles.statusAceptado : styles.statusRechazado
                          }`}>
                            {solicitud.ESTADO === 'Pendiente' && '⏳'} 
                            {solicitud.ESTADO === 'Aceptado' && '✅'} 
                            {solicitud.ESTADO === 'Rechazado' && '❌'} 
                            {solicitud.ESTADO}
                          </span>
                        </td>
                        <td>
                          <div className={styles.dateText}>
                            {new Date(solicitud.FECHA_SOLICITUD).toLocaleDateString('es-ES')}
                          </div>
                        </td>
                        <td>
                          {solicitud.ESTADO === 'Pendiente' ? (
                            <div className={styles.actionsContainer}>
                              <div className={styles.actionStep}>
                                <div className={styles.stepLabel}>
                                  <span className={styles.stepNumber}>1</span>
                                  💬 Comentario
                                </div>
                                <input
                                  type="text"
                                  placeholder="Comentario (opcional)"
                                  value={comentarios[solicitud.PK_CAMBIO_PASSWORD_SOLICITUD] || ''}
                                  onChange={(e) => setComentarios(prev => ({
                                    ...prev,
                                    [solicitud.PK_CAMBIO_PASSWORD_SOLICITUD]: e.target.value
                                  }))}
                                  className={styles.input}
                                />
                              </div>
                              
                              <div className={styles.actionStep}>
                                <div className={styles.stepLabel}>
                                  <span className={styles.stepNumber}>2</span>
                                  🔑 Contraseña
                                </div>
                                <div className={styles.passwordContainer}>
                                  <input
                                    type={showPasswords[solicitud.PK_CAMBIO_PASSWORD_SOLICITUD] ? 'text' : 'password'}
                                    placeholder="Nueva contraseña"
                                    value={nuevasPasswords[solicitud.PK_CAMBIO_PASSWORD_SOLICITUD] || ''}
                                    onChange={(e) => setNuevasPasswords(prev => ({
                                      ...prev,
                                      [solicitud.PK_CAMBIO_PASSWORD_SOLICITUD]: e.target.value
                                    }))}
                                    className={`${styles.input} ${styles.passwordInput}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleShowPassword(solicitud.PK_CAMBIO_PASSWORD_SOLICITUD)}
                                    className={styles.passwordToggle}
                                  >
                                    <FontAwesomeIcon 
                                      icon={showPasswords[solicitud.PK_CAMBIO_PASSWORD_SOLICITUD] ? faEye : faEyeSlash} 
                                    />
                                  </button>
                                </div>
                              </div>
                              
                              <div className={styles.buttonGroup}>
                                <button
                                  onClick={() => handleAccion(solicitud.PK_CAMBIO_PASSWORD_SOLICITUD, 'Aceptado')}
                                  className={`${styles.button} ${styles.buttonAccept}`}
                                  disabled={isLoading}
                                  title="Aceptar solicitud"
                                >
                                  <FontAwesomeIcon icon={faCheckCircle} />
                                  Aprobar
                                </button>
                                <button
                                  onClick={() => handleAccion(solicitud.PK_CAMBIO_PASSWORD_SOLICITUD, 'Rechazado')}
                                  className={`${styles.button} ${styles.buttonReject}`}
                                  disabled={isLoading}
                                  title="Rechazar solicitud"
                                >
                                  <FontAwesomeIcon icon={faTimesCircle} />
                                  Rechazar
                                </button>
                              </div>
                              
                              <div className={styles.quickActionHint}>
                                💡 Para aprobar necesitas crear una contraseña temporal
                              </div>
                            </div>
                          ) : (
                            <div className={styles.processedText}>
                              ✅ Solicitud procesada exitosamente
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={7}>
                        <Pagination
                          page={page}
                          total={totalSolicitudes}
                          limit={limit}
                          onChange={handlePageChange}
                        />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}