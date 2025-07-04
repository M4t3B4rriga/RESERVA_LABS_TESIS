import { useState, useEffect } from "react";
import axios from 'axios';
import Modal from '@mui/material/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faSpinner, faArrowRight, faArrowLeft, faCheckCircle, faExclamationCircle, faExclamationTriangle, faWarning, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import styles from '@/styles/CRUD.module.css';
import { ReactNotifications } from 'react-notifications-component'
import 'react-notifications-component/dist/theme.css'
import { Store } from 'react-notifications-component';
import { Formik, Form, Field, ErrorMessage, useFormikContext } from 'formik';
import * as Yup from 'yup';
import { API_BASE_URL, API_BASE_URL_SEC } from '@/src/components/BaseURL';
import UploadPhotos from '@/src/components/UploadPhotos';
import DisponibilitySchedule from "@/src/components/DisponibilitySchedule";
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { TipoEspacio } from '@/libs/tipoEspacio';
import { PersonaInterna } from '@/libs/persona';
import { TipoEvento } from '@/libs/tipoEvento';
import { ServicioEspecial } from '@/libs/servicioEspecial';
import { EquipoForReservation } from '@/libs/equipo';
import { Espacio_Create, Espacio_Tiny } from '@/libs/espacios';
import { useRouter } from "next/router";
import { es } from 'date-fns/locale';
import { isValid, format, set } from 'date-fns';
import { RepasoInfo, Reserva } from "@/libs/reserva";

interface ReservationBox {
    day: Date;
    startHour: string;
    endHour: string;
}

interface MakeReservationProps {
    isOpen: boolean;
    onClose: () => void;
    reservation: ReservationBox | null;
    setReservation: (reservation: ReservationBox) => Promise<boolean>;
    setRepaso1: (repaso1: ReservationBox | null) => void;
    setRepaso2: (repaso2: ReservationBox | null) => void;
    validateRepaso: (reservation: ReservationBox) => Promise<boolean>;
    espacio: number | null;
}

interface StepErrors {
    step0: boolean;
    step1: boolean;
    step2: boolean;
    step3: boolean;
}

interface FormValues {
    Dia: Date;
    HoraInicio: string;
    HoraFin: string;
    DiaRepaso1: Date;
    HoraInicioRepaso1: string;
    HoraFinRepaso1: string;
    DiaRepaso2: Date;
    HoraInicioRepaso2: string;
    HoraFinRepaso2: string;
    NombrePersonaExterna: string;
    ApellPaternoPersonaExterna: string;
    ApellMaternoPersonaExterna: string;
    EmailPersonaExterna: string;
    TelefonoPersonaExterna: string;
    CedulaPersonaExterna: string;
    OrganizacionPersonaExterna: string;
    Razon: string;
    CodTipoEvento: number;
    Equipos: any[];
    ServiciosEspeciales: any[];
}

interface MakeReservationForm {
    onUpdateStepErrors: (stepErrors: StepErrors) => void;
    onClose: () => void;
    isLoading: boolean;
    activeStep: number;
    handleNext: () => void;
    handlePrev: () => void;
    formSubmited: boolean;
    newEspacio: Espacio_Create | null;
    onFinalization: () => void;
    reservationProps: ReservationBox | null;
    setReservation: (reservation: ReservationBox) => Promise<boolean>;
    setRepaso1: (repaso1: ReservationBox | null) => void;
    setRepaso2: (repaso2: ReservationBox | null) => void;
    isPersonaExterna: boolean;
    setIsPersonaExterna: (isPersonaExterna: boolean) => void;
    isEventoAcademico: boolean;
    setIsEventoAcademico: (isEventoAcademico: boolean) => void;
    validateRepaso: (reservation: ReservationBox) => Promise<boolean>;
}

type ConfirmationModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

type FinalizationModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    CodEspacio: number;
    onFinalization: () => void;
}
interface SelectsData {
    value: string | number;
    label: string;
}

