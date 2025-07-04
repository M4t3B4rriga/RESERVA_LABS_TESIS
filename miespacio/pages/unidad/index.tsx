import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { Unidad } from '@/libs/unidad';
import Pagination from '@/src/components/Pagination';
import SearchBar from '@/src/components/SearchBar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortUp, faSortDown, faSave, faTimes, faSpinner, faPrint, faFileCsv, faFilePdf, faFilter, faPlus, faUserTag, faEdit, faTrashAlt, faUndo, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/CRUD.module.css';
import { API_BASE_URL } from '@/src/components/BaseURL';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { generateCSV } from '@/src/components/csvGeneratorFuntions'
import { generatePDF } from '@/src/components/pdfGeneratorFuntions'
import { ReactNotifications } from 'react-notifications-component'
import 'react-notifications-component/dist/theme.css'
import { Store } from 'react-notifications-component';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { PersonaInterna } from '@/libs/persona';
import AsyncSelect from 'react-select/async';
import { Auth } from '@/libs/auth';
import { jwtVerify } from 'jose';
import { GetServerSidePropsContext } from 'next';
import Layout from '@/src/components/Layout';
import Head from 'next/head';
import Link from 'next/link';

const PAGE_SIZE = 10;
type OrderBy = 'UNI_NOMBRE' | 'UNI_SIGLAS' | 'UNI_DESCRIPCION' | 'ESTADO';
type OrderDir = 'ASC' | 'DESC';

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
            return { props: { unidades: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
        }

        const response = await axios.get(`${API_BASE_URL}/api/unidad`, {
            params: { page: '1', limit: PAGE_SIZE, filter: 'ESTADO-1', orderBy: 'UNI_NOMBRE', orderDir: 'ASC', usuarioLogueado: null },
        });
        if (response.status === 200) {
            const unidades = response.data.unidades;
            const totalCount = response.data.totalCount;
            return { props: { unidades, totalCount, usuarioLogueado: usuarioLogueado } };
        } else {
            console.error('La API no respondió con el estado 200 OK');
            return { props: { unidades: [], totalCount: 0, error: true, messageError: response.data.message, usuarioLogueado: usuarioLogueado } };
        }
    } catch (error) {
        console.error(error);
        return { props: { unidades: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
    }
}

export default function Uni({ unidades: initialUnidades, totalCount: initialTotalCount, error: initialError, messageError: initialMessageError, usuarioLogueado: initialUsuarioLogueado }: { unidades: Unidad[], totalCount: number, error?: boolean, messageError?: string, usuarioLogueado: Auth | null }) {
    const [unidades, setUnidades] = useState(initialUnidades);
    const [usuarioLogueado, setUsuarioLogueado] = useState(initialUsuarioLogueado);
    const [NombreUnidad, setNombre] = useState('');
    const [CodPersonaInterna, setCodPersonaInterna] = useState('');
    const [Siglas, setSiglas] = useState('');
    const [DescripcionUnidad, setDescripcion] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showModalEdit, setShowModalEdit] = useState(false);
    const [selectedUnidad, setSelectedUnidad] = useState<Unidad | null>(null);
    const [tempUnidad, setTempUnidad] = useState<Unidad | null>(null);
    const [page, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalUnidades, setTotalUnidades] = useState(initialTotalCount);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState(['ESTADO-1']);
    const [orderBy, setOrderBy] = useState<OrderBy>('UNI_NOMBRE');
    const [orderDir, setOrderDir] = useState<OrderDir>('ASC');
    const [deletedCount, setDeletedCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const modalPrintRef = useRef<HTMLDivElement>(null);
    const modalFilterRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [error, setError] = useState(initialError);
    const [messageError, setMessageError] = useState(initialMessageError);
    const [options, setOptions] = useState<any[]>([]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const fetchData = async () => {
                try {
                    const response = await axios.get(`${API_BASE_URL}/api/unidad`, {
                        params: { page, limit, search, filter: filters.join(','), orderBy, orderDir },
                    });
                    console.log(response.data.unidades);
                    if (response.status === 200) {
                        setUnidades(response.data.unidades);
                        setTotalUnidades(response.data.totalCount);
                    } else {
                        console.error('La API no respondió con el estado 200 OK');
                        setError(true);
                        setMessageError(response.data.message);
                    }
                } catch (error) {
                    console.error(error);
                    setError(true);
                    setMessageError("Hubo un error al obtener la información");
                }
            };

            fetchData();
        }
    }, [page, limit, search, filters, orderBy, orderDir, deletedCount]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalFilterRef.current && !modalFilterRef.current.contains(event.target as Node)) {
                setShowFilterModal(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [modalFilterRef]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalPrintRef.current && !modalPrintRef.current.contains(event.target as Node)) {
                setShowPrintModal(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [modalPrintRef]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    function handleSearchTermChange(newSearchTerm: string) {
        setSearch(newSearchTerm);
        setCurrentPage(1);
    };

    const handleFilterChange = (filter: string) => {
        if (filter === 'todos') {
            setFilters(['ESTADO-1', 'ESTADO-0']);
        } else if (filters.includes(filter)) {
            setFilters(filters.filter((f) => f !== filter));
        } else {
            setFilters([...filters, filter]);
        }
        setCurrentPage(1);
    };

    const handleOrderBy = (orderBy: OrderBy) => {
        setOrderBy(orderBy);
        setOrderDir(orderDir === 'ASC' ? 'DESC' : 'ASC');
    };

    const handleDownloadCSV = async () => {
        try {
            // Obtener los registros que deseas exportar
            const response = await axios.get(`${API_BASE_URL}/api/unidad`, {
                params: { page: 1, limit: 99999, search, filter: filters.join(','), orderBy, orderDir },
            });
            const unidades = response.data.unidades;

            // Definir los nombres de las columnas
            const headers = ['#', 'Nombre Unidad', 'Siglas', 'Descripción Unidad', 'Estado'];

            // Mapear los datos para que tengan la estructura adecuada
            const data = unidades.map((r: { NombreUnidad: string, Siglas: string, DescripcionUnidad: string, Estado: string }, i: number) => {
                return {
                    '#': i + 1,
                    'Nombre Unidad': r.NombreUnidad,
                    'Siglas': r.Siglas,
                    'Descripción Unidad': r.DescripcionUnidad,
                    'Estado': r.Estado == "1" ? 'Activo' : 'Inactivo',
                }
            });

            // Exportar los datos como CSV
            generateCSV(headers, data, "Reporte de unidades");
        } catch (error) {
            console.error(error);
        }
    };

    const handleDownloadPDF = async () => {
        try {
            // Obtener todos los registros sin paginación
            const response = await axios.get(`${API_BASE_URL}/api/unidad`, {
                params: { page: 1, limit: 99999, search, filter: filters.join(','), orderBy, orderDir },
            });
            const unidades = response.data.unidades.map((unidad: { NombreUnidad: string, Siglas: string, DescripcionUnidad: string, Estado: string }, index: number) => [index + 1, unidad.NombreUnidad, unidad.Siglas, unidad.DescripcionUnidad, unidad.Estado]); // Eliminamos la primera columna y agregamos un índice
            const header = ["N°", "Nombre Unidad", "Siglas", "Descripcion Unidad", "Estado"]; // Eliminamos "N°"
            const reportTitle = "Reporte de unidades";
            generatePDF(unidades, header, reportTitle);
        } catch (error) {
            console.error(error);
        }
    };

    const createUnidad = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
        setSubmitting(true);
        setIsLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/unidad`, {
                NombreUnidad: values.NombreUnidad,
                Siglas: values.Siglas,
                DescripcionUnidad: values.DescripcionUnidad,
                CodPersonaInterna: values.CodPersonaInterna,
            });
            const newUnidad = response.data;
            console.log(newUnidad);
            setUnidades([...unidades, newUnidad]);
            console.log(unidades);
            setShowModal(false);
            Store.addNotification({
                title: "Unidad creada con exito",
                message: "La unidad " + response.data.NombreUnidad + " se ha creado con éxito",
                type: "success",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 3500,
                    onScreen: true
                }
            });
            resetForm();
        } catch (error) {
            Store.addNotification({
                title: "Ha ocurrido un problema al crear la unidad",
                message: "Lo sentimos ha ocurido un problema al crear la unidad vuelva a intentarlo mas tarde",
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 3500,
                    onScreen: true
                }
            });
            console.error(error);
        }
        setIsLoading(false);
        setSubmitting(false);
    };
    const initialValues = {
        NombreUnidad: '',
        Siglas: '',
        DescripcionUnidad: '',
        CodPersonaInterna: null,
    };

    const validationSchema = Yup.object().shape({
        NombreUnidad: Yup.string()
            .matches(/^[A-Za-zÁ-Úá-ú\s]+$/, 'Solo se permiten letras y espacios')
            .max(100, 'La longitud máxima es de 100 caracteres')
            .required('Este campo es requerido'),
        Siglas: Yup.string()
            .matches(/^[A-Z]+$/, 'Solo se permiten letras en mayúscula')
            .max(7, 'La longitud máxima es de 7 caracteres')
            .required('Este campo es requerido'),
        DescripcionUnidad: Yup.string()
            .matches(/^[A-Za-zÁ-Úá-ú\s]+$/, 'Solo se permiten letras y espacios')
            .max(250, 'La longitud máxima es de 250 caracteres'),
        CodPersonaInterna: Yup.number()
            .required('Este campo es requerido'),
    });

    const fetchDirigenteData = async (unidad: Unidad) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/unidad/dirigente?CodUnidad=${unidad.CodUnidad}`);
            console.log(response.data.CodPersonaInterna);
            if (response.status === 200) {
                setCodPersonaInterna(response.data.CodPersonaInterna);
            } else {
                console.error('La API no respondió con el estado 200 OK');
            }
        } catch (error) {
            console.error(error);
            Store.addNotification({
                title: "Ha ocurrido un problema al consultar el dirigente",
                message: "Lo sentimos ha ocurido un problema vuelva a intentarlo mas tarde",
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 3500,
                    onScreen: true,
                    pauseOnHover: true
                }
            });
        }
    };

    const editUnidad = async (unidad: Unidad) => {
        setSelectedUnidad(unidad);
        setTempUnidad(unidad);
        setNombre(unidad.NombreUnidad);
        setSiglas(unidad.Siglas);
        setDescripcion(unidad.DescripcionUnidad);
        await fetchDirigenteData(unidad);
        setShowModalEdit(true);
    };

    const updateUnidad = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
        setSubmitting(true);
        setIsLoading(true);
        try {
            const response = await axios.put(`${API_BASE_URL}/api/unidad/${selectedUnidad?.CodUnidad}`, {
                NombreUnidad: values.NombreUnidad,
                Siglas: values.Siglas,
                DescripcionUnidad: values.DescripcionUnidad,
                CodPersonaInterna: values.CodPersonaInterna,
            });
            const updatedUnidad = response.data;
            console.log(response);
            setUnidades(unidades.map((unidad) =>
                unidad.CodUnidad === updatedUnidad.CodUnidad ? updatedUnidad : unidad
            ));
            setShowModalEdit(false);
            setNombre('');
            setSiglas('');
            setDescripcion('');
            Store.addNotification({
                title: "Unidad editada con exito",
                message: "La unidad " + response.data.NombreUnidad + " se ha editado con éxito",
                type: "success",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 2000,
                    onScreen: true
                }
            });
            resetForm();
        } catch (error) {
            Store.addNotification({
                title: "Ha ocurrido un problema al editar la unidad",
                message: "Lo sentimos ha ocurido un problema al editar la unidad vuelva a intentarlo mas tarde",
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 2000,
                    onScreen: true
                }
            });
            console.error(error);
        }
        setIsLoading(false);
        setSubmitting(false);
    };

    const deleteUnidad = async (codUnidad: number) => {
        try {
            const response = await axios.delete(`${API_BASE_URL}/api/unidad/${codUnidad}`);
            const updatedUnidad = response.data;
            console.log(response);
            setUnidades(unidades.map((unidad) =>
                unidad.CodUnidad === updatedUnidad.CodUnidad ? updatedUnidad : unidad
            ));
            console.log('cambio deletedCount');
            setDeletedCount(deletedCount + 1);
            Store.addNotification({
                title: "Estado de la unidad modificado con exito",
                message: "La unidad " + response.data.NombreUnidad + " se ha modificado con éxito",
                type: "success",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 2000,
                    onScreen: true
                }
            });
        } catch (error) {
            Store.addNotification({
                title: "Ha ocurrido un problema al modificar el estado de la unidad",
                message: "Lo sentimos ha ocurido un problema al editar el estado de la unidad, vuelva a intentarlo mas tarde",
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 2000,
                    onScreen: true
                }
            });
        }
    };

    const handlePrint = () => {
        if (showPrintModal) {
            setShowPrintModal(false);
        } else {
            setShowPrintModal(true);
        }
    }

    const handleFilter = () => {
        if (showFilterModal) {
            setShowFilterModal(false);
        } else {
            setShowFilterModal(true);
        }
    }

    const handleReload = () => {
        router.reload();
    };

    return (
        <Layout usuarioLogueado={usuarioLogueado}>
            <Head>
                <title>Unidades</title>
            </Head>
            <div className={styles.crud_container}>
                <ReactNotifications />
                <div className={styles.crud_header}>
                    <h1>Unidades</h1>
                    <button className={styles.crud_normal_button}>
                        <Link href="/usuarios/asignar-unidad" className={styles.link}>
                            <FontAwesomeIcon icon={faUserTag} className={styles.button_icon} style={{ marginRight: '5px' }} />
                            Asignar unidad a usuario
                        </Link>
                    </button>
                </div>
                <div className={styles.crud_body}>
                    <div className={styles.crud_options}>
                        <SearchBar searchTerm={search} onSearchTermChange={handleSearchTermChange} />
                        <button onClick={() => setShowModal(true)} className={styles.crud_normal_button}>
                            <FontAwesomeIcon icon={faPlus} style={{ marginRight: '5px' }} />
                            Crear
                        </button>
                        <div className={styles.print_filter_container}>
                            <div className={styles.print_container}>
                                <button onClick={handlePrint} className={styles.crud_regular_button}>
                                    <FontAwesomeIcon icon={faPrint} style={{ marginRight: '5px' }} />
                                    Imprimir
                                </button>
                                <div className={styles.print_modal} ref={modalPrintRef} style={{ display: showPrintModal ? 'flex' : 'none' }}>
                                    <button onClick={handleDownloadCSV}>
                                        <FontAwesomeIcon icon={faFileCsv} className={styles.csv_icon} />
                                        CSV</button>
                                    <button onClick={handleDownloadPDF}>
                                        <FontAwesomeIcon icon={faFilePdf} className={styles.pdf_icon} />
                                        PDF</button>
                                </div>
                            </div>
                            <div className={styles.filter_container}>
                                <button onClick={handleFilter} className={styles.crud_regular_button}>
                                    <FontAwesomeIcon icon={faFilter} style={{ marginRight: '5px' }} />
                                    Filtrar
                                </button>
                                <div className={styles.filter_modal} ref={modalFilterRef} style={{ display: showFilterModal ? 'flex' : 'none' }} >
                                    <div className={styles.checkbox_container}>
                                        <label className={styles.checkbox_label}>
                                            <input type="checkbox" checked={filters.length === 2} onChange={() => handleFilterChange('todos')} />
                                            <span className={styles.checkmark}></span>
                                            Todos
                                        </label>
                                        <label className={styles.checkbox_label}>
                                            <input type="checkbox" checked={filters.includes('ESTADO-1')} onChange={() => handleFilterChange('ESTADO-1')} />
                                            <span className={styles.checkmark}></span>
                                            Activos
                                        </label>
                                        <label className={styles.checkbox_label}>
                                            <input type="checkbox" checked={filters.includes('ESTADO-0')} onChange={() => handleFilterChange('ESTADO-0')} />
                                            <span className={styles.checkmark}></span>
                                            Inactivos
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {error ? (
                        <div className={styles.notfound}>
                            <div className={styles.notfound_icon}><FontAwesomeIcon icon={faExclamationTriangle} /></div>
                            <div className={styles.notfound_text}>{messageError}</div>
                            <button type='button' onClick={handleReload} className={styles.crud_normal_button}>Volver a intentar</button>
                        </div>
                    ) : (
                        <>
                            <div className={styles.crud_table}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th onClick={() => handleOrderBy('UNI_NOMBRE')} className={styles.th_orderable}>
                                                Nombre {' '}
                                                {orderBy === 'UNI_NOMBRE' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'UNI_NOMBRE' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'UNI_NOMBRE' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('UNI_SIGLAS')} className={styles.th_orderable}>
                                                Siglas {' '}
                                                {orderBy === 'UNI_SIGLAS' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'UNI_SIGLAS' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'UNI_SIGLAS' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('UNI_DESCRIPCION')} className={styles.th_orderable}>
                                                Descripción {' '}
                                                {orderBy === 'UNI_DESCRIPCION' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'UNI_DESCRIPCION' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'UNI_DESCRIPCION' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('ESTADO')} className={styles.th_orderable}>
                                                Estado {' '}
                                                {orderBy === 'ESTADO' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'ESTADO' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'ESTADO' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {unidades.map((unidad, index) => (
                                            <tr key={unidad.CodUnidad}>
                                                <td>{(page - 1) * limit + index + 1}</td>
                                                <td>{unidad.NombreUnidad}</td>
                                                <td>{unidad.Siglas}</td>
                                                <td>{unidad.DescripcionUnidad}</td>
                                                {unidad.Estado == "1" ?
                                                    <td><span className={styles.estado_activo}>Activo</span></td> :
                                                    <td><span className={styles.estado_inactivo}>Inactivo</span></td>
                                                }
                                                <td>
                                                    <button onClick={() => editUnidad(unidad)} className={styles.button_edit}><FontAwesomeIcon icon={faEdit} /></button>
                                                    {unidad.Estado == "0" ?
                                                        <button onClick={() => deleteUnidad(unidad.CodUnidad)} className={styles.button_undo} title='Activar'>
                                                            <FontAwesomeIcon icon={faUndo} />
                                                        </button> :
                                                        <button onClick={() => deleteUnidad(unidad.CodUnidad)} className={styles.button_trash} title='Inactivar'>
                                                            <FontAwesomeIcon icon={faTrashAlt} />
                                                        </button>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={6}>
                                                <Pagination
                                                    page={page}
                                                    total={totalUnidades}
                                                    limit={limit}
                                                    onChange={handlePageChange}
                                                />
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </>
                    )}
                </div>
                {showModal && (
                    <div className={styles.modal}>
                        <div className={styles.card}>
                            <h3>Crear Unidad</h3>
                            <Formik
                                initialValues={initialValues}
                                validationSchema={validationSchema}
                                onSubmit={createUnidad}
                                validateOnChange={true}
                            >
                                {({ isSubmitting, errors, touched }) => (
                                    <Form>
                                        <label htmlFor="NombreUnidad">Nombre de Unidad</label>
                                        <Field id="NombreUnidad" name='NombreUnidad' placeholder="Ingresa el nombre de la unidad" className={errors.NombreUnidad && touched.NombreUnidad ? styles.error_input : ''} />
                                        <ErrorMessage name="NombreUnidad" component="div" className={styles.error} />

                                        <label htmlFor="Siglas">Siglas de la Unidad</label>
                                        <Field id="Siglas" name='Siglas' placeholder="Ingresa las siglas de la unidad" className={errors.Siglas && touched.Siglas ? styles.error_input : ''} />
                                        <ErrorMessage name="Siglas" component="div" className={styles.error} />

                                        <label htmlFor="DescripcionUnidad">Descripción de la Unidad</label>
                                        <Field id="DescripcionUnidad" name='DescripcionUnidad' placeholder="Ingresa una descripción para la unidad" className={errors.DescripcionUnidad && touched.DescripcionUnidad ? styles.error_input : ''} />
                                        <ErrorMessage name="DescripcionUnidad" component="div" className={styles.error} />

                                        <label htmlFor="CodPersonaInterna">Director de Unidad</label>
                                        <Field name="CodPersonaInterna" id="CodPersonaInterna">
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

                                                const handleChange = (selectedOption: any) => {
                                                    form.setFieldValue(field.name, selectedOption ? selectedOption.value : "");
                                                };

                                                // Si field.value está definido, asigna el valor directamente
                                                const selectedValue = field.value ? field.value : "";

                                                return (
                                                    <AsyncSelect
                                                        {...field}
                                                        cacheOptions
                                                        defaultOptions
                                                        loadOptions={loadOptions}
                                                        value={options.find((option: any) => option.value === selectedValue)}
                                                        onChange={handleChange}
                                                        placeholder="Busque el nombre, correo o ID de la institución de la persona"
                                                        classNamePrefix="react-select"
                                                        className={`${styles.create_select} ${errors.CodPersonaInterna && touched.CodPersonaInterna ? styles.error_input : ""
                                                            }`}
                                                        isSearchable
                                                    />
                                                );
                                            }}
                                        </Field>
                                        <ErrorMessage name="CodPersonaInterna" component="div" className={styles.error} />

                                        {isLoading ? (
                                            <div className={styles.card_buttons_container}>
                                                <div className={styles.load_icon}>
                                                    <FontAwesomeIcon icon={faSpinner} spin />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={styles.card_buttons_container}>
                                                <button type="submit" disabled={isSubmitting}>
                                                    <FontAwesomeIcon icon={faSave} style={{ marginRight: '5px' }} /> Crear
                                                </button>
                                                <button type="button" onClick={() => setShowModal(false)}>
                                                    <FontAwesomeIcon icon={faTimes} style={{ marginRight: '5px' }} /> Cancelar
                                                </button>
                                            </div>
                                        )}
                                    </Form>
                                )}
                            </Formik>
                        </div>
                        <div className={styles.overlay} onClick={() => setShowModal(false)}></div>
                    </div>
                )}
                {showModalEdit && (
                    <div className={styles.modal}>
                        <div className={styles.card}>
                            <h3>Editar</h3>
                            <Formik
                                initialValues={{ NombreUnidad: NombreUnidad, Siglas: Siglas, DescripcionUnidad: DescripcionUnidad, CodPersonaInterna: CodPersonaInterna }}
                                validationSchema={validationSchema}
                                onSubmit={updateUnidad}
                                validateOnChange={true}
                            >
                                {({ isSubmitting, errors, touched }) => (
                                    <Form>
                                        <div>
                                            <label htmlFor="NombreUnidad">Nombre de la Unidad</label>
                                            <Field id="NombreUnidad" name="NombreUnidad" placeholder="Ingresa el nombre de la unidad" className={errors.NombreUnidad && touched.NombreUnidad ? styles.error_input : ''} />
                                            <ErrorMessage name="NombreUnidad" component="div" className={styles.error} />
                                        </div>
                                        <div>
                                            <label htmlFor="Siglas">Siglas de la Unidad</label>
                                            <Field id="Siglas" name="Siglas" placeholder="Ingresa las siglas de la unidad" className={errors.Siglas && touched.Siglas ? styles.error_input : ''} />
                                            <ErrorMessage name="Siglas" component="div" className={styles.error} />
                                        </div>
                                        <div>
                                            <label htmlFor="DescripcionUnidad">Descripción de la Unidad</label>
                                            <Field id="DescripcionUnidad" name="DescripcionUnidad" placeholder="Ingresa una descripción para la unidad" className={errors.DescripcionUnidad && touched.DescripcionUnidad ? styles.error_input : ''} />
                                            <ErrorMessage name="DescripcionUnidad" component="div" className={styles.error} />
                                        </div>

                                        <label htmlFor="CodPersonaInterna">Director de Unidad</label>
                                        <Field name="CodPersonaInterna" id="CodPersonaInterna">
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

                                                const handleChange = (selectedOption: any) => {
                                                    form.setFieldValue(field.name, selectedOption ? selectedOption.value : "");
                                                };

                                                // Si field.value está definido, asigna el valor directamente
                                                const selectedValue = field.value ? field.value : "";

                                                return (
                                                    <AsyncSelect
                                                        {...field}
                                                        cacheOptions
                                                        defaultOptions
                                                        loadOptions={loadOptions}
                                                        value={options.find((option: any) => option.value === selectedValue)}
                                                        onChange={handleChange}
                                                        placeholder="Busque el nombre, correo o ID de la institución de la persona"
                                                        classNamePrefix="react-select"
                                                        className={`${styles.create_select} ${errors.CodPersonaInterna && touched.CodPersonaInterna ? styles.error_input : ""
                                                            }`}
                                                        isSearchable
                                                    />
                                                );
                                            }}
                                        </Field>
                                        <ErrorMessage name="CodPersonaInterna" component="div" className={styles.error} />

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
                                                <button type="button" onClick={() => {
                                                    setShowModalEdit(false);
                                                    setNombre('');
                                                    setDescripcion('');
                                                    setCodPersonaInterna('');
                                                }}>
                                                    <FontAwesomeIcon icon={faTimes} style={{ marginRight: '5px' }} /> Cancelar
                                                </button>
                                            </div>
                                        )}
                                    </Form>
                                )}
                            </Formik>
                        </div>
                        <div className={styles.overlay} onClick={() => {
                            setShowModalEdit(false);
                            setNombre('');
                            setDescripcion('');
                            setCodPersonaInterna('');
                        }}></div>
                    </div>
                )
                }

            </div >
        </Layout>
    );
}