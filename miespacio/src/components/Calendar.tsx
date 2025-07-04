import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from '@/styles/Calendar.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faSpinner, faTrash, faCheck, faAngleRight, faGraduationCap, faClock, faCheckCircle, faCalendarAlt, faTimesCircle, faChalkboardTeacher } from '@fortawesome/free-solid-svg-icons';
import { Popper } from 'react-popper';
import { Formik, Form, Field, ErrorMessage, useFormikContext, FormikProps, FormikValues } from 'formik';
import * as Yup from 'yup';
import { ReactNotifications } from 'react-notifications-component'
import 'react-notifications-component/dist/theme.css'
import { Store } from 'react-notifications-component';
import axios from 'axios';
import { useRouter } from 'next/router';
import { ReservaEspacioCalendar, ReservaEspacioInfo } from '@/libs/reserva';
import { Slide } from '@mui/material';
import { API_BASE_URL } from '@/src/components/BaseURL';
import SearchBar from '@/src/components/SearchBar';
import { MakeReservation } from '@/src/components/MakeReservation';
import { Espacio } from '@/libs/espacios';
import ListEspaciosReserva from '@/src/components/ListEspaciosReserva';
import Modal from '@mui/material/Modal';
import { set } from 'date-fns';

type CloseModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}
interface AvailabilityBox {
    id: number;
    dayIndex: number;
    startHour: string;
    duration: number;
}

interface ReservationBox {
    day: Date;
    startHour: string;
    endHour: string;
}

interface InputAttributes {
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    duration: number;
}

interface LimitInputs {
    min: number;
    max: number;
}

interface DisponibilityScheduleProps {
    Espacio: number | null;
    isEditable: boolean;
    useRouteCodEspacio: boolean;
    format: string;
    date: Date;
    filters: string[],
    reservar: boolean;
}

function CloseReservation(props: CloseModalProps) {
    const { isOpen, onClose, onConfirm } = props;

    return (
        <Modal open={isOpen} onClose={onClose} className={styles.modal}>
            <div className={`${styles.card} ${styles.card_confirmation}`}>
                <h3>Confirmación</h3>
                <div>Si cierra esta ventana la reserva se perderá. ¿Está seguro?</div>
                <div className={styles.card_buttons_container}>
                    <button onClick={onClose} className={styles.cancel_button}>
                        No, cancelar
                    </button>
                    <button onClick={onConfirm} className={styles.confirm_button}>
                        Sí, cerrar
                    </button>
                </div>
            </div>
        </Modal>
    );
}

const NUMBER_HOURS = 16;
const START_HOUR = 6;
const MIN_DURATION = 29;
const MAX_DURATION = 16 * 60;

