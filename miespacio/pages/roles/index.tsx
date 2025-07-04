import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { Roles } from '@/libs/roles';
import Pagination from '@/src/components/Pagination';
import SearchBar from '@/src/components/SearchBar';
import DeleteConfirmation from '@/src/components/DeleteConfirmation';
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
import { parseCookies } from 'nookies';
import Cookies from 'js-cookie';
import { insertAuditLog } from '@/src/components/Auditoria';
import { Auth } from '@/libs/auth';
import { jwtVerify } from 'jose';
import { GetServerSidePropsContext } from 'next';
import Layout from '@/src/components/Layout';
import Head from 'next/head';
import Link from 'next/link';
const PAGE_SIZE = 10;
type OrderBy = 'ROL_NOMBRE' | 'ROL_DESCRIPCION' | 'Estado';
type OrderDir = 'ASC' | 'DESC';

export async function getServerSideProps(context: GetServerSidePropsContext) {
    try {
        const { miEspacioSession } = context.req.cookies;

        if (miEspacioSession === undefined) {
            console.log('No hay cookie');
            return { props: { roles: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
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

        const response = await axios.get(`${API_BASE_URL}/api/roles`, {
            params: { page: '1', limit: PAGE_SIZE, filter: 'Estado-1', orderBy: 'ROL_NOMBRE', orderDir: 'ASC' },
        });
        if (response.status === 200) {
            const roles = response.data.roles;
            const totalCount = response.data.totalCount;

            return { props: { roles, totalCount, usuarioLogueado: usuarioLogueado } };
        } else {
            console.error('La API no respondió con el estado 200 OK');
            return { props: { roles: [], totalCount: 0, error: true, messageError: response.data.message, usuarioLogueado: usuarioLogueado } };
        }

    } catch (error) {
        console.error(error);
        return { props: { roles: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
    }
}

export default function Rol({ roles: initialRoles, totalCount: initialTotalCount, error: initialError, messageError: initialMessageError, usuarioLogueado: initialUsuarioLogueado }: { roles: Roles[], totalCount: number, error?: boolean, messageError?: string, usuarioLogueado: Auth | null }) {
    const [usuarioLogueado, setUsuarioLogueado] = useState(initialUsuarioLogueado);
    const [roles, setRoles] = useState(initialRoles);
    const [NombreRol, setNombre] = useState('');
    const [DescripcionRol, setDescripcion] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showModalEdit, setShowModalEdit] = useState(false);
    const [selectedRol, setSelectedRol] = useState<Roles | null>(null);
    const [tempRol, setTempRol] = useState<Roles | null>(null);
    const [page, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalRoles, setTotalRoles] = useState(initialTotalCount);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState(['Estado-1']);
    const [orderBy, setOrderBy] = useState<OrderBy>('ROL_NOMBRE');
    const [orderDir, setOrderDir] = useState<OrderDir>('ASC');
    const [cliente, setCliente] = useState('cliente');
    const [deletedCount, setDeletedCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const modalPrintRef = useRef<HTMLDivElement>(null);
    const modalFilterRef = useRef<HTMLDivElement>(null);
    const [isOpenDeleteConfirmation, setIsOpenDeleteConfirmation] = useState(false);
    const [dataForDelete, setDataForDelete] = useState<Roles | null>(null);
    const router = useRouter();
    const [error, setError] = useState(initialError);
    const [messageError, setMessageError] = useState(initialMessageError);

    useEffect(() => {

        if (typeof window !== 'undefined') {
            const fetchData = async () => {
                try {
                    const response = await axios.get(`${API_BASE_URL}/api/roles`, {
                        params: { page, limit, search, filter: filters.join(','), orderBy, orderDir },
                    });

                    if (response.status === 200) {
                        setRoles(response.data.roles);
                        setTotalRoles(response.data.totalCount);
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
            setFilters(['Estado-1', 'Estado-0']);
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
            const response = await axios.get(`${API_BASE_URL}/api/roles`, {
                params: { page: 1, limit: 99999, search, filter: filters.join(','), orderBy, orderDir },
            });
            const roles = response.data.roles;

            // Definir los nombres de las columnas
            const headers = ['#', 'Nombre Rol', 'Descripción Rol', 'Estado'];

            // Mapear los datos para que tengan la estructura adecuada
            const data = roles.map((r: { NombreRol: string, DescripcionRol: string, Estado: string }, i: number) => {
                return {
                    '#': i + 1,
                    'Nombre Rol': r.NombreRol,
                    'Descripción Rol': r.DescripcionRol,
                    'Estado': r.Estado == "1" ? 'Activo' : 'Inactivo',
                }
            });

            // Exportar los datos como CSV
            generateCSV(headers, data, "Reporte de roles");
        } catch (error) {
            console.error(error);
        }
    };

    const handleDownloadPDF = async () => {
        try {
            // Obtener todos los registros sin paginación
            const response = await axios.get(`${API_BASE_URL}/api/roles`, {
                params: { page: 1, limit: 99999, search, filter: filters.join(','), orderBy, orderDir },
            });
            const roles = response.data.roles.map((role: { NombreRol: string, DescripcionRol: string, Estado: string }, index: number) => [index + 1, role.NombreRol, role.DescripcionRol, role.Estado]); // Eliminamos la primera columna y agregamos un índice
            const header = ["N°", "Nombre Rol", "Descripción Rol", "Estado"]; // Eliminamos "N°"
            const reportTitle = "Reporte de roles";
            generatePDF(roles, header, reportTitle);
        } catch (error) {
            console.error(error);
        }
    };

    const createRol = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
        setSubmitting(true);
        setIsLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/roles`, {
                NombreRol: values.NombreRol,
                DescripcionRol: values.DescripcionRol,
            });
            const newRol = response.data;
            setRoles([...roles, newRol]);
            setShowModal(false);
            Store.addNotification({
                title: "Rol creado con exito",
                message: "El rol " + response.data.NombreRol + " se ha creado con éxito",
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
                title: "Ha ocurrido un problema al crear el rol",
                message: "Lo sentimos ha ocurido un problema al crear el rol vuelva a intentarlo mas tarde",
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
        NombreRol: '',
        DescripcionRol: '',
    };

    const validationSchema = Yup.object().shape({
        NombreRol: Yup.string()
            .matches(/^[A-Za-zÁ-Úá-ú\s]+$/, 'Solo se permiten letras y espacios')
            .max(50, 'La longitud máxima es de 50 caracteres')
            .required('Este campo es requerido'),
        DescripcionRol: Yup.string()
            .matches(/^[A-Za-zÁ-Úá-ú\s]+$/, 'Solo se permiten letras y espacios')
            .max(150, 'La longitud máxima es de 150 caracteres'),
    });

    const editRol = async (rol: Roles) => {
        setSelectedRol(rol);
        setTempRol(rol);
        setNombre(rol.NombreRol);
        setDescripcion(rol.DescripcionRol);
        setShowModalEdit(true);
    };

    const deleteModal = async (rol: Roles) => {
        setDataForDelete(rol);
        setIsOpenDeleteConfirmation(true);
    };

    const updateRol = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
        setSubmitting(true);
        setIsLoading(true);
        try {
            const response = await axios.put(`${API_BASE_URL}/api/roles/${selectedRol?.CodRol}`, {
                NombreRol: values.NombreRol,
                DescripcionRol: values.DescripcionRol,
            });
            const updatedRol = response.data;
            console.log(response);
            setRoles(roles.map((rol) =>
                rol.CodRol === updatedRol.CodRol ? updatedRol : rol
            ));
            setShowModalEdit(false);
            setNombre('');
            setDescripcion('');
            Store.addNotification({
                title: "Rol editado con exito",
                message: "El rol " + response.data.NombreRol + " se ha editado con éxito",
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
                title: "Ha ocurrido un problema al editar el rol",
                message: "Lo sentimos ha ocurido un problema al editar el rol vuelva a intentarlo mas tarde",
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

    const deleteRol = async (codRol: number) => {
        try {
            const response = await axios.delete(`${API_BASE_URL}/api/roles/${codRol}`);
            const updatedRol = response.data;
            console.log(response);
            setRoles(roles.map((rol) =>
                rol.CodRol === updatedRol.CodRol ? updatedRol : rol
            ));
            console.log('cambio deletedCount');
            setDeletedCount(deletedCount + 1);
            Store.addNotification({
                title: "Estado del rol modificado con exito",
                message: "El rol " + response.data.NombreRol + " se ha modificado con éxito",
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
                title: "Ha ocurrido un problema al modificar el estado del rol",
                message: "Lo sentimos ha ocurido un problema al editar el estado del rol vuelva a intentarlo mas tarde",
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
                <title>Roles</title>
            </Head>
            <div className={styles.crud_container}>
                <DeleteConfirmation isOpen={isOpenDeleteConfirmation} onClose={() => { setIsOpenDeleteConfirmation(false) }} onConfirm={dataForDelete ? () => deleteRol(dataForDelete.CodRol) : () => { }} registerName={dataForDelete ? dataForDelete.NombreRol : undefined} />
                <ReactNotifications />
                <div className={styles.crud_header}>
                    <h1>Roles</h1>
                    <button className={styles.crud_normal_button}>
                        <Link href="/usuarios/asignar-rol" className={styles.link}>
                            <FontAwesomeIcon icon={faUserTag} className={styles.button_icon} style={{ marginRight: '5px' }} />
                            Asignar rol a usuario
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
                                            <input type="checkbox" checked={filters.includes('Estado-1')} onChange={() => handleFilterChange('Estado-1')} />
                                            <span className={styles.checkmark}></span>
                                            Activos
                                        </label>
                                        <label className={styles.checkbox_label}>
                                            <input type="checkbox" checked={filters.includes('Estado-0')} onChange={() => handleFilterChange('Estado-0')} />
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
                                            <th onClick={() => handleOrderBy('ROL_NOMBRE')} className={styles.th_orderable}>
                                                Nombre {' '}
                                                {orderBy === 'ROL_NOMBRE' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'ROL_NOMBRE' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'ROL_NOMBRE' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('ROL_DESCRIPCION')} className={styles.th_orderable}>
                                                Descripción {' '}
                                                {orderBy === 'ROL_DESCRIPCION' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'ROL_DESCRIPCION' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'ROL_DESCRIPCION' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('Estado')} className={styles.th_orderable}>
                                                Estado {' '}
                                                {orderBy === 'Estado' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'Estado' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'Estado' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {roles.map((rol, index) => (
                                            <tr key={rol.CodRol}>
                                                <td>{(page - 1) * limit + index + 1}</td>
                                                <td>{rol.NombreRol}</td>
                                                <td>{rol.DescripcionRol}</td>
                                                {rol.Estado == "1" ?
                                                    <td><span className={styles.estado_activo}>Activo</span></td> :
                                                    <td><span className={styles.estado_inactivo}>Inactivo</span></td>
                                                }
                                                <td>
                                                    <button onClick={() => editRol(rol)} className={styles.button_edit}><FontAwesomeIcon icon={faEdit} /></button>
                                                    {rol.Estado == "0" ?
                                                        <button onClick={() => deleteRol(rol.CodRol)} className={styles.button_undo} title='Activar'>
                                                            <FontAwesomeIcon icon={faUndo} />
                                                        </button> :
                                                        <button onClick={() => deleteModal(rol)} className={styles.button_trash} title='Inactivar'>
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
                                                    total={totalRoles}
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
                            <h3>Crear Rol</h3>
                            <Formik
                                initialValues={initialValues}
                                validationSchema={validationSchema}
                                onSubmit={createRol}
                                validateOnChange={true}
                            >
                                {({ isSubmitting, errors, touched }) => (
                                    <Form>
                                        <label htmlFor="NombreRol">Nombre del Rol</label>
                                        <Field id="NombreRol" name='NombreRol' placeholder="Ingresa el nombre del rol" className={errors.NombreRol && touched.NombreRol ? styles.error_input : ''} />
                                        <ErrorMessage name="NombreRol" component="div" className={styles.error} />

                                        <label htmlFor="DescripcionRol">Descripción del Rol</label>
                                        <Field id="DescripcionRol" name='DescripcionRol' placeholder="Ingresa una descripción para el rol" className={errors.DescripcionRol && touched.DescripcionRol ? styles.error_input : ''} />
                                        <ErrorMessage name="DescripcionRol" component="div" className={styles.error} />

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
                                initialValues={{ NombreRol: NombreRol, DescripcionRol: DescripcionRol }}
                                validationSchema={validationSchema}
                                onSubmit={updateRol}
                                validateOnChange={true}
                            >
                                {({ isSubmitting, errors, touched }) => (
                                    <Form>
                                        <div>
                                            <label htmlFor="NombreRol">Nombre del Rol</label>
                                            <Field id="NombreRol" name="NombreRol" placeholder="Ingresa el nombre del rol" className={errors.NombreRol && touched.NombreRol ? styles.error_input : ''} />
                                            <ErrorMessage name="NombreRol" component="div" className={styles.error} />
                                        </div>
                                        <div>
                                            <label htmlFor="DescripcionRol">Descripción del Rol</label>
                                            <Field id="DescripcionRol" name="DescripcionRol" placeholder="Ingresa una descripción para el rol" className={errors.DescripcionRol && touched.DescripcionRol ? styles.error_input : ''} />
                                            <ErrorMessage name="DescripcionRol" component="div" className={styles.error} />
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