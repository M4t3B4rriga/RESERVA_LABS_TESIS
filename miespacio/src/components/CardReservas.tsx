import React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { faUsers, faBuilding, faCheck, faTimes, faCalendarAlt, faGraduationCap, faUser, faBriefcase, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from '@/styles/CardReservas.module.css';
import Image from 'next/image';
import { RepasoInfo, ReservaInfo } from '@/libs/reserva';
import axios from 'axios';
import { ServicioEspecialReservas } from '@/libs/servicioEspecial';
import { EquipoForReservation } from '@/libs/equipo';
import { set } from 'date-fns';
import 'react-notifications-component/dist/theme.css'
import { Store } from 'react-notifications-component';
import { Auth } from '@/libs/auth';

interface CardReservasProps {
    imageUrl: string;
    reserva: ReservaInfo;
    usuarioLogueado: Auth | null;
    setSelectedReserva: (reserva: ReservaInfo) => void;
    setIsNestedModalOpen: (isOpen: boolean) => void;
    setAction: (action: string) => void;
}

interface EquiposPorTipo {
    [tipo: string]: EquipoForReservation[];
}

const CardReservas: React.FC<CardReservasProps> = ({ imageUrl, reserva, usuarioLogueado, setSelectedReserva, setIsNestedModalOpen, setAction }) => {
    const [src, setSrc] = useState(imageUrl);
    const [seeMore, setSeeMore] = useState(false);
    const [equipos, setEquipos] = useState([] as EquipoForReservation[]);
    const [serviciosEspeciales, setServiciosEspeciales] = useState([] as ServicioEspecialReservas[]);
    const [repasos, setRepasos] = useState([] as RepasoInfo[]);
    const [isLoading, setIsLoading] = useState(false);
    const [tiposDeEquipoUnicos, setTiposDeEquipoUnicos] = useState([] as number[]);

    const formatDate = (dateString: string) => {
        const options = { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' } as any;
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', options);
    };

    const fetchMoreData = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`/api/reserva/especificData?CodReserva=${reserva.CodReserva}`);
            if (response.status === 200) {
                console.log(response.data);
                setEquipos(response.data.equipos);
                setTiposDeEquipoUnicos(Array.from(new Set((response.data.equipos as EquipoForReservation[]).map((equipo) => equipo.CodTipoEquipo))));
                setServiciosEspeciales(response.data.serviciosEspeciales);
                setRepasos(response.data.repasos);
                setSeeMore(true);
            } else {
                setSeeMore(false);
                Store.addNotification({
                    title: "Ha ocurrido un problema",
                    message: "Lo sentimos ha ocurido un problema al editar el estado del servicio especial, vuelva a intentarlo más tarde.",
                    type: "danger",
                    insert: "top",
                    container: "top-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 2000,
                        onScreen: true,
                        pauseOnHover: true
                    }
                });
            }
        } catch (error) {
            console.error(error);
            setSeeMore(false);
            Store.addNotification({
                title: "Ha ocurrido un problema",
                message: "Lo sentimos ha ocurido un problema al editar el estado del servicio especial, vuelva a intentarlo más tarde.",
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 2000,
                    onScreen: true,
                    pauseOnHover: true
                }
            });
        }
        setIsLoading(false);
    };

    const handleSeeMore = () => {
        fetchMoreData();
    };

    const handleAccept = () => {
        setSelectedReserva(reserva);
        setIsNestedModalOpen(true);
        setAction('1');
    };

    const handleReject = () => {
        setSelectedReserva(reserva);
        setIsNestedModalOpen(true);
        setAction('0');
    };

    return (
        <div className={styles.card} key={reserva.CodReserva}>
            <div className={styles.image}>
                <Image
                    alt={reserva.NombreEspacio}
                    src={src}
                    width={100}
                    height={100}
                    placeholder="blur"
                    blurDataURL='/images/placeholder/placeholder.png'
                    onError={() => setSrc('/images/descarga.jpg')}
                    className={styles.img}
                />
            </div>
            <div className={styles.general_container}>
                <div className={styles.split_container}>
                    <div className={styles.title}>
                        {reserva.EstadoEspacio == '1' ? (
                            <Link href={`/espacios/${reserva.CodEspacio}`} className={styles.link}>
                                {reserva.NombreEspacio}
                            </Link>
                        ) : (
                            <div className={styles.red_color_hover} title='ESPACIO ELIMINADO'>
                                {reserva.NombreEspacio}
                            </div>
                        )}

                    </div>
                    {(() => {
                        // Verificar si el usuario tiene permisos de administrador (CodRol 1 o 2)
                        const isAdmin = usuarioLogueado && (usuarioLogueado.CodRol === 1 || usuarioLogueado.CodRol === 2);
                        
                        // Verificar si es dirigente del espacio
                        const isDirigente = usuarioLogueado && 
                            reserva.CodPersonaInternaDirigenteEspacio.split(',').map(Number).includes(usuarioLogueado.CodPersonaInterna);
                        
                        // Mostrar botones si es admin o dirigente y la solicitud está pendiente
                        const canManageRequest = (isAdmin || isDirigente) && reserva.EstadoSolicitud == '2';
                        
                        return canManageRequest && (
                            <div className={styles.buttons_container}>
                                {reserva.Dia >= new Date().toISOString().slice(0, 10) && (
                                    <button type="button" className={`${styles.solicitud_button} ${styles.accept}`} title='Aceptar' onClick={handleAccept}>
                                        <FontAwesomeIcon icon={faCheck} className={styles.button_icon} />
                                    </button>
                                )}
                                <button type="button" className={`${styles.solicitud_button} ${styles.deny}`} title='Rechazar' onClick={handleReject}>
                                    <FontAwesomeIcon icon={faTimes} className={styles.button_icon} />
                                </button>
                            </div>
                        );
                    })()}
                </div>
                <div className={styles.split_container}>
                    <div className={styles.info_reserva}>
                        <FontAwesomeIcon icon={faCalendarAlt} className={styles.card_icon_2} />
                        {formatDate(reserva.Dia)}
                        {` de ${reserva.HoraInicio.slice(0, 2)}h${reserva.HoraInicio.slice(3, 5)} a ${reserva.HoraFin.slice(0, 2)}h${reserva.HoraFin.slice(3, 5)}`}
                    </div>
                </div>
                <div className={styles.split_container}>
                    {reserva.EstadoSolicitud == '1' && (
                        <div className={`${styles.estado} ${styles.reservado}`}>
                            Reservado
                        </div>
                    )}
                    {reserva.EstadoSolicitud == '2' && (
                        <div className={`${styles.estado} ${styles.pendiente}`}>
                            Pendiente
                        </div>
                    )}
                    {reserva.EstadoSolicitud == '0' && (
                        <div className={`${styles.estado} ${styles.rechazado}`}>
                            Rechazado
                        </div>
                    )}
                </div>
                <div className={styles.split_container_2}>
                    <div className={styles.column}>
                        <div className={styles.info_container}>
                            <div className={`${styles.icon_info_reserva} ${styles.icon_user}`}><FontAwesomeIcon icon={faUser} /></div>
                            <div className={styles.responsable}>
                                {reserva.CodPersonaExterna !== null ? (
                                    <>
                                        Reservado para{' '}
                                        <span className={styles.reservas_space_responsable}>
                                            {reserva.OrganizacionPersonaExterna ? `${reserva.OrganizacionPersonaExterna} - ` : ''}
                                            {reserva.NombrePersonaExterna} {reserva.ApellidoPaternoPersonaExterna} por{' '}
                                            <Link href={`/reservas?filter=Persona-${reserva.CodPersonaInterna}`} className={styles.link}>
                                                {`${reserva.NombrePersonaInterna} ${reserva.ApellidoPaternoPersonaInterna}`}
                                            </Link>
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        Reservado por{' '}
                                        <span className={styles.reservas_space_responsable}>
                                            <Link href={`/reservas?filter=Persona-${reserva.CodPersonaInterna}`} className={styles.link}>
                                                {`${reserva.NombrePersonaInterna} ${reserva.ApellidoPaternoPersonaInterna}`}
                                            </Link>
                                        </span>
                                    </>
                                )}

                            </div>
                        </div>
                        {reserva.EventoAcademico === 1 && (
                            <div className={styles.info_container}>
                                <div className={styles.icon_info_reserva}><FontAwesomeIcon icon={faGraduationCap} /></div>
                                Evento Académico
                            </div>
                        )}

                    </div>
                    <div className={styles.column}>
                        {reserva.CodTipoEvento && (
                            <div className={styles.info_container} title={reserva.EstadoTipoEvento == '0' ? 'ELIMINADO' : reserva.NombreTipoEvento}>
                                <div className={`${styles.icon_info_reserva} ${reserva.EstadoTipoEvento == '0' ? styles.red_icon : styles.icon_evento}`}><FontAwesomeIcon icon={faBuilding} /></div>
                                {reserva.NombreTipoEvento}
                            </div>
                        )}
                        {!seeMore && (
                            <div className={styles.info_container}>
                                {isLoading ? (
                                    <div className={styles.load_icon}><FontAwesomeIcon icon={faSpinner} spin /></div>
                                ) : (
                                    <span className={styles.see_more} onClick={handleSeeMore}>Ver más...</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className={`${styles.hidden_column} ${seeMore ? styles.show : ''}`}>
                    <div className={styles.title_secondary}>Razón</div>
                    <div>{reserva.Razon}</div>
                    <div className={styles.more_info_container}>
                        {equipos.length > 0 && (
                            <div className={styles.more_info_column}>
                                <div className={styles.title_secondary}>Equipos</div>
                                <div className={styles.split_container_3}>
                                    {tiposDeEquipoUnicos.map((codTipoEquipo, index) => {
                                        const equiposPorTipo = equipos.filter((equipo) => equipo.CodTipoEquipo === codTipoEquipo);
                                        const nombreTipoEquipo = equiposPorTipo.length > 0 ? equiposPorTipo[0].NombreTipoEquipo : '';

                                        return (
                                            <div key={codTipoEquipo + index} className={styles.column}>
                                                <h5 className={styles.tipo_equipo_titulo}>{nombreTipoEquipo}</h5>
                                                <div className={styles.equipo_lista}>
                                                    {equiposPorTipo.map((equipo, index) => (
                                                        <div key={equipo.CodEquipo + index} className={styles.equipo_item}>
                                                            <div className={styles.nombre_equipo}>{equipo.NombreEquipo}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {serviciosEspeciales.length > 0 && (
                            <div className={styles.more_info_column}>
                                <div className={styles.title_secondary}>Servicios Especiales</div>
                                {serviciosEspeciales.map((servicioEspecial, index) => (
                                    <div key={servicioEspecial.CodServicioEspecial + index} className={styles.nombre_servicio_especial}>{servicioEspecial.NombreServicioEspecial}</div>
                                ))}
                            </div>
                        )}
                    </div>
                    {repasos.length > 0 && (
                        <>
                            <div className={styles.title_secondary}>Repasos</div>
                            {repasos.map((repaso, index) => (
                                <div key={repaso.CodRepaso + index} className={styles.info_reserva}>
                                    <FontAwesomeIcon icon={faCalendarAlt} className={styles.card_icon_2} />
                                    {formatDate(repaso.Dia)}
                                    {` de ${repaso.HoraInicio.slice(0, 2)}h${repaso.HoraInicio.slice(3, 5)} a ${repaso.HoraFin.slice(0, 2)}h${repaso.HoraFin.slice(3, 5)}`}
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CardReservas;