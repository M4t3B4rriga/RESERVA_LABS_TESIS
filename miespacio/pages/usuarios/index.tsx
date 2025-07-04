import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { PersonaInternaUnidad } from '@/libs/persona';
import Pagination from '@/src/components/Pagination';
import SearchBar from '@/src/components/SearchBar';
import DeleteConfirmation from '@/src/components/DeleteConfirmation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortUp, faSortDown, faSave, faTimes, faSpinner, faPrint, faFileCsv, faFileExcel, faFilePdf, faFilter, faUpload, faPlus, faUserTag, faEdit, faTrashAlt, faUndo, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/CRUD.module.css';
import { API_BASE_URL } from '@/src/components/BaseURL';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { generateCSV, generateXLSX } from '@/src/components/csvGeneratorFuntions'
import { generatePDF } from '@/src/components/pdfGeneratorFuntions'
import { ReactNotifications } from 'react-notifications-component'
import 'react-notifications-component/dist/theme.css'
import { Store } from 'react-notifications-component';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { parseCookies } from 'nookies';
import Cookies from 'js-cookie';
import { insertAuditLog } from '@/src/components/Auditoria';
import Modal from '@mui/material/Modal';
import { useDropzone } from 'react-dropzone';
import { Auth } from '@/libs/auth';
import { GetServerSidePropsContext } from 'next';
import { jwtVerify } from 'jose';
import Head from 'next/head';
import Layout from '@/src/components/Layout';

