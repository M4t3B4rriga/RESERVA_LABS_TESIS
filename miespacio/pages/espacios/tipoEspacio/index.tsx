import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { TipoEspacio } from '@/libs/tipoEspacio';
import Pagination from '@/src/components/Pagination';
import SearchBar from '@/src/components/SearchBar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortUp, faSortDown, faSave, faTimes, faSpinner, faPrint, faFileCsv, faFilePdf, faExclamationTriangle, faFilter, faPlus, faUserTag, faEdit, faTrashAlt, faUndo } from '@fortawesome/free-solid-svg-icons';
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
import { Auth } from '@/libs/auth';
import { jwtVerify } from 'jose';
import { GetServerSidePropsContext } from 'next';
import Layout from '@/src/components/Layout';
import Head from 'next/head';

const PAGE_SIZE = 10;
type OrderBy = 'TES_NOMBRE' | 'TES_DESCRIPCION' | 'ESTADO';
type OrderDir = 'ASC' | 'DESC';

export async function getServerSideProps(context: GetServerSidePropsContext) {
    try {
        const { miEspacioSession } = context.req.cookies;

        if (miEspacioSession === undefined) {
            console.log('No hay cookie');
            return { props: { tiposEspacio: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
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
            return { props: { tiposEspacio: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
        }

        const response = await axios.get(`${API_BASE_URL}/api/tipoEspacio`, {
            params: { page: '1', limit: PAGE_SIZE, filter: 'ESTADO-1', orderBy: 'TES_NOMBRE', orderDir: 'ASC' },
        });
        if (response.status === 200) {
            const tiposEspacio = response.data.TipoEspacios;
            const totalCount = response.data.totalCount;
            return { props: { tiposEspacio, totalCount, usuarioLogueado: usuarioLogueado } };
        } else {
            console.error('La API no respondió con el estado 200 OK');
            return { props: { tiposEspacio: [], totalCount: 0, error: true, messageError: response.data.message, usuarioLogueado: usuarioLogueado } };
        }
    } catch (error) {
        console.error(error);
        return { props: { tiposEspacio: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
    }
}

export default function TipEspa({ tiposEspacio: initialtiposEspacio, totalCount: initialTotalCount, error: initialError, messageError: initialMessageError, usuarioLogueado: initialUsuarioLogueado }: { tiposEspacio: TipoEspacio[], totalCount: number, error?: boolean, messageError?: string, usuarioLogueado: Auth | null }) {
    const [usuarioLogueado, setUsuarioLogueado] = useState(initialUsuarioLogueado);
    const [tiposEspacio, settiposEspacio] = useState(initialtiposEspacio);
    const [NombreTipoEspacio, setNombre] = useState('');
    const [DescripcionTipoEspacio, setDescripcion] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showModalEdit, setShowModalEdit] = useState(false);
    const [selectedTipoEspacio, setSelectedTipoEspacio] = useState<TipoEspacio | null>(null);
    const [tempTipoEspacio, setTempTipoEspacio] = useState<TipoEspacio | null>(null);
    const [page, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totaltiposEspacio, setTotaltiposEspacio] = useState(initialTotalCount);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState(['ESTADO-1']);
    const [orderBy, setOrderBy] = useState<OrderBy>('TES_NOMBRE');
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

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const fetchData = async () => {
                try {
                    const response = await axios.get(`${API_BASE_URL}/api/tipoEspacio`, {
                        params: { page, limit, search, filter: filters.join(','), orderBy, orderDir },
                    });
                    console.log(response.data.TipoEspacios);
                    if (response.status === 200) {
                        settiposEspacio(response.data.TipoEspacios);
                        setTotaltiposEspacio(response.data.totalCount);
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
        console.log('cambio orderBy y orderDir');
        setOrderBy(orderBy);
        setOrderDir(orderDir === 'ASC' ? 'DESC' : 'ASC');
    };

    const handleDownloadCSV = async () => {
        try {
            // Obtener los registros que deseas exportar
            const response = await axios.get(`${API_BASE_URL}/api/tipoEspacio`, {
                params: { page: 1, limit: 99999, search, filter: filters.join(','), orderBy, orderDir },
            });
            const tiposEspacio = response.data.TipoEspacios;

            // Definir los nombres de las columnas
            const headers = ['#', 'Nombre Tipo Espacio', 'Descripción Tipo Espacio', 'Estado'];

            // Mapear los datos para que tengan la estructura adecuada
            const data = tiposEspacio.map((r: { NombreTipoEspacio: string, DescripcionTipoEspacio: string, Estado: string }, i: number) => {
                return {
                    '#': i + 1,
                    'Nombre Tipo Espacio': r.NombreTipoEspacio,
                    'Descripción Tipo Espacio': r.DescripcionTipoEspacio,
                    'Estado': r.Estado == "1" ? 'Activo' : 'Inactivo',
                }
            });

            // Exportar los datos como CSV
            generateCSV(headers, data, "Reporte de Tipos de Espacio");
        } catch (error) {
            console.error(error);
        }
    };

    const handleDownloadPDF = async () => {
        try {
            // Obtener todos los registros sin paginación
            const response = await axios.get(`${API_BASE_URL}/api/tipoEspacio`, {
                params: { page: 1, limit: 99999, search, filter: filters.join(','), orderBy, orderDir },
            });
            const tiposEspacio = response.data.TipoEspacios.map((TipoEspacio: { NombreTipoEspacio: string, DescripcionTipoEspacio: string, Estado: string }, index: number) => [index + 1, TipoEspacio.NombreTipoEspacio, TipoEspacio.DescripcionTipoEspacio, TipoEspacio.Estado]); // Eliminamos la primera columna y agregamos un índice
            const header = ["N°", "Nombre Tipo Espacio", "Descripcion Tipo Espacio", "Estado"]; // Eliminamos "N°"
            const reportTitle = "Reporte de Tipos de Espacio";
            generatePDF(tiposEspacio, header, reportTitle);
        } catch (error) {
            console.error(error);
        }
    };

    const createTipoEspacio = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
        setSubmitting(true);
        setIsLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/tipoEspacio`, {
                NombreTipoEspacio: values.NombreTipoEspacio,
                DescripcionTipoEspacio: values.DescripcionTipoEspacio,
            });
            const newTipoEspacio = response.data;
            settiposEspacio([...tiposEspacio, newTipoEspacio]);
            setShowModal(false);
            Store.addNotification({
                title: "Tipo de espacio creado con exito",
                message: "El tipo de espacio " + response.data.NombreTipoEspacio + " se ha creado con éxito",
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
                title: "Ha ocurrido un problema al crear el tipo de espacio",
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
        NombreTipoEspacio: '',
        DescripcionTipoEspacio: '',
    };

    const validationSchema = Yup.object().shape({
        NombreTipoEspacio: Yup.string()
            .matches(/^[A-Za-zÁ-Úá-ú\s]+$/, 'Solo se permiten letras y espacios')
            .max(50, 'La longitud máxima es de 50 caracteres')
            .required('Este campo es requerido'),
        DescripcionTipoEspacio: Yup.string()
            .matches(/^[A-Za-zÁ-Úá-ú\s]+$/, 'Solo se permiten letras y espacios')
            .max(150, 'La longitud máxima es de 150 caracteres')
    });

    const editTipoEspacio = async (TipoEspacio: TipoEspacio) => {
        setSelectedTipoEspacio(TipoEspacio);
        setTempTipoEspacio(TipoEspacio);
        setNombre(TipoEspacio.NombreTipoEspacio);
        setDescripcion(TipoEspacio.DescripcionTipoEspacio);
        setShowModalEdit(true);
    };

    const updateTipoEspacio = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
        setSubmitting(true);
        setIsLoading(true);
        console.log(values.NombreTipoEspacio);
        try {
            const response = await axios.put(`${API_BASE_URL}/api/tipoEspacio/${selectedTipoEspacio?.CodTipoEspacio}`, {
                NombreTipoEspacio: values.NombreTipoEspacio,
                DescripcionTipoEspacio: values.DescripcionTipoEspacio,
            });
            const updatedTipoEspacio = response.data;
            console.log(response);
            settiposEspacio(tiposEspacio.map((TipoEspacio) =>
                TipoEspacio.CodTipoEspacio === updatedTipoEspacio.CodTipoEspacio ? updatedTipoEspacio : TipoEspacio
            ));
            setShowModalEdit(false);
            setNombre('');
            setDescripcion('');
            Store.addNotification({
                title: "Tipo de espacio editado con exito",
                message: "El tipo de equipo " + response.data.NombreTipoEspacio + " se ha editado con éxito",
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
                title: "Ha ocurrido un problema al editar el tipo de espacio",
                message: "Lo sentimos ha ocurido un problema al editar el tipo de espacio, vuelva a intentarlo mas tarde",
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

    const deleteTipoEspacio = async (codTipoEspacio: number) => {
        try {
            const response = await axios.delete(`${API_BASE_URL}/api/tipoEspacio/${codTipoEspacio}`);
            const updatedTipoEspacio = response.data;
            console.log(response);
            settiposEspacio(tiposEspacio.map((TipoEspacio) =>
                TipoEspacio.CodTipoEspacio === updatedTipoEspacio.CodTipoEspacio ? updatedTipoEspacio : TipoEspacio
            ));
            console.log('cambio deletedCount');
            setDeletedCount(deletedCount + 1);
            Store.addNotification({
                title: "Estado del tipo de espacio modificado con exito",
                message: "El tipo de espacio " + response.data.NombreTipoEspacio + " se ha modificado con éxito",
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
                title: "Ha ocurrido un problema al modificar el estado del tipo de espacio",
                message: "Lo sentimos ha ocurido un problema al editar el estado del tipo de espacio, vuelva a intentarlo mas tarde",
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
                <title>Tipos de Espacio</title>
            </Head>
            <div className={styles.crud_container}>
                <ReactNotifications />
                <div className={styles.crud_header}>
                    <h1>Tipos de espacio</h1>

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
                                            <th onClick={() => handleOrderBy('TES_NOMBRE')} className={styles.th_orderable}>
                                                Nombre {' '}
                                                {orderBy === 'TES_NOMBRE' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'TES_NOMBRE' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'TES_NOMBRE' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('TES_DESCRIPCION')} className={styles.th_orderable}>
                                                Descripción {' '}
                                                {orderBy === 'TES_DESCRIPCION' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'TES_DESCRIPCION' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'TES_DESCRIPCION' && <FontAwesomeIcon icon={faSort} />}
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
                                        {tiposEspacio.map((TipoEspacio, index) => (
                                            <tr key={TipoEspacio.CodTipoEspacio}>
                                                <td>{(page - 1) * limit + index + 1}</td>
                                                <td>{TipoEspacio.NombreTipoEspacio}</td>
                                                <td>{TipoEspacio.DescripcionTipoEspacio}</td>
                                                {TipoEspacio.Estado == "1" ?
                                                    <td><span className={styles.estado_activo}>Activo</span></td> :
                                                    <td><span className={styles.estado_inactivo}>Inactivo</span></td>
                                                }
                                                <td>
                                                    <button onClick={() => editTipoEspacio(TipoEspacio)} className={styles.button_edit}><FontAwesomeIcon icon={faEdit} /></button>
                                                    {TipoEspacio.Estado == "0" ?
                                                        <button onClick={() => deleteTipoEspacio(TipoEspacio.CodTipoEspacio)} className={styles.button_undo} title='Activar'>
                                                            <FontAwesomeIcon icon={faUndo} />
                                                        </button> :
                                                        <button onClick={() => deleteTipoEspacio(TipoEspacio.CodTipoEspacio)} className={styles.button_trash} title='Inactivar'>
                                                            <FontAwesomeIcon icon={faTrashAlt} />
                                                        </button>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={5}>
                                                <Pagination
                                                    page={page}
                                                    total={totaltiposEspacio}
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
                            <h3>Crear Tipo de espacio</h3>
                            <Formik
                                initialValues={initialValues}
                                validationSchema={validationSchema}
                                onSubmit={createTipoEspacio}
                                validateOnChange={true}
                            >
                                {({ isSubmitting, errors, touched }) => (
                                    <Form>
                                        <label htmlFor="NombreTipoEspacio">Nombre del tipo de espacio</label>
                                        <Field id="NombreTipoEspacio" name='NombreTipoEspacio' placeholder="Ingresa el Nombre del tipo de espacio" className={errors.NombreTipoEspacio && touched.NombreTipoEspacio ? styles.error_input : ''} />
                                        <ErrorMessage name="NombreTipoEspacio" component="div" className={styles.error} />

                                        <label htmlFor="DescripcionTipoEspacio">Descripción del tipo de espacio</label>
                                        <Field id="DescripcionTipoEspacio" name='DescripcionTipoEspacio' placeholder="Ingresa una descripción para el tipo de espacio" className={errors.DescripcionTipoEspacio && touched.DescripcionTipoEspacio ? styles.error_input : ''} />
                                        <ErrorMessage name="DescripcionTipoEspacio" component="div" className={styles.error} />

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
                                initialValues={{ NombreTipoEspacio: NombreTipoEspacio, DescripcionTipoEspacio: DescripcionTipoEspacio }}
                                validationSchema={validationSchema}
                                onSubmit={updateTipoEspacio}
                                validateOnChange={true}
                            >
                                {({ isSubmitting, errors, touched }) => (
                                    <Form>
                                        <div>
                                            <label htmlFor="NombreTipoEspacio">Nombre del tipo de espacio</label>
                                            <Field id="NombreTipoEspacio" name="NombreTipoEspacio" placeholder="Ingresa el nombre del tipo de espacio" className={errors.NombreTipoEspacio && touched.NombreTipoEspacio ? styles.error_input : ''} />
                                            <ErrorMessage name="NombreTipoEspacio" component="div" className={styles.error} />
                                        </div>
                                        <div>
                                            <label htmlFor="DescripcionTipoEspacio">Descripción del tipo de espacio</label>
                                            <Field id="DescripcionTipoEspacio" name="DescripcionTipoEspacio" placeholder="Ingresa una descripción para el tipo de espacio" className={errors.DescripcionTipoEspacio && touched.DescripcionTipoEspacio ? styles.error_input : ''} />
                                            <ErrorMessage name="DescripcionTipoEspacio" component="div" className={styles.error} />
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