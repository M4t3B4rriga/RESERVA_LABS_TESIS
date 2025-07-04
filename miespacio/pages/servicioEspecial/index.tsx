import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ServicioEspecial } from '@/libs/servicioEspecial';
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
import { Unidad } from '@/libs/unidad';
import Select from 'react-select';
import { useRouter } from 'next/router';
import { Auth } from '@/libs/auth';
import { jwtVerify } from 'jose';
import { GetServerSidePropsContext } from 'next';
import Layout from '@/src/components/Layout';
import Head from 'next/head';
const PAGE_SIZE = 10;
type OrderBy = 'SES_NOMBRE' | 'SES_DESCRIPCION' | 'UNI_NOMBRE' | 'SE.ESTADO';
type OrderDir = 'ASC' | 'DESC';

export async function getServerSideProps(context: GetServerSidePropsContext) {
    try {
        const { miEspacioSession } = context.req.cookies;

        if (miEspacioSession === undefined) {
            console.log('No hay cookie');
            return { props: { serviciosEspeciales: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
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
            return { props: { serviciosEspeciales: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
        }

        const response = await axios.get(`${API_BASE_URL}/api/servicioEspecial`, {
            params: { page: '1', limit: PAGE_SIZE, filter: 'SE.ESTADO-1', orderBy: 'SES_NOMBRE', orderDir: 'ASC' },
        });
        if (response.status === 200) {
            const serviciosEspeciales = response.data.serviciosEspeciales;
            console.log(serviciosEspeciales);
            const totalCount = response.data.totalCount;
            return { props: { serviciosEspeciales, totalCount, usuarioLogueado: usuarioLogueado } };
        } else {
            console.error('La API no respondió con el estado 200 OK');
            return { props: { serviciosEspeciales: [], totalCount: 0, error: true, messageError: response.data.message, usuarioLogueado: usuarioLogueado } };
        }
    } catch (error) {
        console.error(error);
        return { props: { serviciosEspeciales: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información" } };
    }
}

export default function ServEspe({ serviciosEspeciales: initialserviciosEspeciales, totalCount: initialTotalCount, error: initialError, messageError: initialMessageError, usuarioLogueado: initialUsuarioLogueado }: { serviciosEspeciales: ServicioEspecial[], totalCount: number, error?: boolean, messageError?: string, usuarioLogueado: Auth | null }) {
    const [usuarioLogueado, setUsuarioLogueado] = useState(initialUsuarioLogueado);
    const [serviciosEspeciales, setserviciosEspeciales] = useState(initialserviciosEspeciales);
    const [NombreServicioEspecial, setNombre] = useState('');
    const [DescripcionServicioEspecial, setDescripcion] = useState('');
    const [CodUnidad, setUnidad] = useState('');
    const [NombreUnidad, setNombreUnidad] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showModalEdit, setShowModalEdit] = useState(false);
    const [selectedservicioEspecial, setSelectedServicioEspecial] = useState<ServicioEspecial | null>(null);
    const [tempservicioEspecial, setTempservicioEspecial] = useState<ServicioEspecial | null>(null);
    const [page, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalserviciosEspeciales, setTotalserviciosEspeciales] = useState(initialTotalCount);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState(['SE.ESTADO-1']);
    const [orderBy, setOrderBy] = useState<OrderBy>('SES_NOMBRE');
    const [orderDir, setOrderDir] = useState<OrderDir>('ASC');
    const [deletedCount, setDeletedCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const modalPrintRef = useRef<HTMLDivElement>(null);
    const modalFilterRef = useRef<HTMLDivElement>(null);
    const [unidades, setUnidades] = useState([]);
    const [selected, setSelected] = useState(null);
    const router = useRouter();
    const [error, setError] = useState(initialError);
    const [messageError, setMessageError] = useState(initialMessageError);
    useEffect(() => {
        const fetchUnidades = async () => {
            console.log('Aca hizo una llamada al servidor desde el cliente');


            try {
                const response = await axios.get(`${API_BASE_URL}/api/unidad`, {
                    params: { filter: 'ESTADO-1' },
                });
                if (response.status === 200) {
                    console.log(response.data.unidades);
                    setUnidades(response.data.unidades);

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
        fetchUnidades();
    }, []);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const fetchData = async () => {
                console.log('Aca hizo una llamada al servidor desde el cliente');


                try {
                    const response = await axios.get(`${API_BASE_URL}/api/servicioEspecial`, {
                        params: { page, limit, search, filter: filters.join(','), orderBy, orderDir },
                    });
                    if (response.status === 200) {
                        setserviciosEspeciales(response.data.serviciosEspeciales);
                        setTotalserviciosEspeciales(response.data.totalCount);
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
            setFilters(['SE.Estado-1', 'SE.Estado-0']);
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
            const response = await axios.get(`${API_BASE_URL}/api/servicioEspecial`, {
                params: { page: 1, limit: 99999, search, filter: filters.join(','), orderBy, orderDir },
            });
            const serviciosEspeciales = response.data.serviciosEspeciales;

            // Definir los nombres de las columnas
            const headers = ['#', 'Nombre Servicio Especial', 'Descripción Servicio Especial', 'Unidad', 'Estado'];

            // Mapear los datos para que tengan la estructura adecuada
            const data = serviciosEspeciales.map((r: { NombreServicioEspecial: string, DescripcionServicioEspecial: string, NombreUnidad: string, Estado: string }, i: number) => {
                return {
                    '#': i + 1,
                    'Nombre Servicio Especial': r.NombreServicioEspecial,
                    'Descripción Servicio Especial': r.DescripcionServicioEspecial,
                    'Unidad': r.NombreUnidad,
                    'Estado': r.Estado == "1" ? 'Activo' : 'Inactivo',
                }
            });

            // Exportar los datos como CSV
            generateCSV(headers, data, "Reporte de servicios especiales");
        } catch (error) {
            console.error(error);
        }
    };

    const handleDownloadPDF = async () => {
        try {
            // Obtener todos los registros sin paginación
            const response = await axios.get(`${API_BASE_URL}/api/servicioEspecial`, {
                params: { page: 1, limit: 99999, search, filter: filters.join(','), orderBy, orderDir },
            });
            const serviciosEspeciales = response.data.serviciosEspeciales.map((servicioEspecial: { NombreServicioEspecial: string, DescripcionServicioEspecial: string, NombreUnidad: string, Estado: string }, index: number) => [index + 1, servicioEspecial.NombreServicioEspecial, servicioEspecial.DescripcionServicioEspecial, servicioEspecial.NombreUnidad, servicioEspecial.Estado]); // Eliminamos la primera columna y agregamos un índice
            const header = ["N°", "Nombre Servicio Especial", "Descripcion Servicio especial", "Unidad", "Estado"]; // Eliminamos "N°"
            const reportTitle = "Reporte de Servicios especiales";
            generatePDF(serviciosEspeciales, header, reportTitle);
        } catch (error) {
            console.error(error);
        }
    };



    const createservicioEspecial = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
        setSubmitting(true);
        setIsLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/servicioEspecial`, {
                NombreServicioEspecial: values.NombreServicioEspecial,
                DescripcionServicioEspecial: values.DescripcionServicioEspecial,
                CodUnidad: values.CodUnidad,
            });
            const newservicioEspecial = response.data.nuevoServicioEspecial;
            console.log(newservicioEspecial);
            setserviciosEspeciales([...serviciosEspeciales, newservicioEspecial]);
            setShowModal(false);
            Store.addNotification({
                title: "Servicio especial creado con exito",
                message: "El servicio especial " + response.data.nuevoServicioEspecial.NombreServicioEspecial + " se ha creado con éxito",
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
                title: "Ha ocurrido un problema al crear el servicio especial",
                message: "Lo sentimos ha ocurido un problema al crear el tipo de espacio, vuelva a intentarlo mas tarde",
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
        NombreServicioEspecial: '',
        DescripcionServicioEspecial: '',
        CodUnidad: '',
    };

    const validationSchema = Yup.object().shape({
        NombreServicioEspecial: Yup.string()
            .matches(/^[A-Za-zÁ-Úá-ú\s]+$/, 'Solo se permiten letras y espacios')
            .max(50, 'La longitud máxima es de 50 caracteres')
            .required('Este campo es requerido'),
        DescripcionServicioEspecial: Yup.string()
            .matches(/^[A-Za-zÁ-Úá-ú\s]+$/, 'Solo se permiten letras y espacios')
            .max(150, 'La longitud máxima es de 150 caracteres'),
        CodUnidad: Yup.string()
            .required('Este campo es requerido'),
    });

    const editservicioEspecial = async (servicioEspecial: ServicioEspecial) => {
        setSelectedServicioEspecial(servicioEspecial);
        setTempservicioEspecial(servicioEspecial);
        setNombre(servicioEspecial.NombreServicioEspecial);
        setDescripcion(servicioEspecial.DescripcionServicioEspecial);
        setUnidad(servicioEspecial.CodUnidad);
        setShowModalEdit(true);
    };
    //te quedaste aca colega
    const updateservicioEspecial = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
        setSubmitting(true);
        setIsLoading(true);
        console.log(values.NombreServicioEspecial);
        try {
            const response = await axios.put(`${API_BASE_URL}/api/servicioEspecial/${selectedservicioEspecial?.CodServicioEspecial}`, {
                NombreServicioEspecial: values.NombreServicioEspecial,
                DescripcionServicioEspecial: values.DescripcionServicioEspecial,
                CodUnidad: values.CodUnidad,
            });
            const updatedservicioEspecial = response.data;
            console.log(response);
            setserviciosEspeciales(serviciosEspeciales.map((servicioEspecial) =>
                servicioEspecial.CodServicioEspecial === updatedservicioEspecial.CodServicioEspecial ? updatedservicioEspecial : servicioEspecial
            ));
            setShowModalEdit(false);
            setNombre('');
            setDescripcion('');
            Store.addNotification({
                title: "ServicioEspecial editado con exito",
                message: "El tipo servicio especial " + response.data.NombreServicioEspecial + " se ha editado con éxito",
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
                title: "Ha ocurrido un problema al editar el servicio especial",
                message: "Lo sentimos ha ocurido un problema al editar el servicio especial, vuelva a intentarlo mas tarde",
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

    const deleteservicioEspecial = async (codservicioEspecial: number) => {
        try {
            const response = await axios.delete(`${API_BASE_URL}/api/servicioEspecial/${codservicioEspecial}`);
            const updatedservicioEspecial = response.data;
            console.log(response);
            setserviciosEspeciales(serviciosEspeciales.map((servicioEspecial) =>
                servicioEspecial.CodServicioEspecial === updatedservicioEspecial.CodServicioEspecial ? updatedservicioEspecial : servicioEspecial
            ));
            console.log('cambio deletedCount');
            setDeletedCount(deletedCount + 1);
            Store.addNotification({
                title: "Estado del servicio especial modificado con exito",
                message: "El servicio especial " + response.data.NombreTipoEquipo + " se ha modificado con éxito",
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
                title: "Ha ocurrido un problema al modificar el estado del servico especial",
                message: "Lo sentimos ha ocurido un problema al editar el estado del servicio especial, vuelva a intentarlo mas tarde",
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

    const emptyOption = { value: '', label: 'Selecciona la Unidad Encargada' };
    const handleReload = () => {
        router.reload();
    };

    return (
        <Layout usuarioLogueado={usuarioLogueado}>
            <Head>
                <title>Servicios Especiales</title>
            </Head>
            <div className={styles.crud_container}>
                <ReactNotifications />
                <div className={styles.crud_header}>
                    <h1>Servicios especiales</h1>

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
                                            <input type="checkbox" checked={filters.includes('SE.ESTADO-1')} onChange={() => handleFilterChange('SE.ESTADO-1')} />
                                            <span className={styles.checkmark}></span>
                                            Activos
                                        </label>
                                        <label className={styles.checkbox_label}>
                                            <input type="checkbox" checked={filters.includes('SE.ESTADO-0')} onChange={() => handleFilterChange('SE.ESTADO-0')} />
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
                                            <th onClick={() => handleOrderBy('SES_NOMBRE')} className={styles.th_orderable}>
                                                Nombre {' '}
                                                {orderBy === 'SES_NOMBRE' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'SES_NOMBRE' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'SES_NOMBRE' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('SES_DESCRIPCION')} className={styles.th_orderable}>
                                                Descripción {' '}
                                                {orderBy === 'SES_DESCRIPCION' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'SES_DESCRIPCION' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'SES_DESCRIPCION' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('UNI_NOMBRE')} className={styles.th_orderable}>
                                                Unidad Encargada {' '}
                                                {orderBy === 'UNI_NOMBRE' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'UNI_NOMBRE' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'UNI_NOMBRE' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('SE.ESTADO')} className={styles.th_orderable}>
                                                Estado {' '}
                                                {orderBy === 'SE.ESTADO' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'SE.ESTADO' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'SE.ESTADO' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {serviciosEspeciales.map((servicioEspecial, index) => (
                                            <tr key={servicioEspecial.CodServicioEspecial}>
                                                <td>{(page - 1) * limit + index + 1}</td>
                                                <td>{servicioEspecial.NombreServicioEspecial}</td>
                                                <td>{servicioEspecial.DescripcionServicioEspecial}</td>
                                                <td>{servicioEspecial.NombreUnidad}</td>


                                                {servicioEspecial.Estado == "1" ?
                                                    <td><span className={styles.estado_activo}>Activo</span></td> :
                                                    <td><span className={styles.estado_inactivo}>Inactivo</span></td>
                                                }
                                                <td>
                                                    <button onClick={() => editservicioEspecial(servicioEspecial)} className={styles.button_edit}><FontAwesomeIcon icon={faEdit} /></button>
                                                    {servicioEspecial.Estado == "0" ?
                                                        <button onClick={() => deleteservicioEspecial(servicioEspecial.CodServicioEspecial)} className={styles.button_undo} title='Activar'>
                                                            <FontAwesomeIcon icon={faUndo} />
                                                        </button> :
                                                        <button onClick={() => deleteservicioEspecial(servicioEspecial.CodServicioEspecial)} className={styles.button_trash} title='Inactivar'>
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
                                                    total={totalserviciosEspeciales}
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
                            <h3>Crear Servicio especial</h3>
                            <Formik
                                initialValues={initialValues}
                                validationSchema={validationSchema}
                                onSubmit={createservicioEspecial}
                                validateOnChange={true}
                            >
                                {({ isSubmitting, errors, touched }) => (
                                    <Form>
                                        <label htmlFor="NombreServicioEspecial">Nombre de servicio especial</label>
                                        <Field id="NombreServicioEspecial" name='NombreServicioEspecial' placeholder="Ingresa el nombre del servicio especial" className={errors.NombreServicioEspecial && touched.NombreServicioEspecial ? styles.error_input : ''} />
                                        <ErrorMessage name="NombreServicioEspecial" component="div" className={styles.error} />

                                        <label htmlFor="DescripcionServicioEspecial">Descripción del servicio especial</label>
                                        <Field id="DescripcionServicioEspecial" name='DescripcionServicioEspecial' placeholder="Ingresa una descripción para el servicio especial" className={errors.DescripcionServicioEspecial && touched.DescripcionServicioEspecial ? styles.error_input : ''} />
                                        <ErrorMessage name="DescripcionServicioEspecial" component="div" className={styles.error} />

                                        <label htmlFor="Unidad">Unidad</label>
                                        <Field name="CodUnidad">
                                            {({ field, form }: { field: any, form: any }) => {
                                                const handleChange = (selectedOption: any) => {
                                                    form.setFieldValue(field.name, selectedOption.value);
                                                };

                                                const options = [emptyOption, ...unidades.map((unidad: Unidad) => ({ value: unidad.CodUnidad, label: "(" + unidad.Siglas + ") " + unidad.NombreUnidad }))];

                                                const selectedOption = options.find(option => option.value === field.value);

                                                return (
                                                    <Select
                                                        {...field}
                                                        value={selectedOption}
                                                        options={options}
                                                        onChange={handleChange}
                                                        classNamePrefix="react-select"
                                                        placeholder="Selecciona la Unidad Encargada"
                                                        className={`${styles.create_select} ${errors.CodUnidad && touched.CodUnidad ? styles.error_input : ''}`}
                                                        isSearchable
                                                    />
                                                );
                                            }}
                                        </Field>
                                        <ErrorMessage name="CodUnidad" component="div" className={styles.error} />

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
                                initialValues={{ NombreServicioEspecial: NombreServicioEspecial, DescripcionServicioEspecial: DescripcionServicioEspecial, CodUnidad: CodUnidad }}
                                validationSchema={validationSchema}
                                onSubmit={updateservicioEspecial}
                                validateOnChange={true}
                            >
                                {({ isSubmitting, errors, touched }) => (
                                    <Form>
                                        <div>
                                            <label htmlFor="NombreServicioEspecial">Nombre del servicio especial</label>
                                            <Field id="NombreServicioEspecial" name="NombreServicioEspecial" placeholder="Ingresa el nombre del servicio especial" className={errors.NombreServicioEspecial && touched.NombreServicioEspecial ? styles.error_input : ''} />
                                            <ErrorMessage name="NombreTipoEquipo" component="div" className={styles.error} />
                                        </div>
                                        <div>
                                            <label htmlFor="DescripcionServicioEspecial">Descripción del servicio especial</label>
                                            <Field id="DescripcionServicioEspecial" name="DescripcionServicioEspecial" placeholder="Ingresa una descripción del servicio especial" className={errors.DescripcionServicioEspecial && touched.DescripcionServicioEspecial ? styles.error_input : ''} />
                                            <ErrorMessage name="DescripcionTipoEquipo" component="div" className={styles.error} />
                                        </div>
                                        <div>
                                            <label htmlFor="CodUnidad">Unidad</label>
                                            <Field
                                                name="CodUnidad"
                                                render={({ field, form }: { field: any, form: any }) => {
                                                    const handleChange = (selectedOption: any) => {
                                                        form.setFieldValue(field.name, selectedOption.value);
                                                    };

                                                    const options = [emptyOption, ...unidades.map((unidad: Unidad) => ({ value: unidad.CodUnidad, label: "(" + unidad.Siglas + ") " + unidad.NombreUnidad }))];

                                                    const selectedOption = options.find(option => option.value === field.value);

                                                    return (
                                                        <Select
                                                            defaultValue={selectedOption}
                                                            options={options}
                                                            onChange={handleChange}
                                                            classNamePrefix="react-select"
                                                            placeholder="Selecciona la Unidad Encargada"
                                                            className={`${styles.create_select} ${errors.CodUnidad && touched.CodUnidad ? styles.error_input : ''}`}
                                                            isSearchable
                                                        />
                                                    );
                                                }}
                                            />
                                            <ErrorMessage name="CodUnidad" component="div" className={styles.error} />
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
                                                    setDescripcion('');
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
                        }}></div>
                    </div>
                )}

            </div>
        </Layout>
    );
}