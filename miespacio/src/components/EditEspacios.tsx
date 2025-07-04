import { useState, useEffect } from "react";
import axios from 'axios';
import Modal from '@mui/material/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faSpinner, faArrowRight, faArrowLeft, faCheckCircle, faExclamationCircle, faExclamationTriangle, faWarning, faSearch } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/CRUD.module.css';
import { ReactNotifications } from 'react-notifications-component'
import 'react-notifications-component/dist/theme.css'
import { Store } from 'react-notifications-component';
import { Formik, Form, Field, ErrorMessage, useFormikContext } from 'formik';
import * as Yup from 'yup';
import { API_BASE_URL } from '@/src/components/BaseURL';
import UploadPhotos from '@/src/components/UploadPhotos';
import DisponibilitySchedule from "@/src/components/DisponibilitySchedule";
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { TipoEspacio } from '@/libs/tipoEspacio';
import { PersonaInterna } from '@/libs/persona';
import { FotoEspacio } from '@/libs/fotoEspacio';
import { Unidad } from '@/libs/unidad';
import { Espacio_Create } from '@/libs/espacios';
import { useRouter } from "next/router";

interface EditEspacioModal {
    isOpen: boolean;
    onClose: () => void;
    Espacio: Espacio_Create;
    DirigentesEspacio: PersonaInterna[];
    FotosEspacio: FotoEspacio[];
}

interface StepErrors {
    step0: boolean;
    step1: boolean;
    step2: boolean;
    step3: boolean;
}

interface FormValues {
    NombreEspacio: string;
    DescripcionEspacio: string;
    DescripcionRol: string;
    CapacidadEspacio: number;
    DescripcionUbicacion: string;
    CodTipoEspacio: number;
    CodUnidad: number;
    PersonasInternas: any[];
    DiasAntelacion: number;
    Disponibilidad: number;
}