const MakeReservationForm: React.FC<MakeReservationForm> = ({ onUpdateStepErrors, onClose, isLoading, activeStep, handleNext, handlePrev, formSubmited, newEspacio, onFinalization, reservationProps, setReservation, setRepaso1, setRepaso2, isPersonaExterna, setIsPersonaExterna, isEventoAcademico, setIsEventoAcademico, validateRepaso }) => {
    const [reservation, setReservation2] = useState<ReservationBox | null>(reservationProps);
    const { errors, touched } = useFormikContext<FormValues>();
    const { isSubmitting } = useFormikContext<FormValues>();
    const [isEspecificDataSerched, setIsEspecificDataSerched] = useState(false);
    const [tiposEventos, setTiposEventos] = useState([]);
    const [serviciosEspeciales, setServiciosEspeciales] = useState([]);
    const [equipos, setEquipos] = useState([]);
    const emptyOptionTipoEspacio = {} as SelectsData;
    const emptyOptionUnidad = {} as SelectsData;
    const [isEspecificDataReady, setIsEspecificDataReady] = useState(false);
    const [isEspecificDataError, setIsEspecificDataError] = useState(false);
    const [createdEspacio, setCreatedEspacio] = useState<Espacio_Create | null>(newEspacio);
    const [options, setOptions] = useState<any[]>([]);
    const [allOptions, setAllOptions] = useState<any[]>([]);
    const { setFieldValue } = useFormikContext();
    const [openRepaso1, setOpenRepaso1] = useState(false);
    const [openRepaso2, setOpenRepaso2] = useState(false);
    const [isConfirmExternalReservationModalOpen, setIsConfirmExternalReservationModalOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (reservationProps) {
            console.log("reservationProps", reservationProps);
            setReservation2(reservationProps);
            setFieldValue('Dia', reservationProps.day);
            setFieldValue('HoraInicio', reservationProps.startHour);
            setFieldValue('HoraFin', reservationProps.endHour);
            setFieldValue('HoraInicio', reservationProps.startHour);
            setFieldValue('HoraFin', reservationProps.endHour);
            removeRepaso(2);
            removeRepaso(1);
        } else {
            console.log("reservationProps", reservationProps);
            setReservation2(null);
            setFieldValue('Dia', null);
            setFieldValue('HoraInicio', "");
            setFieldValue('HoraFin', "");
            setFieldValue('HoraInicio', "");
            setFieldValue('HoraFin', "");
            removeRepaso(2);
            removeRepaso(1);
        }
    }, [reservationProps]);

    useEffect(() => {
        onUpdateStepErrors({
            step0: !!((errors.Dia && touched.Dia) || (errors.HoraInicio && touched.HoraInicio) || (errors.HoraFin && touched.HoraFin)),
            step1: isPersonaExterna && !!((errors.NombrePersonaExterna && touched.NombrePersonaExterna) || (errors.ApellPaternoPersonaExterna && touched.ApellPaternoPersonaExterna) || (errors.ApellMaternoPersonaExterna && touched.ApellMaternoPersonaExterna) || (errors.ApellMaternoPersonaExterna && touched.ApellMaternoPersonaExterna) || (errors.CedulaPersonaExterna && touched.CedulaPersonaExterna) || (errors.TelefonoPersonaExterna && touched.TelefonoPersonaExterna) || (errors.EmailPersonaExterna && touched.EmailPersonaExterna) || (errors.OrganizacionPersonaExterna && touched.OrganizacionPersonaExterna)),
            step2: !!((errors.Razon && touched.Razon) || (errors.Equipos && touched.Equipos) || (errors.ServiciosEspeciales && touched.ServiciosEspeciales) || (errors.CodTipoEvento && touched.CodTipoEvento)),
            step3: !!((errors.DiaRepaso1 && touched.DiaRepaso1) || (errors.DiaRepaso2 && touched.DiaRepaso2) || (errors.HoraInicioRepaso1 && touched.HoraInicioRepaso1) || (errors.HoraInicioRepaso2 && touched.HoraInicioRepaso2) || (errors.HoraFinRepaso1 && touched.HoraFinRepaso1) || (errors.HoraFinRepaso2 && touched.HoraFinRepaso2)),
        });
    }, [errors, touched]);

    useEffect(() => {
        if (activeStep === 1 && !isEspecificDataSerched) {
            handleEspecificData();
        }
    }, [activeStep]);

    const handleEspecificData = async () => {
        setIsEspecificDataReady(false);
        setIsEspecificDataError(false);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/reserva/calendar/selectsData?codEspacio=${router.query.espacio}`);
            setTiposEventos(response.data.tiposEventos ? response.data.tiposEventos : []);
            setServiciosEspeciales(response.data.serviciosEspeciales ? response.data.serviciosEspeciales : []);
            setEquipos(response.data.equipos ? response.data.equipos : []);
            console.log("response.data.equipos", response.data);
            setIsEspecificDataSerched(true);
            setIsEspecificDataReady(true);
        } catch (error) {
            console.error(error);
            Store.addNotification({
                title: "Ha ocurrido un problema al consultar las opciones",
                message: "Lo sentimos ha ocurido un problema, vuelva a intentarlo mas tarde",
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 8000,
                    onScreen: true, pauseOnHover: true
                }
            });
            setIsEspecificDataError(true);
        }
    }

    const handleFinishForm = () => {
        onClose();
        if (createdEspacio) {
            router.push(`${API_BASE_URL}/espacios/${createdEspacio.CodEspacio}`);
        }
    }

    const handleAddRepaso = () => {
        if (!openRepaso1 && !openRepaso2) {
            setOpenRepaso1(true);
        } else if (openRepaso1 && !openRepaso2) {
            setOpenRepaso2(true);
        }
    }

    const removeRepaso = (index: number) => {
        if (index === 1) {
            setRepaso1(null);
            setOpenRepaso1(false);
            setFieldValue('DiaRepaso1', null);
            setFieldValue('HoraInicioRepaso1', "");
            setFieldValue('HoraFinRepaso1', "");
        } else if (index === 2) {
            setRepaso2(null);
            setOpenRepaso2(false);
            setFieldValue('DiaRepaso2', "");
            setFieldValue('HoraInicioRepaso2', "");
            setFieldValue('HoraFinRepaso2', "");
        }
    }

    const handleChangeIsPersonaExterna = (value: boolean) => {
        setIsPersonaExterna(value);
        if (!value) {
            setFieldValue('NombrePersonaExterna', "");
            setFieldValue('ApellPaternoPersonaExterna', "");
            setFieldValue('ApellMaternoPersonaExterna', "");
            setFieldValue('CedulaPersonaExterna', "");
            setFieldValue('TelefonoPersonaExterna', "");
            setFieldValue('EmailPersonaExterna', "");
            setFieldValue('OrganizacionPersonaExterna', "");
        } else {
            setIsConfirmExternalReservationModalOpen(true);
        }
    }

    return (
        <Form id="formMakeReservation" className={styles.form_general}>
            <ConfirmExternalReservationModal isOpen={isConfirmExternalReservationModalOpen} onClose={() => setIsConfirmExternalReservationModalOpen(false)} onConfirm={() => { }} onFinalization={() => { }} CodEspacio={0} />
            <div className={activeStep === 0 ? `${styles.form_step_2} ${styles.show}` : `${styles.form_step_2} ${styles.hide}`}>
                <div className={styles.center_column}>
                    <label htmlFor="Dia">Fecha</label>
                    <Field name="Dia">
                        {({ form }: { form: any }) => (
                            <DatePicker
                                selected={reservation?.day ? reservation.day : form.values.Dia}
                                showPopperArrow={true}
                                locale={es}
                                onChange={(date) => {
                                    if (date && isValid(date) && date > new Date()) {
                                        const formattedDate = format(date, 'MM-dd-yyyy');
                                        const url = new URL(window.location.href);
                                        url.searchParams.set('date', formattedDate);
                                        router.push(url.pathname + url.search);
                                        if ((reservation && reservation.startHour && reservation.endHour) && (!form.values.HoraInicio && !form.values.HoraFin)) {
                                            const newReservation = { ...reservation, day: date };
                                            setReservation(newReservation);
                                        }

                                        if (form.values.HoraIncio != "" && form.values.HoraFin != "") {
                                            const newReservation = { ...reservation, day: date, startHour: form.values.HoraInicio, endHour: form.values.HoraFin };
                                            setReservation(newReservation);
                                        }

                                        if ((!form.values.HoraIncio || !form.values.HoraFin)) {
                                            setReservation({ day: date, startHour: '', endHour: '' }).then((result) => {
                                                console.log("reserva", result);
                                                if (result === false) {
                                                    Store.addNotification({
                                                        title: "Fecha inválida",
                                                        message: "La fecha no se encuentra dentro de ninguna restricción",
                                                        type: "info",
                                                        insert: "bottom",
                                                        container: "bottom-left",
                                                        animationIn: ["animate__animated", "animate__fadeIn"],
                                                        animationOut: ["animate__animated", "animate__fadeOut"],
                                                        dismiss: {
                                                            duration: 8000,
                                                            onScreen: true, pauseOnHover: true
                                                        }
                                                    });
                                                } else {
                                                    form.setFieldValue('Dia', date);
                                                    console.log("El resultado es true");
                                                }
                                            });
                                        }
                                    } else {
                                        Store.addNotification({
                                            title: "Fecha inválida",
                                            message: "Debe seleccionar una fecha válida",
                                            type: "info",
                                            insert: "bottom",
                                            container: "bottom-left",
                                            animationIn: ["animate__animated", "animate__fadeIn"],
                                            animationOut: ["animate__animated", "animate__fadeOut"],
                                            dismiss: {
                                                duration: 8000,
                                                onScreen: true, pauseOnHover: true
                                            }
                                        });
                                    }
                                }}
                                className={`${styles.form_datepicker} ${errors.Dia && touched.Dia ? styles.error_input : ''}`}
                            />
                        )}
                    </Field>
                    <ErrorMessage name="Dia" component="div" className={styles.error} />
                </div>
                <div className={styles.nowrap_row}>
                    <div style={{ width: "min-content" }}>
                        <label htmlFor="HoraInicio">Hora inicial</label>
                        <Field type="time" id="HoraInicio" name='HoraInicio' placeholder="Ingrese la hora de inicio" min="06:00" max="22:00" disabled={formSubmited}
                            render={({ field, form }: { field: any, form: any }) => (
                                <input
                                    type="time"
                                    name='HoraInicio'
                                    {...field}
                                    value={reservation && reservation.startHour ? reservation.startHour : form.values.HoraInicio}
                                    className={errors.HoraInicio && touched.HoraInicio ? styles.error_input : ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        let valor = e.target.value;
                                        if (
                                            form.values.Dia &&
                                            !form.values.HoraFin &&
                                            e.target.value !== ""
                                        ) {
                                            setReservation({ day: form.values.Dia, startHour: valor, endHour: "" }).then((result) => {
                                                if (result === false) {
                                                    Store.addNotification({
                                                        title: "Fecha inválida",
                                                        message: "La fecha no se encuentra dentro de ninguna restricción",
                                                        type: "info",
                                                        insert: "bottom",
                                                        container: "bottom-left",
                                                        animationIn: ["animate__animated", "animate__fadeIn"],
                                                        animationOut: ["animate__animated", "animate__fadeOut"],
                                                        dismiss: {
                                                            duration: 8000,
                                                            onScreen: true,
                                                            pauseOnHover: true
                                                        }
                                                    });
                                                } else {
                                                    setFieldValue('HoraInicio', valor);
                                                }
                                            });
                                        }

                                        if (form.values.Dia && form.values.HoraInicio) {
                                            if (form.values.HoraFin > e.target.value) {
                                                setReservation({ day: form.values.Dia, startHour: valor, endHour: form.values.HoraFin }).then((result) => {
                                                    if (result === false) {
                                                        Store.addNotification({
                                                            title: "Fecha inválida",
                                                            message: "Seleccione otra fecha de inicio",
                                                            type: "info",
                                                            insert: "bottom",
                                                            container: "bottom-left",
                                                            animationIn: ["animate__animated", "animate__fadeIn"],
                                                            animationOut: ["animate__animated", "animate__fadeOut"],
                                                            dismiss: {
                                                                duration: 8000,
                                                                onScreen: true,
                                                                pauseOnHover: true
                                                            }
                                                        });
                                                    } else {
                                                        setFieldValue('HoraInicio', valor);
                                                    }
                                                });
                                            } else {
                                                Store.addNotification({
                                                    title: "Hora inválida",
                                                    message: "La hora de inicio debe ser menor a la hora final",
                                                    type: "info",
                                                    insert: "bottom",
                                                    container: "bottom-left",
                                                    animationIn: ["animate__animated", "animate__fadeIn"],
                                                    animationOut: ["animate__animated", "animate__fadeOut"],
                                                    dismiss: {
                                                        duration: 8000,
                                                        onScreen: true,
                                                        pauseOnHover: true
                                                    }
                                                });
                                            }
                                        }

                                        if (!form.values.Dia) {
                                            Store.addNotification({
                                                title: "Día inválido",
                                                message: "Seleccione un día para la reserva primero",
                                                type: "info",
                                                insert: "bottom",
                                                container: "bottom-left",
                                                animationIn: ["animate__animated", "animate__fadeIn"],
                                                animationOut: ["animate__animated", "animate__fadeOut"],
                                                dismiss: {
                                                    duration: 8000,
                                                    onScreen: true,
                                                    pauseOnHover: true
                                                }
                                            });
                                        }
                                    }}
                                />
                            )} />
                        <ErrorMessage name="HoraInicio" component="div" className={styles.error} />
                    </div>

                    <div style={{ width: "min-content" }}>
                        <label htmlFor="HoraFin">Hora final</label>
                        <Field type="time" id="HoraFin" name='HoraFin' placeholder="Ingrese la hora fin" min="06:00" max="22:00" className={errors.HoraFin && touched.HoraFin ? styles.error_input : ''} disabled={formSubmited}
                            render={({ field, form }: { field: any, form: any }) => (
                                <input
                                    type="time"
                                    name='HoraFin'
                                    {...field}
                                    value={reservation && reservation.endHour ? reservation.endHour : form.values.HoraFin}
                                    className={errors.HoraFin && touched.HoraFin ? styles.error_input : ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {

                                        let valor = e.target.value;
                                        if (
                                            form.values.Dia &&
                                            !form.values.HoraInicio &&
                                            e.target.value !== ""
                                        ) {
                                            setReservation({ day: form.values.Dia, startHour: '', endHour: valor }).then((result) => {
                                                if (result === false) {
                                                    Store.addNotification({
                                                        title: "Fecha inválida",
                                                        message: "La fecha no se encuentra dentro de ninguna restricción",
                                                        type: "info",
                                                        insert: "bottom",
                                                        container: "bottom-left",
                                                        animationIn: ["animate__animated", "animate__fadeIn"],
                                                        animationOut: ["animate__animated", "animate__fadeOut"],
                                                        dismiss: {
                                                            duration: 8000,
                                                            onScreen: true,
                                                            pauseOnHover: true
                                                        }
                                                    });
                                                } else {
                                                    setFieldValue('HoraFin', valor);
                                                }
                                            });
                                        }

                                        if (form.values.Dia && form.values.HoraInicio) {
                                            if (form.values.HoraInicio < e.target.value) {
                                                setReservation({ day: form.values.Dia, startHour: form.values.HoraInicio, endHour: valor }).then((result) => {
                                                    if (result === false) {
                                                        Store.addNotification({
                                                            title: "Fecha inválida",
                                                            message: "Seleccione otra fecha de fin",
                                                            type: "info",
                                                            insert: "bottom",
                                                            container: "bottom-left",
                                                            animationIn: ["animate__animated", "animate__fadeIn"],
                                                            animationOut: ["animate__animated", "animate__fadeOut"],
                                                            dismiss: {
                                                                duration: 8000,
                                                                onScreen: true,
                                                                pauseOnHover: true
                                                            }
                                                        });
                                                    } else {
                                                        setFieldValue('HoraFin', valor);
                                                    }
                                                });
                                            } else {
                                                Store.addNotification({
                                                    title: "Hora inválida",
                                                    message: "La hora de fin debe ser mayor a la hora inicial",
                                                    type: "info",
                                                    insert: "bottom",
                                                    container: "bottom-left",
                                                    animationIn: ["animate__animated", "animate__fadeIn"],
                                                    animationOut: ["animate__animated", "animate__fadeOut"],
                                                    dismiss: {
                                                        duration: 8000,
                                                        onScreen: true,
                                                        pauseOnHover: true
                                                    }
                                                });
                                            }
                                        }

                                        if (!form.values.Dia) {
                                            Store.addNotification({
                                                title: "Día inválido",
                                                message: "Seleccione un día para la reserva primero",
                                                type: "info",
                                                insert: "bottom",
                                                container: "bottom-left",
                                                animationIn: ["animate__animated", "animate__fadeIn"],
                                                animationOut: ["animate__animated", "animate__fadeOut"],
                                                dismiss: {
                                                    duration: 8000,
                                                    onScreen: true,
                                                    pauseOnHover: true
                                                }
                                            });
                                        }
                                    }}
                                />
                            )} />
                        <ErrorMessage name="HoraFin" component="div" className={styles.error} />
                    </div>
                </div>

                <div className={styles.container_line}>
                    {isPersonaExterna && (
                        <div className={styles.tiny_info} style={{ marginBottom: "7px", fontWeight: "bolder" }}>
                            Al hacer una reserva para persona o entidad externa usted autoriza y aprueba directamente la solicitud y reconoce la previa autorización de parte del señor Rector.
                        </div>
                    )}
                    <label className={styles.checkbox_label}>
                        <Field type="checkbox" id="EsPersonaExterna" name="EsPersonaExterna">
                            {({ field }: { field: any }) => (
                                <>
                                    <input
                                        type="checkbox"
                                        {...field}
                                        checked={isPersonaExterna}
                                        onChange={(e) => {
                                            handleChangeIsPersonaExterna(e.target.checked);
                                            field.onChange(e);
                                            setFieldValue('EsPersonaExterna', e.target.checked);
                                        }}
                                    />
                                </>
                            )}
                        </Field>
                        <span className={styles.checkmark}></span>
                        Es reserva para persona externa
                    </label>
                </div>

            </div>
            <div className={isPersonaExterna && activeStep === 1 ? `${styles.form_step_2} ${styles.show}` : `${styles.form_step_2} ${styles.hide}`}>
                <label htmlFor="NombrePersonaExterna">Nombre <span className={styles.tiny_info}>(Obligatorio)</span></label>
                <Field id="NombrePersonaExterna" name='NombrePersonaExterna' placeholder="Ingrese el nombre de la persona" className={errors.NombrePersonaExterna && touched.NombrePersonaExterna ? `${styles.error_input} ${styles.width_100}` : styles.width_100} disabled={formSubmited} />
                <ErrorMessage name="NombrePersonaExterna" component="div" className={styles.error} />

                <label htmlFor="ApellPaternoPersonaExterna">Apellido paterno <span className={styles.tiny_info}>(Obligatorio)</span></label>
                <Field id="ApellPaternoPersonaExterna" name='ApellPaternoPersonaExterna' placeholder="Ingrese el apellido paterno" className={errors.ApellPaternoPersonaExterna && touched.ApellPaternoPersonaExterna ? `${styles.error_input} ${styles.width_100}` : styles.width_100} disabled={formSubmited} />
                <ErrorMessage name="ApellPaternoPersonaExterna" component="div" className={styles.error} />

                <label htmlFor="ApellMaternoPersonaExterna">Apellido materno <span className={styles.tiny_info}>(Obligatorio)</span></label>
                <Field id="ApellMaternoPersonaExterna" name='ApellMaternoPersonaExterna' placeholder="Ingrese el apellido materno" className={errors.ApellMaternoPersonaExterna && touched.ApellMaternoPersonaExterna ? `${styles.error_input} ${styles.width_100}` : styles.width_100} disabled={formSubmited} />
                <ErrorMessage name="ApellMaternoPersonaExterna" component="div" className={styles.error} />

                <label htmlFor="CedulaPersonaExterna">Cédula ecuatoriana</label>
                <Field id="CedulaPersonaExterna" name='CedulaPersonaExterna' placeholder="Ingrese la cédula ecuatoriana" className={errors.CedulaPersonaExterna && touched.CedulaPersonaExterna ? `${styles.error_input} ${styles.width_100}` : styles.width_100} disabled={formSubmited} />
                <ErrorMessage name="CedulaPersonaExterna" component="div" className={styles.error} />

                <label htmlFor="EmailPersonaExterna">Email <span className={styles.tiny_info}>(Obligatorio)</span></label>
                <Field id="EmailPersonaExterna" name='EmailPersonaExterna' placeholder="Ingrese un email de contacto" className={errors.EmailPersonaExterna && touched.EmailPersonaExterna ? `${styles.error_input} ${styles.width_100}` : styles.width_100} disabled={formSubmited} />
                <ErrorMessage name="EmailPersonaExterna" component="div" className={styles.error} />

                <label htmlFor="TelefonoPersonaExterna">Teléfono celular</label>
                <Field id="TelefonoPersonaExterna" name='TelefonoPersonaExterna' placeholder="Ingrese un teléfono de contacto" className={errors.TelefonoPersonaExterna && touched.TelefonoPersonaExterna ? `${styles.error_input} ${styles.width_100}` : styles.width_100} disabled={formSubmited} />
                <ErrorMessage name="TelefonoPersonaExterna" component="div" className={styles.error} />

                <label htmlFor="OrganizacionPersonaExterna">Organización representante</label>
                <Field id="OrganizacionPersonaExterna" name='OrganizacionPersonaExterna' placeholder="Ingrese el nombre de la organización" className={errors.OrganizacionPersonaExterna && touched.OrganizacionPersonaExterna ? `${styles.error_input} ${styles.width_100}` : styles.width_100} disabled={formSubmited} />
                <ErrorMessage name="OrganizacionPersonaExterna" component="div" className={styles.error} />
            </div>
            <div className={(isPersonaExterna && activeStep === 2) || (!isPersonaExterna && activeStep === 1) ? `${styles.form_step_2} ${styles.show}` : `${styles.form_step_2} ${styles.hide}`}>
                {isEspecificDataReady && !isEspecificDataError ? (
                    <>
                        <label htmlFor="Razon">Razón de la reserva <span className={styles.tiny_info}>(Obligatorio)</span></label>
                        <Field as="textarea" id="Razon" name='Razon' placeholder="Escriba la razón para la reserva del espacio" className={errors.Razon && touched.Razon ? `${styles.error_input} ${styles.width_100}` : styles.width_100} disabled={formSubmited} />
                        <ErrorMessage name="Razon" component="div" className={styles.error} />

                        {tiposEventos.length === 0 && (
                            <div style={{ filter: 'opacity(0.7)' }}><i>No hay tipos de eventos para seleccionar</i></div>
                        )}
                        <div className={`${tiposEventos.length === 0 ? styles.hidden : ''}`} style={{ marginBottom: '10px' }}>
                            <label htmlFor="CodTipoEvento">Tipo de Evento</label>
                            <Field name="CodTipoEvento" id="CodTipoEvento" disabled={formSubmited}>
                                {({ field, form }: { field: any, form: any }) => {
                                    const handleChange = (selectedOption: any) => {
                                        if (selectedOption) {
                                            form.setFieldValue(field.name, selectedOption.value);
                                        } else {
                                            form.setFieldValue(field.name, null);
                                        }
                                    };

                                    const options: SelectsData[] = tiposEventos.map((tipoEvento: TipoEvento) => ({ value: tipoEvento.CodTipoEvento, label: tipoEvento.NombreTipoEvento }));
                                    const selectedOption = options.find(option => option.value === field.value);

                                    return (
                                        <Select
                                            {...field}
                                            value={selectedOption}
                                            options={options}
                                            onChange={handleChange}
                                            classNamePrefix="react-select"
                                            placeholder="Selecciona el tipo de espacio"
                                            className={`${styles.create_select} ${errors.CodTipoEvento && touched.CodTipoEvento ? styles.error_input : ''}`}
                                            isSearchable
                                            isClearable
                                            isDisabled={formSubmited}
                                        />
                                    );
                                }}
                            </Field>
                            <ErrorMessage name="CodTipoEvento" component="div" className={styles.error} />
                        </div>

                        {equipos.length === 0 && (
                            <div style={{ filter: 'opacity(0.7)' }}><i>No hay equipos disponibles</i></div>
                        )}
                        <div className={`${equipos.length === 0 ? styles.hidden : ''}`} style={{ marginBottom: '10px' }}>
                            <label htmlFor="Equipos">Equipos para reserva</label>
                            <Field name="Equipos" id="Equipos" disabled={formSubmited}>
                                {({ field, form }: { field: any, form: any }) => {
                                    const handleChange = (selectedOptions: any) => {
                                        const selectedValues = selectedOptions ? selectedOptions.map((option: any) => option.value) : [];
                                        form.setFieldValue(field.name, selectedValues);
                                    };

                                    const groupedOptions = equipos.reduce((acc: any, equipo: EquipoForReservation) => {
                                        const option = { value: equipo.CodEquipo, label: equipo.NombreEquipo + " (x" + equipo.Cantidad + ")" };
                                        const groupName = equipo.NombreTipoEquipo;
                                        if (!acc[groupName]) {
                                            acc[groupName] = [];
                                        }
                                        acc[groupName].push(option);
                                        return acc;
                                    }, {});

                                    const options = Object.keys(groupedOptions).map((groupName: string) => ({
                                        label: groupName,
                                        options: groupedOptions[groupName],
                                    }));

                                    const selectedValues = field.value || []; // Obtener los valores seleccionados del formulario

                                    // Obtener las opciones seleccionadas basadas en los valores seleccionados
                                    const selectedOptions = options.reduce((acc: any, option: any) => {
                                        const selected = option.options.filter((o: any) => selectedValues.includes(o.value));
                                        acc.push(...selected);
                                        return acc;
                                    }, []);

                                    return (
                                        <Select
                                            {...field}
                                            options={options}
                                            onChange={handleChange}
                                            classNamePrefix="react-select"
                                            placeholder="Seleccione si necesita equipos"
                                            className={`${styles.create_select} ${errors.Equipos && touched.Equipos ? styles.error_input : ''}`}
                                            isSearchable
                                            isClearable
                                            isMulti
                                            isDisabled={formSubmited}
                                            value={selectedOptions}
                                        />
                                    );
                                }}
                            </Field>
                            <ErrorMessage name="Equipos" component="div" className={styles.error} />
                        </div>

                        {serviciosEspeciales.length === 0 && (
                            <div style={{ filter: 'opacity(0.7)' }}><i>No hay servicios especiales disponibles</i></div>
                        )}
                        <div className={`${serviciosEspeciales.length === 0 ? styles.hidden : ''}`} style={{ marginBottom: '10px' }}>
                            <label htmlFor="ServiciosEspeciales">Servicios Especiales</label>
                            <Field name="ServiciosEspeciales" id="ServiciosEspeciales" disabled={formSubmited}>
                                {({ field, form }: { field: any, form: any }) => {
                                    const handleChange = (selectedOptions: any) => {
                                        const selectedValues = selectedOptions ? selectedOptions.map((option: any) => option.value) : [];
                                        form.setFieldValue(field.name, selectedValues);
                                    };

                                    const options = serviciosEspeciales.map((servicioEspecial: ServicioEspecial) => ({
                                        value: servicioEspecial.CodServicioEspecial,
                                        label: servicioEspecial.NombreServicioEspecial,
                                    }));

                                    const selectedValues = field.value || [];

                                    const selectedOption = options.filter((option: any) => selectedValues.includes(option.value));

                                    return (
                                        <Select
                                            {...field}
                                            value={selectedOption}
                                            options={options}
                                            onChange={handleChange}
                                            classNamePrefix="react-select"
                                            placeholder="Seleccione si necesita servicios especiales"
                                            className={`${styles.create_select} ${errors.CodTipoEvento && touched.CodTipoEvento ? styles.error_input : ''}`}
                                            isSearchable
                                            isClearable
                                            isMulti
                                            isDisabled={formSubmited}
                                        />
                                    );
                                }}
                            </Field>
                            <ErrorMessage name="ServiciosEspeciales" component="div" className={styles.error} />
                        </div>

                        {!isPersonaExterna && (
                            <div className={styles.container_line}>
                                <label className={styles.checkbox_label}>
                                    <Field type="checkbox" id="isEventoAcademico" name="isEventoAcademico">
                                        {({ field }: { field: any }) => (
                                            <>
                                                <input
                                                    type="checkbox"
                                                    {...field}
                                                    checked={isEventoAcademico}
                                                    onChange={(e) => {
                                                        setIsEventoAcademico(e.target.checked);
                                                        field.onChange(e);
                                                        setFieldValue('isEventoAcademico', e.target.checked);
                                                    }}
                                                />
                                            </>
                                        )}
                                    </Field>
                                    <span className={styles.checkmark}></span>
                                    Es evento académico o protocolario
                                </label>
                            </div>

                        )}
                    </>
                ) : (
                    <div className={styles.load_container}><FontAwesomeIcon icon={faSpinner} spin style={{ marginBottom: '10px' }} /></div>
                )}

                {isEspecificDataError && (
                    <div className={styles.load_container}>
                        <FontAwesomeIcon icon={faExclamationTriangle} className={styles.error_icon} />
                        <p>Ha ocurrido un error al cargar los datos</p>
                    </div>
                )}
            </div>
            <div className={(isPersonaExterna && activeStep === 3) || (!isPersonaExterna && activeStep === 2) ? `${styles.form_step_2} ${styles.show}` : `${styles.form_step_2} ${styles.hide}`}>
                {isEventoAcademico ? (
                    <div className={styles.tiny_info}>
                        Para eventos académicos debe seleccionar hasta 2 repasos con un máximo de 2 horas cada uno.
                    </div>
                ) : (
                    <div className={styles.tiny_info}>
                        Puede o no seleccionar hasta 2 repasos con un máximo de 2 horas cada uno para su reserva.
                    </div>
                )}

                {openRepaso1 && reservation && reservation.day && (
                    <>
                        <div className={styles.separate_row}>1er Repaso {!openRepaso2 && (<button type="button" className={styles.close_repaso} onClick={() => removeRepaso(1)}><FontAwesomeIcon icon={faTimes} style={{ marginRight: '5px' }} /> Quitar repaso</button>)}</div>
                        <div className={styles.center_column}>
                            <label htmlFor="DiaRepaso1">Fecha</label>
                            <Field name="DiaRepaso1">
                                {({ form }: { form: any }) => (
                                    <DatePicker
                                        selected={form.values.DiaRepaso1}
                                        showPopperArrow={true}
                                        locale={es}
                                        onChange={(date) => {
                                            if (date && isValid(date)) {
                                                if (date > new Date() && date < reservation.day) {
                                                    if (!form.values.DiaRepaso2 || date < form.values.DiaRepaso2) {
                                                        if ((!form.values.HoraIncioRepaso1 || !form.values.HoraFinRepaso1)) {
                                                            validateRepaso({ day: date, startHour: '', endHour: '' }).then((result) => {
                                                                if (result === false) {
                                                                    Store.addNotification({
                                                                        title: "Fecha inválida",
                                                                        message: "La fecha no se encuentra dentro de ninguna restricción",
                                                                        type: "info",
                                                                        insert: "bottom",
                                                                        container: "bottom-left",
                                                                        animationIn: ["animate__animated", "animate__fadeIn"],
                                                                        animationOut: ["animate__animated", "animate__fadeOut"],
                                                                        dismiss: {
                                                                            duration: 8000,
                                                                            onScreen: true,
                                                                            pauseOnHover: true
                                                                        }
                                                                    });
                                                                } else {
                                                                    form.setFieldValue('DiaRepaso1', date);
                                                                    console.log('cambio aca');
                                                                    if (form.values.HoraInicioRepaso1 !== '' && form.values.HoraFinRepaso1 !== '') {
                                                                        setRepaso1({ day: date, startHour: form.values.HoraInicioRepaso1, endHour: form.values.HoraFinRepaso1 });
                                                                    }
                                                                }
                                                            });
                                                        } else {
                                                            if (form.values.HoraInicioRepaso1 !== '' && form.values.HoraFinRepaso1 !== '') {
                                                                validateRepaso({ day: date, startHour: form.values.HoraInicioRepaso1, endHour: form.values.HoraFinRepaso1 }).then((result) => {
                                                                    if (result === false) {
                                                                        Store.addNotification({
                                                                            title: "Fecha inválida",
                                                                            message: "La fecha no se encuentra dentro de ninguna restricción",
                                                                            type: "info",
                                                                            insert: "bottom",
                                                                            container: "bottom-left",
                                                                            animationIn: ["animate__animated", "animate__fadeIn"],
                                                                            animationOut: ["animate__animated", "animate__fadeOut"],
                                                                            dismiss: {
                                                                                duration: 8000,
                                                                                onScreen: true,
                                                                                pauseOnHover: true
                                                                            }
                                                                        });
                                                                    } else {
                                                                        form.setFieldValue('DiaRepaso1', date);
                                                                        console.log('mentira aca');
                                                                        setRepaso1({ day: date, startHour: form.values.HoraInicioRepaso1, endHour: form.values.HoraFinRepaso1 });
                                                                    }
                                                                });
                                                            }
                                                        }
                                                    } else {
                                                        Store.addNotification({
                                                            title: "Fecha para repaso inválida",
                                                            message: "La fecha de repaso no puede ser mayor a la fecha del otro repaso",
                                                            type: "info",
                                                            insert: "bottom",
                                                            container: "bottom-left",
                                                            animationIn: ["animate__animated", "animate__fadeIn"],
                                                            animationOut: ["animate__animated", "animate__fadeOut"],
                                                            dismiss: {
                                                                duration: 8000,
                                                                onScreen: true,
                                                                pauseOnHover: true
                                                            }
                                                        });
                                                    }

                                                } else {
                                                    Store.addNotification({
                                                        title: "Fecha para repaso inválida",
                                                        message: "La fecha de repaso debe ser menor a la fecha de reserva y mayor a la fecha actual",
                                                        type: "info",
                                                        insert: "bottom",
                                                        container: "bottom-left",
                                                        animationIn: ["animate__animated", "animate__fadeIn"],
                                                        animationOut: ["animate__animated", "animate__fadeOut"],
                                                        dismiss: {
                                                            duration: 8000,
                                                            onScreen: true,
                                                            pauseOnHover: true
                                                        }
                                                    });
                                                }
                                            } else {
                                                Store.addNotification({
                                                    title: "Fecha para repaso inválida",
                                                    message: "Debe seleccionar una fecha válida",
                                                    type: "warning",
                                                    insert: "bottom",
                                                    container: "bottom-left",
                                                    animationIn: ["animate__animated", "animate__fadeIn"],
                                                    animationOut: ["animate__animated", "animate__fadeOut"],
                                                    dismiss: {
                                                        duration: 8000,
                                                        onScreen: true,
                                                        pauseOnHover: true
                                                    }
                                                });
                                            }
                                        }}
                                        className={`${styles.form_datepicker} ${errors.DiaRepaso1 && touched.DiaRepaso1 ? styles.error_input : ''}`}
                                    />
                                )}
                            </Field>
                            <ErrorMessage name="DiaRepaso1" component="div" className={styles.error} />
                        </div>
                        <div className={styles.nowrap_row}>
                            <div style={{ width: "min-content" }}>
                                <label htmlFor="HoraInicioRepaso1">Hora inicial</label>
                                <Field type="time" id="HoraInicioRepaso1" name='HoraInicioRepaso1' placeholder="Ingrese la hora de inicio" min="06:00" max="22:00" disabled={formSubmited}
                                    render={({ field, form }: { field: any, form: any }) => (
                                        <input
                                            type="time"
                                            name='HoraInicioRepaso1'
                                            {...field}
                                            value={form.values.HoraInicioRepaso1}
                                            className={errors.HoraInicioRepaso1 && touched.HoraInicioRepaso1 ? styles.error_input : ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                let valor = e.target.value;
                                                if (
                                                    form.values.DiaRepaso1 &&
                                                    !form.values.HoraFinRepaso1 &&
                                                    e.target.value !== ""
                                                ) {
                                                    validateRepaso({ day: form.values.DiaRepaso1, startHour: valor, endHour: "" }).then((result) => {
                                                        if (result === false) {
                                                            Store.addNotification({
                                                                title: "Fecha inválida",
                                                                message: "La fecha no se encuentra dentro de ninguna restricción",
                                                                type: "info",
                                                                insert: "bottom",
                                                                container: "bottom-left",
                                                                animationIn: ["animate__animated", "animate__fadeIn"],
                                                                animationOut: ["animate__animated", "animate__fadeOut"],
                                                                dismiss: {
                                                                    duration: 8000,
                                                                    onScreen: true,
                                                                    pauseOnHover: true
                                                                }
                                                            });
                                                        } else {
                                                            setFieldValue('HoraInicioRepaso1', valor);
                                                        }
                                                    });
                                                }

                                                if (form.values.DiaRepaso1 && form.values.HoraFinRepaso1) {
                                                    if (form.values.HoraFinRepaso1 > e.target.value) {
                                                        validateRepaso({ day: form.values.DiaRepaso1, startHour: valor, endHour: form.values.HoraFinRepaso1 }).then((result) => {
                                                            if (result === false) {
                                                                Store.addNotification({
                                                                    title: "Fecha inválida",
                                                                    message: "Seleccione otra fecha de inicio",
                                                                    type: "info",
                                                                    insert: "bottom",
                                                                    container: "bottom-left",
                                                                    animationIn: ["animate__animated", "animate__fadeIn"],
                                                                    animationOut: ["animate__animated", "animate__fadeOut"],
                                                                    dismiss: {
                                                                        duration: 8000,
                                                                        onScreen: true,
                                                                        pauseOnHover: true
                                                                    }
                                                                });
                                                            } else {
                                                                setFieldValue('HoraInicioRepaso1', valor);
                                                                setRepaso1({ day: form.values.DiaRepaso1, startHour: valor, endHour: form.values.HoraFinRepaso1 });
                                                            }
                                                        });
                                                    } else {
                                                        Store.addNotification({
                                                            title: "Hora inválida",
                                                            message: "La hora de inicio debe ser menor a la hora final",
                                                            type: "info",
                                                            insert: "bottom",
                                                            container: "bottom-left",
                                                            animationIn: ["animate__animated", "animate__fadeIn"],
                                                            animationOut: ["animate__animated", "animate__fadeOut"],
                                                            dismiss: {
                                                                duration: 8000,
                                                                onScreen: true,
                                                                pauseOnHover: true
                                                            }
                                                        });
                                                    }
                                                }

                                                if (!form.values.DiaRepaso1) {
                                                    Store.addNotification({
                                                        title: "Día inválido",
                                                        message: "Seleccione un día para el repaso primero",
                                                        type: "info",
                                                        insert: "bottom",
                                                        container: "bottom-left",
                                                        animationIn: ["animate__animated", "animate__fadeIn"],
                                                        animationOut: ["animate__animated", "animate__fadeOut"],
                                                        dismiss: {
                                                            duration: 8000,
                                                            onScreen: true,
                                                            pauseOnHover: true
                                                        }
                                                    });
                                                }
                                            }}
                                        />
                                    )} />
                                <ErrorMessage name="HoraInicioRepaso1" component="div" className={styles.error} />
                            </div>

                            <div style={{ width: "min-content" }}>
                                <label htmlFor="HoraFinRepaso1">Hora final</label>
                                <Field type="time" id="HoraFinRepaso1" name='HoraFinRepaso1' placeholder="Ingrese la hora fin" min="06:00" max="22:00" disabled={formSubmited}
                                    render={({ field, form }: { field: any, form: any }) => (
                                        <input
                                            type="time"
                                            name='HoraFinRepaso1'
                                            {...field}
                                            className={errors.HoraFinRepaso1 && touched.HoraFinRepaso1 ? styles.error_input : ''}
                                            value={form.values.HoraFinRepaso1}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                let valor = e.target.value;
                                                if (
                                                    form.values.DiaRepaso1 &&
                                                    !form.values.HoraInicioRepaso1 &&
                                                    e.target.value !== ""
                                                ) {
                                                    validateRepaso({ day: form.values.DiaRepaso1, startHour: '', endHour: valor }).then((result) => {
                                                        if (result === false) {
                                                            Store.addNotification({
                                                                title: "Fecha inválida",
                                                                message: "La fecha no se encuentra dentro de ninguna restricción",
                                                                type: "info",
                                                                insert: "bottom",
                                                                container: "bottom-left",
                                                                animationIn: ["animate__animated", "animate__fadeIn"],
                                                                animationOut: ["animate__animated", "animate__fadeOut"],
                                                                dismiss: {
                                                                    duration: 8000,
                                                                    onScreen: true,
                                                                    pauseOnHover: true
                                                                }
                                                            });
                                                        } else {
                                                            setFieldValue('HoraFinRepaso1', valor);
                                                        }
                                                    });
                                                }

                                                if (form.values.DiaRepaso1 && form.values.HoraInicioRepaso1) {
                                                    if (form.values.HoraInicioRepaso1 < e.target.value) {
                                                        validateRepaso({ day: form.values.DiaRepaso1, startHour: form.values.HoraInicioRepaso1, endHour: valor }).then((result) => {
                                                            if (result === false) {
                                                                Store.addNotification({
                                                                    title: "Fecha inválida",
                                                                    message: "Seleccione otra fecha de fin",
                                                                    type: "info",
                                                                    insert: "bottom",
                                                                    container: "bottom-left",
                                                                    animationIn: ["animate__animated", "animate__fadeIn"],
                                                                    animationOut: ["animate__animated", "animate__fadeOut"],
                                                                    dismiss: {
                                                                        duration: 8000,
                                                                        onScreen: true,
                                                                        pauseOnHover: true
                                                                    }
                                                                });
                                                            } else {
                                                                setFieldValue('HoraFinRepaso1', valor);
                                                                setRepaso1({ day: form.values.DiaRepaso1, startHour: form.values.HoraInicioRepaso1, endHour: valor });
                                                            }
                                                        });
                                                    } else {
                                                        Store.addNotification({
                                                            title: "Hora inválida",
                                                            message: "La hora de fin debe ser mayor a la hora inicial",
                                                            type: "info",
                                                            insert: "bottom",
                                                            container: "bottom-left",
                                                            animationIn: ["animate__animated", "animate__fadeIn"],
                                                            animationOut: ["animate__animated", "animate__fadeOut"],
                                                            dismiss: {
                                                                duration: 8000,
                                                                onScreen: true,
                                                                pauseOnHover: true
                                                            }
                                                        });
                                                    }
                                                }

                                                if (!form.values.DiaRepaso1) {
                                                    Store.addNotification({
                                                        title: "Día inválido",
                                                        message: "Seleccione un día para el repaso primero",
                                                        type: "info",
                                                        insert: "bottom",
                                                        container: "bottom-left",
                                                        animationIn: ["animate__animated", "animate__fadeIn"],
                                                        animationOut: ["animate__animated", "animate__fadeOut"],
                                                        dismiss: {
                                                            duration: 8000,
                                                            onScreen: true,
                                                            pauseOnHover: true
                                                        }
                                                    });
                                                }
                                            }}
                                        />
                                    )} />
                                <ErrorMessage name="HoraFinRepaso1" component="div" className={styles.error} />
                            </div>
                        </div>
                    </>
                )}

                {openRepaso2 && reservation && reservation.day && (
                    <>
                        <div className={styles.separate_row}>2do Repaso <button type="button" className={styles.close_repaso} onClick={() => removeRepaso(2)}><FontAwesomeIcon icon={faTimes} style={{ marginRight: '5px' }} /> Quitar repaso</button></div>
                        <div className={styles.center_column}>
                            <label htmlFor="DiaRepaso2">Fecha</label>
                            <Field name="DiaRepaso2">
                                {({ form }: { form: any }) => (
                                    <DatePicker
                                        selected={form.values.DiaRepaso2}
                                        showPopperArrow={true}
                                        locale={es}
                                        onChange={(date) => {
                                            if (date && isValid(date)) {
                                                if (date > new Date() && date < reservation.day && (!form.values.DiaRepaso1 || date > form.values.DiaRepaso1)) {
                                                    if ((!form.values.HoraIncioRepaso2 || !form.values.HoraFinRepaso2)) {
                                                        validateRepaso({ day: date, startHour: '', endHour: '' }).then((result) => {
                                                            if (result === false) {
                                                                Store.addNotification({
                                                                    title: "Fecha inválida",
                                                                    message: "La fecha no se encuentra dentro de ninguna restricción",
                                                                    type: "info",
                                                                    insert: "bottom",
                                                                    container: "bottom-left",
                                                                    animationIn: ["animate__animated", "animate__fadeIn"],
                                                                    animationOut: ["animate__animated", "animate__fadeOut"],
                                                                    dismiss: {
                                                                        duration: 8000,
                                                                        onScreen: true,
                                                                        pauseOnHover: true
                                                                    }
                                                                });
                                                            } else {
                                                                form.setFieldValue('DiaRepaso2', date);
                                                            }
                                                        });
                                                    } else {
                                                        if (form.values.HoraInicioRepaso2 !== '' && form.values.HoraFinRepaso2 !== '') {
                                                            validateRepaso({ day: date, startHour: form.values.HoraInicioRepaso2, endHour: form.values.HoraFinRepaso2 }).then((result) => {
                                                                if (result === false) {
                                                                    Store.addNotification({
                                                                        title: "Fecha inválida",
                                                                        message: "La fecha no se encuentra dentro de ninguna restricción",
                                                                        type: "info",
                                                                        insert: "bottom",
                                                                        container: "bottom-left",
                                                                        animationIn: ["animate__animated", "animate__fadeIn"],
                                                                        animationOut: ["animate__animated", "animate__fadeOut"],
                                                                        dismiss: {
                                                                            duration: 8000,
                                                                            onScreen: true,
                                                                            pauseOnHover: true
                                                                        }
                                                                    });
                                                                } else {
                                                                    form.setFieldValue('DiaRepaso2', date);
                                                                    setRepaso2({ day: date, startHour: form.values.HoraInicioRepaso2, endHour: form.values.HoraFinRepaso2 });
                                                                }
                                                            });
                                                        }
                                                    }
                                                } else {
                                                    Store.addNotification({
                                                        title: "Fecha para repaso inválida",
                                                        message: "La fecha debe ser menor a la fecha de la reserva y mayor a la fecha del repaso 1",
                                                        type: "info",
                                                        insert: "bottom",
                                                        container: "bottom-left",
                                                        animationIn: ["animate__animated", "animate__fadeIn"],
                                                        animationOut: ["animate__animated", "animate__fadeOut"],
                                                        dismiss: {
                                                            duration: 8000,
                                                            onScreen: true,
                                                            pauseOnHover: true
                                                        }
                                                    });
                                                }
                                            } else {
                                                Store.addNotification({
                                                    title: "Fecha para repaso inválida",
                                                    message: "Debe seleccionar una fecha válida",
                                                    type: "warning",
                                                    insert: "bottom",
                                                    container: "bottom-left",
                                                    animationIn: ["animate__animated", "animate__fadeIn"],
                                                    animationOut: ["animate__animated", "animate__fadeOut"],
                                                    dismiss: {
                                                        duration: 8000,
                                                        onScreen: true,
                                                        pauseOnHover: true
                                                    }
                                                });
                                            }
                                        }}
                                        className={`${styles.form_datepicker} ${errors.DiaRepaso2 && touched.DiaRepaso2 ? styles.error_input : ''}`}
                                    />
                                )}
                            </Field>
                            <ErrorMessage name="DiaRepaso2" component="div" className={styles.error} />
                        </div>
                        <div className={styles.nowrap_row}>
                            <div style={{ width: "min-content" }}>
                                <label htmlFor="HoraInicioRepaso2">Hora inicial</label>
                                <Field type="time" id="HoraInicioRepaso2" name='HoraInicioRepaso2' placeholder="Ingrese la hora de inicio" min="06:00" max="22:00" disabled={formSubmited}
                                    render={({ field, form }: { field: any, form: any }) => (
                                        <input
                                            type="time"
                                            name='HoraInicioRepaso2'
                                            {...field}
                                            value={form.values.HoraInicioRepaso2}
                                            className={errors.HoraInicioRepaso2 && touched.HoraInicioRepaso2 ? styles.error_input : ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                let valor = e.target.value;
                                                if (
                                                    form.values.DiaRepaso2 &&
                                                    !form.values.HoraFinRepaso2 &&
                                                    e.target.value !== ""
                                                ) {
                                                    validateRepaso({ day: form.values.DiaRepaso2, startHour: valor, endHour: "" }).then((result) => {
                                                        if (result === false) {
                                                            Store.addNotification({
                                                                title: "Fecha inválida",
                                                                message: "La fecha no se encuentra dentro de ninguna restricción",
                                                                type: "info",
                                                                insert: "bottom",
                                                                container: "bottom-left",
                                                                animationIn: ["animate__animated", "animate__fadeIn"],
                                                                animationOut: ["animate__animated", "animate__fadeOut"],
                                                                dismiss: {
                                                                    duration: 8000,
                                                                    onScreen: true,
                                                                    pauseOnHover: true
                                                                }
                                                            });
                                                        } else {
                                                            setFieldValue('HoraInicioRepaso2', valor);
                                                        }
                                                    });
                                                }

                                                if (form.values.DiaRepaso2 && form.values.HoraFinRepaso2) {
                                                    if (form.values.HoraFinRepaso2 > e.target.value) {
                                                        validateRepaso({ day: form.values.DiaRepaso2, startHour: valor, endHour: form.values.HoraFinRepaso2 }).then((result) => {
                                                            if (result === false) {
                                                                Store.addNotification({
                                                                    title: "Fecha inválida",
                                                                    message: "Seleccione otra fecha de inicio",
                                                                    type: "info",
                                                                    insert: "bottom",
                                                                    container: "bottom-left",
                                                                    animationIn: ["animate__animated", "animate__fadeIn"],
                                                                    animationOut: ["animate__animated", "animate__fadeOut"],
                                                                    dismiss: {
                                                                        duration: 8000,
                                                                        onScreen: true,
                                                                        pauseOnHover: true
                                                                    }
                                                                });
                                                            } else {
                                                                setFieldValue('HoraInicioRepaso2', valor);
                                                                setRepaso2({ day: form.values.DiaRepaso2, startHour: valor, endHour: form.values.HoraFinRepaso2 });
                                                            }
                                                        });
                                                    } else {
                                                        Store.addNotification({
                                                            title: "Hora inválida",
                                                            message: "La hora de inicio debe ser menor a la hora final",
                                                            type: "info",
                                                            insert: "bottom",
                                                            container: "bottom-left",
                                                            animationIn: ["animate__animated", "animate__fadeIn"],
                                                            animationOut: ["animate__animated", "animate__fadeOut"],
                                                            dismiss: {
                                                                duration: 8000,
                                                                onScreen: true,
                                                                pauseOnHover: true
                                                            }
                                                        });
                                                    }
                                                }

                                                if (!form.values.DiaRepaso2) {
                                                    Store.addNotification({
                                                        title: "Día inválido",
                                                        message: "Seleccione un día para el repaso primero",
                                                        type: "info",
                                                        insert: "bottom",
                                                        container: "bottom-left",
                                                        animationIn: ["animate__animated", "animate__fadeIn"],
                                                        animationOut: ["animate__animated", "animate__fadeOut"],
                                                        dismiss: {
                                                            duration: 8000,
                                                            onScreen: true,
                                                            pauseOnHover: true
                                                        }
                                                    });
                                                }
                                            }}
                                        />
                                    )} />
                                <ErrorMessage name="HoraInicioRepaso2" component="div" className={styles.error} />
                            </div>

                            <div style={{ width: "min-content" }}>
                                <label htmlFor="HoraFinRepaso2">Hora final</label>
                                <Field type="time" id="HoraFinRepaso2" name='HoraFinRepaso2' placeholder="Ingrese la hora fin" min="06:00" max="22:00" disabled={formSubmited}
                                    render={({ field, form }: { field: any, form: any }) => (
                                        <input
                                            type="time"
                                            name='HoraFinRepaso2'
                                            {...field}
                                            className={errors.HoraFinRepaso2 && touched.HoraFinRepaso2 ? styles.error_input : ''}
                                            value={form.values.HoraFinRepaso2}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                let valor = e.target.value;
                                                if (
                                                    form.values.DiaRepaso2 &&
                                                    !form.values.HoraInicioRepaso2 &&
                                                    e.target.value !== ""
                                                ) {
                                                    validateRepaso({ day: form.values.DiaRepaso2, startHour: '', endHour: valor }).then((result) => {
                                                        if (result === false) {
                                                            Store.addNotification({
                                                                title: "Fecha inválida",
                                                                message: "La fecha no se encuentra dentro de ninguna restricción",
                                                                type: "info",
                                                                insert: "bottom",
                                                                container: "bottom-left",
                                                                animationIn: ["animate__animated", "animate__fadeIn"],
                                                                animationOut: ["animate__animated", "animate__fadeOut"],
                                                                dismiss: {
                                                                    duration: 8000,
                                                                    onScreen: true,
                                                                    pauseOnHover: true
                                                                }
                                                            });
                                                        } else {
                                                            setFieldValue('HoraFinRepaso2', valor);
                                                        }
                                                    });
                                                }

                                                if (form.values.DiaRepaso2 && form.values.HoraInicioRepaso2) {
                                                    if (form.values.HoraInicioRepaso2 < e.target.value) {
                                                        validateRepaso({ day: form.values.DiaRepaso2, startHour: form.values.HoraInicioRepaso2, endHour: valor }).then((result) => {
                                                            if (result === false) {
                                                                Store.addNotification({
                                                                    title: "Fecha inválida",
                                                                    message: "Seleccione otra fecha de fin",
                                                                    type: "info",
                                                                    insert: "bottom",
                                                                    container: "bottom-left",
                                                                    animationIn: ["animate__animated", "animate__fadeIn"],
                                                                    animationOut: ["animate__animated", "animate__fadeOut"],
                                                                    dismiss: {
                                                                        duration: 8000,
                                                                        onScreen: true,
                                                                        pauseOnHover: true
                                                                    }
                                                                });
                                                            } else {
                                                                setFieldValue('HoraFinRepaso2', valor);
                                                                setRepaso2({ day: form.values.DiaRepaso2, startHour: form.values.HoraInicioRepaso2, endHour: valor });
                                                            }
                                                        });
                                                    } else {
                                                        Store.addNotification({
                                                            title: "Hora inválida",
                                                            message: "La hora de fin debe ser mayor a la hora inicial",
                                                            type: "info",
                                                            insert: "bottom",
                                                            container: "bottom-left",
                                                            animationIn: ["animate__animated", "animate__fadeIn"],
                                                            animationOut: ["animate__animated", "animate__fadeOut"],
                                                            dismiss: {
                                                                duration: 8000,
                                                                onScreen: true,
                                                                pauseOnHover: true
                                                            }
                                                        });
                                                    }
                                                }

                                                if (!form.values.DiaRepaso2) {
                                                    Store.addNotification({
                                                        title: "Día inválido",
                                                        message: "Seleccione un día para el repaso primero",
                                                        type: "info",
                                                        insert: "bottom",
                                                        container: "bottom-left",
                                                        animationIn: ["animate__animated", "animate__fadeIn"],
                                                        animationOut: ["animate__animated", "animate__fadeOut"],
                                                        dismiss: {
                                                            duration: 8000,
                                                            onScreen: true,
                                                            pauseOnHover: true
                                                        }
                                                    });
                                                }
                                            }}
                                        />
                                    )} />
                                <ErrorMessage name="HoraFinRepaso2" component="div" className={styles.error} />
                            </div>
                        </div>
                    </>
                )}

                {reservation && reservation.day ? (
                    <>
                        {!openRepaso2 && (
                            <div className={styles.card_buttons_container}>
                                <button type="button" name="addRepaso" className={styles.add_repaso_button} onClick={handleAddRepaso}>Añadir un {openRepaso1 && ('nuevo ')}repaso</button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className={styles.load_container}>Agende una reserva primero</div>
                )}

            </div>
            <div className={styles.step_buttons_2}>
                <button type="button" onClick={handlePrev} disabled={activeStep === 0} className={styles.prev_button}>
                    <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: "5px" }} /> Atrás
                </button>
                <button type="button" onClick={handleNext} disabled={(activeStep === 2 && !isPersonaExterna) || (activeStep === 3 && isPersonaExterna)} className={styles.next_button}>
                    Siguiente <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: "5px" }} />
                </button>
            </div>
            {
                activeStep === 1 && (
                    <div>
                        {isLoading && (
                            <div className={styles.card_buttons_container}>
                                <div className={styles.load_icon}>
                                    <FontAwesomeIcon icon={faSpinner} spin />
                                </div>
                            </div>
                        )}
                    </div>
                )
            }
            {((!isPersonaExterna && activeStep === 2) || (isPersonaExterna && activeStep === 3)) && (reservation !== undefined && reservation !== null) ? (
                <div className={styles.card_buttons_container}>
                    <button type="submit" disabled={isSubmitting || formSubmited} className={styles.reserva_button}>
                        <FontAwesomeIcon icon={faCalendarAlt} style={{ marginRight: '10px' }} /> Agendar Reserva
                    </button>
                </div>
            ) : ('')}
            {
                formSubmited === true && (
                    <div className={styles.card_buttons_container}>
                        <button type="button" onClick={() => onFinalization()} disabled={!formSubmited}>
                            <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '5px' }} /> Finalizar
                        </button>
                    </div>
                )
            }
        </Form >
    )
}

function ConfirmationModal(props: ConfirmationModalProps) {
    const { isOpen, onClose, onConfirm } = props;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <Modal open={isOpen} onClose={onClose} className={styles.modal}>
            <div className={`${styles.card} ${styles.card_confirmation}`}>
                <h3>¿Está seguro?</h3>
                <div>Los datos no guardados se perderán.</div>
                <div className={styles.card_buttons_container}>
                    <button onClick={onClose} className={styles.cancel_button}>
                        Cancelar
                    </button>
                    <button onClick={handleConfirm} className={styles.confirm_button}>
                        Confirmar
                    </button>
                </div>
            </div>
        </Modal>
    );
}

function FinalizationModal(props: FinalizationModalProps) {
    const { isOpen, onClose, onConfirm, CodEspacio, onFinalization } = props;

    const handleConfirm = () => {
        if (CodEspacio === undefined || CodEspacio === null) return console.error('No existe el código del espacio');
        onConfirm();
        onClose();
        setTimeout(() => {
            window.open(`/equipo?CodEspacio=${CodEspacio}`, '_blank');
        }, 100);
        setTimeout(() => {
            window.location.href = `/espacios/${CodEspacio}`;
        }, 110);
    };

    return (
        <Modal open={isOpen} onClose={onClose} className={styles.modal}>
            <div className={`${styles.card} ${styles.card_confirmation}`}>
                <h3>Gestionar Equipos</h3>
                <div>¿Desea gestionar los equipos del espacio ahora?</div>
                <div className={styles.card_buttons_container}>
                    <button onClick={onFinalization} className={styles.cancel_button}>
                        No, solo finalizar
                    </button>
                    <button onClick={handleConfirm} className={styles.confirm_button}>
                        Sí, gestionar equipos
                    </button>
                </div>
            </div>
        </Modal>
    );
}

function ConfirmExternalReservationModal(props: FinalizationModalProps) {
    const { isOpen, onClose } = props;
    const [aceptTerms, setAceptTerms] = useState(false);

    const handleChangeTerm = (value: boolean) => {
        setAceptTerms(value);
    }

    const handleConfirm = () => {
        setAceptTerms(false);
        onClose();
    };

    return (
        <Modal open={isOpen} className={`${styles.modal} ${styles.modal_supreme}`}>
            <div className={`${styles.card} ${styles.more_size_card}`}>
                <h3>Advertencia</h3>
                <div>Al seleccionar que esta es una reserva para persona o entidad externa a la universidad, usted <span className={styles.green_color}>autoriza</span> y <span className={styles.green_color}>aprueba</span> directamente la solicitud y reconoce la previa autorización de parte del señor Rector.</div>
                <label className={styles.checkbox_label} style={{ marginTop: '20px' }}>
                    <input
                        type="checkbox"
                        checked={aceptTerms}
                        onChange={(e) => {
                            handleChangeTerm(e.target.checked);
                        }}
                    />
                    <span className={styles.checkmark}></span>
                    He leído y entiendo lo que se me informa
                </label>
                <div className={styles.card_buttons_container}>
                    <button onClick={handleConfirm} className={styles.confirm_button} disabled={!aceptTerms}>
                        Entendido
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export const MakeReservation: React.FC<MakeReservationProps> = ({
    isOpen,
    onClose,
    reservation,
    setReservation,
    setRepaso1,
    setRepaso2,
    validateRepaso,
    espacio
}) => {
    const [nombreEspacio, setNombreEspacio] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [stepErrors, setStepErrors] = useState({ step0: false, step1: false, step2: false, step3: false });
    const [isNestedModalOpen, setIsNestedModalOpen] = useState(false);
    const [isFinalizationModalOpen, setIsFinalizationModalOpen] = useState(false);
    const [newEspacio, setNewEspacio] = useState({} as Espacio_Create);
    const [formSubmited, setFormSubmited] = useState(false);
    const [isPersonaExterna, setIsPersonaExterna] = useState(false);
    const [isEventoAcademico, setIsEventoAcademico] = useState(false);
    const [isReserving, setIsReserving] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [reservationError, setReservationError] = useState(false);
    const [newReservation, setNewReservation] = useState({} as Reserva);
    const [newRepasos, setNewRepasos] = useState([] as RepasoInfo[]);
    const [reservedEspacio, setReservedEspacio] = useState({} as Espacio_Tiny);
    const router = useRouter();

    const createReserva = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
        setIsReserving(true);
        setIsNestedModalOpen(true);
        setSubmitting(true);
        if (reservation === undefined || reservation === null) {
            setSubmitting(false);
            setIsReserving(false);
            Store.addNotification({
                title: "La reserva no esta registrada",
                message: "Lo sentimos ha ocurido un problema al registrar la reserva, por favor revísela y vuelva a intentarlo",
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
            return console.error('No existe la reserva');
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/api/reserva/calendar`, {
                Dia: values.Dia,
                HoraInicio: values.HoraInicio,
                HoraFin: values.HoraFin,
                DiaRepaso1: values.DiaRepaso1,
                HoraInicioRepaso1: values.HoraInicioRepaso1,
                HoraFinRepaso1: values.HoraFinRepaso1,
                DiaRepaso2: values.DiaRepaso2,
                HoraInicioRepaso2: values.HoraInicioRepaso2,
                HoraFinRepaso2: values.HoraFinRepaso2,
                NombrePersonaExterna: values.NombrePersonaExterna,
                ApellPaternoPersonaExterna: values.ApellPaternoPersonaExterna,
                ApellMaternoPersonaExterna: values.ApellMaternoPersonaExterna,
                EmailPersonaExterna: values.EmailPersonaExterna,
                TelefonoPersonaExterna: values.TelefonoPersonaExterna,
                CedulaPersonaExterna: values.CedulaPersonaExterna,
                OrganizacionPersonaExterna: values.OrganizacionPersonaExterna,
                Razon: values.Razon,
                CodTipoEvento: values.CodTipoEvento,
                Equipos: values.Equipos,
                ServiciosEspeciales: values.ServiciosEspeciales,
                isEventoAcademico: values.isEventoAcademico,
                EsPersonaExterna: values.EsPersonaExterna,
                CodEspacio: espacio ? espacio : null
            });
            if (response.status === 200) {
                setNewReservation(response.data.reserva);
                setNewRepasos(response.data.repasos);
                setReservedEspacio(response.data.espacio);
                setReservationError(false);
                setTitle(response.data.reserva.EsPersonaExterna === true ? "Reserva agendada con éxito" : "Solicitud agendada con éxito");
                setContent(`La solicitud o reserva se ha creado con éxito. Revise su correo para más información.<br/>
                            <a href="${API_BASE_URL_SEC}/reservas?filter=CodReserva-${response.data.reserva.CodReserva}" style="text-decoration: none; color: #649c6c; cursor: pointer; font-weight: 600;" target="_blank">Click aquí para ver detalles de la reserva</a>`);
                Store.addNotification({
                    title: "Reserva agendada con éxito",
                    message: "La solicitud o reserva se ha creado con éxito. Revise su correo para más información.",
                    type: "success",
                    insert: "top",
                    container: "top-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 3500,
                        onScreen: true,
                        pauseOnHover: true,
                    }
                });
                //resetForm();
                console.log(newEspacio);
            } else {
                Store.addNotification({
                    title: "Ha ocurrido un problema al realizar la reserva",
                    message: "Lo sentimos ha ocurido un problema al realizar la reserva, vuelva a intentarlo más tarde. " + response.data.message,
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
                setReservationError(true);
                setTitle("Ha ocurrido un problema al realizar la reserva");
                setContent("Lo sentimos ha ocurido un problema al realizar la reserva, vuelva a intentarlo más tarde. " + response.data.message);
                setNewReservation({} as Reserva);
                setNewRepasos([] as RepasoInfo[]);
                setReservedEspacio({} as Espacio_Tiny);
            }
        } catch (error) {
            Store.addNotification({
                title: "Ha ocurrido un problema al realizar la reserva",
                message: "Lo sentimos ha ocurido un problema al realizar la reserva, vuelva a intentarlo más tarde",
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
            console.error(error);
            setReservationError(true);
            setTitle("Ha ocurrido un problema al realizar la reserva");
            setContent("Lo sentimos ha ocurido un problema al realizar la reserva, vuelva a intentarlo más tarde.");
            setNewReservation({} as Reserva);
            setNewRepasos([] as RepasoInfo[]);
            setReservedEspacio({} as Espacio_Tiny);
        }
        setIsReserving(false);
        setSubmitting(false);
    };

    const handleNext = () => {
        setActiveStep(activeStep + 1);
    };

    const handlePrev = () => {
        setActiveStep(activeStep - 1);
    };

    const initialValues = {
        Dia: reservation ? reservation.day : null,
        HoraInicio: reservation ? reservation.startHour : '',
        HoraFin: reservation ? reservation.endHour : '',
        DiaRepaso1: null,
        HoraInicioRepaso1: '',
        HoraFinRepaso1: '',
        DiaRepaso2: null,
        HoraInicioRepaso2: '',
        HoraFinRepaso2: '',
        NombrePersonaExterna: "",
        ApellPaternoPersonaExterna: "",
        ApellMaternoPersonaExterna: "",
        EmailPersonaExterna: "",
        TelefonoPersonaExterna: "",
        CedulaPersonaExterna: "",
        OrganizacionPersonaExterna: "",
        Razon: '',
        CodTipoEvento: '',
        Equipos: null,
        ServiciosEspeciales: null,
        isEventoAcademico: false,
        EsPersonaExterna: false,
    };

    const validationSchema = Yup.object().shape({
        NombrePersonaExterna: Yup.string()
            .matches(/^(?!\s+$)[A-Za-zÁ-Úá-ú0-9\s-_./]+$/, 'Solo se permiten letras, números, espacios y ciertos caracteres especiales (-, _, ., /)')
            .max(50, 'La longitud máxima es de 50 caracteres')
            .test('isRequired', 'Este campo es requerido', function (value) {
                if (isPersonaExterna) {
                    return !!value;
                }
                return true;
            }),
        ApellPaternoPersonaExterna: Yup.string()
            .matches(/^(?!\s+$)[A-Za-zÁ-Úá-ú0-9\s-_./]+$/, 'Solo se permiten letras, números, espacios y ciertos caracteres especiales (-, _, ., /)')
            .max(35, 'La longitud máxima es de 35 caracteres')
            .test('isRequired', 'Este campo es requerido', function (value) {
                if (isPersonaExterna) {
                    return !!value;
                }
                return true;
            }),
        ApellMaternoPersonaExterna: Yup.string()
            .matches(/^(?!\s+$)[A-Za-zÁ-Úá-ú0-9\s-_./]+$/, 'Solo se permiten letras, números, espacios y ciertos caracteres especiales (-, _, ., /)')
            .max(35, 'La longitud máxima es de 35 caracteres')
            .test('isRequired', 'Este campo es requerido', function (value) {
                if (isPersonaExterna) {
                    return !!value;
                }
                return true;
            }),
        OrganizacionPersonaExterna: Yup.string()
            .matches(/^(?!\s+$)[A-Za-zÁ-Úá-ú0-9\s-_.'",/]+$/, 'Solo se permiten letras, números, espacios y ciertos caracteres especiales')
            .max(100, 'Has superado la longitud máxima de caracteres'),
        TelefonoPersonaExterna: Yup.string()
            .matches(/^\d+$/, 'El teléfono celular debe contener solo dígitos')
            .min(7, 'El teléfono celular debe tener al menos 7 dígitos')
            .max(10, 'El teléfono celular no puede tener más de 10 dígitos'),
        EmailPersonaExterna: Yup.string().email('Formato de email inválido')
            .test('isRequired', 'Este campo es requerido', function (value) {
                if (isPersonaExterna) {
                    return !!value;
                }
                return true;
            }),
        CedulaPersonaExterna: Yup.string().test('cedula', 'Cédula inválida', (value) => {
            if (!value) {
                return true;
            }

            const cedula = value.replace(/[-]/g, '');

            if (!/^\d{10}$/.test(cedula)) {
                return false;
            }

            const provincia = Number(cedula.substr(0, 2));
            if (provincia < 1 || provincia > 24) {
                return false;
            }

            const tercerDigito = Number(cedula.charAt(2));
            if (tercerDigito < 0 || tercerDigito > 5) {
                return false;
            }

            // Validar el último dígito (dígito verificador)
            const digitoVerificador = Number(cedula.charAt(9));
            let suma = 0;

            for (let i = 0; i < 9; i++) {
                const digito = Number(cedula.charAt(i));
                if (i % 2 === 0) {
                    let producto = digito * 2;
                    if (producto > 9) {
                        producto -= 9;
                    }
                    suma += producto;
                } else {
                    suma += digito;
                }
            }

            const digitoCalculado = (Math.ceil(suma / 10) * 10) - suma;

            if (digitoCalculado !== digitoVerificador) {
                return false;
            }

            return true;
        }),
        Razon: Yup.string()
            .matches(/^(?!\s+$)[A-Za-zÁ-Úá-ú0-9\s-_.'",/]+$/, 'Solo se permiten letras, números, espacios y ciertos caracteres especiales')
            .max(200, 'Has superado la longitud máxima de caracteres')
            .required('Este campo es requerido'),
        Dia: Yup.date()
            .required('Este campo es requerido'),
        HoraInicio: Yup.string()
            .required('Este campo es requerido')
            .test(
                'HoraInicio',
                'Hora inválida',
                function (value) {
                    const { HoraFin } = this.parent;
                    if (!value || !HoraFin) {
                        return true;
                    }
                    return value >= '06:00' && value <= '22:00' && value < HoraFin;
                }
            ),
        HoraFin: Yup.string()
            .required('Este campo es requerido')
            .test(
                'HoraFin',
                'Hora inválida',
                function (value) {
                    const { HoraInicio } = this.parent;
                    if (!value || !HoraInicio) {
                        return true;
                    }
                    return value >= '06:00' && value <= '22:00' && value > HoraInicio;
                }
            ),
        HoraInicioRepaso1: Yup.string()
            .test(
                'HoraInicioRepaso1',
                'Hora inválida',
                function (value) {
                    const { HoraFinRepaso1 } = this.parent;
                    if (!value || !HoraFinRepaso1) {
                        return true;
                    }
                    return value < HoraFinRepaso1;
                }
            ),
        HoraFinRepaso1: Yup.string()
            .test(
                'HoraFinRepaso1',
                'Hora inválida',
                function (value) {
                    const { HoraInicioRepaso1 } = this.parent;
                    if (!value || !HoraInicioRepaso1) {
                        return true;
                    }
                    return value > HoraInicioRepaso1;
                }
            ),
        HoraInicioRepaso2: Yup.string()
            .test(
                'HoraInicioRepaso2',
                'Hora inválida',
                function (value) {
                    const { HoraFinRepaso2 } = this.parent;
                    if (!value || !HoraFinRepaso2) {
                        return true;
                    }
                    return value < HoraFinRepaso2;
                }
            ),
        HoraFinRepaso2: Yup.string()
            .test(
                'HoraFinRepaso2',
                'Hora inválida',
                function (value) {
                    const { HoraInicioRepaso2 } = this.parent;
                    if (!value || !HoraInicioRepaso2) {
                        return true;
                    }
                    return value > HoraInicioRepaso2;
                }
            ),
    });

    const handleUpdateStepErrors = (newStepErrors: StepErrors) => {
        setStepErrors(newStepErrors);
    };

    const closeModal = () => {
        setIsNestedModalOpen(false);
        setIsFinalizationModalOpen(false);
        setActiveStep(0);
        setStepErrors({ step0: false, step1: false, step2: false, step3: false });
        setNewEspacio({} as Espacio_Create);
        setFormSubmited(false);
        setNewReservation({} as Reserva);
        setNewRepasos([] as RepasoInfo[]);
        setReservedEspacio({} as Espacio_Tiny);
        setReservationError(false);
        const url = new URL(window.location.href);
        url.searchParams.set('reservar', 'false');
        url.searchParams.set('espacio', '');
        router.push(url.pathname + url.search);
    }

    const closeConfirmationModal = () => {
        setIsNestedModalOpen(false);
    }

    const closeFinalizationModal = () => {
        setIsFinalizationModalOpen(false);
    }

    const finalizationModal = () => {
        closeModal();
    }

    return (
        <>
            {/* <ConfirmationModal isOpen={isNestedModalOpen} onClose={closeConfirmationModal} onConfirm={closeModal} /> */}
            <FinalizationModal isOpen={isFinalizationModalOpen} onClose={closeFinalizationModal} onConfirm={closeModal} onFinalization={finalizationModal} CodEspacio={newEspacio.CodEspacio} />
            <Modal open={isNestedModalOpen} className={styles.modal_supreme}>
                <>
                    <div className={styles.card}>
                        {isReserving === true ? (
                            <>
                                <h3>Reservando...</h3>
                                <FontAwesomeIcon icon={faSpinner} spin />
                            </>
                        ) : (
                            <>
                                <h3>{title}</h3>
                                <div dangerouslySetInnerHTML={{ __html: content }} />
                                <button type="button" className={styles.crud_normal_button} onClick={closeModal} style={{ marginTop: "15px" }}>Aceptar</button>
                            </>
                        )}
                    </div>
                </>
            </Modal>
            <div className={`${styles.card_2}`}>

                <Stepper activeStep={activeStep} className={styles.stepper_container} alternativeLabel>
                    <Step>
                        <StepLabel error={stepErrors.step0} icon={stepErrors.step0 && (<FontAwesomeIcon icon={faExclamationCircle} className={styles.error_icon} />)} ><span className={styles.dissapearing_text}>Agenda</span></StepLabel>
                    </Step>
                    {isPersonaExterna && (
                        <Step>
                            <StepLabel error={stepErrors.step1} icon={stepErrors.step1 && (<FontAwesomeIcon icon={faExclamationCircle} className={styles.error_icon} />)}><span className={styles.dissapearing_text}>Persona Externa</span></StepLabel>
                        </Step>
                    )}
                    <Step>
                        <StepLabel error={stepErrors.step2} icon={stepErrors.step2 && (<FontAwesomeIcon icon={faExclamationCircle} className={styles.error_icon} />)}><span className={styles.dissapearing_text}>Datos Reserva</span></StepLabel>
                    </Step>
                    <Step>
                        <StepLabel error={stepErrors.step3} icon={stepErrors.step3 && (<FontAwesomeIcon icon={faExclamationCircle} className={styles.error_icon} />)}><span className={styles.dissapearing_text}>Repasos</span></StepLabel>
                    </Step>
                </Stepper>
                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={createReserva}
                    validateOnChange={true}
                >
                    {({ isSubmitting, errors, touched, setFieldValue }) => (
                        <MakeReservationForm
                            onUpdateStepErrors={handleUpdateStepErrors}
                            onClose={() => { }}
                            isLoading={isLoading}
                            activeStep={activeStep}
                            handleNext={handleNext}
                            handlePrev={handlePrev}
                            formSubmited={formSubmited}
                            newEspacio={newEspacio}
                            onFinalization={() => setIsFinalizationModalOpen(true)}
                            reservationProps={reservation}
                            setReservation={setReservation}
                            setRepaso1={setRepaso1}
                            setRepaso2={setRepaso2}
                            validateRepaso={validateRepaso}
                            isPersonaExterna={isPersonaExterna}
                            setIsPersonaExterna={setIsPersonaExterna}
                            isEventoAcademico={isEventoAcademico}
                            setIsEventoAcademico={setIsEventoAcademico}
                        />
                    )}
                </Formik>
            </div>
        </>
    );
};