const Calendar = (props: DisponibilityScheduleProps) => {
    const { isEditable, useRouteCodEspacio } = props;
    const [CodEspacio, setCodEspacio] = useState<number | null>(props.Espacio);
    const [format, setFormat] = useState<string>(props.format);
    const [date, setDate] = useState<Date>(props.date);
    const [reservar, setReservar] = useState<boolean>(props.reservar);
    const [selectedCodReserva, setSelectedCodReserva] = useState<number | null>(null);
    const [selectedCodRepaso, setSelectedCodRepaso] = useState<number | null>(null);
    const [filters, setFilters] = useState<string[]>(props.filters);
    const [availabilityBoxes, setAvailabilityBoxes] = useState<AvailabilityBox[]>([]);
    const [newReservationBox, setNewReservationBox] = useState<ReservationBox[]>([]);
    const [repaso1, setRepaso1] = useState<ReservationBox[]>([]);
    const [repaso2, setRepaso2] = useState<ReservationBox[]>([]);
    const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const completeDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const containerDaysRef = useRef<HTMLDivElement>(null);
    const scheduleHeaderRef = useRef<HTMLDivElement>(null);
    const [showPopper, setShowPopper] = useState(false);
    const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);
    const [selectedBox, setSelectedBox] = useState<AvailabilityBox | null>(null);
    const [inputAttributes, setInputAttributes] = useState<InputAttributes>({ startHour: 0, startMinute: 0, endHour: 0, endMinute: 0, duration: 0 });
    const [startHourLimit, setStartHourLimit] = useState<LimitInputs>({ min: START_HOUR, max: START_HOUR + NUMBER_HOURS - 1 });
    const [startMinuteLimit, setStartMinuteLimit] = useState<LimitInputs>({ min: 0, max: 59 });
    const [endHourLimit, setEndHourLimit] = useState<LimitInputs>({ min: START_HOUR, max: START_HOUR + NUMBER_HOURS - 1 });
    const [endMinuteLimit, setEndMinuteLimit] = useState<LimitInputs>({ min: 0, max: 59 });
    const [durationLimit, setDurationLimit] = useState<LimitInputs>({ min: MIN_DURATION, max: MAX_DURATION });
    const [isHourError, setIsHourError] = useState(false);
    const [CodRestriccion, setCodRestriccion] = useState<number | null>(null);
    const router = useRouter();
    const { id } = router.query;
    const [openSlide, setOpenSlide] = useState(false);
    const [isSizeAdjusted, setIsSizeAdjusted] = useState(false);
    const slideRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const [showDisponibility, setShowDisponibility] = useState(false);
    const [reservas, setReservas] = useState<ReservaEspacioCalendar[]>([]);
    const [selectedReserva, setSelectedReserva] = useState<ReservaEspacioInfo | null>(null);
    const [search, setSearch] = useState('');
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    const [espaciosSearch, setEspaciosSearch] = useState<Espacio[]>();
    const [espaciosSearchTotal, setEspaciosSearchTotal] = useState(0);
    const [hasDataSearch, setHasDataSearch] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const modalSearchRef = useRef<HTMLDivElement>(null);
    const [selectedEspacio, setSelectedEspacio] = useState<any | null>(null);
    const [isReservaInfoLoading, setIsReservaInfoLoading] = useState(false);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);

    const handleCalendarSize = () => {
        if (headerRef.current && bodyRef.current && slideRef.current && !isSizeAdjusted) {
            const headerWidth = headerRef.current.clientWidth;
            const bodyWidth = bodyRef.current.clientWidth;
            const slideWidth = slideRef.current.clientWidth;

            const adjustedHeaderWidth = headerWidth - slideWidth;
            const adjustedBodyWidth = bodyWidth - slideWidth;

            headerRef.current.style.width = `${adjustedHeaderWidth}px`;
            bodyRef.current.style.width = `${adjustedBodyWidth}px`;

            headerRef.current.classList.add('animate-width');
            bodyRef.current.classList.add('animate-width');

            setIsSizeAdjusted(true);

            if (CodEspacio && CodEspacio !== undefined && CodEspacio !== null) {
                setReservar(true);
                setShowDisponibility(true);

                router.push({
                    pathname: '/',
                    query: {
                        format: format,
                        date: date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'),
                        filter: filters.join(','),
                        reservar: true,
                        espacio: CodEspacio
                    }
                });
            }

        }
        if (isSizeAdjusted && reservar === false) {
            if (CodEspacio && CodEspacio !== undefined && CodEspacio !== null) {
                setReservar(true);
                setShowDisponibility(true);

                router.push({
                    pathname: '/',
                    query: {
                        format: format,
                        date: date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'),
                        filter: filters.join(','),
                        reservar: true,
                        espacio: CodEspacio
                    }
                });
            }
        }
    };

    const handleOpenSlide = () => {
        setOpenSlide(true);
    };

    const checkCloseSlide = () => {
        if (openSlide && CodEspacio !== null && reservar === true && selectedEspacio !== null && availabilityBoxes.length > 0) {
            setIsConfirmationModalOpen(true);
        } else {
            handleCloseSlide();
        }
    }

    const handleCloseSlide = () => {
        setIsConfirmationModalOpen(false);
        if (isSizeAdjusted && headerRef.current && bodyRef.current) {
            headerRef.current.style.width = '';
            bodyRef.current.style.width = '';

            setIsSizeAdjusted(false);
        }
        setShowDisponibility(false);
        setOpenSlide(false);
        setCodEspacio(null);
        setSelectedCodReserva(null);
        setSelectedCodRepaso(null);
        setSelectedEspacio(null);
        setReservar(false);
        setNewReservationBox([]);
        setRepaso1([]);
        setRepaso2([]);
        router.push({
            pathname: '/',
            query: {
                format: format,
                date: date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'),
                filter: filters.join(','),
                reservar: false,
                espacio: null,
            }
        });
    };

    const fillWeekDates = (date: Date) => {
        const weekDates = [];
        let days = format === 's' ? 7 : 1;
        for (let i = 0; i < days; i++) {
            const newDate = new Date(date);
            newDate.setDate(newDate.getDate() + i);
            weekDates.push(newDate);
        }
        return weekDates;
    }
    const [weekDays, setWeekDays] = useState<Date[]>(fillWeekDates(date));

    const fetchReloadData = async (codigoEspacio: number) => {
        try {
            const CodigoRestriccion = '';
            const response = await axios.get('/api/espacios/uploadDisponibilityBox?CodRestriccion=' + CodigoRestriccion + '&CodEspacio=' + codigoEspacio);

            if (response.status === 200) {
                setCodRestriccion(response.data.CodRestriccion);
                setAvailabilityBoxes(response.data.AvaliabilityBoxes !== undefined ? response.data.AvaliabilityBoxes as AvailabilityBox[] : []);
            } else {
                Store.addNotification({
                    title: "Error",
                    message: "Hubo un error al consultar las restricciones. " + response.data.message,
                    type: "danger",
                    insert: "top",
                    container: "top-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 8000,
                        onScreen: true,
                        pauseOnHover: true,
                    }
                });
            }
        } catch (error) {
            console.error(error);
            Store.addNotification({
                title: "Error!",
                message: `Ocurrió un error al consultar las restricciones. ${error}`,
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 4000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
        }
    };

    const fetchReloadReservasData = async (filters: string[], format: string, date: Date, reservar: boolean) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/reserva/calendar`, {
                params: { filter: filters.join(','), format: format, date: date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'), reservar: reservar },
            });

            if (response.status === 200) {
                setReservas(response.data.reservas !== undefined ? response.data.reservas as ReservaEspacioCalendar[] : []);
            } else {
                Store.addNotification({
                    title: "Error",
                    message: "Hubo un error al consultar las reservas. " + response.data.message,
                    type: "danger",
                    insert: "top",
                    container: "top-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 8000,
                        onScreen: true,
                        pauseOnHover: true,
                    }
                });
            }
        } catch (error) {
            console.error(error);
            Store.addNotification({
                title: "Error!",
                message: `Ocurrió un error al consultar las reservas. ${error}`,
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 4000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
        }
    };


    const fetchInfoReservaData = async (CodReserva: number, CodRepaso: number | null) => {
        setIsReservaInfoLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/reserva/calendar/${CodReserva}?CodRepaso=${CodRepaso || ''}`);

            if (response.status === 200) {
                setSelectedReserva(response.data.reserva[0] !== undefined ? response.data.reserva[0] as ReservaEspacioInfo : null);
            } else {
                Store.addNotification({
                    title: "Error",
                    message: "Hubo un error al consultar la reserva. " + response.data.message,
                    type: "danger",
                    insert: "top",
                    container: "top-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 8000,
                        onScreen: true,
                        pauseOnHover: true,
                    }
                });
            }
        } catch (error) {
            console.error(error);
            Store.addNotification({
                title: "Error!",
                message: `Ocurrió un error al consultar la reserva. ${error}`,
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 4000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
        }
        setIsReservaInfoLoading(false);
    };

    useEffect(() => {
        if (CodEspacio !== undefined && CodEspacio !== null) {
            //fetchInfoReservaData(CodEspacio);
            fetchReloadData(CodEspacio);

            if (reservar === true) {
                const intervalId = setInterval(() => fetchReloadData(CodEspacio), 50000);
                // Limpia el intervalo cuando el componente se desmonta o cambia
                return () => {
                    clearInterval(intervalId);
                };
            }
        }
    }, [CodEspacio]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalSearchRef.current && !modalSearchRef.current.contains(event.target as Node)) {
                setShowSearchModal(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [modalSearchRef]);

    useEffect(() => {
        if (props.format !== undefined && props.format !== '') {
            setFormat(props.format);
        }
        if (props.date !== undefined) {
            setDate(props.date);
            setWeekDays(fillWeekDates(props.date));
        }
    }, [props.format, props.date]);

    useEffect(() => {
        setCodEspacio(props.Espacio);
        if ((props.Espacio !== undefined && props.Espacio !== null && reservar !== undefined && reservar !== null && reservar === true) || (props.Espacio !== undefined && props.Espacio !== null && props.reservar !== undefined && props.reservar !== null && props.reservar === true)) {
            setShowDisponibility(true);
            setNewReservationBox([]);
            setRepaso1([]);
            setRepaso2([]);
            const fetchData = async (CodEspacio: number) => {
                const newSelectedEspacio = await searchSelectedEspacio(CodEspacio);
                if (newSelectedEspacio === null || newSelectedEspacio.disponibilidad == '0') {
                    if (isSizeAdjusted && headerRef.current && bodyRef.current) {
                        headerRef.current.style.width = '';
                        bodyRef.current.style.width = '';

                        setIsSizeAdjusted(false);
                    }
                    setShowDisponibility(false);
                    setSelectedEspacio(null);
                    setOpenSlide(false);
                } else {
                    handleOpenSlide();
                    setTimeout(() => {
                        handleCalendarSize();
                    }, 200);
                    fetchReloadData(CodEspacio);
                }
            };
            fetchData(props.Espacio);
        } else if (reservar === false && (!props.Espacio || props.Espacio === undefined || props.Espacio === null || isNaN(props.Espacio))) {
            if (isSizeAdjusted && headerRef.current && bodyRef.current) {
                headerRef.current.style.width = '';
                bodyRef.current.style.width = '';

                setIsSizeAdjusted(false);
            }
            setShowDisponibility(false);
            setSelectedEspacio(null);
            setOpenSlide(false);
        }
    }, [props.Espacio]);

    useEffect(() => {
        if (props.reservar !== undefined && props.reservar !== null) {
            setReservar(props.reservar);
            if (CodEspacio !== null && CodEspacio !== undefined && props.reservar === true) {
                setNewReservationBox([]);
                setRepaso1([]);
                setRepaso2([]);
                setShowDisponibility(true);
                const fetchData = async (CodEspacio: number) => {
                    const newSelectedEspacio = await searchSelectedEspacio(CodEspacio);
                    if (newSelectedEspacio === null || newSelectedEspacio.disponibilidad == '0') {
                        if (isSizeAdjusted && headerRef.current && bodyRef.current) {
                            headerRef.current.style.width = '';
                            bodyRef.current.style.width = '';

                            setIsSizeAdjusted(false);
                        }
                        setShowDisponibility(false);
                        setSelectedEspacio(null);
                        setOpenSlide(false);
                    } else {
                        handleOpenSlide();
                        setTimeout(() => {
                            handleCalendarSize();
                        }, 200);
                    }
                };
                fetchData(CodEspacio);
            } else if (props.reservar === false && (!props.Espacio || props.Espacio === undefined || props.Espacio === null || isNaN(props.Espacio))) {
                if (isSizeAdjusted && headerRef.current && bodyRef.current) {
                    headerRef.current.style.width = '';
                    bodyRef.current.style.width = '';

                    setIsSizeAdjusted(false);
                }
                setShowDisponibility(false);
                setSelectedEspacio(null);
                setOpenSlide(false);
            }
        }
    }, [props.reservar]);

    useEffect(() => {
        if (props.filters !== undefined && props.filters !== null) {
            setFilters(props.filters);
        }
    }, [props.filters]);

    useEffect(() => {
        if (format !== undefined && date !== undefined && filters !== undefined) {
            fetchReloadReservasData(filters, format, date, reservar);
            const bucle = setInterval(() => fetchReloadReservasData(filters, format, date, reservar), 20000);
            // Limpia el intervalo cuando el componente se desmonta o cambia
            return () => {
                clearInterval(bucle);
            };
        }
    }, [format, date, filters, reservar]);

    const searchSelectedEspacio = async (NewCodEspacio: number) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/espacios/calendar/${NewCodEspacio}`);
            if (response.status === 200) {
                const imageUrl = response.data.espacio[0].NombreFoto ? response.data.espacio[0].RutaFoto + response.data.espacio[0].NombreFoto : '/images/descarga.jpg';

                const newSelectedEspacio = {
                    codEspacio: response.data.espacio[0].CodEspacio,
                    imageUrl: imageUrl,
                    nombreEspacio: response.data.espacio[0].NombreEspacio,
                    nombreTipoEspacio: response.data.espacio[0].NombreTipoEspacio,
                    disponibilidad: response.data.espacio[0].Disponibilidad,
                    capacidad: response.data.espacio[0].CapacidadEspacio,
                    diasAntelacion: response.data.espacio[0].DiasAntelacion,
                }

                setSelectedEspacio(newSelectedEspacio);
                return newSelectedEspacio;
            } else {
                Store.addNotification({
                    title: "Error",
                    message: "Hubo un error al consultar el espacio. " + response.data.message,
                    type: "danger",
                    insert: "top",
                    container: "top-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 8000,
                        onScreen: true,
                        pauseOnHover: true,
                    }
                });
                setSelectedEspacio(null);
                return null;
            }
        } catch (error) {
            console.error(error);
            Store.addNotification({
                title: "Ha ocurrido un problema al cargar el espacio",
                message: "Estamos teniendo problemas para cargar el espacio, por favor intente mas tarde.",
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 4500,
                    onScreen: true
                }
            });
            setSelectedEspacio(null);
            return null;
        }
    }

    //YA NO SE USA ELIMINAR SI SE REQUIERE
    const handleDayClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, dayIndex: number) => {
        const dayElement = event.currentTarget;
        const rect = dayElement.getBoundingClientRect();
        const y = event.clientY - rect.top;

        const rowHeight = dayElement.clientHeight / 24; // Dividir en 24 filas para las horas

        const startHour = '15:00';
        const duration = 45; // Duración del cuadro en minutos (ejemplo: 45 minutos)

        const newBox: AvailabilityBox = {
            id: 1,
            dayIndex,
            startHour,
            duration,
        };

        setAvailabilityBoxes([...availabilityBoxes, newBox]);

        // Guardar en la base de datos
        // Implementa la lógica para enviar newBox al servidor y almacenarlo en la base de datos
    };
    //FIN YA NO SE USA ELIMINAR SI SE REQUIERE

    const handleScroll = () => {
        if (containerDaysRef.current && scheduleHeaderRef.current) {
            scheduleHeaderRef.current.scrollLeft = containerDaysRef.current.scrollLeft;
        }
    };

    //YA NO SE USA ELIMINAR SI SE REQUIERE
    async function handleBoxClick(event: React.MouseEvent<HTMLDivElement>, day: number) {
        const container = event.currentTarget.parentElement;
        if (!container) {
            return;
        }

        const rect = container.getBoundingClientRect();
        const yPosition = Math.round(event.clientY - rect.top);
        const containerHeight = container.offsetHeight;

        const pixelsByHours = containerHeight / NUMBER_HOURS;

        let { clickedHour, clickedMinute } = calculateExactTime(yPosition, pixelsByHours);

        if (clickedMinute < 29) {
            clickedMinute = 0;
        } else {
            clickedMinute = 30;
        }

        const clickedPixels = calculatePixelsByTime(clickedHour, clickedMinute, pixelsByHours);

        const duration = NUMBER_HOURS + START_HOUR - 1 === clickedHour && clickedMinute >= 30 ? 29 : 59;

        const newBox: AvailabilityBox = {
            id: availabilityBoxes.length + 1,
            dayIndex: day,
            startHour: clickedHour + ':' + clickedMinute,
            duration: duration,
        };

        const isOverlapping = availabilityBoxes.some((box) => {
            if (box && box.dayIndex === day) {
                const boxStartPixels = calculatePixelsByTime(parseInt(box.startHour.split(':')[0]), parseInt(box.startHour.split(':')[1]), pixelsByHours);
                let boxEndPixels = calculateDurationToPixels(box.duration);
                let newBoxEndPixels = calculateDurationToPixels(newBox?.duration ?? 0);
                if (boxEndPixels && newBoxEndPixels) {
                    boxEndPixels += boxStartPixels;
                    newBoxEndPixels += clickedPixels;
                } else {
                    return false;
                }
                console.log('----------------------');
                console.log('boxStartPixels', boxStartPixels);
                console.log('boxEndPixels', boxEndPixels);
                console.log('clickedPixels', clickedPixels);
                console.log('newBoxEndPixels', newBoxEndPixels);

                return (
                    (clickedPixels >= boxStartPixels && clickedPixels < boxEndPixels) ||
                    (newBoxEndPixels > boxStartPixels && newBoxEndPixels <= boxEndPixels) ||
                    (clickedPixels <= boxStartPixels && newBoxEndPixels >= boxEndPixels)
                );
            }
            return false;
        });

        if (isOverlapping) {
            console.log('El nuevo Box se sobrepone a uno existente');
            return;
        }

        setAvailabilityBoxes([...availabilityBoxes, newBox]);
        closePopper();
        console.log(availabilityBoxes);

        if (CodEspacio === undefined || CodEspacio === null) {
            return;
        }

        try {
            const data = new FormData();
            data.append('CodEspacio', CodEspacio.toString());
            data.append('Dia', newBox.dayIndex.toString());
            data.append('HoraInicio', newBox.startHour);
            data.append('Duracion', newBox.duration.toString());
            data.append('HoraFin', calculateDurationToHour(newBox.duration, newBox.startHour));
            data.append('CodRestriccion', CodRestriccion?.toString() ?? '');

            const response = await axios.post('/api/espacios/uploadDisponibilityBox', data);

            if (response.status === 200) {
                console.log(response.data.message);
                console.log(response.data.CodRestriccion);
                console.log(response.data.CodHorario);
                console.log(response.data.AvaliabilityBoxes);
                setCodRestriccion(response.data.CodRestriccion);

                setAvailabilityBoxes(response.data.AvaliabilityBoxes !== undefined ? response.data.AvaliabilityBoxes as AvailabilityBox[] : []);
            } else {
                Store.addNotification({
                    title: "Error",
                    message: "Hubo un error al guardar la restricción. " + response.data.message,
                    type: "danger",
                    insert: "top",
                    container: "top-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 8000,
                        onScreen: true,
                        pauseOnHover: true,
                    }
                });
                setAvailabilityBoxes(response.data.AvaliabilityBoxes !== undefined ? response.data.AvaliabilityBoxes as AvailabilityBox[] : []);
            }
        } catch (error) {
            console.error(error);
            Store.addNotification({
                title: "Error!",
                message: `Ocurrió un error al subir las imágenes. ${error}`,
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 4000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
            setAvailabilityBoxes(availabilityBoxes.filter((box) => box.id !== newBox.id));
        }
    }
    //FIN YA NO SE USA ELIMINAR SI SE REQUIERE

    async function handleReservationDayClick(event: React.MouseEvent<HTMLDivElement>, day: Date) {
        const container = event.currentTarget.parentElement;
        if (!container) {
            return;
        }

        const rect = container.getBoundingClientRect();
        const yPosition = Math.round(event.clientY - rect.top);
        const containerHeight = container.offsetHeight;

        const pixelsByHours = containerHeight / NUMBER_HOURS;

        let { clickedHour, clickedMinute } = calculateExactTime(yPosition, pixelsByHours);

        if (clickedMinute < 29) {
            clickedMinute = 0;
        } else {
            clickedMinute = 30;
        }

        const clickedPixels = calculatePixelsByTime(clickedHour, clickedMinute, pixelsByHours);

        const duration = NUMBER_HOURS + START_HOUR - 1 === clickedHour && clickedMinute >= 30 ? 29 : 59;
        const endHour = calculateDurationToHour(duration, clickedHour + ':' + clickedMinute);

        const newBox: ReservationBox = {
            day,
            startHour: (clickedHour < 10 ? "0" + clickedHour : clickedHour) + ':' + (clickedMinute < 10 ? "0" + clickedMinute : clickedMinute),
            endHour,
        };

        const isInRestriction = availabilityBoxes.some((box) => {
            const reservationDay = day.getDay() === 0 ? 6 : day.getDay() - 1;

            if (box && box.dayIndex === reservationDay) {
                const boxStartPixels = calculatePixelsByTime(parseInt(box.startHour.split(':')[0]), parseInt(box.startHour.split(':')[1]), pixelsByHours);
                let boxEndPixels = calculateDurationToPixels(box.duration);
                let newBoxEndPixels = calculatePixelsByTime(parseInt(newBox.endHour.split(':')[0]), parseInt(newBox.endHour.split(':')[1]), pixelsByHours);
                if (boxEndPixels && newBoxEndPixels) {
                    boxEndPixels += boxStartPixels;
                } else {
                    return false;
                }
                console.log('----------------------');
                console.log('boxStartPixels', boxStartPixels);
                console.log('boxEndPixels', boxEndPixels);
                console.log('clickedPixels', clickedPixels);
                console.log('newBoxEndPixels', newBoxEndPixels);

                console.log('(clickedPixels >= boxStartPixels && clickedPixels < boxEndPixels)', (clickedPixels >= boxStartPixels && clickedPixels < boxEndPixels));
                console.log('(newBoxEndPixels > boxStartPixels && newBoxEndPixels <= boxEndPixels)', (newBoxEndPixels > boxStartPixels && newBoxEndPixels <= boxEndPixels));

                return (
                    (clickedPixels >= boxStartPixels && clickedPixels < boxEndPixels) &&
                    (newBoxEndPixels > boxStartPixels && newBoxEndPixels <= boxEndPixels)
                );
            }
            return false;
        });

        if (!isInRestriction) {
            console.log('No esta dentro de un box existente');
            return;
        }

        if (CodEspacio === undefined || CodEspacio === null) {
            console.log('No hay espacio seleccionado');
            return;
        }

        const fechaActual = new Date();

        const diferenciaMilisegundos = newBox.day.getTime() - fechaActual.getTime();
        const diferenciaDias = Math.floor(diferenciaMilisegundos / (1000 * 3600 * 24));

        if (diferenciaDias < parseInt(selectedEspacio.diasAntelacion as string)) {
            Store.addNotification({
                title: "Reserva no permitida",
                message: `La reserva debe realizarse con ${selectedEspacio.diasAntelacion} días de antelación`,
                type: "info",
                insert: "bottom",
                container: "bottom-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 8000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
            return;
        }

        const isOverlapping = reservas.some((box) => {
            const reservationDay = day.getDay() === 0 ? 6 : day.getDay() - 1;
            const boxDay = new Date(box.Dia);
            if (box && boxDay.toDateString() === day.toDateString() && box.CodEspacio === CodEspacio) {
                const boxStartPixels = calculatePixelsByTime(parseInt(box.HoraInicio.split(':')[0]), parseInt(box.HoraInicio.split(':')[1]), pixelsByHours);
                let boxEndPixels = calculatePixelsByTime(parseInt(box.HoraFin.split(':')[0]), parseInt(box.HoraFin.split(':')[1]), pixelsByHours);
                let newBoxEndPixels = calculatePixelsByTime(parseInt(newBox.endHour.split(':')[0]), parseInt(newBox.endHour.split(':')[1]), pixelsByHours);
                if (!boxEndPixels || !newBoxEndPixels) {
                    return false;
                }
                console.log('----------------------');
                console.log('boxStartPixels', boxStartPixels);
                console.log('boxEndPixels', boxEndPixels);
                console.log('clickedPixels', clickedPixels);
                console.log('newBoxEndPixels', newBoxEndPixels);

                return (
                    (clickedPixels >= boxStartPixels && clickedPixels < boxEndPixels) ||
                    (newBoxEndPixels > boxStartPixels && newBoxEndPixels <= boxEndPixels) ||
                    (clickedPixels <= boxStartPixels && newBoxEndPixels >= boxEndPixels)
                );
            }
            return false;
        });

        if (isOverlapping) {
            Store.addNotification({
                title: "Colisión",
                message: "Parece que ya esta reservado el espacio en ese horario.",
                type: "info",
                insert: "bottom",
                container: "bottom-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 8000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
            return;
        }
        console.log(newBox);
        setNewReservationBox([newBox]);

        try {
            const response = await axios.get(`${API_BASE_URL}/api/reserva/calendar/checkColition?CodEspacio=${CodEspacio}&Dia=${day.getFullYear()}-${(day.getMonth() + 1).toString().padStart(2, '0')}-${day.getDate().toString().padStart(2, '0')}&HoraInicio=${newBox.startHour}&HoraFin=${newBox.endHour}`);

            if (response.status === 200) {
                //setNewReservationBox(newBox);
            } else {
                Store.addNotification({
                    title: "Reserva no permitida",
                    message: response.data.message,
                    type: "info",
                    insert: "bottom",
                    container: "bottom-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 8000,
                        onScreen: true,
                        pauseOnHover: true,
                    }
                });
                setNewReservationBox([]);
            }
        } catch (error) {
            console.error(error);
            Store.addNotification({
                title: "Error!",
                message: `Ocurrió un error al seleccionar el horario de la reserva. ${error}`,
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 4000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
            setNewReservationBox([]);
        }
    }

    function calculateExactTime(yPosition: number, pixelsByHours: number) {
        const clickedHour = START_HOUR + Math.floor(yPosition / pixelsByHours);
        const clickedMinute = Math.round((yPosition % pixelsByHours) / (pixelsByHours / 60));

        return { clickedHour, clickedMinute };
    }

    function calculatePixelsByTime(hour: number, minute: number, pixelsByHours: number) {
        const hourPosition = hour - START_HOUR;
        const minutePosition = Math.round((minute / 60) * pixelsByHours);
        const yPosition = hourPosition * pixelsByHours + minutePosition;

        return yPosition;
    }

    function calculateTimeToPixels(data: string) {
        if (!containerDaysRef.current) {
            return;
        }
        const hour = parseInt(data.split(':')[0]);
        const minute = parseInt(data.split(':')[1]);
        const pixelsByHours = containerDaysRef.current?.offsetHeight / NUMBER_HOURS;
        const hourPosition = hour - START_HOUR;
        const minutePosition = Math.round((minute / 60) * pixelsByHours);
        const yPosition = hourPosition * pixelsByHours + minutePosition;

        return yPosition;
    }

    function calculateDurationToPixels(duration: number) {
        if (!containerDaysRef.current) {
            return;
        }
        const pixelsByHours = containerDaysRef.current?.offsetHeight / NUMBER_HOURS;
        const pixelsByDuration = Math.round((duration / 60) * pixelsByHours);

        return pixelsByDuration;
    }

    function calculateDurationToHour(duration: number, startHour: string) {
        const hour = parseInt(startHour.split(':')[0]);
        const minute = parseInt(startHour.split(':')[1]);
        const durationHour = Math.floor(duration / 60);
        const durationMinute = duration % 60;
        let newHour = hour + durationHour;
        let newMinute = minute + durationMinute;

        if (newMinute >= 60) {
            newHour += Math.floor(newMinute / 60);
            newMinute = newMinute % 60;
        }

        const newHourString = newHour.toString().padStart(2, '0');
        const newMinuteString = newMinute.toString().padStart(2, '0');
        const newHourStringFormat = newHourString + ':' + newMinuteString;

        return newHourStringFormat;
    }

    const calculateLimits = (box: AvailabilityBox) => {
        const startHour = parseInt(box.startHour.split(':')[0]);
        const startMinute = parseInt(box.startHour.split(':')[1]);
        const duration = box.duration;
        const endHour = parseInt(calculateDurationToHour(duration, box.startHour).split(':')[0]);
        const endMinute = parseInt(calculateDurationToHour(duration, box.startHour).split(':')[1]);
        const currentDay = box.dayIndex;

        const startMyBoxHour = new Date();
        startMyBoxHour.setHours(parseInt(box.startHour.split(':')[0]));
        startMyBoxHour.setMinutes(parseInt(box.startHour.split(':')[1]));
        startMyBoxHour.setSeconds(0);

        const endMyBoxHour = new Date();
        endMyBoxHour.setHours(endHour);
        endMyBoxHour.setMinutes(endMinute);
        endMyBoxHour.setSeconds(0);

        const sameDayBoxes = availabilityBoxes.filter((b) => b.dayIndex === currentDay && b.id !== box.id);

        const startHourLimits = {
            min: START_HOUR, // Valor mínimo predeterminado
            max: START_HOUR + NUMBER_HOURS - 1, // Valor máximo predeterminado
        };

        const endHourLimits = {
            min: parseInt(calculateDurationToHour(MIN_DURATION, box.startHour).split(':')[0]), // Valor mínimo predeterminado
            max: START_HOUR + NUMBER_HOURS - 1, // Valor máximo predeterminado
        };

        const startMinuteLimits = {
            min: 0, // Valor mínimo predeterminado
            max: 59, // Valor máximo predeterminado
        };

        const endMinuteLimits = {
            min: parseInt(calculateDurationToHour(MIN_DURATION, box.startHour).split(':')[1]), // Valor mínimo predeterminado
            max: 59, // Valor máximo predeterminado
        };

        const durationLimits = {
            min: 0, // Valor mínimo predeterminado
            max: MAX_DURATION, // Valor máximo predeterminado
        };

        console.log('--------------------------');

        // Actualizar los límites en base a las boxes en el mismo día
        sameDayBoxes.forEach((b) => {
            const bStartHour = parseInt(b.startHour.split(':')[0]);
            const bEndDate = calculateDurationToHour(b.duration, b.startHour);

            const startHourBox = new Date();
            startHourBox.setHours(parseInt(b.startHour.split(':')[0]));
            startHourBox.setMinutes(parseInt(b.startHour.split(':')[1]));
            startHourBox.setSeconds(0);

            const endHourBox = new Date();
            endHourBox.setHours(parseInt(bEndDate.split(':')[0]));
            endHourBox.setMinutes(parseInt(bEndDate.split(':')[1]));
            endHourBox.setSeconds(0);

            console.log('bStartHour', bStartHour);
            console.log('bEndDate', bEndDate);
            console.log('b.startHour', b.startHour);
            console.log('startBox', startHourBox);
            console.log('endBox', endHourBox);
            console.log('endHourBox.getHours()', endHourBox.getHours());
            console.log('startHourLimits', startHourLimits);
            console.log('startMyBoxHour', startMyBoxHour);
            console.log('endMyBoxHour', endMyBoxHour);

            if (startMyBoxHour > endHourBox) {
                startHourLimits.min = Math.max(startHourLimits.min, endHourBox.getHours());
                startMinuteLimits.min = Math.max(startMinuteLimits.min, startMyBoxHour.getHours() === endHourBox.getHours() ? endHourBox.getMinutes() : 0);
                const newEndHourBox = calculateDurationToHour(MIN_DURATION, box.startHour);
                console.log('newEndHourBox', newEndHourBox);
                endHourLimits.min = Math.max(endHourLimits.min, parseInt(newEndHourBox.split(':')[0]));
                endMinuteLimits.min = Math.max(endMinuteLimits.min, startMyBoxHour.getHours() === endHourBox.getHours() ? parseInt(newEndHourBox.split(':')[1]) : 0);
            } else {

            }

            /* if (bStartHour < startHour) {
                startHourLimits.min = Math.max(startHourLimits.min, bEndHour);
            }

            if (bEndHour > endHour) {
                endHourLimits.max = Math.min(endHourLimits.max, bStartHour);
            }

            if (bStartHour === startHour) {
                startMinuteLimits.min = Math.max(startMinuteLimits.min, parseInt(b.startHour.split(':')[1]) + b.duration);
            }

            if (bEndHour === endHour) {
                endMinuteLimits.max = Math.min(endMinuteLimits.max, parseInt(calculateDurationToHour(b.duration, b.startHour).split(':')[1]) - startMinute);
            } */
        });

        /*         // Actualizar el límite máximo de la duración según los límites de las horas finales
                durationLimits.max = Math.min(durationLimits.max, calculateDuration(endHourLimits.max.toString(), '20'));
         */

        console.log('startHourLimits', startHourLimits);
        console.log('startMinuteLimits', startMinuteLimits);
        console.log('endHourLimits', endHourLimits);

        console.log('endMinuteLimits', endMinuteLimits);
        /*console.log('durationLimits', durationLimits); */

        /* setStartHourLimit({ min: , max:  });
        setEndHourLimit({ min: , max:  });
        setStartMinuteLimit({ min: , max:  });
        setEndMinuteLimit({ min: , max:  });
        setDurationLimit({ min: , max:  }); */
    }

    const checkForColisions = () => {
        setIsHourError(false);
        let result = false;
        if (selectedBox) {
            const currentDay = selectedBox.dayIndex;

            const startSelBoxHour = new Date();
            startSelBoxHour.setHours(inputAttributes.startHour);
            startSelBoxHour.setMinutes(inputAttributes.startMinute);
            startSelBoxHour.setSeconds(0);

            const endSelBoxHour = new Date();
            endSelBoxHour.setHours(inputAttributes.endHour);
            endSelBoxHour.setMinutes(inputAttributes.endMinute);
            endSelBoxHour.setSeconds(0);

            const sameDayBoxes = availabilityBoxes.filter((b) => b.dayIndex === currentDay && b.id !== selectedBox.id);

            sameDayBoxes.forEach((b) => {
                const bStartHour = parseInt(b.startHour.split(':')[0]);
                const bEndDate = calculateDurationToHour(b.duration, b.startHour);

                const startHourBox = new Date();
                startHourBox.setHours(parseInt(b.startHour.split(':')[0]));
                startHourBox.setMinutes(parseInt(b.startHour.split(':')[1]));
                startHourBox.setSeconds(0);

                const endHourBox = new Date();
                endHourBox.setHours(parseInt(bEndDate.split(':')[0]));
                endHourBox.setMinutes(parseInt(bEndDate.split(':')[1]));
                endHourBox.setSeconds(0);

                if (
                    (startSelBoxHour >= startHourBox && startSelBoxHour <= endHourBox) ||
                    (endSelBoxHour >= startHourBox && endSelBoxHour <= endHourBox) ||
                    (startSelBoxHour <= startHourBox && endSelBoxHour >= endHourBox)
                ) {
                    console.log('Hay una colisión');
                    setIsHourError(true);
                    result = true;
                }
            });

            return result;
        } else {
            console.log('No hay caja seleccionada');
            return false;
        }
    }

    const checkAmounthOFColisions = (reserva: ReservaEspacioCalendar) => {
        let colisions = 0;
        if (reserva) {
            const currentDay = new Date(reserva.Dia);

            const startSelBoxHour = new Date();
            startSelBoxHour.setHours(parseInt(reserva.HoraInicio.split(':')[0]));
            startSelBoxHour.setMinutes(parseInt(reserva.HoraInicio.split(':')[1]));
            startSelBoxHour.setSeconds(0);

            const endSelBoxHour = new Date();
            endSelBoxHour.setHours(parseInt(reserva.HoraFin.split(':')[0]));
            endSelBoxHour.setMinutes(parseInt(reserva.HoraFin.split(':')[1]));
            endSelBoxHour.setSeconds(0);

            const sameDayBoxes = reservas.filter((b) => {
                const bDate = new Date(b.Dia);
                if (reserva.CodRepaso) return (bDate.toDateString() === currentDay.toDateString() && b.CodRepaso !== reserva.CodRepaso)
                else return (bDate.toDateString() === currentDay.toDateString() && b.CodReserva !== reserva.CodReserva)
            });

            sameDayBoxes.forEach((b) => {
                const startHourBox = new Date();
                startHourBox.setHours(parseInt(b.HoraInicio.split(':')[0]));
                startHourBox.setMinutes(parseInt(b.HoraInicio.split(':')[1]));
                startHourBox.setSeconds(0);

                const endHourBox = new Date();
                endHourBox.setHours(parseInt(b.HoraFin.split(':')[0]));
                endHourBox.setMinutes(parseInt(b.HoraFin.split(':')[1]));
                endHourBox.setSeconds(0);

                if (
                    (startSelBoxHour >= startHourBox && startSelBoxHour <= endHourBox) ||
                    (endSelBoxHour >= startHourBox && endSelBoxHour <= endHourBox) ||
                    (startSelBoxHour <= startHourBox && endSelBoxHour >= endHourBox)
                ) {
                    colisions++;
                }
            });
        } else {
            console.log('No hay caja seleccionada');
        }

        return colisions;
    }

    const handleReservaClick = (event: React.MouseEvent<HTMLElement>, reserva: ReservaEspacioCalendar) => {
        if (!(openSlide && CodEspacio !== null && reservar === true && selectedEspacio !== null && availabilityBoxes.length > 0)) {
            if (reserva !== undefined && reserva.CodReserva !== null) {
                if (reserva.CodRepaso !== null) setSelectedCodRepaso(reserva.CodRepaso);
                else setSelectedCodRepaso(null);
                setSelectedCodReserva(reserva.CodReserva);
                setCodEspacio(reserva.CodEspacio);
                fetchInfoReservaData(reserva.CodReserva, reserva.CodRepaso !== null ? reserva.CodRepaso : null);
                router.push({
                    pathname: '/',
                    query: {
                        format: format,
                        date: date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'),
                        filter: filters.join(','),
                        reservar: false,
                        espacio: reserva.CodEspacio,
                    }
                });
            }
            handleOpenSlide();
        }
    }

    const closePopper = () => {
        setShowPopper(false);
        setReferenceElement(null);
    };

    const calculateEndHour = (startHour: number, startMinute: number, duration: number) => {
        const totalMinutes = startHour * 60 + startMinute + duration;
        return Math.floor(totalMinutes / 60);
    };

    const calculateEndMinute = (startHour: number, startMinute: number, endHour: number, duration: number) => {
        const totalMinutes = startHour * 60 + startMinute + (endHour - startHour) * 60 + duration;
        return totalMinutes % 60;
    };

    const calculateDuration = (startHour: number, startMinute: number, endHour: number, endMinute: number) => {
        const totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
        return totalMinutes;
    };

    const validationSchema = Yup.object().shape({
        startHour: Yup.number()
            .integer('La hora debe ser un número entero positivo')
            .min(startHourLimit.min, `La hora no puede ser menor a ${startHourLimit.min}h`)
            .max(startHourLimit.max, `La hora no puede ser mayor a ${startHourLimit.max}h`)
            .required('Este campo es requerido'),
        startMinute: Yup.number()
            .integer('La hora inicial debe ser un número entero positivo')
            .min(startMinuteLimit.min, `La hora no puede ser menor a ${startMinuteLimit.min}m`)
            .max(startMinuteLimit.max, `La hora no puede ser mayor a ${startMinuteLimit.max}m`)
            .required('Este campo es requerido'),
        endHour: Yup.number()
            .integer('La hora final debe ser un número entero positivo')
            .min(endHourLimit.min, `La hora no puede ser menor a ${endHourLimit.min}h`)
            .max(endHourLimit.max, `La hora no puede ser mayor a ${endHourLimit.max}h`)
            .required('Este campo es requerido'),
        endMinute: Yup.number()
            .integer('La hora final debe ser un número entero positivo')
            .min(endMinuteLimit.min, `La hora no puede ser menor a ${endMinuteLimit.min}m`)
            .max(endMinuteLimit.max, `La hora no puede ser mayor a ${endMinuteLimit.max}m`)
            .required('Este campo es requerido'),
        duration: Yup.number()
            .integer('Debe ingresar número entero positivo')
            .min(durationLimit.min, `No puede ser menor a ${durationLimit.min}m`)
            .max(durationLimit.max, `No puede ser mayor a ${durationLimit.max}m`)
            .required('Este campo es requerido'),
    });

    const initialValues = {
        startHour: START_HOUR,
        startMinute: 0,
        endHour: START_HOUR,
        endMinute: 0,
        duration: 0,
    };

    const saveChange = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
        setSubmitting(true);
        if (!checkForColisions() && selectedBox) {

            resetForm();
            closePopper();
            const oldAvaliabilityBoxes = availabilityBoxes;
            const updatedBoxes = availabilityBoxes.map((box) => {
                if (box.id === selectedBox?.id) {
                    return {
                        ...box,
                        startHour: inputAttributes.startHour + ':' + inputAttributes.startMinute,
                        duration: inputAttributes.duration,
                    };
                }
                return box;
            });

            if (CodEspacio === null) {
                return;
            }

            setAvailabilityBoxes(updatedBoxes);

            try {
                const data = new FormData();
                console.log('CodRestriccion: ' + CodRestriccion);
                data.append('CodEspacio', CodEspacio.toString());
                data.append('CodRestriccion', CodRestriccion?.toString() || '');
                data.append('Id', selectedBox?.id.toString());
                data.append('Dia', selectedBox?.dayIndex.toString() || '');
                data.append('HoraInicio', inputAttributes.startHour + ':' + inputAttributes.startMinute);
                data.append('Duracion', inputAttributes.duration.toString());
                data.append('HoraFin', inputAttributes.endHour + ':' + inputAttributes.endMinute);

                const response = await axios.put('/api/espacios/uploadDisponibilityBox', data);

                if (response.status === 200) {
                    console.log(response.data.message);
                    console.log(response.data.AvaliabilityBoxes);
                    setCodRestriccion(response.data.CodRestriccion);
                    setAvailabilityBoxes(response.data.AvaliabilityBoxes !== undefined ? response.data.AvaliabilityBoxes as AvailabilityBox[] : []);
                } else {
                    Store.addNotification({
                        title: "Error",
                        message: "Hubo un error al guardar la restricción. " + response.data.message,
                        type: "danger",
                        insert: "top",
                        container: "top-left",
                        animationIn: ["animate__animated", "animate__fadeIn"],
                        animationOut: ["animate__animated", "animate__fadeOut"],
                        dismiss: {
                            duration: 8000,
                            onScreen: true,
                            pauseOnHover: true,
                        }
                    });
                    setAvailabilityBoxes(oldAvaliabilityBoxes);
                }
            } catch (error) {
                console.error(error);
                Store.addNotification({
                    title: "Error!",
                    message: `Ocurrió un error al guardar. ${error}`,
                    type: "danger",
                    insert: "top",
                    container: "top-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 4000,
                        onScreen: true,
                        pauseOnHover: true,
                    }
                });
                // se revierte el cambio en el box
                setAvailabilityBoxes(oldAvaliabilityBoxes);
            }
        }
        setSubmitting(false);
    };

    const todayDate = () => {
        const today = new Date();
        today.setDate(today.getDate());
        return today;
    }

    function handleSearchTermChange(newSearchTerm: string) {
        setIsSearchLoading(true);
        setSearch(newSearchTerm);
        setShowSearchModal(true);
        if (newSearchTerm !== '') {
            try {
                const fetchSearchData = async () => {
                    const response = await axios.get(`${API_BASE_URL}/api/espacios`, {
                        params: { page: 1, limit: 5, search: newSearchTerm, filter: 'Disponibilidad-1', orderBy: 'ESP_NOMBRE', orderDir: 'ASC' },
                    });
                    setEspaciosSearchTotal(response.data.totalCount);
                    if (response.data.espacio.length === 0) {
                        setHasDataSearch(false);
                        setEspaciosSearch([]);
                    } else {
                        setHasDataSearch(true);
                        setEspaciosSearch(response.data.espacio);
                    }
                }
                fetchSearchData();
            } catch (error) {
                console.error(error);
                Store.addNotification({
                    title: "Ha ocurrido un problema al cargar la búsqueda",
                    message: "Estamos teniendo problemas para cargar la búsqueda, por favor intente mas tarde.",
                    type: "danger",
                    insert: "top",
                    container: "top-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 4500,
                        onScreen: true
                    }
                });
            }
        } else {
            setHasDataSearch(false);
            setEspaciosSearch([]);
        }
        setIsSearchLoading(false);
    };

    const handleLoadSearchResults = async () => {
        setShowSearchModal(false);
        router.push({
            pathname: '/espacios',
            query: {
                search: search,
                filter: filters.join(','),
                orderBy: 'ESP_NOMBRE',
                orderDir: 'ASC'
            }
        });
    };

    const handleWeekDayClick = (event: React.MouseEvent<HTMLDivElement>, day: Date) => {
        if (CodEspacio !== undefined && CodEspacio !== null && reservar === true && selectedEspacio !== null) {
            handleReservationDayClick(event, day);
        }
        handleOpenSlide();
    }

    const handleStartReservation = () => {
        if (selectedEspacio !== null) {
            setCodEspacio(selectedEspacio.codEspacio);
            setReservar(true);
            router.push({
                pathname: '/',
                query: {
                    format: format,
                    date: date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'),
                    filter: filters.join(','),
                    reservar: true,
                    espacio: selectedEspacio.codEspacio,
                }
            });
            handleCalendarSize();
        }
    }

    const handleChangeNewReservationBox = async (reservationBox: ReservationBox) => {
        if (!reservationBox) {
            Store.addNotification({
                title: "Reserva no permitida",
                message: `No se ha especificado una agenda`,
                type: "info",
                insert: "bottom",
                container: "bottom-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 8000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
            return false;
        }

        if (!containerDaysRef.current) {
            return false;
        }

        const fechaActual = new Date();

        const diferenciaMilisegundos = reservationBox.day.getTime() - fechaActual.getTime();
        const diferenciaDias = Math.floor(diferenciaMilisegundos / (1000 * 3600 * 24));

        if (diferenciaDias < parseInt(selectedEspacio.diasAntelacion as string)) {
            Store.addNotification({
                title: "Reserva no permitida",
                message: `La reserva debe realizarse con ${selectedEspacio.diasAntelacion} días de antelación`,
                type: "info",
                insert: "bottom",
                container: "bottom-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 8000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
            return false;
        }

        if ((reservationBox.startHour === '' || reservationBox.endHour === '') && reservationBox.day !== null) {
            const isInRestriction = availabilityBoxes.some((box) => {
                const reservationDay = reservationBox.day.getDay() === 0 ? 6 : reservationBox.day.getDay() - 1;

                if (box && box.dayIndex === reservationDay) {
                    return true;
                }
            });
            console.log("isInRestriction", isInRestriction);
            return isInRestriction;
        }

        const parseTimeToMinutes = (time: string) => {
            const [hours, minutes] = time.split(':');
            return parseInt(hours) * 60 + parseInt(minutes);
        };

        const startMinutes = parseTimeToMinutes(reservationBox.startHour);
        const endMinutes = parseTimeToMinutes(reservationBox.endHour);
        const timeDifference = endMinutes - startMinutes;

        if (timeDifference < 29) {
            Store.addNotification({
                title: "Reserva no permitida",
                message: `La reserva debe tener mínimo 29 minutos de duración`,
                type: "info",
                insert: "bottom",
                container: "bottom-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 8000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
            return false;
        }

        const pixelsByHours = containerDaysRef.current?.offsetHeight / NUMBER_HOURS;

        const isInRestriction = availabilityBoxes.some((box) => {
            const reservationDay = reservationBox.day.getDay() === 0 ? 6 : reservationBox.day.getDay() - 1;

            if (box && box.dayIndex === reservationDay) {
                const boxStartPixels = calculatePixelsByTime(parseInt(box.startHour.split(':')[0]), parseInt(box.startHour.split(':')[1]), pixelsByHours);
                let boxEndPixels = calculateDurationToPixels(box.duration);
                let newBoxStartPixels = calculatePixelsByTime(parseInt(reservationBox.startHour.split(':')[0]), parseInt(reservationBox.startHour.split(':')[1]), pixelsByHours);
                let newBoxEndPixels = calculatePixelsByTime(parseInt(reservationBox.endHour.split(':')[0]), parseInt(reservationBox.endHour.split(':')[1]), pixelsByHours);
                if (boxEndPixels && newBoxEndPixels) {
                    boxEndPixels += boxStartPixels;
                } else {
                    return false;
                }
                console.log('----------------------');
                console.log('boxStartPixels', boxStartPixels);
                console.log('boxEndPixels', boxEndPixels);
                console.log('clickedPixels', newBoxStartPixels);
                console.log('newBoxEndPixels', newBoxEndPixels);

                console.log('(clickedPixels >= boxStartPixels && clickedPixels < boxEndPixels)', (newBoxStartPixels >= boxStartPixels && newBoxStartPixels < boxEndPixels));
                console.log('(newBoxEndPixels > boxStartPixels && newBoxEndPixels <= boxEndPixels)', (newBoxEndPixels > boxStartPixels && newBoxEndPixels <= boxEndPixels));

                return (
                    (newBoxStartPixels >= boxStartPixels && newBoxStartPixels < boxEndPixels) &&
                    (newBoxEndPixels > boxStartPixels && newBoxEndPixels <= boxEndPixels)
                );
            }
            return false;
        });

        if (!isInRestriction) {
            console.log('No esta dentro de un box existente');
            Store.addNotification({
                title: "Reserva no permitida",
                message: `La reserva no se encuentra dentro de un horario disponible`,
                type: "info",
                insert: "bottom",
                container: "bottom-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 8000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
            return false;
        }

        if (CodEspacio === undefined || CodEspacio === null) {
            console.log('No hay espacio seleccionado');
            return false;
        }

        const isOverlapping = reservas.some((box) => {
            const reservationDay = reservationBox.day.getDay() === 0 ? 6 : reservationBox.day.getDay() - 1;
            const boxDay = new Date(box.Dia);
            if (box && boxDay.toDateString() === reservationBox.day.toDateString() && box.CodEspacio === CodEspacio) {
                const boxStartPixels = calculatePixelsByTime(parseInt(box.HoraInicio.split(':')[0]), parseInt(box.HoraInicio.split(':')[1]), pixelsByHours);
                let boxEndPixels = calculatePixelsByTime(parseInt(box.HoraFin.split(':')[0]), parseInt(box.HoraFin.split(':')[1]), pixelsByHours);
                let newBoxStartPixels = calculatePixelsByTime(parseInt(reservationBox.startHour.split(':')[0]), parseInt(reservationBox.startHour.split(':')[1]), pixelsByHours);
                let newBoxEndPixels = calculatePixelsByTime(parseInt(reservationBox.endHour.split(':')[0]), parseInt(reservationBox.endHour.split(':')[1]), pixelsByHours);
                if (!boxEndPixels || !newBoxEndPixels) {
                    return false;
                }

                return (
                    (newBoxStartPixels >= boxStartPixels && newBoxStartPixels < boxEndPixels) ||
                    (newBoxEndPixels > boxStartPixels && newBoxEndPixels <= boxEndPixels) ||
                    (newBoxStartPixels <= boxStartPixels && newBoxEndPixels >= boxEndPixels)
                );
            }
            return false;
        });

        if (isOverlapping) {
            Store.addNotification({
                title: "Colisión",
                message: "Parece que ya esta reservado el espacio en ese horario.",
                type: "info",
                insert: "bottom",
                container: "bottom-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 8000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
            return false;
        }
        console.log(reservationBox);
        setNewReservationBox([reservationBox]);

        try {
            const response = await axios.get(`${API_BASE_URL}/api/reserva/calendar/checkColition?CodEspacio=${CodEspacio}&Dia=${reservationBox.day.getFullYear()}-${(reservationBox.day.getMonth() + 1).toString().padStart(2, '0')}-${reservationBox.day.getDate().toString().padStart(2, '0')}&HoraInicio=${reservationBox.startHour}&HoraFin=${reservationBox.endHour}`);

            if (response.status === 200) {
                return true;
            } else {
                Store.addNotification({
                    title: "Reserva no permitida",
                    message: response.data.message,
                    type: "info",
                    insert: "bottom",
                    container: "bottom-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 8000,
                        onScreen: true,
                        pauseOnHover: true,
                    }
                });
                setNewReservationBox([]);
                return false;
            }
        } catch (error) {
            console.error(error);
            Store.addNotification({
                title: "Error!",
                message: `Ocurrió un error al seleccionar el horario de la reserva. ${error}`,
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 4000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
            setNewReservationBox([]);
            return false;
        }
    }

    const handleValidateRepaso = async (reservationBox: ReservationBox) => {
        if (!reservationBox) {
            return false;
        }

        if (!containerDaysRef.current) {
            return false;
        }

        if ((reservationBox.startHour && reservationBox.startHour < "0" + START_HOUR + ":00") || (reservationBox.endHour && reservationBox.endHour > (START_HOUR + NUMBER_HOURS) + ":00")) {
            Store.addNotification({
                title: "Límite de horario",
                message: `El repaso debe estar dentro del horario de ${START_HOUR}:00 a ${START_HOUR + NUMBER_HOURS}:00`,
                type: "info",
                insert: "bottom",
                container: "bottom-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 8000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
            return false;
        }

        if (newReservationBox[0].day === reservationBox.day) {
            Store.addNotification({
                title: "Repaso no permitido",
                message: `El repaso no puede ubicarse en el mismo día que la reserva principal.`,
                type: "info",
                insert: "bottom",
                container: "bottom-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 8000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
        }

        if ((reservationBox.startHour === '' || reservationBox.endHour === '') && reservationBox.day !== null) {
            const isInRestriction = availabilityBoxes.some((box) => {
                const reservationDay = reservationBox.day.getDay() === 0 ? 6 : reservationBox.day.getDay() - 1;

                if (box && box.dayIndex === reservationDay) {
                    return true;
                }
            });
            console.log("isInRestriction", isInRestriction);
            return isInRestriction;
        }

        const parseTimeToMinutes = (time: string) => {
            const [hours, minutes] = time.split(':');
            return parseInt(hours) * 60 + parseInt(minutes);
        };

        const startMinutes = parseTimeToMinutes(reservationBox.startHour);
        const endMinutes = parseTimeToMinutes(reservationBox.endHour);
        const timeDifference = endMinutes - startMinutes;

        if (timeDifference < 29) {
            Store.addNotification({
                title: "Repaso no permitido",
                message: `El repaso debe tener mínimo 29 minutos de duración`,
                type: "info",
                insert: "bottom",
                container: "bottom-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 8000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
            return false;
        }

        if (timeDifference > 120) {
            Store.addNotification({
                title: "Repaso no permitido",
                message: `El repaso debe tener máximo 2 horas de duración`,
                type: "info",
                insert: "bottom",
                container: "bottom-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 8000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
            return false;
        }

        const pixelsByHours = containerDaysRef.current?.offsetHeight / NUMBER_HOURS;

        const isInRestriction = availabilityBoxes.some((box) => {
            const reservationDay = reservationBox.day.getDay() === 0 ? 6 : reservationBox.day.getDay() - 1;

            if (box && box.dayIndex === reservationDay) {
                const boxStartPixels = calculatePixelsByTime(parseInt(box.startHour.split(':')[0]), parseInt(box.startHour.split(':')[1]), pixelsByHours);
                let boxEndPixels = calculateDurationToPixels(box.duration);
                let newBoxStartPixels = calculatePixelsByTime(parseInt(reservationBox.startHour.split(':')[0]), parseInt(reservationBox.startHour.split(':')[1]), pixelsByHours);
                let newBoxEndPixels = calculatePixelsByTime(parseInt(reservationBox.endHour.split(':')[0]), parseInt(reservationBox.endHour.split(':')[1]), pixelsByHours);
                if (boxEndPixels && newBoxEndPixels) {
                    boxEndPixels += boxStartPixels;
                } else {
                    return false;
                }
                console.log('----------------------');
                console.log('boxStartPixels', boxStartPixels);
                console.log('boxEndPixels', boxEndPixels);
                console.log('clickedPixels', newBoxStartPixels);
                console.log('newBoxEndPixels', newBoxEndPixels);

                console.log('(clickedPixels >= boxStartPixels && clickedPixels < boxEndPixels)', (newBoxStartPixels >= boxStartPixels && newBoxStartPixels < boxEndPixels));
                console.log('(newBoxEndPixels > boxStartPixels && newBoxEndPixels <= boxEndPixels)', (newBoxEndPixels > boxStartPixels && newBoxEndPixels <= boxEndPixels));

                return (
                    (newBoxStartPixels >= boxStartPixels && newBoxStartPixels < boxEndPixels) &&
                    (newBoxEndPixels > boxStartPixels && newBoxEndPixels <= boxEndPixels)
                );
            }
            return false;
        });

        if (!isInRestriction) {
            console.log('No esta dentro de un box existente');
            Store.addNotification({
                title: "Repaso no permitido",
                message: `El repaso debe estar dentro de un horario de disponibilidad.`,
                type: "info",
                insert: "bottom",
                container: "bottom-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 8000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
            return false;
        }

        if (CodEspacio === undefined || CodEspacio === null) {
            console.log('No hay espacio seleccionado');
            return false;
        }

        const fechaActual = new Date();
        fechaActual.setDate(fechaActual.getDate() + 1);

        if (reservationBox.day < fechaActual) {
            Store.addNotification({
                title: "Repaso no permitido",
                message: `El repaso no puede ser agendado en una fecha anterior a la actual`,
                type: "info",
                insert: "bottom",
                container: "bottom-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 8000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
            return false;
        }

        const isOverlapping = reservas.some((box) => {
            const reservationDay = reservationBox.day.getDay() === 0 ? 6 : reservationBox.day.getDay() - 1;
            const boxDay = new Date(box.Dia);
            if (box && boxDay.toDateString() === reservationBox.day.toDateString() && box.CodEspacio === CodEspacio) {
                const boxStartPixels = calculatePixelsByTime(parseInt(box.HoraInicio.split(':')[0]), parseInt(box.HoraInicio.split(':')[1]), pixelsByHours);
                let boxEndPixels = calculatePixelsByTime(parseInt(box.HoraFin.split(':')[0]), parseInt(box.HoraFin.split(':')[1]), pixelsByHours);
                let newBoxStartPixels = calculatePixelsByTime(parseInt(reservationBox.startHour.split(':')[0]), parseInt(reservationBox.startHour.split(':')[1]), pixelsByHours);
                let newBoxEndPixels = calculatePixelsByTime(parseInt(reservationBox.endHour.split(':')[0]), parseInt(reservationBox.endHour.split(':')[1]), pixelsByHours);
                if (!boxEndPixels || !newBoxEndPixels) {
                    return false;
                }

                return (
                    (newBoxStartPixels >= boxStartPixels && newBoxStartPixels < boxEndPixels) ||
                    (newBoxEndPixels > boxStartPixels && newBoxEndPixels <= boxEndPixels) ||
                    (newBoxStartPixels <= boxStartPixels && newBoxEndPixels >= boxEndPixels)
                );
            }
            return false;
        });

        if (isOverlapping) {
            Store.addNotification({
                title: "Colisión",
                message: "Parece que ya esta reservado el espacio en ese horario.",
                type: "info",
                insert: "bottom",
                container: "bottom-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 8000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
            return false;
        }
        console.log(reservationBox);

        try {
            const response = await axios.get(`${API_BASE_URL}/api/reserva/calendar/checkColition?CodEspacio=${CodEspacio}&Dia=${reservationBox.day.getFullYear()}-${(reservationBox.day.getMonth() + 1).toString().padStart(2, '0')}-${reservationBox.day.getDate().toString().padStart(2, '0')}&HoraInicio=${reservationBox.startHour}&HoraFin=${reservationBox.endHour}`);

            if (response.status === 200) {
                return true;
            } else {
                Store.addNotification({
                    title: "Repaso no permitido",
                    message: response.data.message,
                    type: "info",
                    insert: "bottom",
                    container: "bottom-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 8000,
                        onScreen: true,
                        pauseOnHover: true,
                    }
                });
                return false;
            }
        } catch (error) {
            console.error(error);
            Store.addNotification({
                title: "Error!",
                message: `Ocurrió un error al seleccionar el horario del repaso. ${error}`,
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 4000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
            return false;
        }
    }

    const handleChangeRepaso1 = (repaso: ReservationBox | null) => {
        if (repaso === null) setRepaso1([]);
        else setRepaso1([repaso]);
    }

    const handleChangeRepaso2 = (repaso: ReservationBox | null) => {
        if (repaso === null) setRepaso2([]);
        else setRepaso2([repaso]);
    }

    return (
        <>
            <div className={styles.schedule_grand_container}>
                <CloseReservation isOpen={isConfirmationModalOpen} onClose={() => setIsConfirmationModalOpen(false)} onConfirm={handleCloseSlide} />
                <Slide direction="left" in={openSlide} mountOnEnter unmountOnExit>
                    <div ref={slideRef} className={styles.slide_container}>
                        <div className={styles.slide_body}>
                            <button type="button" onClick={checkCloseSlide} className={styles.close_slide_button}>
                                <FontAwesomeIcon icon={faAngleRight} />
                            </button>
                            {CodEspacio === null && reservar === false ? (
                                <>
                                    <h4>Seleccione un espacio</h4>
                                    <div className={styles.tiny_info}><i>Primero busque y seleccione el espacio que desee reservar</i></div>
                                    <div className={styles.search_container}>
                                        <SearchBar searchTerm={search} onSearchTermChange={handleSearchTermChange} />
                                        <div className={styles.search_modal} ref={modalSearchRef} style={{ display: showSearchModal ? 'flex' : 'none' }} >
                                            {!hasDataSearch ?
                                                <div>No hay datos para mostrar</div> : <div></div>
                                            }
                                            {espaciosSearch?.map((espacio) => {
                                                const imageUrl = espacio.NombreFoto ? espacio.RutaFoto + espacio.NombreFoto : '/images/descarga.jpg';

                                                return (
                                                    <ListEspaciosReserva
                                                        key={espacio.CodEspacio}
                                                        imageUrl={imageUrl}
                                                        nombreEspacio={espacio.NombreEspacio}
                                                        nombreTipoEspacio={espacio.NombreTipoEspacio}
                                                        disponibilidad={espacio.Disponibilidad}
                                                        capacidad={espacio.CapacidadEspacio}
                                                        id={espacio.CodEspacio}
                                                        actionable={true}
                                                        setSelectedEspacio={setSelectedEspacio}
                                                        setShowSearchModal={setShowSearchModal}
                                                    />
                                                );
                                            })}

                                            {espaciosSearchTotal > 5 ?
                                                <button onClick={handleLoadSearchResults} className={`${styles.normal_button} ${styles.align_center}`}>
                                                    Más resultados
                                                </button> : <div></div>
                                            }
                                        </div>
                                    </div>
                                    {selectedEspacio !== null && (
                                        <>
                                            <div className={styles.selected_space_container}>
                                                <ListEspaciosReserva
                                                    key={selectedEspacio.codEspacio}
                                                    imageUrl={selectedEspacio.imageUrl}
                                                    nombreEspacio={selectedEspacio.nombreEspacio}
                                                    nombreTipoEspacio={selectedEspacio.nombreTipoEspacio}
                                                    disponibilidad={selectedEspacio.disponibilidad}
                                                    capacidad={selectedEspacio.capacidad}
                                                    id={selectedEspacio.codEspacio}
                                                    actionable={false}
                                                    setSelectedEspacio={setSelectedEspacio}
                                                    setShowSearchModal={setShowSearchModal}
                                                />
                                            </div>
                                            <button type='button' className={styles.reserva_button} onClick={handleStartReservation}>
                                                <FontAwesomeIcon icon={faCheck} style={{ marginRight: '10px' }} />
                                                Continuar
                                            </button>
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    {CodEspacio !== null && reservar === false && selectedCodReserva !== null && (
                                        <>
                                            <h4>Información</h4>
                                            <div className={styles.space_info_container}>
                                                {isReservaInfoLoading ? (
                                                    <div className={styles.load_icon}><FontAwesomeIcon icon={faSpinner} spin /></div>
                                                ) : (
                                                    <>
                                                        {selectedReserva !== null ? (
                                                            <>
                                                                <div className={styles.space_info}>
                                                                    <div className={styles.image}>
                                                                        <Image
                                                                            alt={selectedReserva.NombreFoto}
                                                                            src={selectedReserva.NombreFoto ? selectedReserva.RutaFoto + selectedReserva.NombreFoto : '/images/descarga.jpg'}
                                                                            width={800}
                                                                            height={500}
                                                                            placeholder="blur"
                                                                            blurDataURL='/images/placeholder/placeholder.png'
                                                                            className={styles.img}
                                                                        />
                                                                    </div>
                                                                    <div className={styles.reservas_space_container}>
                                                                        <div className={styles.reservas_space_title}>
                                                                            {selectedReserva.EstadoEspacio == '0' ? (
                                                                                <div className={styles.red_color_hover} title={'Espacio Eliminado'}>{selectedReserva.NombreEspacio}</div>
                                                                            ) : (
                                                                                <Link href={`/espacios/${selectedReserva.CodEspacio}`} className={styles.link}>
                                                                                    {selectedReserva.NombreEspacio}
                                                                                </Link>
                                                                            )}

                                                                        </div>
                                                                        <div className={styles.reservas_info}>{selectedCodRepaso !== null ? 'Repaso' : 'Reservado'} para el {new Date(selectedReserva.Dia).toLocaleDateString('es-ES')}</div>
                                                                        <div className={styles.reservas_info}>
                                                                            {`Desde las ${selectedReserva.HoraInicio.slice(0, 2)}h${selectedReserva.HoraInicio.slice(3, 5)} hasta las ${selectedReserva.HoraFin.slice(0, 2)}h${selectedReserva.HoraFin.slice(3, 5)}`}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className={styles.general_space_container}>
                                                                    <div className={styles.reservas_space_subtitle}>{selectedReserva.CodTipoEvento !== null ? selectedReserva.NombreTipoEvento : 'Evento'}</div>
                                                                    <div>{selectedReserva.Razon}</div>
                                                                    <div className={styles.responsable}>
                                                                        {selectedReserva.CodPersonaExterna !== null ? (
                                                                            <>
                                                                                Reservado para{' '}
                                                                                <span className={styles.reservas_space_responsable}>
                                                                                    {selectedReserva.OrganizacionPersonaExterna ? `${selectedReserva.OrganizacionPersonaExterna} - ` : ''}
                                                                                    {selectedReserva.NombrePersonaExterna} {selectedReserva.ApellidoPaternoPersonaExterna} por{' '}
                                                                                    {`${selectedReserva.NombrePersonaInterna} ${selectedReserva.ApellidoPaternoPersonaInterna}`}
                                                                                </span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                Reservado por{' '}
                                                                                <span className={styles.reservas_space_responsable}>
                                                                                    {`${selectedReserva.NombrePersonaInterna} ${selectedReserva.ApellidoPaternoPersonaInterna}`}
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {selectedReserva.EventoAcademico === 1 && (
                                                                    <>
                                                                        <div className={styles.extra_info_container}>
                                                                            <div className={styles.icon_info_reserva}><FontAwesomeIcon icon={faGraduationCap} /></div>
                                                                            Evento Académico
                                                                        </div>
                                                                    </>
                                                                )}
                                                                <div className={styles.extra_info_container}>
                                                                    {selectedReserva.EstadoSolicitud == '0' && (
                                                                        <>
                                                                            <div className={`${styles.icon_info_reserva} ${styles.icon_no_aprobado}`}><FontAwesomeIcon icon={faTimesCircle} /></div>
                                                                            No aprobado
                                                                        </>
                                                                    )}
                                                                    {selectedReserva.EstadoSolicitud == '1' && (
                                                                        <>
                                                                            <div className={`${styles.icon_info_reserva} ${styles.icon_reservado}`}><FontAwesomeIcon icon={faCheckCircle} /></div>
                                                                            Reservado
                                                                        </>
                                                                    )}
                                                                    {selectedReserva.EstadoSolicitud == '2' && (
                                                                        <>
                                                                            <div className={`${styles.icon_info_reserva} ${styles.icon_pendiente}`}><FontAwesomeIcon icon={faClock} /></div>
                                                                            Pendiente
                                                                        </>
                                                                    )}
                                                                </div>
                                                                {selectedReserva.CodRepaso !== null && (
                                                                    <>
                                                                        <div className={styles.extra_info_container}>
                                                                            <div className={`${styles.icon_info_reserva} ${styles.icon_repaso}`}><FontAwesomeIcon icon={faChalkboardTeacher} /></div>
                                                                            Repaso
                                                                        </div>
                                                                    </>
                                                                )}
                                                                <div className={styles.more_info}>
                                                                    <Link href={`/reservas?filter=CodReserva-${selectedReserva.CodReserva}`} className={styles.link}>
                                                                        Ver más...
                                                                    </Link>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <h6>Hubo un error al cargar los datos!</h6>
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            <div className={styles.reserva_button_container}>
                                                {selectedReserva?.EstadoEspacio != '0' && selectedReserva?.Disponibilidad != '0' && (
                                                    <button type="button" onClick={handleCalendarSize} className={`${styles.reserva_button}`}>
                                                        <FontAwesomeIcon icon={faCalendarAlt} style={{ marginRight: '10px' }} />
                                                        Quiero reservar este espacio!
                                                    </button>
                                                )}
                                                {selectedReserva?.Disponibilidad == '0' && (
                                                    <i>Espacio no disponible para reserva</i>
                                                )}
                                            </div>

                                        </>
                                    )}
                                    {CodEspacio !== null && reservar === true && (
                                        <>
                                            <h4>Reservar</h4>
                                            {selectedEspacio !== null && (
                                                <>
                                                    <div className={styles.selected_space_container_2}>
                                                        <div className={styles.label_tiny}>Espacio a reservar</div>
                                                        <ListEspaciosReserva
                                                            key={selectedEspacio.codEspacio}
                                                            imageUrl={selectedEspacio.imageUrl}
                                                            nombreEspacio={selectedEspacio.nombreEspacio}
                                                            nombreTipoEspacio={selectedEspacio.nombreTipoEspacio}
                                                            disponibilidad={selectedEspacio.disponibilidad}
                                                            capacidad={selectedEspacio.capacidad}
                                                            id={selectedEspacio.codEspacio}
                                                            actionable={false}
                                                            setSelectedEspacio={setSelectedEspacio}
                                                            setShowSearchModal={setShowSearchModal}
                                                        />
                                                    </div>
                                                    {availabilityBoxes.length > 0 ? (
                                                        <>
                                                            <div className={styles.info_reservation}>
                                                                <div className={`${styles.info_reservation_text} ${styles.dissapearingThing_2}`}>
                                                                    Para seleccionar la fecha y hora de reserva puede interactuar con el calendario a la izquierda <span className={styles.green_text}>dentro</span> de las <span className={styles.green_text}>zonas verdes</span>, esto solo aplica para reservas.
                                                                </div>
                                                                <div className={`${styles.info_reservation_text} ${styles.dinamic_marginb_10}`}>
                                                                    Las reservas para el espacio seleccionado necesitan tener un mínimo <span className={styles.green_text}>{selectedEspacio.diasAntelacion} días</span> de antelación.
                                                                </div>
                                                                <MakeReservation isOpen={true} onClose={() => { }} reservation={newReservationBox.length === 0 ? null : newReservationBox[0]} setReservation={handleChangeNewReservationBox} setRepaso1={handleChangeRepaso1} setRepaso2={handleChangeRepaso2} validateRepaso={handleValidateRepaso} espacio={CodEspacio} />
                                                            </div>

                                                        </>

                                                    ) : (
                                                        <>
                                                            <br />
                                                            <br />
                                                            Ups!
                                                            Parece que no hay disponibilidad para este espacio!
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </Slide>

                <div ref={headerRef} className={styles.schedule_container_header}>
                    <div className={styles.schedule_header}>
                        <div className={styles.hours_header}>
                            <div className={styles.hour_header}></div>
                        </div>
                        <div className={styles.days_header_container}>
                            <div className={styles.days_header} ref={scheduleHeaderRef}>
                                <div className={styles.general_hseparator_noborder}></div>
                                {weekDays.map((date, index) => (
                                    <div key={'hday-' + index} className={styles.hday}>
                                        <div className={styles.head_info}>{date.toLocaleString('es-GB', { timeZone: 'UTC', month: 'short' })}</div>
                                        <div className={`${styles.head_number} ${date.toDateString() === todayDate().toDateString() ? styles.green_color : ''}`}>{date.getUTCDate()}</div>
                                        <div className={styles.head_info}>{date.getDay() === 0 ? days[6] : days[date.getDay() - 1]}</div>
                                    </div>
                                ))}
                                <div className={styles.scroll_space}></div>
                            </div>
                        </div>
                    </div>
                    <div className={styles.schedule_header}>
                        <div className={styles.hours_header}>
                            <div className={styles.hour_header}></div>
                        </div>
                        <div className={styles.days_header_container}>
                            <div className={styles.days_header}>
                                <div className={styles.general_hseparator}></div>
                                {days.map((day, index) => (
                                    <div key={'dseparator-' + index} className={`${styles.hday} ${styles.day_separator}`}>
                                        <span key={'dspan-' + index}></span>
                                    </div>
                                ))}
                                <div className={styles.scroll_space}></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div ref={bodyRef} className={styles.schedule_body}>
                    <div className={styles.container_body}>
                        <div className={styles.hours_body}>
                            {Array.from(Array(NUMBER_HOURS).keys()).map((hour, index) => {
                                const displayHour = hour + START_HOUR;
                                return (
                                    <div key={'hour-' + index} className={styles.hour}>
                                        <span>{displayHour}:00</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className={styles.container_days} onScroll={handleScroll} ref={containerDaysRef}>
                            <div className={styles.days_body}>
                                <div aria-hidden="true" className={styles.hour_separator}>
                                    {Array.from(Array(NUMBER_HOURS).keys()).map((hour, index) => (
                                        <div key={'bseparator-' + index} className={styles.hour_separator_line}></div>
                                    ))}
                                </div>
                                <div className={styles.general_separator}></div>
                                {weekDays.map((day, index) => {
                                    let order = 0;
                                    return (
                                        <div key={'day-' + index} className={styles.bday}
                                            onClick={(event) => {
                                                handleWeekDayClick(event, day);
                                            }}>
                                            {availabilityBoxes.map((box) => {
                                                const newDate = new Date(day);
                                                const currentNewDay = newDate.getDay() === 0 ? 6 : newDate.getDay() - 1;
                                                if (box.dayIndex === currentNewDay && new Date() <= newDate) {
                                                    return (
                                                        <div
                                                            key={'box-' + box.id + '-' + index}
                                                            className={`${styles.availability_box}  ${showDisponibility ? styles.show : ''}`}
                                                            style={{
                                                                top: calculateTimeToPixels(box.startHour) + 'px',
                                                                height: calculateDurationToPixels(box.duration) + 'px',
                                                            }}
                                                        ></div>
                                                    );
                                                }
                                                return null;
                                            })}
                                            <div key={'res-' + index} className={styles.bday_reservation}>
                                                {reservas.map((reserva) => {
                                                    const newDate = new Date(reserva.Dia);
                                                    let boxWidth = 100;
                                                    let marginLeft = 0;
                                                    let boxShadow = 'none';
                                                    if (newDate.toDateString() === day.toDateString()) {
                                                        const duration = calculateDuration(parseInt(reserva.HoraInicio.split(':')[0]), parseInt(reserva.HoraInicio.split(':')[1]), parseInt(reserva.HoraFin.split(':')[0]), parseInt(reserva.HoraFin.split(':')[1]));
                                                        let backgroundColor = '67%, 69%';
                                                        let color = '38%, 29%';
                                                        let lightColor = '41%, 45%';
                                                        if (reserva.EstadoSolicitud == '2') {
                                                            backgroundColor = "30, " + backgroundColor;
                                                            color = "30, " + color;
                                                            lightColor = "30, " + lightColor;
                                                        } else if (reserva.EstadoSolicitud == '1') {
                                                            const colorValue = 80 + (reserva.CodTipoEspacio * 60) <= 360 ? 80 + (reserva.CodTipoEspacio * 60) : 80 + (reserva.CodTipoEspacio * 60) - 360;
                                                            backgroundColor = colorValue.toString() + ', ' + backgroundColor;
                                                            color = colorValue + ', ' + color;
                                                            lightColor = colorValue + ', ' + lightColor;
                                                        } else if (reserva.EstadoSolicitud == '0') {
                                                            const colorValue = 0;
                                                            backgroundColor = colorValue.toString() + ', ' + backgroundColor;
                                                            color = colorValue + ', ' + color;
                                                            lightColor = colorValue + ', ' + lightColor;
                                                        } else if (reserva.CodRepaso !== null) {
                                                            backgroundColor = "280, " + backgroundColor;
                                                            color = "280, " + color;
                                                            lightColor = "280, " + lightColor;
                                                        }
                                                        const colisions = checkAmounthOFColisions(reserva);
                                                        if (colisions > 0) {
                                                            order++;
                                                            boxWidth = order >= colisions + 1 ? (100 / (colisions + 1)) : (100 / (colisions + 1) + 25);
                                                            marginLeft = order > colisions ? ((colisions) * (100 / (colisions + 1))) : ((order - 1) * (100 / (colisions + 1)));
                                                            boxShadow = order !== 1 ? "inset 0px 0px 0px 2px hsl(" + lightColor + ")" : "none";
                                                        }
                                                        return (
                                                            <div
                                                                key={'reserva-' + reserva.CodReserva + '-' + index}
                                                                className={`${styles.reservation_box}  ${styles.show}`}
                                                                style={{
                                                                    top: calculateTimeToPixels(reserva.HoraInicio) + 'px',
                                                                    height: calculateDurationToPixels(duration) + 'px',
                                                                    width: boxWidth + '%',
                                                                    marginLeft: marginLeft + '%',
                                                                    backgroundColor: 'hsl(' + backgroundColor + ')',
                                                                    color: 'hsl(' + color + ')',
                                                                    boxShadow: boxShadow,
                                                                }}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    handleReservaClick(event, reserva);
                                                                }}
                                                            >
                                                                <div className={styles.reservation_text_container}>
                                                                    <div className={styles.reservation_text_title}>
                                                                        {reserva.NombreEspacio}
                                                                    </div>
                                                                    <div className={styles.reservation_text_normal}>
                                                                        {`${reserva.HoraInicio.split(':')[0]}h${reserva.HoraInicio.split(':')[1]}`} - {`${reserva.HoraFin.split(':')[0]}h${reserva.HoraFin.split(':')[1]}`}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })}

                                                {newReservationBox.map((newReservationBox) => {
                                                    const newDate = new Date(newReservationBox.day);
                                                    if (newDate.toDateString() === day.toDateString()) {
                                                        const duration = calculateDuration(parseInt(newReservationBox.startHour.split(':')[0]), parseInt(newReservationBox.startHour.split(':')[1]), parseInt(newReservationBox.endHour.split(':')[0]), parseInt(newReservationBox.endHour.split(':')[1]));
                                                        let backgroundColor = '230, 67%, 69%';
                                                        let color = '230, 38%, 29%';
                                                        return (
                                                            <div
                                                                key={'newReserv-' + index}
                                                                className={`${styles.new_reservation_box}  ${showDisponibility ? styles.show : ''}`}
                                                                style={{
                                                                    top: calculateTimeToPixels(newReservationBox.startHour) + 'px',
                                                                    height: calculateDurationToPixels(duration) + 'px',
                                                                    backgroundColor: 'hsl(' + backgroundColor + ')',
                                                                    color: 'hsl(' + color + ')',
                                                                }}
                                                            >
                                                                <div className={styles.reservation_text_container}>
                                                                    <div className={styles.reservation_text_title}>
                                                                        Mi Reserva
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })}

                                                {repaso1.map((newRepasoBox) => {
                                                    const newDate = new Date(newRepasoBox.day);
                                                    if (newDate.toDateString() === day.toDateString()) {
                                                        const duration = calculateDuration(parseInt(newRepasoBox.startHour.split(':')[0]), parseInt(newRepasoBox.startHour.split(':')[1]), parseInt(newRepasoBox.endHour.split(':')[0]), parseInt(newRepasoBox.endHour.split(':')[1]));
                                                        let backgroundColor = '86, 89%, 90%';
                                                        let color = '231, 8%, 18%';
                                                        return (
                                                            <div
                                                                key={'newReserv-' + index}
                                                                className={`${styles.new_reservation_box}  ${showDisponibility ? styles.show : ''}`}
                                                                style={{
                                                                    top: calculateTimeToPixels(newRepasoBox.startHour) + 'px',
                                                                    height: calculateDurationToPixels(duration) + 'px',
                                                                    backgroundColor: 'hsl(' + backgroundColor + ')',
                                                                    color: 'hsl(' + color + ')',
                                                                }}
                                                            >
                                                                <div className={styles.reservation_text_container}>
                                                                    <div className={styles.reservation_text_title}>
                                                                        1er Repaso
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })}

                                                {repaso2.map((newRepasoBox) => {
                                                    const newDate = new Date(newRepasoBox.day);
                                                    if (newDate.toDateString() === day.toDateString()) {
                                                        const duration = calculateDuration(parseInt(newRepasoBox.startHour.split(':')[0]), parseInt(newRepasoBox.startHour.split(':')[1]), parseInt(newRepasoBox.endHour.split(':')[0]), parseInt(newRepasoBox.endHour.split(':')[1]));
                                                        let backgroundColor = '128, 89%, 90%';
                                                        let color = '231, 8%, 18%';
                                                        return (
                                                            <div
                                                                key={'newReserv-' + index}
                                                                className={`${styles.new_reservation_box}  ${showDisponibility ? styles.show : ''}`}
                                                                style={{
                                                                    top: calculateTimeToPixels(newRepasoBox.startHour) + 'px',
                                                                    height: calculateDurationToPixels(duration) + 'px',
                                                                    backgroundColor: 'hsl(' + backgroundColor + ')',
                                                                    color: 'hsl(' + color + ')',
                                                                }}
                                                            >
                                                                <div className={styles.reservation_text_container}>
                                                                    <div className={styles.reservation_text_title}>
                                                                        2do Repaso
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Calendar;