interface EditEspacioForm {
    onUpdateStepErrors: (stepErrors: StepErrors) => void;
    onClose: () => void;
    isLoading: boolean;
    activeStep: number;
    handleNext: () => void;
    handlePrev: () => void;
    formSubmited: boolean;
    newEspacio: Espacio_Create | null;
    dirigentesEspacio: PersonaInterna[];
    fotosEspacio: FotoEspacio[];
    onFinalization: () => void;
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

const EditEspacioForm: React.FC<EditEspacioForm> = ({ onUpdateStepErrors, onClose, isLoading, activeStep, handleNext, handlePrev, formSubmited, newEspacio, dirigentesEspacio, onFinalization }) => {
    const { errors, touched } = useFormikContext<FormValues>();
    const { isSubmitting } = useFormikContext<FormValues>();
    const [isEspecificDataSerched, setIsEspecificDataSerched] = useState(false);
    const [tiposEspacios, setTiposEspacios] = useState([]);
    const [tiposEquipos, setTiposEquipos] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const emptyOptionTipoEspacio = {} as SelectsData;
    const emptyOptionUnidad = {} as SelectsData;
    const [isEspecificDataReady, setIsEspecificDataReady] = useState(false);
    const [isEspecificDataError, setIsEspecificDataError] = useState(false);
    const [createdEspacio, setCreatedEspacio] = useState<Espacio_Create | null>(newEspacio);
    const [options, setOptions] = useState<any[]>(dirigentesEspacio);
    const [allOptions, setAllOptions] = useState<any[]>(dirigentesEspacio);
    const router = useRouter();

    useEffect(() => {
        onUpdateStepErrors({
            step0: !!((errors.NombreEspacio && touched.NombreEspacio) || (errors.DescripcionEspacio && touched.DescripcionEspacio) || (errors.CapacidadEspacio && touched.CapacidadEspacio) || (errors.Disponibilidad && touched.Disponibilidad)),
            step1: !!((errors.CodTipoEspacio && touched.CodTipoEspacio) || (errors.CodUnidad && touched.CodUnidad) || (errors.PersonasInternas && touched.PersonasInternas) || (errors.DiasAntelacion && touched.DiasAntelacion)),
            step2: false,
            step3: false,
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
            const response = await axios.get(`${API_BASE_URL}/api/espacios/selectsData`);
            const filterString = dirigentesEspacio
                .map((dirigente) => `PK_TMCPERSONA_INTERNA-${dirigente.CodPersonaInterna}`)
                .join(',');

            const responsePI = await axios.get(`${API_BASE_URL}/api/personas-internas?filter=${filterString}`);

            if (responsePI.status === 200) {
                const loadedOptions = responsePI.data.personasInternas.map((personaInterna: PersonaInterna) => ({
                    value: personaInterna.CodPersonaInterna,
                    label: `${personaInterna.CarnetID} - ${personaInterna.Nombre} ${personaInterna.ApellidoPaterno}`,
                }));
                const newOptions = loadedOptions.filter((option: any) => !options.some((option2: any) => option2.value === option.value));
                setOptions([...options, ...newOptions]);
            }

            setTiposEspacios(response.data.tiposEspacios);
            setUnidades(response.data.unidades);
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
                    duration: 4000,
                    onScreen: true
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

    return (
        <Form style={{ width: '100%' }} id="formCreateEspacio">
            <div className={activeStep === 0 ? `${styles.form_step} ${styles.show}` : `${styles.form_step} ${styles.hide}`}>
                <label htmlFor="NombreEspacio">Nombre del espacio</label>
                <Field id="NombreEspacio" name='NombreEspacio' placeholder="Ingresa el nombre" className={errors.NombreEspacio && touched.NombreEspacio ? styles.error_input : ''} />
                <ErrorMessage name="NombreEspacio" component="div" className={styles.error} />

                <label htmlFor="DescripcionEspacio">Descripción</label>
                <Field as="textarea" id="DescripcionEspacio" name='DescripcionEspacio' placeholder="Ingresa una descripción para el espacio" className={errors.DescripcionEspacio && touched.DescripcionEspacio ? styles.error_input : ''} />
                <ErrorMessage name="DescripcionEspacio" component="div" className={styles.error} />

                <label htmlFor="CapacidadEspacio">Capacidad</label>
                <Field type="number" id="CapacidadEspacio" name='CapacidadEspacio' placeholder="Ingresa la capacidad" className={errors.CapacidadEspacio && touched.CapacidadEspacio ? styles.error_input : ''} />
                <ErrorMessage name="CapacidadEspacio" component="div" className={styles.error} />

                <label htmlFor="DescripcionUbicacion">Ubicación</label>
                <Field as="textarea" id="DescripcionUbicacion" name='DescripcionUbicacion' placeholder="Escribe alguna ubicación referencial para el espacio" className={errors.DescripcionUbicacion && touched.DescripcionUbicacion ? styles.error_input : ''} />
                <ErrorMessage name="DescripcionUbicacion" component="div" className={styles.error} />

                <label htmlFor="Disponibilidad">Disponible</label>
                <Field name="Disponibilidad">
                    {({ field, form }: { field: any, form: any }) => {
                        const handleChange = (selectedOption: any) => {
                            form.setFieldValue(field.name, selectedOption.value);
                        };

                        const options = [
                            { value: 1, label: 'Sí' },
                            { value: 0, label: 'No' }
                        ];
                        const selectedOption = options.find(option => option.value === field.value);

                        return (
                            <Select
                                {...field}
                                value={selectedOption}
                                options={options}
                                onChange={handleChange}
                                classNamePrefix="react-select"
                                placeholder="Selecciona una opción"
                                className={`${styles.create_select} ${errors.Disponibilidad && touched.Disponibilidad ? styles.error_input : ''}`}
                                isSearchable
                            />
                        );
                    }}
                </Field>
                <ErrorMessage name="Disponibilidad" component="div" className={styles.error} />
            </div>
            <div className={activeStep === 1 ? `${styles.form_step} ${styles.show}` : `${styles.form_step} ${styles.hide}`}>
                {isEspecificDataReady && !isEspecificDataError ? (
                    <>
                        <label htmlFor="CodTipoEspacio">Tipo de Espacio</label>
                        <Field name="CodTipoEspacio" id="CodTipoEspacio" >
                            {({ field, form }: { field: any, form: any }) => {
                                const handleChange = (selectedOption: any) => {
                                    if (selectedOption) {
                                        form.setFieldValue(field.name, selectedOption.value);
                                    } else {
                                        form.setFieldValue(field.name, null);
                                    }
                                };

                                const options: SelectsData[] = tiposEspacios.map((tiposEspacios: TipoEspacio) => ({ value: tiposEspacios.CodTipoEspacio, label: tiposEspacios.NombreTipoEspacio }));
                                const selectedOption = field.value !== null ? options.find(option => option.value === field.value.toString()) : null;

                                return (
                                    <Select
                                        defaultValue={selectedOption}
                                        options={options}
                                        onChange={handleChange}
                                        classNamePrefix="react-select"
                                        placeholder="Selecciona el tipo de espacio"
                                        className={`${styles.create_select} ${errors.CodTipoEspacio && touched.CodTipoEspacio ? styles.error_input : ''}`}
                                        isSearchable
                                        isClearable

                                    />
                                );
                            }}
                        </Field>
                        <ErrorMessage name="CodTipoEspacio" component="div" className={styles.error} />

                        <label htmlFor="CodUnidad">Unidad</label>
                        <Field name="CodUnidad" id="CodUnidad" >
                            {({ field, form }: { field: any, form: any }) => {
                                const handleChange = (selectedOption: any) => {
                                    if (selectedOption) {
                                        form.setFieldValue(field.name, selectedOption.value);
                                    } else {
                                        form.setFieldValue(field.name, null);
                                    }
                                };

                                const options = unidades.map((unidad: Unidad) => ({ value: unidad.CodUnidad, label: "(" + unidad.Siglas + ") " + unidad.NombreUnidad }));
                                const selectedOption = field.value !== null ? options.find(option => option.value === field.value.toString()) : null;

                                return (
                                    <Select
                                        defaultValue={selectedOption}
                                        options={options}
                                        onChange={handleChange}
                                        classNamePrefix="react-select"
                                        placeholder="Seleccione la unidad encargada"
                                        className={`${styles.create_select} ${errors.CodUnidad && touched.CodUnidad ? styles.error_input : ''}`}
                                        isSearchable
                                        isClearable

                                    />
                                );
                            }}
                        </Field>
                        <ErrorMessage name="CodUnidad" component="div" className={styles.error} />

                        <label htmlFor="PersonasInternas">Responsable/s del espacio <FontAwesomeIcon icon={faSearch} style={{ marginLeft: '10px', fontSize: '14px' }} /></label>
                        <Field name="PersonasInternas" id="PersonasInternas" >
                            {({ field, form }: { field: any; form: any }) => {

                                const loadOptions = async (inputValue: string, callback: any) => {
                                    try {
                                        const response = await axios.get(`${API_BASE_URL}/api/personas-internas`, {
                                            params: { page: '1', limit: '15', search: inputValue, orderBy: 'PEI_APELLIDO_PATERNO', orderDir: 'ASC' },
                                        });

                                        if (response.status === 200) {
                                            const loadedOptions = response.data.personasInternas.map((personaInterna: PersonaInterna) => ({
                                                value: personaInterna.CodPersonaInterna,
                                                label: `${personaInterna.CarnetID} - ${personaInterna.Nombre} ${personaInterna.ApellidoPaterno}`,
                                            }));
                                            const newOptions = loadedOptions.filter((option: any) => !options.some((option2: any) => option2.value === option.value));
                                            setOptions([...options, ...newOptions]);
                                            callback(loadedOptions);
                                        } else {
                                            console.error('La API no respondió con el estado 200 OK');
                                        }
                                    } catch (error) {
                                        console.error(error);
                                        Store.addNotification({
                                            title: "Ha ocurrido un problema al consultar las opciones",
                                            message: "Lo sentimos ha ocurido un problema, vuelva a intentarlo mas tarde. " + error,
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

                                const handleChange = (selectedOptions: any) => {
                                    if (selectedOptions) {
                                        form.setFieldValue(
                                            field.name,
                                            selectedOptions.map((option: any) => option.value)
                                        );
                                    }
                                };

                                const selectedValues = field.value ? [...field.value] : [];

                                return (
                                    <AsyncSelect
                                        {...field}
                                        cacheOptions
                                        defaultOptions
                                        loadOptions={loadOptions}
                                        value={options.filter((option: any) => selectedValues.includes(option.value))}
                                        onChange={handleChange}
                                        placeholder="Escriba el nombre, correo o ID de la institución de la persona"
                                        classNamePrefix="react-select"
                                        className={`${styles.create_select} ${errors.PersonasInternas && touched.PersonasInternas
                                            ? styles.error_input
                                            : ""
                                            }`}
                                        isMulti
                                        isSearchable

                                    />
                                );
                            }}
                        </Field>
                        <ErrorMessage name="PersonasInternas" component="div" className={styles.error} />

                        <label htmlFor="DiasAntelacion">Días de antelación para realizar reserva</label>
                        <Field type="number" id="DiasAntelacion" name='DiasAntelacion' placeholder="Ingrese cuántos días de antelación" className={errors.DiasAntelacion && touched.DiasAntelacion ? styles.error_input : ''} />
                        <ErrorMessage name="DiasAntelacion" component="div" className={styles.error} />

                        <br />
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
            <div className={activeStep === 2 ? `${styles.form_step} ${styles.show}` : `${styles.form_step} ${styles.hide}`}>
                {newEspacio && newEspacio.CodEspacio ? (
                    <UploadPhotos CodEspacio={newEspacio.CodEspacio} />
                ) : (
                    <div className={styles.load_container}><FontAwesomeIcon icon={faWarning} style={{ marginBottom: '10px' }} /><br />No se pudieron obtener los datos del espacio creado</div>
                )}
            </div>
            <div className={activeStep === 3 ? `${styles.form_step} ${styles.show}` : `${styles.form_step} ${styles.hide}`}>
                <div className={styles.information_title}>Establecer los horarios en los que el espacio estará disponible para reservas</div>
                <div className={styles.tiny_info} style={{ marginTop: '-8px', marginBottom: '10px' }}>Es recomendable no apilar varias restricciones seguidas, mejor extienda el tiempo de una específica.</div>
                {newEspacio && newEspacio.CodEspacio ? (
                    <DisponibilitySchedule Espacio={newEspacio.CodEspacio} isEditable={true} useRouteCodEspacio={false} />
                ) : (
                    <>
                        {/* <div className={styles.load_container}><FontAwesomeIcon icon={faWarning} style={{ marginBottom: '10px' }} /><br/>No se pudieron obtener los datos del espacio creado</div> */}
                        <DisponibilitySchedule Espacio={2} isEditable={true} useRouteCodEspacio={false} />
                    </>
                )}
            </div>
            <div className={styles.step_buttons}>
                <button type="button" onClick={handlePrev} disabled={activeStep === 0}>
                    <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: "5px" }} /> Atrás
                </button>
                <button type="button" onClick={handleNext} disabled={activeStep === 3}>
                    Siguiente <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: "5px" }} />
                </button>
                <button type="button" onClick={() => onClose()} className={styles.steps_cancel_button}>
                    <FontAwesomeIcon icon={faTimes} />
                </button>
            </div>
            {
                activeStep <= 1 && (
                    <div>
                        {isLoading ? (
                            <div className={styles.card_buttons_container}>
                                <div className={styles.load_icon}>
                                    <FontAwesomeIcon icon={faSpinner} spin />
                                </div>
                            </div>
                        ) : (
                            <div className={styles.card_buttons_container}>
                                <button type="submit" disabled={isSubmitting}>
                                    <FontAwesomeIcon icon={faSave} style={{ marginRight: '5px' }} /> Guardar
                                </button>
                            </div>
                        )}
                    </div>
                )
            }

            <div className={styles.card_buttons_container}>
                <button type="button" onClick={() => onFinalization()}>
                    <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '5px' }} /> Cerrar Formulario
                </button>
            </div>
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
                <h3>Falta gestionar equipos</h3>
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

export const EditEspacioModal: React.FC<EditEspacioModal> = ({
    isOpen,
    onClose,
    Espacio: EspacioProp,
    DirigentesEspacio: DirigentesEspacioProp,
    FotosEspacio: FotosEspacioProp,
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [stepErrors, setStepErrors] = useState({ step0: false, step1: false, step2: false, step3: false });
    const [isNestedModalOpen, setIsNestedModalOpen] = useState(false);
    const [isFinalizationModalOpen, setIsFinalizationModalOpen] = useState(false);
    const [espacio, setEspacio] = useState<Espacio_Create>(EspacioProp);
    const [dirigentesEspacio, setDirigentesEspacio] = useState<PersonaInterna[]>(DirigentesEspacioProp);
    const [fotosEspacio, setFotosEspacio] = useState<FotoEspacio[]>(FotosEspacioProp);
    const [formSubmited, setFormSubmited] = useState(false);

    useEffect(() => {
        setEspacio(EspacioProp);
        setDirigentesEspacio(DirigentesEspacioProp);
        setFotosEspacio(FotosEspacioProp);
    }, [EspacioProp, DirigentesEspacioProp, FotosEspacioProp]);

    const editEspacio = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
        setSubmitting(true);
        setIsLoading(true);

        try {
            const response = await axios.put(`${API_BASE_URL}/api/espacios/${espacio.CodEspacio}`, {
                CodEspacio: espacio.CodEspacio,
                NombreEspacio: values.NombreEspacio,
                DescripcionEspacio: values.DescripcionEspacio,
                CapacidadEspacio: values.CapacidadEspacio,
                DescripcionUbicacion: values.DescripcionUbicacion,
                DiasAntelacion: values.DiasAntelacion,
                CodTipoEspacio: values.CodTipoEspacio,
                CodUnidad: values.CodUnidad,
                PersonasInternas: values.PersonasInternas,
                Disponibilidad: values.Disponibilidad,
            });
            const newEspacio = response.data;
            Store.addNotification({
                title: "Espacio modificado con exito",
                message: "El espacio " + response.data.NombreEspacio + " se ha modificado con éxito",
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
            setEspacio(newEspacio);
            console.log(newEspacio);
            setFormSubmited(true);
        } catch (error) {
            Store.addNotification({
                title: "Ha ocurrido un problema al modificar el espacio",
                message: "Lo sentimos ha ocurido un problema al modificar el espacio, vuelva a intentarlo mas tarde",
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
            console.error(error);
        }
        setIsLoading(false);
        setSubmitting(false);
    };

    const handleNext = () => {
        setActiveStep(activeStep + 1);
    };

    const handlePrev = () => {
        setActiveStep(activeStep - 1);
    };

    const initialValues = {
        NombreEspacio: espacio.NombreEspacio,
        DescripcionEspacio: espacio.DescripcionEspacio,
        CapacidadEspacio: espacio.CapacidadEspacio,
        DescripcionUbicacion: espacio.DescripcionUbicacion,
        CodTipoEspacio: espacio.CodTipoEspacio,
        CodUnidad: espacio.CodUnidad,
        PersonasInternas: dirigentesEspacio.map((dirigente) => dirigente.CodPersonaInterna),
        DiasAntelacion: espacio.DiasAntelacion,
        Disponibilidad: espacio.Disponibilidad,
    };

    const validationSchema = Yup.object().shape({
        NombreEspacio: Yup.string()
            .matches(/^(?!\s+$)[A-Za-zÁ-Úá-ú0-9\s-_./]+$/, 'Solo se permiten letras, números, espacios y ciertos caracteres especiales (-, _, ., /)')
            .max(50, 'La longitud máxima es de 50 caracteres')
            .required('Este campo es requerido'),
        DescripcionEspacio: Yup.string()
            .matches(/^(?!\s+$)[A-Za-zÁ-Úá-ú0-9\s-_.',/]+$/, 'Solo se permiten letras, números, espacios y ciertos caracteres especiales')
            .max(300, 'Has superado la longitud máxima de caracteres'),
        CapacidadEspacio: Yup.number()
            .integer('La capacidad debe ser un número entero')
            .min(1, 'La capacidad no puede ser menor a 1')
            .max(5000, 'La capacidad no puede ser mayor a 5000')
            .required('Este campo es requerido'),
        DescripcionUbicacion: Yup.string()
            .matches(/^(?!\s+$)[A-Za-zÁ-Úá-ú0-9\s-_.',/]+$/, 'Solo se permiten letras, números, espacios y ciertos caracteres especiales')
            .max(150, 'Has superado la longitud máxima de caracteres'),
        /* CodTipoEquipo: Yup.string()
            .required('Este campo es requerido'), */
        CodTipoEspacio: Yup.string()
            .required('Este campo es requerido'),
        CodUnidad: Yup.string()
            .required('Este campo es requerido'),
        PersonasInternas: Yup.array()
            .of(Yup.number().required())
            .min(1, "Debe seleccionar al menos un responsable para el espacio")
            .required("Debe seleccionar al menos un responsable para el espacio"),
        DiasAntelacion: Yup.number()
            .integer('La cantidad de días debe ser un número entero')
            .min(1, 'La cantidad de días no puede ser menor a 1')
            .max(20, 'La cantidad de días no puede ser mayor a 20')
            .required('Este campo es requerido'),
        Disponibilidad: Yup.string()
            .required('Este campo es requerido'),
    });

    const handleUpdateStepErrors = (newStepErrors: StepErrors) => {
        setStepErrors(newStepErrors);
    };

    const closeModal = () => {
        onClose();
        setIsNestedModalOpen(false);
        setIsFinalizationModalOpen(false);
        setActiveStep(0);
        setStepErrors({ step0: false, step1: false, step2: false, step3: false });
        setFormSubmited(false);
    }

    const closeConfirmationModal = () => {
        setIsNestedModalOpen(false);
    }

    const closeFinalizationModal = () => {
        setIsFinalizationModalOpen(false);
    }

    const finalizationModal = () => {
        closeModal();
        if (espacio.CodEspacio !== undefined) {
            window.location.href = `/espacios/${espacio.CodEspacio}`;
        }
    }

    return (
        <>
            <ConfirmationModal isOpen={isNestedModalOpen} onClose={closeConfirmationModal} onConfirm={formSubmited === true ? finalizationModal : closeModal} />
            <FinalizationModal isOpen={isFinalizationModalOpen} onClose={closeFinalizationModal} onConfirm={closeModal} onFinalization={finalizationModal} CodEspacio={espacio.CodEspacio} />
            <Modal open={isOpen} onClose={() => setIsNestedModalOpen(true)} className={styles.modal}>
                <>
                    <ReactNotifications />
                    <div className={`${styles.card} ${activeStep === 2 ? styles.widerCard : ''}  ${activeStep === 3 ? styles.widerCard_2 : ''}`}>
                        <h3>Editar Espacio</h3>
                        <Stepper activeStep={activeStep} className={styles.stepper_container} alternativeLabel>
                            <Step>
                                <StepLabel error={stepErrors.step0} icon={stepErrors.step0 && (<FontAwesomeIcon icon={faExclamationCircle} className={styles.error_icon} />)} ><span className={styles.dissapearing_text}>Datos Generales</span></StepLabel>
                            </Step>
                            <Step>
                                <StepLabel error={stepErrors.step1} icon={stepErrors.step1 && (<FontAwesomeIcon icon={faExclamationCircle} className={styles.error_icon} />)}><span className={styles.dissapearing_text}>Datos Específicos</span></StepLabel>
                            </Step>
                            <Step>
                                <StepLabel error={stepErrors.step2} icon={stepErrors.step2 && (<FontAwesomeIcon icon={faExclamationCircle} className={styles.error_icon} />)}><span className={styles.dissapearing_text}>Fotos</span></StepLabel>
                            </Step>
                            <Step>
                                <StepLabel error={stepErrors.step3} icon={stepErrors.step3 && (<FontAwesomeIcon icon={faExclamationCircle} className={styles.error_icon} />)}><span className={styles.dissapearing_text}>Restricciones</span></StepLabel>
                            </Step>
                        </Stepper>
                        <Formik
                            initialValues={initialValues}
                            validationSchema={validationSchema}
                            onSubmit={editEspacio}
                            validateOnChange={true}
                        >
                            {({ isSubmitting, errors, touched }) => (
                                <EditEspacioForm
                                    onUpdateStepErrors={handleUpdateStepErrors}
                                    onClose={() => setIsNestedModalOpen(true)}
                                    isLoading={isLoading}
                                    activeStep={activeStep}
                                    handleNext={handleNext}
                                    handlePrev={handlePrev}
                                    formSubmited={formSubmited}
                                    newEspacio={espacio}
                                    dirigentesEspacio={dirigentesEspacio}
                                    fotosEspacio={fotosEspacio}
                                    onFinalization={() => setIsFinalizationModalOpen(true)} />
                            )}
                        </Formik>
                    </div>
                </>
            </Modal>
        </>
    );
};
