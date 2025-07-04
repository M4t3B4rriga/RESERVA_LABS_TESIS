import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Equipo } from '@/libs/equipo';
import Pagination from '@/src/components/Pagination';
import SearchBar from '@/src/components/SearchBar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortUp, faSortDown, faSave, faTimes, faSpinner, faPrint, faFileCsv, faExclamationTriangle, faFilePdf, faFilter, faPlus, faUserTag, faEdit, faTrashAlt, faUndo } from '@fortawesome/free-solid-svg-icons';
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
import Select from 'react-select';
import { TipoEquipo } from '@/libs/tipoEquipo';
import { Espacio } from '@/libs/espacios';
import { useRouter } from 'next/router';
import { GetServerSidePropsContext, NextPageContext } from 'next';
import { Auth } from '@/libs/auth';
import { jwtVerify } from 'jose';
import Layout from '@/src/components/Layout';
import Head from 'next/head';

const PAGE_SIZE = 10;
type OrderBy = 'EQU_NOMBRE' | 'EQU_CANTIDAD' | 'ESP_NOMBRE' | 'TEQ_NOMBRE' | 'EQU_MARCA' | 'EQU_MODELO' | 'EQU_ESTA_INSTALADO' | 'ESTADO';
type OrderDir = 'ASC' | 'DESC';
const filtersList = ['ESTADO-1'];