const PAGE_SIZE = 10;
type OrderBy = 'PEI_NOMBRE' | 'PEI_APELLIDO_PATERNO' | 'PEI_CARNET_ID' | 'PEI_EMAIL_INSTITUCIONAL' | 'PEI_EMAIL_PERSONAL' | 'PEI_CEDULA' | 'PEI_TELEFONO' | 'UNI_SIGLAS';
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
            return { props: { usuarios: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
        }

        const response = await axios.get(`${API_BASE_URL}/api/usuarios`, {
            params: { page: '1', limit: PAGE_SIZE, filter: '', orderBy: 'PEI_APELLIDO_PATERNO', orderDir: 'ASC' },
        });
        if (response.status === 200) {
            const usuarios = response.data.usuarios;
            const totalCount = response.data.totalCount;

            return { props: { usuarios, totalCount, usuarioLogueado: usuarioLogueado } };
        } else {
            console.error('La API no respondió con el estado 200 OK');
            return { props: { usuarios: [], totalCount: 0, error: true, messageError: response.data.message, usuarioLogueado: usuarioLogueado } };
        }

    } catch (error) {
        console.error(error);
        return { props: { usuarios: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
    }
}

export default function Usuarios({ usuarios: initialUsuarios, totalCount: initialTotalCount, error: initialError, messageError: initialMessageError, usuarioLogueado: initialUsuarioLogueado }: { usuarios: PersonaInternaUnidad[], totalCount: number, error?: boolean, messageError?: string, usuarioLogueado: Auth | null }) {
    const [usuarios, setUsuarios] = useState(initialUsuarios);
    const [usuarioLogueado, setUsuarioLogueado] = useState(initialUsuarioLogueado);
    const [showModal, setShowModal] = useState(false);
    const [page, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalUsuarios, setTotalUsuarios] = useState(initialTotalCount);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState([]);
    const [orderBy, setOrderBy] = useState<OrderBy>('PEI_APELLIDO_PATERNO');
    const [orderDir, setOrderDir] = useState<OrderDir>('ASC');
    const [cliente, setCliente] = useState('cliente');
    const [deletedCount, setDeletedCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const modalPrintRef = useRef<HTMLDivElement>(null);
    const modalFilterRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [error, setError] = useState(initialError);
    const [messageError, setMessageError] = useState(initialMessageError);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {

        if (typeof window !== 'undefined') {
            const fetchData = async () => {
                try {
                    const response = await axios.get(`${API_BASE_URL}/api/usuarios`, {
                        params: { page, limit, search, filter: filters.join(','), orderBy, orderDir },
                    });

                    if (response.status === 200) {
                        setUsuarios(response.data.usuarios);
                        setTotalUsuarios(response.data.totalCount);
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

    const handleOrderBy = (orderBy: OrderBy) => {
        setOrderBy(orderBy);
        setOrderDir(orderDir === 'ASC' ? 'DESC' : 'ASC');
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setSelectedFile(acceptedFiles[0]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { '.xls': ['.xls'], '.xlsx': ['.xls'] },
        maxFiles: 1,
    });

    const handleDownloadCSV = async () => {
        try {
            // Obtener los registros que deseas exportar
            const response = await axios.get(`${API_BASE_URL}/api/usuarios`, {
                params: { page: 1, limit: 99999, search, filter: filters.join(','), orderBy, orderDir },
            });
            const usuarios = response.data.usuarios as PersonaInternaUnidad[];

            // Definir los nombres de las columnas
            const headers = ['Nombre', 'Apellido Paterno', 'Apellido Materno', 'ID', 'Cédula', 'Correo Institucional', 'Correo Personal', 'Teléfono', 'Unidad'];

            // Mapear los datos para que tengan la estructura adecuada
            const data = usuarios.map((r: PersonaInternaUnidad, i: number) => {
                return {
                    'Nombre': r.Nombre,
                    'Apellido Paterno': r.ApellidoPaterno,
                    'Apellido Materno': r.ApellidoMaterno,
                    'ID': r.CarnetID,
                    'Cédula': r.Cedula,
                    'Correo Institucional': r.EmailInstitucional,
                    'Correo Personal': r.EmailPersonal,
                    'Teléfono': r.Telefono,
                    'Unidad': r.SiglasUnidad !== null ? r.SiglasUnidad + " - " + r.NombreUnidad : '',
                }
            });

            // Exportar los datos como CSV
            generateCSV(headers, data, "Reporte de Usuarios");
        } catch (error) {
            console.error(error);
        }
    };

    const handleDownloadXLSX = async () => {
        try {
            // Obtener los registros que deseas exportar
            const response = await axios.get(`${API_BASE_URL}/api/usuarios`, {
                params: { page: 1, limit: 99999, search, filter: filters.join(','), orderBy, orderDir },
            });
            const usuarios = response.data.usuarios as PersonaInternaUnidad[];

            // Definir los nombres de las columnas
            const headers = ['Nombre', 'Apellido Paterno', 'Apellido Materno', 'ID', 'Cédula', 'Correo Institucional', 'Correo Personal', 'Teléfono', 'Unidad'];

            // Mapear los datos para que tengan la estructura adecuada
            const data = usuarios.map((r: PersonaInternaUnidad, i: number) => {
                return {
                    'Nombre': r.Nombre,
                    'Apellido Paterno': r.ApellidoPaterno,
                    'Apellido Materno': r.ApellidoMaterno,
                    'ID': r.CarnetID,
                    'Cédula': r.Cedula,
                    'Correo Institucional': r.EmailInstitucional,
                    'Correo Personal': r.EmailPersonal,
                    'Teléfono': r.Telefono,
                    'Unidad': r.SiglasUnidad !== null ? r.SiglasUnidad + " - " + r.NombreUnidad : '',
                }
            });

            // Exportar los datos como CSV
            generateXLSX(headers, data, "Reporte de Usuarios");
        } catch (error) {
            console.error(error);
        }
    };

    const handleDownloadPDF = async () => {
        try {
            // Obtener todos los registros sin paginación
            const response = await axios.get(`${API_BASE_URL}/api/usuarios`, {
                params: { page: 1, limit: 99999, search, filter: filters.join(','), orderBy, orderDir },
            });
            const usuarios = response.data.usuarios.map((r: PersonaInternaUnidad, index: number) => [index + 1, r.Nombre + ' ' + r.ApellidoPaterno + ' ' + r.ApellidoMaterno, r.CarnetID, r.Cedula, r.EmailInstitucional, r.EmailPersonal, r.Telefono, r.SiglasUnidad !== null ? r.SiglasUnidad + " - " + r.NombreUnidad : 'Ninguna']);
            const header = ["N°", 'Nombre', 'ID', 'Cédula', 'Correo Institucional', 'Correo Personal', 'Teléfono', 'Unidad'];
            const reportTitle = "Reporte de Usuarios";
            generatePDF(usuarios, header, reportTitle);
        } catch (error) {
            console.error(error);
        }
    };

    const handlePrint = () => {
        if (showPrintModal) {
            setShowPrintModal(false);
        } else {
            setShowPrintModal(true);
        }
    }

    const handleReload = () => {
        router.reload();
    };

    const handleCloseModal = () => {
        setSelectedFile(null);
        setShowModal(false);
    }

    const handleUploadFile = async () => {
        if (selectedFile !== null) {
            setIsLoading(true);
            try {
                const formData = new FormData();
                formData.append('file', selectedFile);
                const response = await axios.post(`${API_BASE_URL}/api/usuarios/uploadUsers`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                const { data } = response;
                if (response.status === 200) {
                    Store.addNotification({
                        title: "Usuarios cargados con éxito",
                        message: "Los usuarios se han cargado con éxito",
                        type: "success",
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
                    setSelectedFile(null);
                    setShowModal(false);
                    router.reload();
                } else {
                    Store.addNotification({
                        title: "Ha ocurrido un problema al cargar los usuarios",
                        message: data.message,
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
            } catch (error) {
                Store.addNotification({
                    title: "Ha ocurrido un problema al cargar los usuarios",
                    message: "Lo sentimos ha ocurido un problema al cargar los usuarios vuelva a intentarlo mas tarde",
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
                console.error(error);
            }
            setIsLoading(false);
        }
    }

    return (
        <Layout usuarioLogueado={usuarioLogueado}>
            <Head>
                <title>Usuarios</title>
            </Head>
            <div className={styles.crud_container}>
                <ReactNotifications />
                <div className={styles.crud_header}>
                    <h1>Usuarios</h1>
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
                            <FontAwesomeIcon icon={faUpload} style={{ marginRight: '5px' }} />
                            Cargar datos
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
                                    <button onClick={handleDownloadXLSX}>
                                        <FontAwesomeIcon icon={faFileExcel} className={styles.csv_icon} />
                                        XLSX</button>
                                    <button onClick={handleDownloadPDF}>
                                        <FontAwesomeIcon icon={faFilePdf} className={styles.pdf_icon} />
                                        PDF</button>
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
                                            <th onClick={() => handleOrderBy('PEI_NOMBRE')} className={styles.th_orderable}>
                                                Nombre {' '}
                                                {orderBy === 'PEI_NOMBRE' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'PEI_NOMBRE' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'PEI_NOMBRE' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('PEI_APELLIDO_PATERNO')} className={styles.th_orderable}>
                                                Apellidos {' '}
                                                {orderBy === 'PEI_APELLIDO_PATERNO' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'PEI_APELLIDO_PATERNO' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'PEI_APELLIDO_PATERNO' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('PEI_CARNET_ID')} className={styles.th_orderable}>
                                                ID {' '}
                                                {orderBy === 'PEI_CARNET_ID' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'PEI_CARNET_ID' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'PEI_CARNET_ID' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('PEI_CEDULA')} className={styles.th_orderable}>
                                                Cédula {' '}
                                                {orderBy === 'PEI_CEDULA' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'PEI_CEDULA' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'PEI_CEDULA' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('PEI_EMAIL_INSTITUCIONAL')} className={styles.th_orderable}>
                                                Email Institucional {' '}
                                                {orderBy === 'PEI_EMAIL_INSTITUCIONAL' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'PEI_EMAIL_INSTITUCIONAL' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'PEI_EMAIL_INSTITUCIONAL' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('PEI_EMAIL_PERSONAL')} className={styles.th_orderable}>
                                                Email Personal {' '}
                                                {orderBy === 'PEI_EMAIL_PERSONAL' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'PEI_EMAIL_PERSONAL' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'PEI_EMAIL_PERSONAL' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('PEI_TELEFONO')} className={styles.th_orderable}>
                                                Teléfono {' '}
                                                {orderBy === 'PEI_TELEFONO' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'PEI_TELEFONO' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'PEI_TELEFONO' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('UNI_SIGLAS')} className={styles.th_orderable}>
                                                Unidad {' '}
                                                {orderBy === 'UNI_SIGLAS' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'UNI_SIGLAS' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'UNI_SIGLAS' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usuarios.map((usuario, index) => (
                                            <tr key={usuario.CodPersonaInterna}>
                                                <td>{(page - 1) * limit + index + 1}</td>
                                                <td>{usuario.Nombre}</td>
                                                <td>{usuario.ApellidoPaterno} {usuario.ApellidoMaterno}</td>
                                                <td>{usuario.CarnetID}</td>
                                                <td>{usuario.Cedula}</td>
                                                <td>{usuario.EmailInstitucional}</td>
                                                <td>{usuario.EmailPersonal}</td>
                                                <td>{usuario.Telefono}</td>
                                                <td>{usuario.SiglasUnidad !== null ? usuario.SiglasUnidad + ' - ' + usuario.NombreUnidad : <i>Ninguna</i>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={9}>
                                                <Pagination
                                                    page={page}
                                                    total={totalUsuarios}
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
                <Modal open={showModal} onClose={handleCloseModal} className={styles.modal_supreme}>
                    <div >
                        <div className={styles.card} style={{ width: "fit-content" }}>
                            <h3>Asignar lista de usuarios</h3>
                            <div style={{ marginBottom: "7px" }}>
                                Suba un archivo de formato <span className={styles.green_color}>XLS</span> con la información
                            </div>
                            <div style={{ marginBottom: "7px" }} className={styles.tiny_info}>
                                Puede encontrar un ejemplo del archivo descargandolo en la seccion<br /> <i className={styles.green_color}>Imprimir</i> de esta misma página. <br />La columna &quot;Unidad&quot; no es necesaria en el archivo.
                            </div>
                            <div style={{ width: "100%" }}>
                                <div {...getRootProps()} className={styles.images_drop}>
                                    <input {...getInputProps()} />
                                    {isDragActive ? (
                                        <p className={styles.dropzone_drop_text}>Suelta el archivo aquí ...</p>
                                    ) : (
                                        <p className={styles.normal_text}>
                                            Arrastra y suelta un archivo .xls aquí o <br />haz clic para seleccionar uno
                                        </p>
                                    )}
                                </div>
                                {selectedFile && (
                                    <div className={styles.regular_info}>
                                        Archivo seleccionado: <br />
                                        <FontAwesomeIcon icon={faFileExcel} style={{ marginRight: '5px' }} className={styles.green_color} /> <b>{selectedFile.name}</b>
                                    </div>
                                )}
                                <div className={styles.card_buttons_container}>
                                    <button className={styles.button} onClick={handleCloseModal} disabled={isLoading}>Cancelar</button>
                                    {selectedFile && (
                                        <button className={styles.button} onClick={handleUploadFile} disabled={isLoading}>
                                            <FontAwesomeIcon icon={!isLoading ? faUpload : faSpinner} style={{ marginRight: '10px' }} spin={isLoading} />Subir Archivo
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>
            </div>
        </Layout>
    );
}