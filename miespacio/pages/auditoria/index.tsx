import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Auditoria } from '@/libs/auditoria';
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
import { useRouter } from 'next/router';
import { GetServerSidePropsContext } from 'next';
import { jwtVerify } from 'jose';
import { Auth } from '@/libs/auth';
import Layout from '@/src/components/Layout';
import Head from 'next/head';


const PAGE_SIZE = 10;
type OrderBy = 'AUD_DESCRIPCION_ACTIV' | 'AUD_NAVEGADOR' | 'AUD_DISPOSITIVO' | 'AUD_IP_USUARIO' | 'XEUSU_CODIGO' | 'AUD_FECHA' | 'AUD_HORA' | 'AUD_RESULTADO_ACTIV' | 'A.ESTADO';
type OrderDir = 'ASC' | 'DESC';

export async function getServerSideProps(context: GetServerSidePropsContext) {
    try {
        const { miEspacioSession } = context.req.cookies;

        if (miEspacioSession === undefined) {
            console.log('No hay cookie');
            return { props: { auditorias: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
        }

        const { payload } = await jwtVerify(miEspacioSession, new TextEncoder().encode('secret'));

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
        };

        if (CodPersonaInterna === undefined || NombreUsuario === undefined || CodRol === undefined || CodUsuario === undefined) {
            console.log('No hay payload');
            return { props: { auditorias: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
        }

        const response = await axios.get(`${API_BASE_URL}/api/auditoria`, {
            params: { page: '1', limit: PAGE_SIZE, filter: 'Estado-1', orderBy: 'AUD_DESCRIPCION_ACTIV', orderDir: 'ASC' },
        });

        if (response.status === 200) {
            const auditorias = response.data.auditoria;
            const totalCount = response.data.totalCount;
            return { props: { auditorias, totalCount, usuarioLogueado } };
        } else {
            console.error('La API no respondió con el estado 200 OK');
            return { props: { auditorias: [], totalCount: 0, error: true, messageError: response.data.message, usuarioLogueado: usuarioLogueado } };
        }
    } catch (error) {
        console.error(error);
        return { props: { auditorias: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
    }
}

export default function Aud({ auditorias: initialAuditorias, totalCount: initialTotalCount, error: initialError, messageError: initialMessageError, usuarioLogueado: initialUsuarioLogueado }: { auditorias: Auditoria[], totalCount: number, error?: boolean, messageError?: string, usuarioLogueado: Auth | null }) {
    const [auditorias, setAuditoria] = useState(initialAuditorias);
    const [usuarioLogueado, setUsuarioLogueado] = useState(initialUsuarioLogueado);
    const [page, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalAuditorias, setTotalAuditorias] = useState(initialTotalCount);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState(['A.ESTADO-1']);
    const [intervals, setIntervals] = useState(['']);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [orderBy, setOrderBy] = useState<OrderBy>('AUD_DESCRIPCION_ACTIV');
    const [orderDir, setOrderDir] = useState<OrderDir>('ASC');
    const [deletedCount, setDeletedCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const modalPrintRef = useRef<HTMLDivElement>(null);
    const modalFilterRef = useRef<HTMLDivElement>(null);
    const [isOpenDeleteConfirmation, setIsOpenDeleteConfirmation] = useState(false);
    const router = useRouter();
    const [error, setError] = useState(initialError);
    const [messageError, setMessageError] = useState(initialMessageError);
    useEffect(() => {

        if (typeof window !== 'undefined') {
            const fetchData = async () => {
                try {
                    console.log('Aca hizo una llamada al servidor desde el cliente');
                    const response = await axios.get(`${API_BASE_URL}/api/auditoria`, {
                        params: { page, limit, search, filter: filters.join(','), orderBy, orderDir },
                    });
                    if (response.status === 200) {
                        setAuditoria(response.data.auditoria);
                        setTotalAuditorias(response.data.totalCount);
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
    /*Manejo de intervalos*/
    const handleInterval = () => {
        console.log('cambio page y filters');
        if (startDate && endDate) {
            setFilters(['AUD_FECHA--' + startDate.toISOString(), 'AUD_FECHA--' + endDate.toISOString()]);
        } else if (startDate) {
            setFilters(['AUD_FECHA--' + startDate.toISOString()]);
        } else if (endDate) {
            window.alert("aca");
            setFilters(['AUD_FECHA--' + endDate.toISOString(), 'AUD_FECHA--' + endDate.toISOString(), 'AUD_FECHA--' + endDate.toISOString()]);
        } else {
            setFilters([]);
        }
        setCurrentPage(1);
    };
    useEffect(() => {
        handleInterval();
    }, [startDate, endDate]);
    const handleStartDateChange = (e: any) => {
        const selectedDate = new Date(e.target.value);
        // Verificar si la fecha de inicio es superior a la fecha final
        if (endDate && selectedDate > endDate) {
            // Mostrar un mensaje de error o tomar alguna acción apropiada
            alert('La fecha de inicio no puede ser posterior a la fecha final');
        } else {
            setStartDate(selectedDate);
        }
    };
    const handleEndDateChange = (e: any) => {
        const selectedDate = new Date(e.target.value);
        // Verificar si la fecha final es anterior a la fecha de inicio
        if (startDate && selectedDate < startDate) {
            // Mostrar un mensaje de error o tomar alguna acción apropiada
            alert('La fecha final no puede ser anterior a la fecha de inicio');
        } else {
            setEndDate(selectedDate);
        }
    };
    /*Manejo de intervalos*/
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
            const response = await axios.get(`${API_BASE_URL}/api/auditoria`, {
                params: { page: 1, limit: 99999, search, filter: filters.join(','), orderBy, orderDir },
            });
            const auditorias = response.data.auditoria;

            // Definir los nombres de las columnas
            const headers = ['#', 'Actividad Realizada', 'Navegador', 'Dispositivo', 'IP', 'Carnet', 'AUD_FECHA', 'AUD_HORA', 'Resultado'];

            // Mapear los datos para que tengan la estructura adecuada
            const data = auditorias.map((r: { DescripcionActividad: string, Navegador: string, Dispositivo: string, IPusuario: string, IdCarnet: string, Fecha: string, Hora: string, ResultadoActividad: string }, i: number) => {
                return {
                    '#': i + 1,
                    'Actividad': r.DescripcionActividad,
                    'Navegador': r.Navegador,
                    'Dispositivo': r.Dispositivo,
                    'IP': r.IPusuario,
                    'Carnet': r.IdCarnet,
                    'AUD_FECHA': r.Fecha,
                    'AUD_HORA': r.Hora,
                    'Resultado': r.ResultadoActividad,
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
            // Obtener los registros para generar el PDF
            const response = await axios.get(`${API_BASE_URL}/api/auditoria`, {
                params: { page: 1, limit: 99999, search, filter: filters.join(','), orderBy, orderDir },
            });
            const auditorias = response.data.auditoria;

            // Definir los nombres de las columnas en el PDF
            const header = ['#', 'Actividad Realizada', 'Navegador', 'Dispositivo', 'IP', 'Carnet', 'Fecha y Hora', 'Resultado'];

            // Mapear los datos para que tengan la estructura adecuada
            const data = auditorias.map((r: { DescripcionActividad: string, Navegador: string, Dispositivo: string, IPusuario: string, IdCarnet: string, Fecha: string, Hora: string, ResultadoActividad: string }, i: number) => {
                const fecha = r.Fecha.split("T")[0];
                return {
                    '#': i + 1,
                    'Actividad': r.DescripcionActividad,
                    'Navegador': r.Navegador,
                    'Dispositivo': r.Dispositivo,
                    'IP': r.IPusuario,
                    'Carnet': r.IdCarnet,
                    'Fecha y Hora': fecha + "/" + r.Hora,
                    'Resultado': r.ResultadoActividad,
                }
            });

            // Generar el PDF utilizando los datos obtenidos
            generatePDF(data, header, "Reporte de auditoria");
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
                <title>Auditoria</title>
            </Head>
            <div className={styles.crud_container}>

                <ReactNotifications />
                <div className={styles.crud_header}>
                    <h1>Auditoria</h1>
                </div>
                <div className={styles.crud_body}>
                    <div className={styles.crud_options}>
                        <SearchBar searchTerm={search} onSearchTermChange={handleSearchTermChange} />
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
                                <input
                                    type="date"
                                    value={startDate ? startDate.toISOString().split('T')[0] : ''}
                                    onChange={handleStartDateChange}
                                />
                                <input
                                    type="date"
                                    value={endDate ? endDate.toISOString().split('T')[0] : ''}
                                    onChange={handleEndDateChange}
                                />
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
                                            <th onClick={() => handleOrderBy('AUD_DESCRIPCION_ACTIV')} className={styles.th_orderable}>
                                                Actividad Realizada {' '}
                                                {orderBy === 'AUD_DESCRIPCION_ACTIV' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'AUD_DESCRIPCION_ACTIV' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'AUD_DESCRIPCION_ACTIV' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('AUD_NAVEGADOR')} className={styles.th_orderable}>
                                                Navegador Utilizado {' '}
                                                {orderBy === 'AUD_NAVEGADOR' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'AUD_NAVEGADOR' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'AUD_NAVEGADOR' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('AUD_DISPOSITIVO')} className={styles.th_orderable}>
                                                Dispositivo {' '}
                                                {orderBy === 'AUD_DISPOSITIVO' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'AUD_DISPOSITIVO' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'AUD_DISPOSITIVO' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('AUD_IP_USUARIO')} className={styles.th_orderable}>
                                                Ip del usuario {' '}
                                                {orderBy === 'AUD_IP_USUARIO' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'AUD_IP_USUARIO' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'AUD_IP_USUARIO' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('XEUSU_CODIGO')} className={styles.th_orderable}>
                                                Carnet {' '}
                                                {orderBy === 'XEUSU_CODIGO' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'XEUSU_CODIGO' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'XEUSU_CODIGO' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('AUD_FECHA')} className={styles.th_orderable}>
                                                Fecha {' '}
                                                {orderBy === 'AUD_FECHA' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'AUD_FECHA' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'AUD_FECHA' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('AUD_HORA')} className={styles.th_orderable}>
                                                Hora {' '}
                                                {orderBy === 'AUD_HORA' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'AUD_HORA' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'AUD_HORA' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                            <th onClick={() => handleOrderBy('AUD_RESULTADO_ACTIV')} className={styles.th_orderable}>
                                                Resultado Actividad {' '}
                                                {orderBy === 'AUD_RESULTADO_ACTIV' && orderDir === 'DESC' && <FontAwesomeIcon icon={faSortUp} />}
                                                {orderBy === 'AUD_RESULTADO_ACTIV' && orderDir === 'ASC' && <FontAwesomeIcon icon={faSortDown} />}
                                                {orderBy !== 'AUD_RESULTADO_ACTIV' && <FontAwesomeIcon icon={faSort} />}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditorias.map((auditoria, index) => (
                                            <tr key={auditoria.CodAuditoria}>
                                                <td>{(page - 1) * limit + index + 1}</td>
                                                <td>{auditoria.DescripcionActividad}</td>
                                                <td>{auditoria.Navegador}</td>
                                                <td>{auditoria.Dispositivo}</td>
                                                <td>{auditoria.IPusuario}</td>
                                                <td>{auditoria.IdCarnet}</td>
                                                <td>{new Date(auditoria.Fecha).getFullYear()}/{new Date(auditoria.Fecha).getDate()}/{new Date(auditoria.Fecha).toLocaleString('default', { month: 'long' })}</td>
                                                <td>{auditoria.Hora}</td>
                                                {auditoria.ResultadoActividad == "Éxito" ?
                                                    <td style={{ paddingTop: "12px", paddingBottom: "12px", }}><span className={styles.estado_activo}>Éxito</span></td> :
                                                    <td style={{ paddingTop: "12px", paddingBottom: "12px", }}><span className={styles.estado_inactivo}>Fallo</span></td>
                                                }
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={10}>
                                                <Pagination
                                                    page={page}
                                                    total={totalAuditorias}
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
            </div>
        </Layout>
    );
}