export async function getServerSideProps(context: GetServerSidePropsContext) {
    const { query } = context;
    const valor = query.CodEspacio || '';
    const filtersList = [];
    if (query.CodEspacio) {
        filtersList.push(`CodEspacio-${valor}`);
    }
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
            return { props: { equipos: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
        }

        const response = await axios.get(`${API_BASE_URL}/api/equipo`, {
            params: {
                page: '1',
                limit: PAGE_SIZE,
                filter: `ESTADO-1,CodEspacio-${valor}`,
                orderBy: 'EQU_NOMBRE',
                orderDir: 'ASC',
            },
        });
        if (response.status === 200) {
            const equipos = response.data.equipos;
            const totalCount = response.data.totalCount;
            return { props: { equipos, totalCount, usuarioLogueado: usuarioLogueado } };
        } else {
            console.error('La API no respondió con el estado 200 OK');
            return { props: { equipos: [], totalCount: 0, error: true, messageError: response.data.message, usuarioLogueado: usuarioLogueado } };
        }
    } catch (error) {
        console.error(error);
        return { props: { equipos: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
    }
}

export default function ServEqui({ equipos: initialequipos, totalCount: initialTotalCount, error: initialError, messageError: initialMessageError, usuarioLogueado: initialUsuarioLogueado }: { equipos: Equipo[], totalCount: number, error?: boolean, messageError?: string, usuarioLogueado: Auth | null }) {
    const [usuarioLogueado, setUsuarioLogueado] = useState(initialUsuarioLogueado);
    const [equipos, setequipos] = useState(initialequipos);
    const [NombreEquipo, setNombre] = useState('');
    const [Cantidad, setCantidad] = useState(0);
    const [EstaInstalado, setEstaInstalado] = useState('');
    const [Marca, setMarca] = useState('');
    const [Modelo, setModelo] = useState('');
    const [CodEspacio, setEspacio] = useState<Number | null>(null);
    const [NombreEspacio, setNombreEspacio] = useState('');
    const [CodTipoEquipo, setTipoEquipo] = useState<Number | null>(null);
    const [NombreTipoEquipo, setNombreTipoEquipo] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showModalEdit, setShowModalEdit] = useState(false);
    const [selectedequipo, setSelectedEquipo] = useState<Equipo | null>(null);
    const [tempequipo, setTempequipo] = useState<Equipo | null>(null);
    const [page, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalequipos, setTotalequipos] = useState(initialTotalCount);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState(filtersList);
    const [orderBy, setOrderBy] = useState<OrderBy>('EQU_NOMBRE');
    const [orderDir, setOrderDir] = useState<OrderDir>('ASC');
    const [deletedCount, setDeletedCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const modalPrintRef = useRef<HTMLDivElement>(null);
    const modalFilterRef = useRef<HTMLDivElement>(null);
    const [tiposEquipo, setTiposEquipo] = useState([]);
    const [espacios, setEspacios] = useState([]);
    const [isSelectDataReady, setIsSelectDataReady] = useState(false);
    const router = useRouter();
    const valor = router.query.CodEspacio || '';
    const [error, setError] = useState(initialError);
    const [messageError, setMessageError] = useState(initialMessageError);

    const handleFetchSelectData = async () => {
        setShowModal(true);
        fetchSelectData();
    };
    const handleFetchSelectEditData = async () => {
        setShowModalEdit(true);
        fetchSelectData();
    };

    const fetchSelectData = async () => {
        setIsSelectDataReady(false);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/equipo/selectData`);
            setTiposEquipo(response.data.tiposEquipo);
            setEspacios(response.data.espacios);
            setIsSelectDataReady(true);
        } catch (error) {
            Store.addNotification({
                title: "Ha ocurrido un problema al obtener las opciones",
                message: "Lo sentimos ha ocurido un problema al optener las opciones, vuelva a intentarlo mas tarde",
                type: "danger",
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
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const fetchData = async () => {
                const newFilters = [...filters];
                if (valor && !newFilters.includes(`CodEspacio-${valor}`)) {
                    newFilters.push(`CodEspacio-${valor}`);
                    setFilters(newFilters);
                }
                try {
                    const response = await axios.get(`${API_BASE_URL}/api/equipo`, {
                        params: { page, limit, search, filter: newFilters.join(','), orderBy, orderDir },
                    });
                    if (response.status === 200) {
                        setequipos(response.data.equipos);
                        setTiposEquipo(response.data.tiposEquipo);
                        setEspacios(response.data.espacios);
                        setTotalequipos(response.data.totalCount);
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
    }, [page, limit, search, filters, orderBy, orderDir, deletedCount, valor]);

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
        console.log('cambio page');
        setCurrentPage(page);
    };

    function handleSearchTermChange(newSearchTerm: string) {
        console.log('cambio page y search');
        setSearch(newSearchTerm);
        setCurrentPage(1);
    };

    const handleFilterChange = (filter: string) => {
        console.log('cambio page y filters');
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
        console.log('cambio orderBy y orderDir');
        setOrderBy(orderBy);
        setOrderDir(orderDir === 'ASC' ? 'DESC' : 'ASC');
    };

    const handleDownloadCSV = async () => {
        try {
            // Obtener los registros que deseas exportar
            const response = await axios.get(`${API_BASE_URL}/api/equipo`, {
                params: { page: 1, limit: 99999, search, filter: filters.join(','), orderBy, orderDir },
            });
            const serviciosEspeciales = response.data.serviciosEspeciales;

            // Definir los nombres de las columnas
            const headers = ['#', 'Nombre Equipo', 'Cantidad', 'Marca', 'Modelo', 'Tipo de Equipo', 'Espacio', 'Instalado en el espacio', 'Estado'];

            // Mapear los datos para que tengan la estructura adecuada
            const data = equipos.map((r: { NombreEquipo: string, Cantidad: number, Marca: string, Modelo: string, NombreTipoEquipo: string, NombreEspacio: string, EstaInstalado: string, Estado: string }, i: number) => {
                return {
                    '#': i + 1,
                    'Nombre Equipo': r.NombreEquipo,
                    'Cantidad': r.Cantidad,
                    'Marca': r.Marca,
                    'Modelo': r.Modelo,
                    'Tipo de Equipo': r.NombreTipoEquipo,
                    'Espacio': r.NombreEspacio,
                    'Instalado en el Espacio': r.EstaInstalado == "1" ? 'Sí' : 'No',
                    'Estado': r.Estado == "1" ? 'Activo' : 'Inactivo',
                }
            });

            // Exportar los datos como CSV
            generateCSV(headers, data, "Reporte de Equipos");
        } catch (error) {
            console.error(error);
        }
    };

    const handleDownloadPDF = async () => {
        try {
            // Obtener los registros que deseas exportar
            const response = await axios.get(`${API_BASE_URL}/api/equipo`, {
                params: { page: 1, limit: 99999, search, filter: filters.join(','), orderBy, orderDir },
            });
            const equipos = response.data.equipos;

            // Mapear los datos para que tengan la estructura adecuada
            const data = equipos.map((r: { NombreEquipo: string, Cantidad: number, Marca: string, Modelo: string, NombreTipoEquipo: string, NombreEspacio: string, EstaInstalado: string, Estado: string }, i: number) => {
                return [
                    i + 1,
                    r.NombreEquipo,
                    r.Cantidad,
                    r.Marca,
                    r.Modelo,
                    r.NombreTipoEquipo,
                    r.NombreEspacio,
                    r.EstaInstalado == "1" ? 'Sí' : 'No',
                    r.Estado == "1" ? 'Activo' : 'Inactivo',
                ];
            });

            // Definir los nombres de las columnas
            const headers = ['#', 'Nombre Equipo', 'Cantidad', 'Marca', 'Modelo', 'Tipo de Equipo', 'Espacio', 'Instalado en el espacio', 'Estado'];

            // Definir el título del reporte
            const reportTitle = "Reporte de Equipos";

            // Generar el PDF
            generatePDF(data, headers, reportTitle);
        } catch (error) {
            console.error(error);
        }
    };
    //te quedaste aca pibe
    const createequipo = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
        setSubmitting(true);
        setIsLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/equipo`, {
                NombreEquipo: values.NombreEquipo,
                Cantidad: values.Cantidad,
                EstaInstalado: values.EstaInstalado,
                Marca: values.Marca,
                Modelo: values.Modelo,
                CodEspacio: values.CodEspacio,
                CodTipoEquipo: values.CodTipoEquipo,
            });
            const newequipo = response.data.nuevoEquipo;
            console.log(newequipo);
            setequipos([...equipos, newequipo]);
            setShowModal(false);
            Store.addNotification({
                title: "Equipo creado con exito",
                message: "El equipo " + response.data.nuevoEquipo.NombreEquipo + " se ha creado con éxito",
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
                title: "Ha ocurrido un problema al crear el equipo",
                message: "Lo sentimos ha ocurido un problema al crear el equipo, vuelva a intentarlo mas tarde",
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
        NombreEquipo: '',
        Cantidad: '',
        CodTipoEquipo: '',
        Marca: '',
        Modelo: '',
        CodEspacio: '',
        EstaInstalado: '',
    };

    const validationSchema = Yup.object().shape({
        NombreEquipo: Yup.string()
            .matches(/^[A-Za-zÁ-Úá-ú\s]+$/, 'Solo se permiten letras y espacios')
            .max(50, 'La longitud máxima es de 50 caracteres')
            .required('Este campo es requerido'),
        Cantidad: Yup.number()
            .min(0, 'El valor mínimo permitido es 0')
            .required('Este campo es requerido'),
        Marca: Yup.string()
            .matches(/^(?!\s+$)[A-Za-zÁ-Úá-ú0-9\s-_.',/]+$/, 'Solo se permiten letras, números, espacios y ciertos caracteres especiales')
            .max(50, 'La longitud máxima es de 50 caracteres'),
        Modelo: Yup.string()
            .matches(/^(?!\s+$)[A-Za-zÁ-Úá-ú0-9\s-_.',/]+$/, 'Solo se permiten letras, números, espacios y ciertos caracteres especiales')
            .max(50, 'La longitud máxima es de 50 caracteres'),
        CodTipoEquipo: Yup.string()
            .required('Este campo es requerido'),
        CodEspacio: Yup.string()
            .required('Este campo es requerido'),
        EstaInstalado: Yup.string()
            .required('Este campo es requerido'),
    });

    const editequipo = async (equipo: Equipo) => {
        setSelectedEquipo(equipo);
        setTempequipo(equipo);
        setNombre(equipo.NombreEquipo);
        setCantidad(equipo.Cantidad);
        setTipoEquipo(equipo.CodTipoEquipo);
        setMarca(equipo.Marca);
        setModelo(equipo.Modelo);
        setEspacio(equipo.CodEspacio);
        setEstaInstalado(equipo.EstaInstalado);
        handleFetchSelectEditData();
    };
    //te quedaste aca colega
    const updateequipo = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
        setSubmitting(true);
        setIsLoading(true);
        console.log("si me llamaron a update");
        try {
            const response = await axios.put(`${API_BASE_URL}/api/equipo/${selectedequipo?.CodEquipo}`, {
                NombreEquipo: values.NombreEquipo,
                Cantidad: values.Cantidad,
                EstaInstalado: values.EstaInstalado,
                Marca: values.Marca,
                Modelo: values.Modelo,
                CodEspacio: values.CodEspacio,
                CodTipoEquipo: values.CodTipoEquipo,
            });
            const updatedequipo = response.data;
            console.log(response);
            setequipos(equipos.map((equipo) =>
                equipo.CodEquipo === updatedequipo.CodEquipo ? updatedequipo : equipo
            ));
            setShowModalEdit(false);
            setNombre('');
            setCantidad(0);
            setTipoEquipo(null);
            setMarca('');
            setModelo('');
            setEspacio(null);
            setEstaInstalado('');
            Store.addNotification({
                title: "Equipo editado con exito",
                message: "El equipo " + response.data.NombreEquipo + " se ha editado con éxito",
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
                title: "Ha ocurrido un problema al editar el equipo",
                message: "Lo sentimos ha ocurido un problema al editar el equipo, vuelva a intentarlo mas tarde",
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

    const deleteequipo = async (codequipo: number) => {
        try {
            const response = await axios.delete(`${API_BASE_URL}/api/equipo/${codequipo}`);
            const updatedequipo = response.data;
            console.log(response);
            setequipos(equipos.map((equipo) =>
                equipo.CodEquipo === updatedequipo.CodEquipo ? updatedequipo : equipo
            ));
            console.log('cambio deletedCount');
            setDeletedCount(deletedCount + 1);
            Store.addNotification({
                title: "Estado del equipo modificado con exito",
                message: "El equipo " + response.data.NombreEquipo + " se ha modificado con éxito",
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
                title: "Ha ocurrido un problema al modificar el estado del equipo",
                message: "Lo sentimos ha ocurido un problema al editar el estado del equipo, vuelva a intentarlo mas tarde",
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

    const emptyOption = { value: '', label: 'Selecciona el tipo de equipo' };
    const emptyOptionEspacio = { value: '', label: 'Selecciona el espacio' };

    return (
        <Layout usuarioLogueado={usuarioLogueado}>
            <Head>
                <title>Equipos</title>
            </Head>
            <div className={styles.crud_container}>
                <ReactNotifications />
                <div className={styles.crud_header}>
                    <h1>Equipos</h1>

                </div>
                <div className={styles.crud_body}>
                    <div className={styles.crud_options}>
                        <SearchBar searchTerm={search} onSearchTermChange={handleSearchTermChange} />
                        <button onClick={() => handleFetchSelectData()} className={styles.crud_normal_button}>
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
                                            <input type="checkbox" checked={valor === '' ? filters.length === 2 : filters.length === 3} onChange={() => handleFilterChange('todos')} />
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
                                            <th onClick={() => handleOrderBy('EQU_NOMBRE')} className={styles.th_orderable}>
                                                Nombre {' '}
                                                {orderBy === 'EQU_NOMBRE' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'EQU_NOMBRE' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'EQU_NOMBRE' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('EQU_CANTIDAD')} className={styles.th_orderable}>
                                                Cantidad {' '}
                                                {orderBy === 'EQU_CANTIDAD' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'EQU_CANTIDAD' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'EQU_CANTIDAD' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('TEQ_NOMBRE')} className={styles.th_orderable}>
                                                Tipo {' '}
                                                {orderBy === 'TEQ_NOMBRE' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'TEQ_NOMBRE' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'TEQ_NOMBRE' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('EQU_MARCA')} className={styles.th_orderable}>
                                                Marca {' '}
                                                {orderBy === 'EQU_MARCA' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'EQU_MARCA' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'EQU_MARCA' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('EQU_MODELO')} className={styles.th_orderable}>
                                                Modelo {' '}
                                                {orderBy === 'EQU_MODELO' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'EQU_MODELO' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'EQU_MODELO' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('ESP_NOMBRE')} className={styles.th_orderable}>
                                                Espacio {' '}
                                                {orderBy === 'ESP_NOMBRE' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'ESP_NOMBRE' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'ESP_NOMBRE' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('EQU_ESTA_INSTALADO')} className={styles.th_orderable}>
                                                Instalado {' '}
                                                {orderBy === 'EQU_ESTA_INSTALADO' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'EQU_ESTA_INSTALADO' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'EQU_ESTA_INSTALADO' && <FontAwesomeIcon icon={faSort} />}
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
                                        {equipos.map((equipo, index) => (
                                            <tr key={equipo.CodEquipo}>
                                                <td>{(page - 1) * limit + index + 1}</td>
                                                <td>{equipo.NombreEquipo}</td>
                                                <td>{equipo.Cantidad}</td>
                                                <td>{equipo.NombreTipoEquipo}</td>
                                                <td>{equipo.Marca}</td>
                                                <td>{equipo.Modelo}</td>
                                                <td>{equipo.NombreEspacio}</td>
                                                {equipo.EstaInstalado == "1" ?
                                                    <td><span className={styles.estado_activo}>Sí</span></td> :
                                                    <td><span className={styles.estado_inactivo}>No</span></td>
                                                }
                                                {equipo.Estado == "1" ?
                                                    <td><span className={styles.estado_activo}>Activo</span></td> :
                                                    <td><span className={styles.estado_inactivo}>Inactivo</span></td>
                                                }
                                                <td>
                                                    <button onClick={() => editequipo(equipo)} className={styles.button_edit}><FontAwesomeIcon icon={faEdit} /></button>
                                                    {equipo.Estado == "0" ?
                                                        <button onClick={() => deleteequipo(equipo.CodEquipo)} className={styles.button_undo} title='Activar'>
                                                            <FontAwesomeIcon icon={faUndo} />
                                                        </button> :
                                                        <button onClick={() => deleteequipo(equipo.CodEquipo)} className={styles.button_trash} title='Inactivar'>
                                                            <FontAwesomeIcon icon={faTrashAlt} />
                                                        </button>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={10}>
                                                <Pagination
                                                    page={page}
                                                    total={totalequipos}
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
                            <h3>Crear Equipo</h3>
                            <Formik
                                initialValues={initialValues}
                                validationSchema={validationSchema}
                                onSubmit={createequipo}
                                validateOnChange={true}
                            >
                                {({ isSubmitting, errors, touched }) => (
                                    <Form>
                                        <label htmlFor="NombreEquipo">Nombre del equipo</label>
                                        <Field id="NombreEquipo" name='NombreEquipo' placeholder="Ingresa el nombre del equipo" className={errors.NombreEquipo && touched.NombreEquipo ? styles.error_input : ''} />
                                        <ErrorMessage name="NombreEquipo" component="div" className={styles.error} />

                                        <label htmlFor="Cantidad">Cantidad</label>
                                        <Field id="Cantidad" name='Cantidad' placeholder="Ingresa la cantidad" type="number" className={errors.Cantidad && touched.Cantidad ? styles.error_input : ''} />
                                        <ErrorMessage name="Cantidad" component="div" className={styles.error} />

                                        <label htmlFor="Espacio">Espacio</label>
                                        {isSelectDataReady ? (
                                            <>
                                                <Field name="CodEspacio">
                                                    {({ field, form }: { field: any, form: any }) => {
                                                        const handleChange = (selectedOption: any) => {
                                                            form.setFieldValue(field.name, selectedOption.value);
                                                        };

                                                        const options = [emptyOptionEspacio, ...espacios.map((espacio: Espacio) => ({ value: espacio.CodEspacio, label: espacio.NombreEspacio }))];
                                                        console.log(valor);
                                                        var selectedOption;
                                                        if (valor && !field.value) {
                                                            form.setFieldValue(field.name, valor);
                                                            selectedOption = options.find(option => option.value === valor);
                                                        }
                                                        else {
                                                            selectedOption = options.find(option => option.value === field.value);
                                                        }


                                                        return (
                                                            <Select
                                                                {...field}
                                                                value={selectedOption}
                                                                options={options}
                                                                onChange={handleChange}
                                                                classNamePrefix="react-select"
                                                                placeholder="Selecciona el espacio"
                                                                className={`${styles.create_select} ${errors.CodEspacio && touched.CodEspacio ? styles.error_input : ''}`}
                                                                isSearchable
                                                                isDisabled={valor !== ''}
                                                            />
                                                        );
                                                    }}
                                                </Field>
                                                <ErrorMessage name="CodEspacio" component="div" className={styles.error} />
                                            </>
                                        ) : (
                                            <div className={styles.load_icon}><FontAwesomeIcon icon={faSpinner} spin /></div>
                                        )}

                                        <label htmlFor="Marca">Marca</label>
                                        <Field id="Marca" name='Marca' placeholder="Ingresa la marca" className={errors.Marca && touched.Marca ? styles.error_input : ''} />
                                        <ErrorMessage name="Marca" component="div" className={styles.error} />

                                        <label htmlFor="Modelo">Modelo</label>
                                        <Field id="Modelo" name='Modelo' placeholder="Ingresa el modelo" className={errors.Modelo && touched.Modelo ? styles.error_input : ''} />
                                        <ErrorMessage name="Modelo" component="div" className={styles.error} />

                                        <label htmlFor="TipoEquipo">Tipo de equipo</label>
                                        {isSelectDataReady ? (

                                            <>
                                                <Field name="CodTipoEquipo">
                                                    {({ field, form }: { field: any, form: any }) => {
                                                        const handleChange = (selectedOption: any) => {
                                                            form.setFieldValue(field.name, selectedOption.value);
                                                        };

                                                        const options = [emptyOption, ...tiposEquipo.map((tipoEquipo: TipoEquipo) => ({ value: tipoEquipo.CodTipoEquipo, label: tipoEquipo.NombreTipoEquipo }))];
                                                        const selectedOption = options.find(option => option.value === field.value);

                                                        return (
                                                            <Select
                                                                {...field}
                                                                value={selectedOption}
                                                                options={options}
                                                                onChange={handleChange}
                                                                classNamePrefix="react-select"
                                                                placeholder="Selecciona el tipo de equipo"
                                                                className={`${styles.create_select} ${errors.CodTipoEquipo && touched.CodTipoEquipo ? styles.error_input : ''}`}
                                                                isSearchable
                                                            />
                                                        );
                                                    }}
                                                </Field>
                                                <ErrorMessage name="CodTipoEquipo" component="div" className={styles.error} />
                                            </>
                                        ) : (
                                            <div className={styles.load_icon}><FontAwesomeIcon icon={faSpinner} spin /></div>
                                        )}

                                        <label htmlFor="EstaInstalado">¿Está instalado?</label>
                                        <Field name="EstaInstalado">
                                            {({ field, form }: { field: any, form: any }) => {
                                                const handleChange = (selectedOption: any) => {
                                                    form.setFieldValue(field.name, selectedOption.value);
                                                };

                                                const options = [
                                                    { value: '1', label: 'Sí' },
                                                    { value: '0', label: 'No' }
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
                                                        className={`${styles.create_select} ${errors.EstaInstalado && touched.EstaInstalado ? styles.error_input : ''}`}
                                                        isSearchable
                                                    />
                                                );
                                            }}
                                        </Field>
                                        <ErrorMessage name="EstaInstalado" component="div" className={styles.error} />

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
                            <h3>Editar Equipo</h3>
                            <Formik
                                initialValues={{ NombreEquipo: NombreEquipo, Cantidad: Cantidad, CodTipoEquipo: CodTipoEquipo, CodEspacio: CodEspacio, Marca: Marca, Modelo: Modelo, EstaInstalado: EstaInstalado }}
                                validationSchema={validationSchema}
                                onSubmit={updateequipo}
                                validateOnChange={true}
                            >
                                {({ isSubmitting, errors, touched }) => (
                                    <Form>
                                        <div>
                                            <label htmlFor="NombreEquipo">Nombre del equipo</label>
                                            <Field id="NombreEquipo" name="NombreEquipo" placeholder="Ingresa el nombre del equipo" className={errors.NombreEquipo && touched.NombreEquipo ? styles.error_input : ''} />
                                            <ErrorMessage name="NombreEquipo" component="div" className={styles.error} />
                                        </div>
                                        <div>
                                            <label htmlFor="Cantidad">Cantidad</label>
                                            <Field id="Cantidad" name="Cantidad" placeholder="Ingresa la cantidad" className={errors.Cantidad && touched.Cantidad ? styles.error_input : ''} />
                                            <ErrorMessage name="Cantidad" component="div" className={styles.error} />
                                        </div>
                                        <div>
                                            <label htmlFor="CodTipoEquipo">Tipo</label>
                                            {isSelectDataReady ? (
                                                <>
                                                    <Field
                                                        name="CodTipoEquipo"
                                                        render={({ field, form }: { field: any, form: any }) => {
                                                            const handleChange = (selectedOption: any) => {
                                                                form.setFieldValue(field.name, selectedOption.value);
                                                            };

                                                            const options = [emptyOption, ...tiposEquipo.map((tipoEquipo: TipoEquipo) => ({ value: tipoEquipo.CodTipoEquipo, label: tipoEquipo.NombreTipoEquipo }))];

                                                            const selectedOption = options.find(option => option.value === CodTipoEquipo?.toString());



                                                            return (
                                                                <Select
                                                                    defaultValue={selectedOption}
                                                                    options={options}
                                                                    onChange={handleChange}
                                                                    classNamePrefix="react-select"
                                                                    placeholder="Seleccione el tipo de equipo"
                                                                    className={`${styles.create_select} ${errors.CodTipoEquipo && touched.CodTipoEquipo ? styles.error_input : ''}`}
                                                                    isSearchable
                                                                />
                                                            );
                                                        }}
                                                    />
                                                    <ErrorMessage name="CodTipoEquipo" component="div" className={styles.error} />
                                                </>
                                            ) : (
                                                <div className={styles.load_icon}><FontAwesomeIcon icon={faSpinner} spin /></div>
                                            )}

                                        </div>
                                        <div>
                                            <label htmlFor="Marca">Marca</label>
                                            <Field id="Marca" name="Marca" placeholder="Ingresa la marca" className={errors.Marca && touched.Marca ? styles.error_input : ''} />
                                            <ErrorMessage name="Marca" component="div" className={styles.error} />
                                        </div>
                                        <div>
                                            <label htmlFor="Modelo">Modelo</label>
                                            <Field id="Modelo" name="Modelo" placeholder="Ingresa el modelo" className={errors.Modelo && touched.Modelo ? styles.error_input : ''} />
                                            <ErrorMessage name="Modelo" component="div" className={styles.error} />
                                        </div>
                                        <div>
                                            <label htmlFor="CodEspacio">Espacio</label>
                                            {isSelectDataReady ? (
                                                <>
                                                    <Field
                                                        name="CodEspacio"
                                                        render={({ field, form }: { field: any, form: any }) => {
                                                            const handleChange = (selectedOption: any) => {
                                                                form.setFieldValue(field.name, selectedOption.value);
                                                            };

                                                            const options = [emptyOptionEspacio, ...espacios.map((espacio: Espacio) => ({ value: espacio.CodEspacio, label: espacio.NombreEspacio }))];

                                                            const selectedOption = options.find(option => option.value === CodEspacio?.toString());

                                                            return (
                                                                <Select
                                                                    defaultValue={selectedOption}
                                                                    options={options}
                                                                    onChange={handleChange}
                                                                    classNamePrefix="react-select"
                                                                    placeholder="Selecciona el Espacio"
                                                                    className={`${styles.create_select} ${errors.CodEspacio && touched.CodEspacio ? styles.error_input : ''}`}
                                                                    isSearchable
                                                                />
                                                            );
                                                        }}
                                                    />
                                                    <ErrorMessage name="CodEspacio" component="div" className={styles.error} />
                                                </>
                                            ) : (
                                                <div className={styles.load_icon}><FontAwesomeIcon icon={faSpinner} spin /></div>
                                            )}

                                        </div>
                                        <div>
                                            <label htmlFor="EstaInstalado">¿Está instalado?</label>
                                            <Field name="EstaInstalado">
                                                {({ field, form }: { field: any, form: any }) => {
                                                    const handleChange = (selectedOption: any) => {
                                                        form.setFieldValue(field.name, selectedOption.value);
                                                    };

                                                    const options = [
                                                        { value: '1', label: 'Sí' },
                                                        { value: '0', label: 'No' }
                                                    ];
                                                    const selectedOption = options.find(option => option.value === EstaInstalado?.toString());

                                                    return (
                                                        <Select
                                                            defaultValue={selectedOption}
                                                            options={options}
                                                            onChange={handleChange}
                                                            classNamePrefix="react-select"
                                                            placeholder="Selecciona una opción"
                                                            className={`${styles.create_select} ${errors.EstaInstalado && touched.EstaInstalado ? styles.error_input : ''}`}
                                                            isSearchable
                                                        />
                                                    );
                                                }}
                                            </Field>
                                            <ErrorMessage name="EstaInstalado" component="div" className={styles.error} />
                                        </div>
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
                                                    setCantidad(0);
                                                    setTipoEquipo(0);
                                                    setMarca('');
                                                    setModelo('');
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
                            setCantidad(0);
                            setTipoEquipo(0);
                            setMarca('');
                            setModelo('');
                        }}></div>
                    </div>
                )}

            </div>
        </Layout>
    );
}